/**
 * @author Mugen87 / https://github.com/Mugen87
 */

import * as THREE from "three";

function createGraphHelper(
  graph,
  nodeSize = 1,
  nodeColor = 0x4e84c4,
  edgeColor = 0xffffff
) {
  const group = new THREE.Group();

  // nodes

  const nodeMaterial = new THREE.MeshBasicMaterial({ color: nodeColor });
  const nodeGeometry = new THREE.IcosahedronGeometry(nodeSize, 2);

  const nodes = [];

  graph.getNodes(nodes);

  for (let node of nodes) {
    const nodeMesh = new THREE.Mesh(nodeGeometry, nodeMaterial);
    nodeMesh.position.copy(node.position);
    nodeMesh.userData.nodeIndex = node.index;

    nodeMesh.matrixAutoUpdate = false;
    nodeMesh.updateMatrix();

    group.add(nodeMesh);
  }

  // edges

  const edgesGeometry = new THREE.BufferGeometry();
  const position = [];

  const edgesMaterial = new THREE.LineBasicMaterial({ color: edgeColor });

  const edges = [];

  for (let node of nodes) {
    graph.getEdgesOfNode(node.index, edges);

    for (let edge of edges) {
      const fromNode = graph.getNode(edge.from);
      const toNode = graph.getNode(edge.to);

      position.push(
        fromNode.position.x,
        fromNode.position.y,
        fromNode.position.z
      );
      position.push(toNode.position.x, toNode.position.y, toNode.position.z);
    }
  }

  edgesGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(position, 3)
  );

  const lines = new THREE.LineSegments(edgesGeometry, edgesMaterial);
  lines.matrixAutoUpdate = false;

  group.add(lines);

  return group;
}

export { createGraphHelper };
