import { useEffect, useRef } from "react";
import * as THREE from "three";
import * as YUKA from "yuka";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createGraphHelper } from "../utils/graph_helper";
import { createConvexRegionHelper } from "../utils/navmesh_helper";
import { CollisionVehicle } from "../types/collisionVehicle";
import { FontLoader } from "three/examples/jsm/Addons.js";
import { TextGeometry } from "three/examples/jsm/Addons.js";

export const Scripts = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Renderer - JS API for rendering interactive 3D Graphics on web browser
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setClearColor(0xa3a3a3);
    mountRef.current?.appendChild(renderer.domElement);

    // Scene - Setting up what to render and where
    const scene = new THREE.Scene();

    // Camera (fov, aspect ratio, near, far) - fear/far is zooming
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(6, 10, 14);
    camera.lookAt(scene.position);

    // Ability to rotate the camera
    const controls = new OrbitControls(camera, renderer.domElement);

    // Lighting
    const ambientLight = new THREE.DirectionalLight(0xffffff, 1);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(3, 10, 2);
    scene.add(directionalLight);

    // !Vehicle Mesh
    const vehicleGeometry = new THREE.ConeGeometry(0.125, 0.375, 16);
    vehicleGeometry.rotateX(Math.PI * 0.5);
    vehicleGeometry.translate(0, 0.25, 0);
    const vehicleMaterial = new THREE.MeshNormalMaterial();
    const vehicleMesh = new THREE.Mesh(vehicleGeometry, vehicleMaterial);
    vehicleMesh.matrixAutoUpdate = false; // Let YUKA handle the movements
    //scene.add(vehicleMesh);

    function sync(entity: any, renderComponent: any) {
      renderComponent.matrix.copy(entity.worldMatrix);
    }

    // Function necessary to keep track of entities
    const entityManager = new YUKA.EntityManager();

    // Adding our factory floor
    const loader = new GLTFLoader();
    loader.load("/Original_Plane.glb", function (glb) {
      const model = glb.scene;
      scene.add(model);
    });

    // ! Creating a path entity to follow in YUKA

    const followPathBehavior = new YUKA.FollowPathBehavior(); // (path, destination tolerance)
    followPathBehavior.active = false; // disables/enables default FollowPathBehavior
    followPathBehavior.nextWaypointDistance = 0.5;

    // ! Creating nav mesh for unit collision
    const navmeshLoader = new YUKA.NavMeshLoader();
    navmeshLoader.load("/NavMesh.glb").then((navigationMesh) => {
      // !navMesh + graph creation
      const navMesh = navigationMesh;
      const graph = navMesh.graph;
      let graphHelper = createGraphHelper(graph, 0.2);
      let navMeshGroup = createConvexRegionHelper(navMesh);
      scene.add(graphHelper);
      scene.add(navMeshGroup);
      graphHelper.visible = false;
      navMeshGroup.visible = false;

      // ! Create Checkpoints
      const pointA = new THREE.Vector3(-3, 0.2, 3);
      const pointB = new THREE.Vector3(-3, 0.2, -3);
      const pointC = new THREE.Vector3(0, 0.2, 0);
      const pointD = new THREE.Vector3(7, 1.2, 3);
      const pointE = new THREE.Vector3(7, 1.2, -3);
      // const pointF = new THREE.Vector3(0, 0.2, -1);
      // 0, 0.2, -3
      // 3, 0.2, -3
      // 3, 0.2, -1
      // 0, 0.2, -1

      const labelMap = new Map<string, string>();
      labelMap.set(pointA.toArray().join(","), "Assembly");
      labelMap.set(pointB.toArray().join(","), "Packaging");
      labelMap.set(pointC.toArray().join(","), "Storage");
      labelMap.set(pointD.toArray().join(","), "Conveyor Belt");
      labelMap.set(pointE.toArray().join(","), "Testing");

      function getLabelFromVector(v: THREE.Vector3): string {
        return (
          labelMap.get(v.toArray().join(",")) ||
          `(${v.x.toFixed(1)}, ${v.y.toFixed(1)}, ${v.z.toFixed(1)})`
        );
      }

      // ! Setup Vehicle Tracking and Generate robots dynamically
      const robotArray: CollisionVehicle[] = [];
      const robotState: Map<number, string> = new Map();
      const robotColor = new Map<number, string>();
      const robotCount = 5;

      for (let i = 0; i < robotCount; i++) {
        const vehicleMeshClone = vehicleMesh.clone();

        const color = new THREE.Color(
          Math.random(),
          Math.random(),
          Math.random()
        );
        const hexColor = `#${color.getHexString()}`; // Convert to hex string

        vehicleMeshClone.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            (child as THREE.Mesh).material = new THREE.MeshStandardMaterial({
              color,
            });
          }
        });

        robotColor.set(i, hexColor); // Save for use in labels

        scene.add(vehicleMeshClone);
        const robot = new CollisionVehicle(navMesh, i);
        robot.setRenderComponent(vehicleMeshClone, sync);
        // spawn in by defining the bounds of the rectangle
        const minX = 0,
          maxX = 3;
        const minZ = -3,
          maxZ = -1;
        const randomX = Math.random() * (maxX - minX) + minX;
        const randomZ = Math.random() * (maxZ - minZ) + minZ;
        robot.position.set(randomX, 0.2, randomZ);

        const individualPath = new YUKA.FollowPathBehavior();
        individualPath.active = false;
        robot.steering.add(individualPath);
        entityManager.add(robot);
        robotArray.push(robot);
        robotState.set(i, "Walk");
      }

      // ! Speed Buttons and States
      // Create title for speed buttons
      const statusTitle = document.createElement("p");
      statusTitle.textContent = "3. Change Status";
      statusTitle.style.position = "absolute";
      statusTitle.style.top = "270px";
      statusTitle.style.left = "180px";
      statusTitle.style.margin = "0";
      statusTitle.style.fontFamily = "Arial, sans-serif";
      statusTitle.style.fontSize = "16px";
      document.body.appendChild(statusTitle);

      // Speed Buttons
      const speedButtonsContainer = document.createElement("div");
      speedButtonsContainer.style.position = "absolute";
      speedButtonsContainer.style.top = "300px";
      speedButtonsContainer.style.left = "180px";
      document.body.appendChild(speedButtonsContainer);

      ["Broken", "Walk", "Run"].forEach((state) => {
        const button = document.createElement("button");
        button.textContent = state;
        button.style.marginRight = "5px";
        speedButtonsContainer.appendChild(button);

        button.addEventListener("click", () => {
          for (const id of selectedRobots) {
            const robot = robotArray[id];
            if (!robot) continue;

            if (state === "Broken") {
              robot.maxSpeed = 0.7;
              robot.steering.behaviors[0].active = false;
              robotInstruction.delete(id);

              // Create and show alert
              const alertBox = document.createElement("div");
              alertBox.textContent = `Removed Robot ${
                id + 1
              } Instructions due to Malfunctions`;
              alertBox.style.position = "absolute";
              alertBox.style.top = `${30 + id * 50}px`;
              alertBox.style.left = "50%";
              alertBox.style.transform = "translateX(-50%)";
              alertBox.style.backgroundColor = "#f8d7da";
              alertBox.style.color = "#721c24";
              alertBox.style.padding = "10px 20px";
              alertBox.style.border = "1px solid #f5c6cb";
              alertBox.style.borderRadius = "4px";
              alertBox.style.zIndex = "1000";
              alertBox.style.fontFamily = "Arial, sans-serif";

              document.body.appendChild(alertBox);

              // Remove after 5 seconds
              setTimeout(() => {
                alertBox.remove();
              }, 5000);
            } else if (state === "Walk") {
              robot.maxSpeed = 1.5;
            } else if (state === "Run") {
              robot.maxSpeed = 3;
            }
            robotState.set(id, state);
          }
          updateUIPanel();
        });
      });

      // ! Start instructions button:
      // Create title for speed buttons
      const startTitle = document.createElement("p");
      startTitle.textContent = "4. Press Start";
      startTitle.style.position = "absolute";
      startTitle.style.top = "340px";
      startTitle.style.left = "180px";
      startTitle.style.margin = "0";
      startTitle.style.fontFamily = "Arial, sans-serif";
      startTitle.style.fontSize = "16px";
      document.body.appendChild(startTitle);
      // button
      const startButton = document.createElement("button");
      startButton.textContent = "Start All Paths";
      startButton.style.position = "absolute";
      startButton.style.top = "370px";
      startButton.style.left = "180px";
      document.body.appendChild(startButton);

      // Generate instructions of waypoints of each robot
      const robotInstruction: Map<number, THREE.Vector3[]> = new Map();
      // contains id and target

      startButton.addEventListener("click", () => {
        for (const [id, pathList] of robotInstruction.entries()) {
          const robot = robotArray[id];
          if (!robot || pathList.length === 0) continue;

          const origin = robot.position;

          // Create a full YUKA path
          const yukaPath = new YUKA.Path();

          yukaPath.add(new YUKA.Vector3(origin.x, origin.y, origin.z));
          for (const point of pathList) {
            yukaPath.add(new YUKA.Vector3(point.x, point.y, point.z));
          }

          // Access private _waypoints field
          const waypoints = (yukaPath as any)._waypoints as YUKA.Vector3[];

          const optimalPath = robot.steering
            .behaviors[0] as YUKA.FollowPathBehavior;
          optimalPath.active = true;
          optimalPath.path.clear();

          for (let i = 0; i < waypoints.length - 1; i++) {
            const from = waypoints[i];
            const to = waypoints[i + 1];

            if (
              Math.abs(from.x - to.x) < 0.001 &&
              Math.abs(from.y - to.y) < 0.001 &&
              Math.abs(from.z - to.z) < 0.001
            ) {
              continue;
            }

            const jitteredTo = to.clone();
            jitteredTo.x += (Math.random() - 0.5) * 1;
            jitteredTo.z += (Math.random() - 0.5) * 1;

            const segment = navMesh.findPath(from, jitteredTo);

            for (const point of segment) {
              optimalPath.path.add(point);
            }
          }
        }
        robotInstruction.clear();
        recentlyUpdatedRobots.clear();
        updateUIPanel(); // reflect cleared instructions
      });

      // ! UI Panel:
      const uiPanel = document.createElement("div");
      uiPanel.style.position = "absolute";
      uiPanel.style.right = "20px";
      uiPanel.style.top = "20px";
      uiPanel.style.width = "250px";
      uiPanel.style.maxHeight = "800px";
      uiPanel.style.overflowY = "auto";
      uiPanel.style.backgroundColor = "#f0f0f0";
      uiPanel.style.border = "1px solid #ccc";
      uiPanel.style.padding = "10px";
      uiPanel.style.fontFamily = "Arial, sans-serif";
      uiPanel.style.fontSize = "14px";
      document.body.appendChild(uiPanel);
      updateUIPanel();

      // ! Update UI on Right
      function updateUIPanel() {
        uiPanel.innerHTML = "<h3>Robot Instructions</h3>";

        if (robotInstruction.size === 0) {
          uiPanel.innerHTML += "<p>No instructions assigned.</p>";
        }

        for (const [id, waypoints] of robotInstruction.entries()) {
          const container = document.createElement("div");
          container.style.marginBottom = "1em";

          const header = document.createElement("h4");
          header.textContent = `Robot ${id + 1} (${robotState.get(id)})`;
          header.style.marginLeft = "10px";
          if (recentlyUpdatedRobots.has(id)) {
            header.style.backgroundColor = "#f1c40f";
          }

          const clearBtn = document.createElement("button");
          clearBtn.textContent = "Clear";
          clearBtn.style.marginLeft = "10px";
          clearBtn.addEventListener("click", () => {
            robotInstruction.delete(id);
            updateUIPanel();
          });

          const list = document.createElement("ul");
          waypoints.forEach((point) => {
            const item = document.createElement("li");
            item.textContent = getLabelFromVector(point);
            list.appendChild(item);
          });

          container.appendChild(header);
          container.appendChild(clearBtn);
          container.appendChild(list);
          uiPanel.appendChild(container);
        }
      }

      const recentlyUpdatedRobots = new Set<number>();

      // ! Helper to create a button
      function createNavButton(
        label: string,
        position: { top: number; left: number },
        target: THREE.Vector3
      ) {
        const button = document.createElement("button");
        button.textContent = label;
        button.style.position = "absolute";
        button.style.top = `${position.top}px`;
        button.style.left = `${position.left}px`;
        document.body.appendChild(button);

        button.addEventListener("click", () => {
          for (const id of selectedRobots) {
            if (!robotInstruction.has(id)) {
              robotInstruction.set(id, []);
            }
            robotInstruction.get(id)!.push(target);
            recentlyUpdatedRobots.add(id);
          }

          updateUIPanel();
        });
      }
      // ! Create buttons
      // Create section title for instructions
      const instructionTitle = document.createElement("p");
      instructionTitle.textContent = "2. Select Instructions";
      instructionTitle.style.position = "absolute";
      instructionTitle.style.top = "40px";
      instructionTitle.style.left = "180px";
      instructionTitle.style.margin = "0";
      instructionTitle.style.fontFamily = "Arial, sans-serif";
      instructionTitle.style.fontSize = "16px";
      document.body.appendChild(instructionTitle);

      // Create navigation / instructions buttons
      createNavButton("Go to Assembly", { top: 70, left: 180 }, pointA);
      createNavButton("Go to Packaging", { top: 110, left: 180 }, pointB);
      createNavButton("Go to Storage", { top: 150, left: 180 }, pointC);
      createNavButton("Go to Conveyor Belt", { top: 190, left: 180 }, pointD);
      createNavButton("Go to Testing", { top: 230, left: 180 }, pointE);

      //createNavButton("Go to Point F", { top: 270, left: 180 }, pointF);

      // ! Create Checkboxes for Robots
      // Create checkboxes to generate grouping instructions
      const selectedRobots = new Set<number>();
      const robotCheckboxMap = new Map<number, HTMLInputElement>();

      // Generate checkboxes for each robot
      for (let i = 0; i < robotCount; i++) {
        createCheckboxForRobot(i);
      }

      // Create section title for robot selection
      const robotTitle = document.createElement("p");
      robotTitle.textContent = "1. Select Robot(s)";
      robotTitle.style.position = "absolute";
      robotTitle.style.top = "40px";
      robotTitle.style.left = "20px";
      robotTitle.style.margin = "0";
      robotTitle.style.fontFamily = "Arial, sans-serif";
      robotTitle.style.fontSize = "16px";
      document.body.appendChild(robotTitle);

      function createCheckboxForRobot(id: number) {
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = `robot-${id}`;
        checkbox.style.position = "absolute";
        checkbox.style.top = `${70 + id * 30}px`;
        checkbox.style.left = "20px";

        const label = document.createElement("label");
        label.htmlFor = checkbox.id;
        label.innerText = `Robot ${id + 1}`;
        //label.style.backgroundColor = "#292828";
        label.style.position = "absolute";
        label.style.top = `${70 + id * 30}px`;
        label.style.left = "50px";

        // Use stored robot color for the label
        const robotColors = robotColor.get(id);
        if (robotColors) label.style.color = robotColors;

        checkbox.addEventListener("change", () => {
          if (checkbox.checked) {
            selectedRobots.add(id);
          } else {
            selectedRobots.delete(id);
          }
        });

        document.body.appendChild(checkbox);
        document.body.appendChild(label);
        robotCheckboxMap.set(id, checkbox);
      }
      // Reset selected checkbox
      // Create "Reset Selection" button
      const resetButton = document.createElement("button");
      resetButton.textContent = "Reset Selection";
      resetButton.style.position = "absolute";
      resetButton.style.top = `${70 + robotArray.length * 30 + 10}px`;
      resetButton.style.left = "20px";
      resetButton.style.fontSize = "12px";
      document.body.appendChild(resetButton);

      resetButton.addEventListener("click", () => {
        for (const [id, checkbox] of robotCheckboxMap.entries()) {
          checkbox.checked = false;
          selectedRobots.delete(id); // no need to dispatch, just update directly
        }
      });

      // ! Create waypoints
      function addMarkerAt(position: THREE.Vector3, color: string) {
        const geometry = new THREE.SphereGeometry(0.2, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.copy(position);
        scene.add(sphere);
      }

      // Visualize checkpoints
      addMarkerAt(pointA, "red");
      addMarkerAt(pointB, "orange");
      addMarkerAt(pointC, "yellow");
      addMarkerAt(pointD, "green");
      addMarkerAt(pointE, "blue");

      // Creating text
      function create3DText(
        text: string,
        color: string,
        position: THREE.Vector3,
        scene: THREE.Scene,
        fontPath = "/Roboto_Light_Regular.json"
      ) {
        const fontLoader = new FontLoader();
        fontLoader.load(fontPath, (font) => {
          const textGeom = new TextGeometry(text, {
            font: font,
            size: 0.6,
            depth: 0.1,
          });

          const material = new THREE.MeshBasicMaterial({ color }); // bright white, very readable

          const textMesh = new THREE.Mesh(textGeom, material);
          textMesh.position.set(
            position.x - 1.5,
            position.y + 2,
            position.z - 0.5
          );
          textMesh.rotation.y = -0.5;

          scene.add(textMesh);
        });
      }
      create3DText("Assembly", "red", pointA, scene);
      create3DText("Packaging", "orange", pointB, scene);
      create3DText(
        "Storage",
        "yellow",
        new THREE.Vector3(pointC.x, pointC.y + 1, pointC.z),

        scene
      );
      create3DText("Conveyor Belt", "green", pointD, scene);
      create3DText("Testing", "blue", pointE, scene);
    });

    const time = new YUKA.Time();

    const animate = () => {
      const delta = time.update().getDelta();
      entityManager.update(delta);
      renderer.render(scene, camera);
    };
    renderer.setAnimationLoop(animate);
    controls.update();

    return () => {
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef}></div>;
};
