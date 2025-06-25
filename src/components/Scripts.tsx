import { useEffect, useRef } from "react";
import * as THREE from "three";
import * as YUKA from "yuka";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createGraphHelper } from "../utils/graph_helper";
import { createConvexRegionHelper } from "../utils/navmesh_helper";
import { CollisionVehicle } from "../types/collisionVehicle";

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
      const pointA = new THREE.Vector3(-3, 0.2, 0);
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

      // ! Generate instructions of waypoints of each robot
      const robotInstruction: Map<number, THREE.Vector3[]> = new Map();
      // contains id and target

      // ! Create checkboxes to generate grouping instructions
      const selectedRobots = new Set<number>();

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

      // Generate checkboxes for each robot
      for (let i = 0; i < robotCount; i++) {
        createCheckboxForRobot(i);
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
          console.log("Updated instructions:", robotInstruction);
        });
      }
      // Create buttons
      createNavButton("Go to Point A", { top: 20, left: 20 }, pointA, 1);
      createNavButton("Go to Point B", { top: 60, left: 20 }, pointB, 1);
      createNavButton("Go to Point C", { top: 100, left: 20 }, pointC, 1);
      createNavButton("Go to Point D", { top: 140, left: 20 }, pointD, 2);
      createNavButton("Go to Point E", { top: 180, left: 20 }, pointE, 2);
      createNavButton("Go to Point F", { top: 220, left: 20 }, pointF, 2);

      // ! Start instructions button:
      const startButton = document.createElement("button");
      startButton.textContent = "Start All Paths";
      startButton.style.position = "absolute";
      startButton.style.top = "270px";
      startButton.style.left = "20px";
      document.body.appendChild(startButton);

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

            const jitteredTo = to.clone(); // purpose is to avoid entities to be directly on top of each other
            jitteredTo.x += (Math.random() - 0.5) * 0.5; // ±0.25 units
            jitteredTo.z += (Math.random() - 0.5) * 0.5;

            const segment = navMesh.findPath(from, jitteredTo);

            for (const point of segment) {
              optimalPath.path.add(point);
            }
          }
        }
      });
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
