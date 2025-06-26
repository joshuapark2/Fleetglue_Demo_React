import React from "react";
import * as THREE from "three";

interface NavButtonsProps {
  robotInstruction: Map<number, THREE.Vector3[]>;
  setRobotInstruction: React.Dispatch<
    React.SetStateAction<Map<number, THREE.Vector3[]>>
  >;
  recentlyUpdatedRobots: Set<number>;
  setRecentlyUpdatedRobots: React.Dispatch<React.SetStateAction<Set<number>>>;
  selectedRobots: Set<number>;
}

const navTargets = [
  { label: "Go to Assembly", top: 70, target: new THREE.Vector3(0, 0.2, -3) },
  { label: "Go to Packaging", top: 100, target: new THREE.Vector3(3, 0.2, -3) },
  { label: "Go to Storage", top: 130, target: new THREE.Vector3(3, 0.2, -1) },
  {
    label: "Go to Conveyor Belt",
    top: 160,
    target: new THREE.Vector3(0, 0.2, -1),
  },
  { label: "Go to Testing", top: 190, target: new THREE.Vector3(1.5, 0.2, -2) },
];

const NavButtons: React.FC<NavButtonsProps> = ({
  robotInstruction,
  setRobotInstruction,
  recentlyUpdatedRobots,
  setRecentlyUpdatedRobots,
  selectedRobots,
}) => {
  const handleClick = (target: THREE.Vector3) => {
    const updatedInstructions = new Map(robotInstruction);
    const updatedRecently = new Set(recentlyUpdatedRobots);

    for (const id of selectedRobots) {
      if (!updatedInstructions.has(id)) {
        updatedInstructions.set(id, []);
      }
      updatedInstructions.get(id)!.push(target.clone());
      updatedRecently.add(id);
    }

    setRobotInstruction(updatedInstructions);
    setRecentlyUpdatedRobots(updatedRecently);
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 20,
        left: 180,
        backgroundColor: "#f0f0f0",
        padding: "10px",
        borderRadius: "4px",
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: "Arial, sans-serif",
          fontSize: "16px",
        }}
      >
        2. Select Instructions
      </p>
      {navTargets.map(({ label, top, target }) => (
        <button
          key={label}
          style={{ display: "block", marginTop: 8 }}
          onClick={() => handleClick(target)}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

export default NavButtons;
