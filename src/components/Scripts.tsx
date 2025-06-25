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
      const pointF = new THREE.Vector3(-3, 0.2, 0);

      // ! Setup Vehicle Tracking and Generate robots dynamically
      const robotArray: CollisionVehicle[] = [];
      const robotCount = 5;
      for (let i = 0; i < robotCount; i++) {
        const vehicleMeshClone = vehicleMesh.clone(); // first create clone of vehicleMesh skeleton obj.
        scene.add(vehicleMeshClone);

        const robot = new CollisionVehicle(navMesh, i); // create new bot with moving parameter of navMesh
        robot.setRenderComponent(vehicleMeshClone, sync); // give robot a mind
        robot.position.set(Math.random() * 4, 0.2, Math.random() * 4); // spawn location

        const individualPath = new YUKA.FollowPathBehavior(); // Each robot must have it's own instance
        individualPath.active = false;

        robot.steering.add(individualPath); // steering behavior
        entityManager.add(robot); // Managing all central objects of game
        robotArray.push(robot); // add robot to our array
      }

      // ! Start instructions button:
      const startButton = document.createElement("button");
      startButton.textContent = "Start All Paths";
      startButton.style.position = "absolute";
      startButton.style.top = "270px";
      startButton.style.left = "20px";
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
            yukaPath.add(new YUKA.Vector3(point.x, point.y, point.z)); // turn THREE into YUKA Vector3
          }

          const optimalPath = robot.steering.behaviors[0];
          optimalPath.active = true;
          optimalPath.path.clear();

          for (let i = 0; i < yukaPath._waypoints.length - 1; i++) {
            const from = yukaPath._waypoints[i];
            const to = yukaPath._waypoints[i + 1];

            if (
              Math.abs(from.x - to.x) < 0.001 &&
              Math.abs(from.y - to.y) < 0.001 &&
              Math.abs(from.z - to.z) < 0.001
            ) {
              continue;
            }

            const jitteredTo = to.clone(); // purpose is to avoid entities to be directly on top of each other
            jitteredTo.x += (Math.random() - 0.5) * 0.5; // ±0.25 units
            jitteredTo.z += (Math.random() - 0.5) * 0.5;

            const segment = navMesh.findPath(from, jitteredTo);

            for (const point of segment) {
              optimalPath.path.add(point);
            }
          }
        }
        robotInstruction.clear();
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

      function updateUIPanel() {
        uiPanel.innerHTML = "<h3>Robot Instructions</h3>";
        for (const [id, pathList] of robotInstruction.entries()) {
          const robotDiv = document.createElement("div");
          robotDiv.innerHTML = `<strong>Robot ${id}</strong>: ${
            pathList.length > 0
              ? pathList.length + " waypoint(s)"
              : "No instructions"
          }`;

          const list = document.createElement("ul");
          for (const point of pathList) {
            const item = document.createElement("li");
            item.textContent = `(${point.x.toFixed(1)}, ${point.y.toFixed(
              1
            )}, ${point.z.toFixed(1)})`;
            list.appendChild(item);
          }

          robotDiv.appendChild(list);
          uiPanel.appendChild(robotDiv);
        }

        if (robotInstruction.size === 0) {
          uiPanel.innerHTML += "<p>No instructions assigned.</p>";
        }
      }

      // ! Helper to create a button
      function createNavButton(
        label: string,
        position: { top: number; left: number },
        target: THREE.Vector3,
        id: number
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
          }

          updateUIPanel();
          //console.log("Updated instructions:", robotInstruction);
        });
      }
      // ! Create buttons
      createNavButton("Go to Assembly", { top: 20, left: 20 }, pointA, 1);
      createNavButton("Go to Packaging", { top: 60, left: 20 }, pointB, 1);
      createNavButton("Go to Storage", { top: 100, left: 20 }, pointC, 1);
      createNavButton("Go to Conveyor Belt", { top: 140, left: 20 }, pointD, 2);
      createNavButton("Go to Testing", { top: 180, left: 20 }, pointE, 2);
      //createNavButton("Go to Point F", { top: 220, left: 20 }, pointF, 2);

      // ! Create Checkboxes
      // Create checkboxes to generate grouping instructions
      const selectedRobots = new Set<number>();

      // Generate checkboxes for each robot
      for (let i = 0; i < robotCount; i++) {
        createCheckboxForRobot(i);
      }

      function createCheckboxForRobot(id: number) {
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = `robot-${id}`;
        checkbox.style.position = "absolute";
        checkbox.style.top = `${300 + id * 30}px`;
        checkbox.style.left = "20px";

        const label = document.createElement("label");
        label.htmlFor = checkbox.id;
        label.innerText = `Robot ${id}`;
        label.style.position = "absolute";
        label.style.top = `${300 + id * 30}px`;
        label.style.left = "50px";

        checkbox.addEventListener("change", (e) => {
          if (checkbox.checked) {
            selectedRobots.add(id);
          } else {
            selectedRobots.delete(id);
          }
        });

        document.body.appendChild(checkbox);
        document.body.appendChild(label);
      }

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
      //addMarkerAt(pointF, "purple");

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

    return () => {
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef}></div>;
};
