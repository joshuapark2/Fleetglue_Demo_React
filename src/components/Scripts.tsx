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
    //entityManager.add(vehicle);

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

    // More control of behavior
    // const onPathBehavior = new YUKA.OnPathBehavior(path, 3);
    //vehicle.steering.add(onPathBehavior);

    // ! Creating Visual Path
    // const visualPath = [];
    // for (let i = 0; i < path._waypoints.length; i++) {
    //   const waypoint = path._waypoints[i];
    //   visualPath.push(waypoint.x, waypoint.y, waypoint.z);
    // }

    // Creating a buffer geometry instance (clay that can form whatever we like)
    // const lineGeometry = new THREE.BufferGeometry();
    // lineGeometry.setAttribute(
    //   "position",
    //   new THREE.Float32BufferAttribute(visualPath, 3) // takes position and passes to GPU w/ 3 elements at a time
    // );

    // Linking points with lines -> Link line -> geometry -> add to scene
    //const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
    //const lines = new THREE.LineLoop(lineGeometry, lineMaterial);
    //scene.add(lines);

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

        button.addEventListener(
          "click",
          () => {
            // const robot = robotArray[id];
            if (!robotInstruction.has(id)) {
              robotInstruction.set(id, []);
            }
            robotInstruction.get(id)!.push(target);
            console.log(robotInstruction);
          }
          // button.addEventListener("click", () => {
          //     const robot = robotArray[id];
          //     if (robot) {
          //       findPathTo(robot, target);
          //     }
          //   }
        );
      }
      // Create buttons
      createNavButton("Go to Point A", { top: 20, left: 20 }, pointA, 0);
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

          // Create a full YUKA path
          const yukaPath = new YUKA.Path();
          for (const point of pathList) {
            yukaPath.add(new YUKA.Vector3(point.x, point.y, point.z)); // turn THREE into YUKA Vector3
          }
          console.log("paths:", yukaPath);

          const followPath = robot.steering.behaviors[0];
          followPath.path.clear();
          for (const wp of yukaPath._waypoints) followPath.path.add(wp);

          followPath.active = true;
          console.log(
            `Robot ${id} is now navigating through ${pathList.length} points`
          );
        }
      });

      // Dynamic findPathTo
      function findPathTo(robot: CollisionVehicle, target: THREE.Vector3) {
        const yukaTarget = new YUKA.Vector3(target.x, target.y, target.z);
        const from = robot.position;
        const path = navMesh.findPath(from, yukaTarget);

        const individualPath = robot.steering.behaviors[0];
        individualPath.active = true;

        individualPath.path.clear();
        for (let point of path) individualPath.path.add(point);
      }
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
