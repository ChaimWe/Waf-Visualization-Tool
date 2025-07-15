import React, { useState, useMemo, useRef } from 'react';
import { Box, useTheme, Stack, Button, Drawer, ToggleButton, ToggleButtonGroup, Paper, Typography } from '@mui/material';
import Topbar from '../components/Topbar';
import { useDataSource } from '../context/DataSourceContext';
import FlowChart from '../components/tree/FlowChart';
import RuleDetailsSidebar from '../components/WAFView/RuleDetailsSidebar';
import InspectorView from '../components/WAFView/InspectorView';
import RuleTransformer from '../components/tree/RuleTransformer';
import BugReportIcon from '@mui/icons-material/BugReport';

export default function ExplorerPage() {
  const theme = useTheme();
  const [viewMode, setViewMode] = useState('tree');
  const [drawerWidth, setDrawerWidth] = useState(500);
  const drawerRef = useRef();
  const isResizing = useRef(false);

  React.useEffect(() => {
    if (viewMode !== 'tree' && viewMode !== 'inspector') {
      setViewMode('tree');
    }
  }, [viewMode]);

  // Mouse event handlers for resizing
  const handleMouseDown = (e) => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
  };
  const handleMouseMove = (e) => {
    if (!isResizing.current) return;
    const newWidth = Math.min(800, Math.max(350, window.innerWidth - e.clientX));
    setDrawerWidth(newWidth);
  };
  const handleMouseUp = () => {
    isResizing.current = false;
    document.body.style.cursor = '';
  };
  React.useEffect(() => {
    if (!isResizing.current) return;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  });

  const { aclData, albData, setAclData, setAlbData, clearAclData, clearAlbData } = useDataSource();
  const [selectedNode, setSelectedNode] = useState(null);
  const [ruleSet, setRuleSet] = useState('acl'); // 'acl' or 'alb'
  const [nodesPerRow, setNodesPerRow] = useState(8);
  const [orderBy, setOrderBy] = useState('dependency');

  // Select rules based on ruleSet
  const rules = useMemo(() => {
    if (ruleSet === 'acl') return aclData?.Rules || [];
    if (ruleSet === 'alb') return albData?.Rules || [];
    return [];
  }, [ruleSet, aclData, albData]);

  // Use RuleTransformer to process rules into nodes/edges
  const transformed = useMemo(() => {
    if (!rules.length) return { nodes: [], edges: [] };
    if (ruleSet === 'acl') {
      const transformer = new RuleTransformer(rules);
      return transformer.transformRules() || { nodes: [], edges: [] };
    } else if (ruleSet === 'alb') {
      // Minimal ALB node transformation: treat each ALB rule as a node
      const nodes = rules.map((rule, idx) => ({
        id: rule.Name || rule.name || rule.Id || String(idx),
        type: 'custom-node',
        data: {
          ...rule,
          name: rule.Name || rule.name || rule.Id || `ALB Rule ${idx + 1}`,
          priority: rule.Priority || rule.priority || idx + 1,
          action: rule.Actions ? (rule.Actions[0]?.Type || 'Unknown') : (rule.action || ''),
          borderColor: 'orange', // Add this for ALB nodes
        },
      }));
      // --- Dependency Edges ---
      const edges = [];
      // Priority order: edge from lower-numbered (higher priority) to higher-numbered
      for (let i = 0; i < rules.length; ++i) {
        const ruleA = rules[i];
        const idA = ruleA.Name || ruleA.name || ruleA.Id || String(i);
        const prioA = ruleA.Priority || ruleA.priority || i + 1;
        // Shared resources: target groups
        const tgA = (ruleA.TargetGroupArns || ruleA.targetGroups || []).map(tg => tg.TargetGroupArn || tg.Name || tg.Id || tg);
        for (let j = 0; j < rules.length; ++j) {
          if (i === j) continue;
          const ruleB = rules[j];
          const idB = ruleB.Name || ruleB.name || ruleB.Id || String(j);
          const prioB = ruleB.Priority || ruleB.priority || j + 1;
          // Priority: if A is higher priority (lower number) and B is lower
          if (prioA < prioB) {
            edges.push({ id: `edge-priority-${idA}-${idB}`, source: idA, target: idB, type: 'custom', label: 'priority' });
          }
          // Shared target group
          const tgB = (ruleB.TargetGroupArns || ruleB.targetGroups || []).map(tg => tg.TargetGroupArn || tg.Name || tg.Id || tg);
          if (tgA.length && tgB.length && tgA.some(tg => tgB.includes(tg))) {
            edges.push({ id: `edge-tg-${idA}-${idB}`, source: idA, target: idB, type: 'custom', label: 'shared target' });
          }
          // Sequential: if priorities are consecutive
          if (prioA + 1 === prioB) {
            edges.push({ id: `edge-seq-${idA}-${idB}`, source: idA, target: idB, type: 'custom', label: 'sequential' });
          }
        }
      }
      return { nodes, edges };
    }
    return { nodes: [], edges: [] };
  }, [rules, ruleSet]);

  // Handler for node selection in tree mode
  const handleNodeSelect = (nodeId) => {
    const found = rules.find(r => (r.Name || r.name) === nodeId);
    setSelectedNode(found || null);
  };

  // Handler to close inspector drawer
  const handleCloseInspector = () => setSelectedNode(null);

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: '100vh',
        p: 0,
        m: 0,
        position: 'relative',
        fontFamily: 'Poppins, sans-serif',
        pt: 0,
        background: theme.palette.mode === 'dark'
          ? 'linear-gradient(rgba(34,34,34,0.95), rgba(34, 34, 34, 0.95))'
          : theme.palette.background.default,
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
      }}
    >
      <Topbar
        viewMode={viewMode}
        setViewMode={setViewMode}
        ruleSet={ruleSet}
        setRuleSet={setRuleSet}
        clearAclData={clearAclData}
        clearAlbData={clearAlbData}
        aclData={aclData}
        albData={albData}
        setAclData={setAclData}
        setAlbData={setAlbData}
      />
      <Paper elevation={3} sx={{
        width: '100%',
        mx: 0,
        mt: 0,
        pt: 0,
        p: 3, // internal padding
        borderRadius: 4,
        mb: 3,
        boxSizing: 'border-box',
        background: theme.palette.background.paper,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        flexShrink: 0,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <BugReportIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            WAF Rule Explorer
          </Typography>
        </Box>
        {/* Control bar for toggles */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0, pt: 0, mb: 0, ml: 2 }}>
          <ToggleButtonGroup
            value={ruleSet}
            exclusive
            onChange={(_, v) => v && setRuleSet(v)}
            size="small"
            sx={{ mr: 2 }}
          >
            <ToggleButton value="acl">ACL</ToggleButton>
            <ToggleButton value="alb">ALB</ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, v) => v && setViewMode(v)}
            size="small"
          >
            <ToggleButton value="tree">Tree View</ToggleButton>
            <ToggleButton value="inspector">Inspector View</ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup
            value={nodesPerRow}
            exclusive
            onChange={(_, v) => v && setNodesPerRow(v)}
            size="small"
          >
            <ToggleButton value={8}>8 / row</ToggleButton>
            <ToggleButton value={16}>16 / row</ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup
            value={orderBy}
            exclusive
            onChange={(_, v) => v && setOrderBy(v)}
            size="small"
          >
            <ToggleButton value="dependency">Order: Dependency</ToggleButton>
            <ToggleButton value="number">Order: Number</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Paper>
      <Box sx={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'row',
        p: 0,
        transition: 'width 0.3s, margin-right 0.3s',
        ...(selectedNode ? { marginRight: `${drawerWidth}px` } : { marginRight: 0 }),
      }}>
        <Box sx={{
          flex: 1,
          minWidth: 0,
          height: '100%',
          p: 0,
          m: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
        }}>
          {/* Empty State for First-Time Users */}
          {rules.length === 0 ? (
            <Box sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              p: 4,
              background: theme.palette.background.default,
              borderRadius: 3,
              boxShadow: 0,
            }}>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                Welcome to the WAF Rule Explorer!
              </Typography>
              <Typography variant="body1" color="text.secondary" align="center" sx={{ maxWidth: 480 }}>
                To get started, connect your AWS account, upload a WAF/ALB JSON file, or explore with sample data.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                <Button variant="contained" color="primary" size="large" onClick={() => {
                  // Open AWS login dialog if available in Topbar or context
                  const awsBtn = document.querySelector('[data-aws-login-btn]');
                  if (awsBtn) awsBtn.click();
                }}>
                  Connect AWS
                </Button>
                <Button variant="outlined" color="primary" size="large" onClick={() => {
                  // Open upload JSON dialog if available in Topbar or context
                  const uploadBtn = document.querySelector('[data-upload-json-btn]');
                  if (uploadBtn) uploadBtn.click();
                }}>
                  Upload JSON
                </Button>
                <Button variant="outlined" color="secondary" size="large" onClick={() => {
                  // Load sample data (example: setAclData with a sample object)
                  if (setAclData) {
                    setAclData({
                      Rules: [
                        { Name: 'SampleRule1', Priority: 1, Action: { Allow: {} }, Statement: { ByteMatchStatement: {} } },
                        { Name: 'SampleRule2', Priority: 2, Action: { Block: {} }, Statement: { IPSetReferenceStatement: {} } }
                      ]
                    });
                  }
                }}>
                  Load Sample Data
                </Button>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
                Need help? <a href="https://github.com/ChaimWe/AppsFlyerProject#readme" target="_blank" rel="noopener noreferrer">Read the Quickstart Guide</a>
              </Typography>
            </Box>
          ) : viewMode === 'tree' ? (
            <FlowChart
              allNodes={transformed.nodes}
              allEdges={transformed.edges}
              selectedNode={selectedNode ? (selectedNode.Name || selectedNode.name) : null}
              setSelectedNode={handleNodeSelect}
              nodesPerRow={nodesPerRow}
              orderBy={orderBy}
            />
          ) : (
            <Box sx={{ width: '100%', height: '100%', flex: 1, minHeight: 0, minWidth: 0, overflow: 'auto' }}>
              <InspectorView rules={rules} showSubgraph={true} />
            </Box>
          )}
        </Box>
      </Box>
      {/* Drawer overlays the entire app, not just the canvas */}
      <Drawer
        anchor="right"
        open={!!selectedNode}
        onClose={handleCloseInspector}
        variant="temporary"
        hideBackdrop={false}
        PaperProps={{
          sx: {
            width: drawerWidth,
            minWidth: 350,
            maxWidth: 800,
            p: 0,
            boxShadow: 6,
            top: 0,
            height: '100vh',
            position: 'fixed',
            right: 0,
            left: 'auto',
            margin: 0,
            borderLeft: '1px solid #ddd',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 2001 // ensure Drawer overlays Topbar
          },
          ref: drawerRef
        }}
      >
        {/* Resizer handle */}
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 8,
            height: '100%',
            cursor: 'col-resize',
            zIndex: 1400,
            background: 'transparent',
            '&:hover': { background: 'rgba(25,118,210,0.08)' }
          }}
          onMouseDown={handleMouseDown}
        />
        {selectedNode && (
          <RuleDetailsSidebar rule={selectedNode} rules={rules} onClose={handleCloseInspector} />
        )}
      </Drawer>
    </Box>
  );
} 