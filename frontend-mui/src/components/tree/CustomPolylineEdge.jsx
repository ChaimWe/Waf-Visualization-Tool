import React from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from 'reactflow';

const CustomPolylineEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
  markerEnd,
}) => {
  // Remove console.log statement
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      {/* Edge path with dynamic style (dashed, color, etc.) */}
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      {/* EdgeLabelRenderer removed: no labels shown */}
    </>
  );
};

export default CustomPolylineEdge; 