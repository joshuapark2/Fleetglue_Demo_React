// src/components/RobotUIPanel.tsx
import React from "react";

interface RobotUIPanelProps {
  robotInstruction: Map<number, THREE.Vector3[]>;
  robotState: Map<number, string>;
  recentlyUpdatedRobots: Set<number>;
  onClear: (id: number) => void;
  getLabelFromVector: (v: THREE.Vector3) => string;
}

const RobotUIPanel: React.FC<RobotUIPanelProps> = ({
  robotInstruction,
  robotState,
  recentlyUpdatedRobots,
  onClear,
  getLabelFromVector,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        right: "20px",
        top: "20px",
        width: "250px",
        maxHeight: "800px",
        overflowY: "auto",
        backgroundColor: "#f0f0f0",
        border: "1px solid #ccc",
        padding: "10px",
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        zIndex: 10,
      }}
    >
      <h3>Robot Instructions</h3>
      {robotInstruction.size === 0 ? (
        <p>No instructions assigned.</p>
      ) : (
        Array.from(robotInstruction.entries()).map(([id, waypoints]) => (
          <div key={id} style={{ marginBottom: "1em" }}>
            <h4
              style={{
                marginLeft: "10px",
                backgroundColor: recentlyUpdatedRobots.has(id)
                  ? "#f1c40f"
                  : undefined,
              }}
            >
              Robot {id + 1} ({robotState.get(id)})
            </h4>
            <button onClick={() => onClear(id)} style={{ marginLeft: "10px" }}>
              Clear
            </button>
            <ul>
              {waypoints.map((point, index) => (
                <li key={index}>{getLabelFromVector(point)}</li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
};

export default RobotUIPanel;
