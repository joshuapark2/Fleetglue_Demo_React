import { useState } from "react";
import * as THREE from "three";
import * as YUKA from "yuka";
import "./App.css";
import RobotUIPanel from "./components/RobotUIPanel";
import RobotSelector from "./components/RobotSelector";
import { Scripts } from "./components/scripts";
import NavButtons from "./components/NavButtons";
import StartPathsButton from "./components/StartPathsButton";
import { CollisionVehicle } from "./types/collisionVehicle";

function App() {
  const robotCount = 5;
  // Global simulation state
  const [navMesh, setNavMesh] = useState<YUKA.NavMesh | null>(null);
  const [robotArray, setRobotArray] = useState<CollisionVehicle[]>([]);

  const [robotInstruction, setRobotInstruction] = useState<
    Map<number, THREE.Vector3[]>
  >(new Map());

  const [robotState, setRobotState] = useState<Map<number, string>>(new Map());

  const [recentlyUpdatedRobots, setRecentlyUpdatedRobots] = useState<
    Set<number>
  >(new Set());

  const [selectedRobots, setSelectedRobots] = useState<Set<number>>(new Set());

  const [robotColor] = useState<Map<number, string>>(() => {
    const colorMap = new Map<number, string>();
    for (let i = 0; i < robotCount; i++) {
      const color = new THREE.Color(
        Math.random(),
        Math.random(),
        Math.random()
      );
      colorMap.set(i, `#${color.getHexString()}`);
    }
    return colorMap;
  });

  const getLabelFromVector = (v: THREE.Vector3): string => {
    return `(${v.x.toFixed(1)}, ${v.y.toFixed(1)}, ${v.z.toFixed(1)})`;
  };

  return (
    <>
      <RobotSelector
        robotCount={robotCount}
        robotColors={robotColor}
        selectedRobots={selectedRobots}
        setSelectedRobots={setSelectedRobots}
      />
      <Scripts
        robotInstruction={robotInstruction}
        setRobotInstruction={setRobotInstruction}
        robotState={robotState}
        setRobotState={setRobotState}
        recentlyUpdatedRobots={recentlyUpdatedRobots}
        setRecentlyUpdatedRobots={setRecentlyUpdatedRobots}
        getLabelFromVector={getLabelFromVector}
        selectedRobots={selectedRobots}
        robotColor={robotColor}
        setNavMesh={setNavMesh}
        setRobotArray={setRobotArray}
      />
      <RobotUIPanel
        robotInstruction={robotInstruction}
        robotState={robotState}
        recentlyUpdatedRobots={recentlyUpdatedRobots}
        onClear={(id) => {
          robotInstruction.delete(id);
          setRobotInstruction(new Map(robotInstruction));
          recentlyUpdatedRobots.delete(id);
          setRecentlyUpdatedRobots(new Set(recentlyUpdatedRobots));
        }}
        getLabelFromVector={getLabelFromVector}
      />

      <NavButtons
        robotInstruction={robotInstruction}
        setRobotInstruction={setRobotInstruction}
        recentlyUpdatedRobots={recentlyUpdatedRobots}
        setRecentlyUpdatedRobots={setRecentlyUpdatedRobots}
        selectedRobots={selectedRobots}
      />
      {navMesh && (
        <StartPathsButton
          robotInstruction={robotInstruction}
          setRobotInstruction={setRobotInstruction}
          recentlyUpdatedRobots={recentlyUpdatedRobots}
          setRecentlyUpdatedRobots={setRecentlyUpdatedRobots}
          robotArray={robotArray}
          navMesh={navMesh}
        />
      )}
    </>
  );
}

export default App;
