import * as THREE from "three";
import * as YUKA from "yuka";

export interface NavEdge {
  vertex: THREE.Vector3;
  next: NavEdge;
}

export interface NavRegion {
  edge: NavEdge | null;
}

export interface NavMesh {
  regions: NavRegion[];
}

export function createConvexRegionHelper(navMesh: YUKA.NavMesh): THREE.Mesh;
