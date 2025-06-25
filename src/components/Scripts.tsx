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
    scene.add(vehicleMesh);

    // ! Adding YUKA Vehicle - Connecting body (mesh) and mind (YUKA)
    const vehicle = new YUKA.Vehicle();
    vehicle.setRenderComponent(vehicleMesh, sync);

    function sync(entity: any, renderComponent: any) {
      renderComponent.matrix.copy(entity.worldMatrix);
    }

    // Function necessary to keep track of entities
    const entityManager = new YUKA.EntityManager();
    entityManager.add(vehicle);

    // Adding our factory floor
    const loader = new GLTFLoader();
    loader.load("/Original_Plane.glb", function (glb) {
      const model = glb.scene;
      scene.add(model);
    });

    // ! Creating a path entity to follow in YUKA
    const path = new YUKA.Path();
    path.add(new YUKA.Vector3(0, 0, 0));
    path.add(new YUKA.Vector3(-3, 0, 0));
    path.add(new YUKA.Vector3(-3, 0, -3));

    path.loop = true;

    // Spawn Vehicle at first checkpoint
    vehicle.position.copy(path.current());

    // make vehicle move
    const followPathBehavior = new YUKA.FollowPathBehavior(path, 1);
    vehicle.steering.add(followPathBehavior);

    // More control of behavior
    const onPathBehavior = new YUKA.OnPathBehavior(path, 3);
    vehicle.steering.add(onPathBehavior);

    // ! Creating Visual Path
    const visualPath = [];
    for (let i = 0; i < path._waypoints.length; i++) {
      const waypoint = path._waypoints[i];
      visualPath.push(waypoint.x, waypoint.y, waypoint.z);
    }

    // Creating a buffer geometry instance (clay that can form whatever we like)
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(visualPath, 3) // takes position and passes to GPU w/ 3 elements at a time
    );

    // Linking points with lines -> Link line -> geometry -> add to scene
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
    const lines = new THREE.LineLoop(lineGeometry, lineMaterial);
    scene.add(lines);

    // ! Creating nav mesh for unit collision
    const navmeshLoader = new YUKA.NavMeshLoader();
    navmeshLoader.load("/NavMesh.glb").then((navigationMesh) => {
      const navMesh = navigationMesh;
      const graph = navMesh.graph;

      let graphHelper = createGraphHelper(graph, 0.2);
      let navMeshGroup = createConvexRegionHelper(navMesh);

      scene.add(graphHelper);
      scene.add(navMeshGroup);

      graphHelper.visible = false;
      navMeshGroup.visible = false;

      const vehicle = new CollisionVehicle(navMesh);
      vehicle.setRenderComponent(vehicleMesh, sync);
      entityManager.add(vehicle);
      vehicle.steering.add(followPathBehavior);
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
