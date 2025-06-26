import React from "react";

interface RobotSelectorProps {
  robotCount: number;
  robotColors: Map<number, string>;
  selectedRobots: Set<number>;
  setSelectedRobots: React.Dispatch<React.SetStateAction<Set<number>>>;
}

const RobotSelector: React.FC<RobotSelectorProps> = ({
  robotCount,
  robotColors,
  selectedRobots,
  setSelectedRobots,
}) => {
  // Checkbox change toggles set membership
  const onToggle = (id: number, checked: boolean) => {
    setSelectedRobots((prev) => {
      const updated = new Set(prev);
      if (checked) updated.add(id);
      else updated.delete(id);
      return updated;
    });
  };

  // Reset all
  const resetSelection = () => {
    setSelectedRobots(new Set());
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 20,
        left: 20,
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
        1. Select Robot(s)
      </p>
      {Array.from({ length: robotCount }, (_, i) => {
        const labelColor = robotColors.get(i) || "#000";
        return (
          <div key={i} style={{ marginTop: 8 }}>
            <input
              type="checkbox"
              id={`robot-${i}`}
              checked={selectedRobots.has(i)}
              onChange={(e) => onToggle(i, e.target.checked)}
            />
            <label
              htmlFor={`robot-${i}`}
              style={{
                marginLeft: 8,
                color: labelColor,
              }}
            >
              Robot {i + 1}
            </label>
          </div>
        );
      })}
      <button
        style={{
          marginTop: 12,
          fontSize: "12px",
          display: "block",
        }}
        onClick={resetSelection}
      >
        Reset Selection
      </button>
    </div>
  );
};

export default RobotSelector;
