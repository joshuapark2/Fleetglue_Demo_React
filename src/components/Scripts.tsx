import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import * as YUKA from "yuka"


export const Scripts  = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true})
    renderer.setSize(width, height);
    renderer.setClearColor(0xa3a3a3);
    mountRef.current?.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(6, 10, 14);
    camera.lookAt(scene.position);

    // Lighting
    const ambientLight = new THREE.DirectionalLight(0xffffff, 1)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(3, 10, 2);
    scene.add(directionalLight);

    // Vehicle Mesh
    const vehicleGeometry = new THREE.ConeGeometry(0.125, 0.375, 16)
    vehicleGeometry.rotateX(Math.PI * 0.5)
    vehicleGeometry.translate(0, 0.25, 0)
    const vehicleMaterial = new THREE.MeshNormalMaterial();
    const vehicleMesh = new THREE.Mesh(vehicleGeometry, vehicleMaterial);
    vehicleMesh.matrixAutoUpdate = false;
    scene.add(vehicleMesh);

    // Adding YUKA Vehicle - Connecting body (mesh) and mind (YUKA)
    const vehicle = new YUKA.Vehicle();
    vehicle.setRenderComponent(vehicleMesh, sync);

    function sync(entity: any, renderComponent: any) {
      renderComponent.matrix.copy(entity.worldMatrix);
    }

    // Function necessary to keep track of entities
    const entityManager = new YUKA.EntityManager()
    entityManager.add(vehicle);

    const time = new YUKA.Time();

    const animate = () => {
      const delta = time.update().getDelta()
      entityManager.update(delta);
      renderer.render(scene, camera);
    }
    renderer.setAnimationLoop(animate);

    return () => {
      renderer.dispose();
      if(renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    }
  }, [])

  return(
    <div ref={mountRef}></div>
  )
}