import React from "react";
import * as YUKA from "yuka";
import * as THREE from "three";

interface StartPathsButtonProps {
  robotInstruction: Map<number, THREE.Vector3[]>;
  setRobotInstruction: React.Dispatch<
    React.SetStateAction<Map<number, THREE.Vector3[]>>
  >;
  recentlyUpdatedRobots: Set<number>;
  setRecentlyUpdatedRobots: React.Dispatch<React.SetStateAction<Set<number>>>;
  robotArray: Record<number, any>;
  navMesh: YUKA.NavMesh;
}

const StartPathsButton: React.FC<StartPathsButtonProps> = ({
  robotInstruction,
  setRobotInstruction,
  recentlyUpdatedRobots,
  setRecentlyUpdatedRobots,
  robotArray,
  navMesh,
}) => {
  const handleStart = () => {
    for (const [id, pathList] of robotInstruction.entries()) {
      const robot = robotArray[id];
      if (!robot || pathList.length === 0) continue;

      const origin = robot.position;
      const yukaPath = new YUKA.Path();
      yukaPath.add(new YUKA.Vector3(origin.x, origin.y, origin.z));

      for (const point of pathList) {
        yukaPath.add(new YUKA.Vector3(point.x, point.y, point.z));
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
    setRobotInstruction(new Map(robotInstruction));
    setRecentlyUpdatedRobots(new Set(recentlyUpdatedRobots));
  };

  return (
    <div style={{ position: "absolute", top: 340, left: 180 }}>
      <p
        style={{ margin: 0, fontFamily: "Arial, sans-serif", fontSize: "16px" }}
      >
        4. Press Start
      </p>
      <button onClick={handleStart} style={{ marginTop: 10 }}>
        Start All Paths
      </button>
    </div>
  );
};

export default StartPathsButton;
