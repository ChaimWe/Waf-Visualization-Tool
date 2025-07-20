import React, { useState, useEffect, useCallback, forwardRef, useMemo } from 'react';
import ReactFlow, {
    Controls,
    useReactFlow,
    ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import CustomNode from './CustomNode';
import { useThemeContext } from '../../context/ThemeContext';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import CustomPolylineEdge from './CustomPolylineEdge';
import { Box, IconButton, Tooltip, Button, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ClickAwayListener from '@mui/material/ClickAwayListener';

// Move nodeTypes and edgeTypes outside the component to avoid React Flow warning
const nodeTypes = { 'custom-node': CustomNode };
const edgeTypes = { custom: CustomPolylineEdge };

// Defensive helper for positions
function safeNumber(val) {
  return typeof val === 'number' && !isNaN(val) ? val : 0;
}

// Helper to assign color based on parent/child
function getNodeColor(node) {
  const isParent = node.data?.isParent;
  const isChild = node.data?.isChild;
  if (isParent && isChild) return 'light blue';
  if (isParent) return 'blue';
  if (isChild) return 'green';
  return 'gray';
}

// Ported row-based, group-and-center hierarchical layout from original frontend
function hierarchicalLayout(nodes, edges, nodesPerRow = 8) {
    if (!nodes.length) return [];
    // Identify node types
    const allNodeIds = new Set(nodes.map(n => n.id));
    const childIds = new Set();
    const parentIds = new Set();
    edges.forEach(e => {
        childIds.add(e.target);
        parentIds.add(e.source);
    });
    const grayNodes = nodes.filter(n => !parentIds.has(n.id) && !childIds.has(n.id));
    const rootNodes = nodes.filter(n => !childIds.has(n.id) && parentIds.has(n.id));
    const nonRootNodes = nodes.filter(n => childIds.has(n.id) && parentIds.has(n.id));
    const leafNodes = nodes.filter(n => childIds.has(n.id) && !parentIds.has(n.id));
    // Layout params
    const maxPerRow = nodesPerRow;
    const rowGap = 120;
    const groupGap = 180; // extra space between groups
    const horizontalSpacing = 120;
    const centerX = 0;
    let y = 0;
    let positioned = [];
    // Helper to center a row
    function centerRow(row, y) {
        const rowWidth = (row.length - 1) * horizontalSpacing;
        const rowStartX = centerX - rowWidth / 2;
        return row.map((node, i) => ({
            ...node,
            position: { x: rowStartX + i * horizontalSpacing, y }
        }));
    }
    // Place gray nodes in the first row(s)
    let rowNodes = grayNodes.slice();
    while (rowNodes.length > 0) {
        const count = Math.min(rowNodes.length, maxPerRow);
        const row = rowNodes.slice(0, count);
        positioned.push(...centerRow(row, y));
        y += rowGap;
        rowNodes = rowNodes.slice(count);
    }
    if (grayNodes.length > 0) y += groupGap - rowGap;
    // Place root nodes in the next row(s)
    rowNodes = rootNodes.slice();
    while (rowNodes.length > 0) {
        const count = Math.min(rowNodes.length, maxPerRow);
        const row = rowNodes.slice(0, count);
        positioned.push(...centerRow(row, y));
        y += rowGap;
        rowNodes = rowNodes.slice(count);
    }
    if (rootNodes.length > 0) y += groupGap - rowGap;
    // Place non-root (teal) nodes in the next row(s)
    rowNodes = nonRootNodes.slice();
    while (rowNodes.length > 0) {
        const count = Math.min(rowNodes.length, maxPerRow);
        const row = rowNodes.slice(0, count);
        positioned.push(...centerRow(row, y));
        y += rowGap;
        rowNodes = rowNodes.slice(count);
    }
    if (nonRootNodes.length > 0) y += groupGap - rowGap;
    // Place leaf (green) nodes in the last row(s)
    rowNodes = leafNodes.slice();
    while (rowNodes.length > 0) {
        const count = Math.min(rowNodes.length, maxPerRow);
        const row = rowNodes.slice(0, count);
        positioned.push(...centerRow(row, y));
        y += rowGap;
        rowNodes = rowNodes.slice(count);
    }
    return positioned;
}

const FlowChartInner = forwardRef(({
    allNodes,
    allEdges,
    selectedNode,
    setSelectedNode,
    searchTerm,
    showArrows,
    nodesPerRow,
    orderBy,
    albMode, // Added albMode prop
}, ref) => {
    const [hoveredNode, setHoveredNode] = useState(null);
    const [showHelp, setShowHelp] = useState(false);
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [highlightedEdges, setHighlightedEdges] = useState(new Set());
    const [blurredNodes, setBlurredNodes] = useState(new Set());
    const [doubleClickedNode, setDoubleClickedNode] = useState(null);
    const [connectedNodeIds, setConnectedNodeIds] = useState(new Set());
    const [isInitialized, setIsInitialized] = useState(false);
    const [visibleEdges, setVisibleEdges] = useState(new Set());
    const { darkTheme } = useThemeContext();
    const reactFlowInstance = useReactFlow();
    const [isLocked, setIsLocked] = useState(false);

    // --- BEGIN PORTED TREE LOGIC FROM OLD FLOWCHART ---
    // Dependency grouping and fallback edge logic
    const colorOrder = ['gray', 'blue', 'light blue', 'green'];
    const preprocessedNodes = useMemo(() => {
        if (!allNodes) return [];
        const parentIds = new Set((allEdges || []).map(e => e.source));
        const childIds = new Set((allEdges || []).map(e => e.target));
        return allNodes.map(n => ({
            ...n,
            data: {
                ...n.data,
                isParent: parentIds.has(n.id),
                isChild: childIds.has(n.id),
            }
        }));
    }, [allNodes, allEdges]);

    const sortedNodes = useMemo(() => {
        if (!preprocessedNodes) return [];
        let nodesCopy = [...preprocessedNodes];
        if (orderBy === 'number') {
            // Sort by priority/number
            nodesCopy.sort((a, b) => {
                const aNum = a.data.Priority ?? a.data.priority ?? parseInt(a.id, 10) ?? 0;
                const bNum = b.data.Priority ?? b.data.priority ?? parseInt(b.id, 10) ?? 0;
                return aNum - bNum;
            });
        } else if (orderBy === 'dependency') {
            // Group nodes by color/type for dependency sort
            nodesCopy = nodesCopy.map(n => ({
                ...n,
                data: {
                    ...n.data,
                    color: getNodeColor(n)
                }
            }));
            const colorGroups = {
                gray: [],
                blue: [],
                'light blue': [],
                green: [],
            };
            nodesCopy.forEach(n => {
                const color = (n.data.color || '').toLowerCase();
                if (colorGroups[color]) colorGroups[color].push(n);
                else colorGroups.gray.push(n);
            });
            // Flatten in color order
            nodesCopy = colorOrder.flatMap(color => colorGroups[color]);
        }
        return nodesCopy;
    }, [preprocessedNodes, orderBy]);

    // Move filteredEdges above positionedNodes
    const filteredEdges = useMemo(() => {
        const nodeIds = new Set(preprocessedNodes.map(n => n.id));
        const valid = (allEdges || []).filter(e => e.source && e.target && nodeIds.has(e.source) && nodeIds.has(e.target));
        // Remove fallback: do not generate artificial edges if there are no real edges
        // Only return real edges
        return valid.map(e => ({ ...e, type: 'custom' }));
    }, [allEdges, preprocessedNodes]);

    // --- Add top margin to hierarchical layout ---
    const TOP_MARGIN = 60;
    // --- DEBUG: Log nodes and edges ---
    // React.useEffect(() => {
    //   if (allNodes && allEdges) {
    //     // Only log for non-empty arrays
    //     if (allNodes.length > 0 || allEdges.length > 0) {
    //       // eslint-disable-next-line no-console
    //       // console.log('[FlowChart] nodes:', allNodes);
    //       // eslint-disable-next-line no-console
    //       // console.log('[FlowChart] edges:', allEdges);
    //     }
    //   }
    // }, [allNodes, allEdges]);

    // --- PATCH: Use provided node positions if present (for COMBINED-WAF view) ---
    const positionedNodes = useMemo(() => {
      // If all nodes have a position property, use them directly
      if (allNodes && allNodes.length > 0 && allNodes.every(n => n.position)) {
        return allNodes;
      }
      // Otherwise, use the existing layout logic
      if (orderBy === 'number') {
        const GRID_SIZE = 180;
        return sortedNodes.map((node, index) => {
          const row = Math.floor(index / nodesPerRow);
          const col = index % nodesPerRow;
          return {
            ...node,
            position: { x: col * GRID_SIZE, y: row * GRID_SIZE + TOP_MARGIN },
          };
        });
      } else if (orderBy === 'dependency') {
        // Use enhanced hierarchical layout for dependency order
        const nodesWithLayout = hierarchicalLayout(sortedNodes, filteredEdges, nodesPerRow);
        return nodesWithLayout.map(n => ({
          ...n,
          position: { x: n.position.x, y: n.position.y + TOP_MARGIN }
        }));
      } else {
        return sortedNodes;
      }
    }, [allNodes, sortedNodes, orderBy, nodesPerRow, filteredEdges]);

    // Add debugging for edge visibility
    useEffect(() => {
        
    }, [showArrows, filteredEdges.length, selectedNode, filteredEdges, positionedNodes]);
    // --- END PORTED TREE LOGIC ---

    // Remove initializeData and related useEffect
    useEffect(() => {
        if (!sortedNodes?.length) {
            setNodes([]);
            setEdges([]);
            setHighlightedEdges(new Set());
            setBlurredNodes(new Set());
            setConnectedNodeIds(new Set());
            return;
        }
        
        // TEMPORARY DEBUG: Force show all edges for debugging
        const DEBUG_FORCE_SHOW_EDGES = true;
        let edgesToUse = filteredEdges;
        
        // Add a test edge if we have at least 2 nodes and no edges
        if (edgesToUse.length === 0 && positionedNodes.length >= 2) {
            edgesToUse = [{
                id: 'test-edge',
                source: positionedNodes[0].id,
                target: positionedNodes[1].id,
                type: 'custom'
            }];
        }
        
        setNodes(sortedNodes);
        setEdges(edgesToUse);
        if (reactFlowInstance && sortedNodes.length > 0) {
            setTimeout(() => {
                try {
                    reactFlowInstance.fitView({ padding: 0.1, includeHiddenNodes: true });
                } catch (e) { /* ignore */ }
            }, 100);
        }
    }, [sortedNodes, filteredEdges, reactFlowInstance, positionedNodes]);

    useEffect(() => {
        if (!isInitialized) return;
        if (!searchTerm) {
            setBlurredNodes(new Set());
            return;
        }
        const lowerSearch = searchTerm.toLowerCase();
        const nodesToBlur = new Set(
            sortedNodes.filter(node => !JSON.stringify(node.data).toLowerCase().includes(lowerSearch))
                    .map(node => node.id)
        );
        setBlurredNodes(nodesToBlur);
    }, [searchTerm, sortedNodes, isInitialized]);

    const connectedNode = useCallback((id) => {
        const connectedEdges = filteredEdges.filter(edge =>
            edge.source === id || edge.target === id
        );
        setHighlightedEdges(new Set(connectedEdges.map(edge => edge.id)));
    }, [filteredEdges]);

    const getDirectlyConnectedNodeIds = useCallback((nodeId) => {
        const connected = new Set();
        filteredEdges.forEach(edge => {
            if (edge.source === nodeId) connected.add(edge.target);
            if (edge.target === nodeId) connected.add(edge.source);
        });
        return connected;
    }, [filteredEdges]);

    const onNodeMouseEnter = useCallback((_, node) => {
        if (!selectedNode && !doubleClickedNode) {
            connectedNode(node.id);
        }
    }, [selectedNode, doubleClickedNode, connectedNode]);

    const onNodeMouseLeave = useCallback(() => {
        if (!selectedNode && !doubleClickedNode) {
            setHighlightedEdges(new Set());
        }
    }, [selectedNode, doubleClickedNode]);

    const onNodeClick = useCallback((_, node) => {
        if (selectedNode === node.id) {
            setSelectedNode(null);
            setHighlightedEdges(new Set());
            setConnectedNodeIds(new Set());
        } else {
            setSelectedNode(node.id);
            const connectedIds = getDirectlyConnectedNodeIds(node.id);
            setConnectedNodeIds(connectedIds);
            if (!showArrows) {
                const connectedEdges = filteredEdges.filter(edge =>
                    edge.source === node.id || edge.target === node.id
                );
                setVisibleEdges(new Set(connectedEdges.map(edge => edge.id)));
            }
            connectedNode(node.id);
        }
    }, [selectedNode, setSelectedNode, getDirectlyConnectedNodeIds, connectedNode, filteredEdges, showArrows]);

    const findUpwardDependencies = useCallback((nodeId, visited = new Set()) => {
        if (visited.has(nodeId)) return visited;
        visited.add(nodeId);
        filteredEdges.filter(e => e.target === nodeId).forEach(e => findUpwardDependencies(e.source, visited));
        return visited;
    }, [filteredEdges]);

    const findDownwardDependencies = useCallback((nodeId, visited = new Set()) => {
        if (visited.has(nodeId)) return visited;
        visited.add(nodeId);
        filteredEdges.filter(e => e.source === nodeId).forEach(e => findDownwardDependencies(e.target, visited));
        return visited;
    }, [filteredEdges]);

    const onNodeDoubleClick = useCallback((_, node) => {
        if (doubleClickedNode === node.id) {
            setDoubleClickedNode(null);
            setBlurredNodes(new Set());
            setHighlightedEdges(new Set());
        } else {
            const upward = findUpwardDependencies(node.id);
            const downward = findDownwardDependencies(node.id);
            const relatedNodes = new Set([...upward, ...downward, node.id]);
            const blurred = new Set(nodes.map(n => n.id).filter(id => !relatedNodes.has(id)));
            const relatedEdges = filteredEdges.filter(edge => {
                const isUpwardEdge = edge.target === node.id && upward.has(edge.source);
                const isDownwardEdge = edge.source === node.id && downward.has(edge.target);
                const parentToParent = upward.has(edge.source) && upward.has(edge.target) &&
                    findUpwardDependencies(edge.target).has(edge.source);
                const childToChild = downward.has(edge.source) && downward.has(edge.target) &&
                    findDownwardDependencies(edge.source).has(edge.target);
                return isUpwardEdge || isDownwardEdge || parentToParent || childToChild;
            });
            setDoubleClickedNode(node.id);
            setBlurredNodes(blurred);
            setHighlightedEdges(new Set(relatedEdges.map(e => e.id)));
        }
        setSelectedNode(node.id);
    }, [doubleClickedNode, nodes, filteredEdges, findUpwardDependencies, findDownwardDependencies, setSelectedNode]);

    const onInit = useCallback((instance) => {
        // No-op for now
    }, []);

    // Use layoutNodes to position nodes
    const positionedNodesWithOffset = useMemo(() => {
        const posMap = new Map();
        return positionedNodes.map(n => {
            let x = safeNumber(n.position?.x);
            let y = safeNumber(n.position?.y);
            const key = `${x},${y}`;
            if (posMap.has(key)) {
                const count = posMap.get(key) + 1;
                posMap.set(key, count);
                return {
                    ...n,
                    position: {
                        x: x + Math.random() * 10 * count,
                        y: y + Math.random() * 10 * count
                    }
                };
            } else {
                posMap.set(key, 1);
                return {
                    ...n,
                    position: { x, y }
                };
            }
        });
    }, [positionedNodes]);

    // Compute highlight/fade sets and fade strength
    const highlightSet = useMemo(() => {
      if (!hoveredNode && !selectedNode) return null;
      const focusId = selectedNode || hoveredNode; // prioritize click
      const set = new Set([focusId]);
      filteredEdges.forEach(edge => {
        if (edge.source === focusId) set.add(edge.target);
        if (edge.target === focusId) set.add(edge.source);
      });
      return set;
    }, [hoveredNode, selectedNode, filteredEdges]);

    // Determine fade strength
    const fadeStrength = selectedNode ? 'strong' : hoveredNode ? 'mild' : null;
    const nodeFade = fadeStrength === 'strong' ? 0.1 : fadeStrength === 'mild' ? 0.4 : 1;
    const edgeFade = fadeStrength === 'strong' ? 0.01 : fadeStrength === 'mild' ? 0.15 : 0.5;


    // --- Export handlers ---
    const handleExportPdf = useCallback((afterExportCallback) => {
        const flowElement = document.querySelector('.react-flow');
        if (!flowElement) {
            if (afterExportCallback) afterExportCallback();
            return;
        }
        setTimeout(() => {
            const rect = flowElement.getBoundingClientRect();
            html2canvas(flowElement, {
                backgroundColor: '#fff',
                useCORS: true,
                scale: 8,
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                scrollX: -window.scrollX,
                scrollY: -window.scrollY,
                onclone: (clonedDoc) => {},
            }).then(canvas => {
                const ctx = canvas.getContext('2d');
                if (ctx) ctx.imageSmoothingEnabled = false;
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({
                    orientation: rect.width > rect.height ? 'landscape' : 'portrait',
                    unit: 'px',
                    format: [Math.round(rect.width), Math.round(rect.height)]
                });
                pdf.addImage(imgData, 'PNG', 0, 0, rect.width, rect.height);
                pdf.save('waf-graph.pdf');
                if (afterExportCallback) afterExportCallback();
            }).catch(err => {
                if (afterExportCallback) afterExportCallback();
            });
        }, 100);
    }, []);

    React.useImperativeHandle(ref, () => ({
        handleExportPdf,
    }));

    const flowStyles = useMemo(() => ({
        backgroundColor: 'transparent',
    }), []);

    if ((!sortedNodes || sortedNodes.length === 0) && (!positionedNodesWithOffset || positionedNodesWithOffset.length === 0)) {
        return <div style={{ color: '#aaa', padding: 20 }}>No nodes to display. Please load or add rules to see the flowchart.</div>;
    }

    // Export handler
    const handleExport = async () => {
        const chart = document.getElementById('flowchart-container');
        if (!chart) return;
        const canvas = await html2canvas(chart, { backgroundColor: null });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height] });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save('tree-view-export.pdf');
    };


    // Pass isFaded and highlighted to nodes/edges
    const nodesWithStyles = positionedNodesWithOffset.map(node => {
      let opacity = 1;
      if (highlightSet) {
        opacity = highlightSet.has(node.id) ? 1 : nodeFade;
      }
      return {
        ...node,
        style: { ...(node.style || {}), opacity, transition: 'opacity 0.2s' },
        selected: selectedNode === node.id,
      };
    });

    // --- Edge style: use edgeType and style for custom appearance ---
    const edgesWithStyles = filteredEdges.map(edge => {
      // Default style
      let opacity = 0.5;
      let strokeWidth = 3;
      let stroke = '#1976d2';
      let strokeDasharray = undefined;
      // Use edge.style if provided (from AlbAclPage)
      if (edge.style) {
        strokeDasharray = edge.style.strokeDasharray;
        if (edge.style.stroke) stroke = edge.style.stroke;
      }
      // Highlight logic
      if (highlightSet) {
        if (highlightSet.has(edge.source) && highlightSet.has(edge.target)) {
          opacity = 1;
          strokeWidth = 3;
        } else {
          opacity = edgeFade;
          strokeWidth = 1;
          stroke = '#e0e0e0';
        }
      }
      return {
        ...edge,
        style: { stroke, strokeWidth, opacity, strokeDasharray, transition: 'opacity 0.2s, stroke-width 0.2s' },
        markerEnd: undefined,
        type: 'custom',
        data: { ...edge.data, label: edge.label }, // Ensure label is passed
      };
    });

    return (
        <Box sx={{ width: '100%', height: '100%', position: 'relative', flex: 1, minHeight: 600 }}>
            {/* Controls: Sorting, Nodes/Row, Export, Help */}
            <Box sx={{ position: 'absolute', top: 8, left: 8, zIndex: 10, display: 'flex', gap: 2 }}>
                {/* Removed ToggleButtonGroup for 'orderBy' */}
                {/* Removed ToggleButtonGroup for 'nodesPerRow' */}
                <Tooltip title="Export as PDF">
                    <IconButton onClick={handleExport} size="small">
                        <DownloadIcon />
                    </IconButton>
                </Tooltip>
                {/* Help / Legend Button */}
                <Tooltip title="Help / Legend">
                    <IconButton onClick={() => setShowHelp(true)} size="small">
                        <HelpOutlineIcon />
                    </IconButton>
                </Tooltip>
            </Box>
            {/* Legend/Help Dialog */}
            {showHelp && (
                <ClickAwayListener onClickAway={() => setShowHelp(false)}>
                    <Box sx={{
                        position: 'fixed',
                        top: 80,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 2002,
                        bgcolor: 'background.paper',
                        borderRadius: 2,
                        boxShadow: 6,
                        p: 3,
                        minWidth: 320,
                        maxWidth: 480,
                    }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>How to Read This View</Typography>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                          {/* Combined WAF (Interlinked) legend (shown if not albMode) */}
                          {albMode || (Array.isArray(allNodes) && allNodes.some(n => n.style && n.style.background === '#81c784')) ? (
                            <>
                              <b>ALB WAF Node Colors:</b><br/>
                              <span style={{ background: '#81c784', border: '2px solid #388e3c', padding: '2px 8px', borderRadius: 4, marginRight: 6 }}>Light Green</span>: ALB WAF Rule<br/>
                              <span style={{ background: '#a5d6a7', color: '#388e3c', fontStyle: 'italic', padding: '2px 8px', borderRadius: 4, marginRight: 6 }}>Pale Green Italic</span>: Condition/Field Match<br/>
                              <span style={{ border: '2px solid #e53935', background: '#fff', color: '#e53935', padding: '2px 8px', borderRadius: 4, marginRight: 6 }}>Red Border</span>: Block Action<br/>
                              <span style={{ background: '#fff9c4', color: '#888', padding: '2px 8px', borderRadius: 4, marginRight: 6 }}>Light Yellow</span>: Allow/Count Action<br/>
                              <span style={{ color: '#43a047', fontWeight: 600 }}>Green Edge</span>: ALB Logic<br/>
                              <span style={{ color: '#ffa726', fontWeight: 600 }}>Orange Edge</span>: Cross-layer (future)<br/>
                              <br/>
                              Click any node to see details and relationships in the inspector.<br/>
                            </>
                          ) : (
                            <>
                              <b>Combined WAF (Interlinked) Node Colors:</b><br/>
                              <span style={{ color: '#1976d2', fontWeight: 600 }}>Blue</span>: ACL rules (label logic)<br/>
                              <span style={{ color: '#43a047', fontWeight: 600 }}>Green</span>: ALB rules<br/>
                              <span style={{ color: '#d32f2f', fontWeight: 600 }}>Red</span>: Blocked action nodes/edges<br/>
                              <span style={{ color: '#e75480', fontWeight: 600, border: '2px solid #e75480', padding: '0 4px', borderRadius: 3 }}>Pink border</span>: Label-emitting rules<br/>
                              <br/>
                              <b>Edges:</b> Show label-based dependencies between rules.<br/>
                              Click any node to see details and relationships in the inspector.<br/>
                            </>
                          )}
                        </Typography>
                        <Button variant="contained" onClick={() => setShowHelp(false)} sx={{ mt: 2 }}>Close</Button>
                    </Box>
                </ClickAwayListener>
            )}
            {/* User tip for navigation */}
            <Box sx={{ position: 'absolute', bottom: 12, left: 16, zIndex: 10, bgcolor: 'rgba(255,255,255,0.85)', borderRadius: 1, px: 2, py: 0.5, fontSize: 13, color: '#333', boxShadow: 1 }}>
                Tip: Drag to move the chart. Use your mouse wheel to zoom in/out.
            </Box>
            <div id="flowchart-container" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 600, overflow: 'auto' }}>
                <ReactFlow
                    ref={ref}
                    nodes={nodesWithStyles}
                    edges={edgesWithStyles}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes} // <-- ensure custom edges are used
                    onNodeClick={onNodeClick}
                    onNodeDoubleClick={onNodeDoubleClick}
                    onNodeMouseEnter={(_, node) => setHoveredNode(node.id)}
                    onNodeMouseLeave={() => setHoveredNode(null)}
                    fitView
                    fitViewOptions={{
                        padding: 0.2,
                        includeHiddenNodes: true
                    }}
                    minZoom={0.1}
                    maxZoom={1.5}
                    defaultViewport={{ zoom: 0.8 }}
                    style={flowStyles}
                    defaultEdgeOptions={{
                        style: { stroke: '#1976d2', strokeWidth: 3, opacity: 0.5 },
                    }}
                >
                    {/* Background removed for plain/transparent look */}
                    <Controls
                        style={{
                            backgroundColor: darkTheme ? 'rgba(235, 58, 58, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                            borderColor: darkTheme ? 'rgba(243, 92, 92, 0.77)' : 'rgba(0, 0, 0, 0.1)',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        }}
                    />
                </ReactFlow>
            </div>
        </Box>
    );
});

const FlowChart = React.memo(React.forwardRef((props, ref) => (
    <ReactFlowProvider>
        <FlowChartInner {...props} ref={ref} />
    </ReactFlowProvider>
)));

export default FlowChart;