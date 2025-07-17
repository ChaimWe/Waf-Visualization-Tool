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

  // Set edge color for WAF interlinked view
  let edgeColor = '#ff9800';
  if (data?.targetAction === 'Block') {
    edgeColor = '#d32f2f';
  }

  return (
    <>
      {/* Edge path with dynamic style (dashed, color, etc.) */}
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ ...style, stroke: edgeColor, strokeWidth: 3 }} />
      {/* EdgeLabelRenderer removed: no labels shown */}
    </>
  );
};

export default CustomPolylineEdge; 