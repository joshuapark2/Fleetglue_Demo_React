import * as THREE from "three";
import * as YUKA from "yuka";

export interface GraphNode {
  index: number;
  position: THREE.Vector3;
}

export interface Graph {
  getNodes(out: GraphNode[]): void;
}

export function createGraphHelper(
  graph: YUKA.Graph<YUKA.Node, YUKA.Edge>,
  nodeSize?: number,
  nodeColor?: number,
  edgeColor?: number
): THREE.Group;

