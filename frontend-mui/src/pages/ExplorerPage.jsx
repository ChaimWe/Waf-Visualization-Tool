import React, { useState, useMemo, useRef } from 'react';
import { Box, useTheme, Stack, Button, Drawer, ToggleButton, ToggleButtonGroup, Paper, Typography, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import Topbar from '../components/Topbar';
import { useDataSource } from '../context/DataSourceContext';
import FlowChart from '../components/tree/FlowChart';
import RuleDetailsContent from '../components/WAFView/RuleDetailsContent';
import InspectorView from '../components/WAFView/InspectorView';
import RuleTransformer from '../components/tree/RuleTransformer';
import AlbRuleTransformer from '../components/tree/AlbRuleTransformer';
import WafInterlinkedTransformer from '../components/tree/WafInterlinkedTransformer';
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
  const [ruleSet, setRuleSet] = useState('acl'); // 'acl', 'alb', or 'waf'
  const [nodesPerRow, setNodesPerRow] = useState(8);
  const [orderBy, setOrderBy] = useState('dependency');
  const [nameFilter, setNameFilter] = useState('*');
  const [actionFilter, setActionFilter] = useState('*');

  // Select rules based on ruleSet
  const rules = useMemo(() => {
    if (ruleSet === 'acl') return aclData?.Rules || [];
    if (ruleSet === 'alb') return albData?.Rules || [];
    if (ruleSet === 'waf') return []; // handled separately
    return [];
  }, [ruleSet, aclData, albData]);

  // Compute available name filter options (A-Z, 0-9, *) from current rules, case sensitive
  const nameFilterOptions = useMemo(() => {
    const allNames = (ruleSet === 'waf'
      ? [...(aclData?.Rules || []), ...(albData?.Rules || [])]
      : rules
    ).map(r => r.Name || r.name || r.Id || r.id || '');
    const initials = Array.from(new Set(allNames.map(n => n[0]).filter(Boolean)));
    initials.sort();
    return ['*', ...initials];
  }, [ruleSet, aclData, albData, rules]);

  // Compute available action filter options from current rules, case sensitive
  const actionFilterOptions = useMemo(() => {
    const allActions = (ruleSet === 'waf'
      ? [...(aclData?.Rules || []), ...(albData?.Rules || [])]
      : rules
    ).map(r => {
      if (r.Action) return Object.keys(r.Action)[0];
      if (r.Actions && Array.isArray(r.Actions)) return r.Actions[0]?.Type;
      return r.action || '';
    }).filter(Boolean);
    const unique = Array.from(new Set(allActions));
    unique.sort();
    return ['*', ...unique];
  }, [ruleSet, aclData, albData, rules]);

  // Filter rules according to filters
  const filteredRules = useMemo(() => {
    let base = ruleSet === 'waf'
      ? [...(aclData?.Rules || []), ...(albData?.Rules || [])]
      : rules;
    if (nameFilter !== '*') {
      base = base.filter(r => {
        const n = r.Name || r.name || r.Id || r.id || '';
        return n.startsWith(nameFilter);
      });
    }
    if (actionFilter !== '*') {
      base = base.filter(r => {
        if (r.Action && Object.keys(r.Action)[0] === actionFilter) return true;
        if (r.Actions && Array.isArray(r.Actions) && r.Actions[0]?.Type === actionFilter) return true;
        if (r.action === actionFilter) return true;
        return false;
      });
    }
    return base;
  }, [ruleSet, aclData, albData, rules, nameFilter, actionFilter]);

  // Use RuleTransformer to process rules into nodes/edges
  const transformed = useMemo(() => {
    if (ruleSet === 'waf') {
      const aclRules = filteredRules.filter(r => (aclData?.Rules || []).includes(r));
      const albRules = filteredRules.filter(r => (albData?.Rules || []).includes(r));
      const transformer = new WafInterlinkedTransformer(aclRules, albRules);
      const result = transformer.transformRules() || { nodes: [], edges: [] };
     return result;
    }
    if (!filteredRules.length) return { nodes: [], edges: [] };
    if (ruleSet === 'acl') {
      const transformer = new RuleTransformer(filteredRules);
      return transformer.transformRules() || { nodes: [], edges: [] };
    }
    if (ruleSet === 'alb') {
      const transformer = new AlbRuleTransformer(filteredRules);
      return transformer.transformRules() || { nodes: [], edges: [] };
    }
    return { nodes: [], edges: [] };
  }, [filteredRules, ruleSet, aclData, albData]);

  // Handler for node selection in tree mode
  const handleNodeSelect = (nodeId) => {
    if (ruleSet === 'waf') {
      const aclRules = aclData?.Rules || [];
      const albRules = albData?.Rules || [];
      const allRules = [...aclRules, ...albRules];
      // Node IDs are prefixed with 'acl-' or 'alb-'
      const cleanId = nodeId.replace(/^acl-/, '').replace(/^alb-/, '');
      const found = allRules.find(r => (r.Name || r.name || r.Id || r.id) === cleanId);
      setSelectedNode(found || null);
    } else {
      const found = rules.find(r => (r.Name || r.name) === nodeId);
      setSelectedNode(found || null);
    }
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
        // REMOVE filter props from Topbar
      />
<Paper
  elevation={2}
  sx={{
    background: theme.palette.mode === 'dark' ? '#1e1e1e' : '#fdfdfd',
    borderRadius: 2,
    px: 2,
    py: 1,
    my: 2,
    maxWidth: 'fit-content',
    mx: 'auto',
    boxShadow: 2,
  }}
>
  <Stack
    direction={{ xs: 'column', md: 'row' }}
    spacing={0.5}
    alignItems="center"
    justifyContent="center"
    flexWrap="wrap"
    sx={{ gap: 0.5 }}
  >
    {/* Name Filter Dropdown */}
    <FormControl size="small" sx={{ minWidth: 90 }}>
      <InputLabel id="name-filter-label">Name</InputLabel>
      <Select
        labelId="name-filter-label"
        id="name-filter"
        value={nameFilter}
        label="Name"
        onChange={e => setNameFilter(e.target.value)}
        autoWidth
      >
        {(nameFilterOptions || []).map(opt => (
          <MenuItem key={opt} value={opt}>{opt === '*' ? 'All' : opt}</MenuItem>
        ))}
      </Select>
    </FormControl>
    {/* Action Filter Dropdown */}
    <FormControl size="small" sx={{ minWidth: 110 }}>
      <InputLabel id="action-filter-label">Action</InputLabel>
      <Select
        labelId="action-filter-label"
        id="action-filter"
        value={actionFilter}
        label="Action"
        onChange={e => setActionFilter(e.target.value)}
        autoWidth
      >
        {(actionFilterOptions || []).map(opt => (
          <MenuItem key={opt} value={opt}>{opt === '*' ? 'All' : opt}</MenuItem>
        ))}
      </Select>
    </FormControl>
    {/* Existing ToggleButtonGroups follow here */}
    <ToggleButtonGroup
      value={ruleSet}
      exclusive
      onChange={(_, v) => v && setRuleSet(v)}
      size="small"
    >
      <ToggleButton value="acl" sx={{ fontWeight: 'bold' }}>CDN-WAF</ToggleButton>
      <ToggleButton value="alb" sx={{ fontWeight: 'bold' }}>WAF-ALB</ToggleButton>
      <ToggleButton value="waf" sx={{ fontWeight: 'bold' }}>COMBINED-WAF</ToggleButton>
    </ToggleButtonGroup>

    <ToggleButtonGroup
      value={viewMode}
      exclusive
      onChange={(_, v) => v && setViewMode(v)}
      size="small"
    >
      <ToggleButton value="tree" sx={{ fontWeight: 'bold' }}>TREE VIEW</ToggleButton>
      <ToggleButton value="inspector" sx={{ fontWeight: 'bold' }}>INSPECTOR VIEW</ToggleButton>
    </ToggleButtonGroup>

    <ToggleButtonGroup
      value={nodesPerRow}
      exclusive
      onChange={(_, v) => v && setNodesPerRow(v)}
      size="small"
    >
      <ToggleButton value={8} sx={{ fontWeight: 'bold' }}>8 / ROW</ToggleButton>
      <ToggleButton value={16} sx={{ fontWeight: 'bold' }}>16 / ROW</ToggleButton>
    </ToggleButtonGroup>

    <ToggleButtonGroup
      value={orderBy}
      exclusive
      onChange={(_, v) => v && setOrderBy(v)}
      size="small"
    >
      <ToggleButton value="dependency" sx={{ fontWeight: 'bold' }}>ORDER: DEPENDENCY</ToggleButton>
      <ToggleButton value="number" sx={{ fontWeight: 'bold' }}>ORDER: PRIORITY</ToggleButton>
    </ToggleButtonGroup>
  </Stack>
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
          {transformed.nodes.length === 0 ? (
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
              selectedNode={selectedNode ? (selectedNode.Name || selectedNode.name || selectedNode.Id || selectedNode.id) : null}
              setSelectedNode={handleNodeSelect}
              nodesPerRow={nodesPerRow}
              orderBy={orderBy}
              viewName={ruleSet === 'acl' ? 'CDN-WAF' : ruleSet === 'alb' ? 'WAF-ALB' : ruleSet === 'waf' ? 'COMBINED-WAF' : ''}
            />
          ) : (
            <Box sx={{ width: '100%', height: '100%', flex: 1, minHeight: 0, minWidth: 0, overflow: 'auto' }}>
              <InspectorView
                rules={ruleSet === 'waf' ? [...(aclData?.Rules || []), ...(albData?.Rules || [])] : rules}
                showSubgraph={true}
              />
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
            top: '64px', // start below Topbar
            height: 'calc(100vh - 64px)', // fill remaining height
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
          <RuleDetailsContent
            rule={selectedNode}
            rules={ruleSet === 'waf' ? [...(aclData?.Rules || []), ...(albData?.Rules || [])] : rules}
            onClose={handleCloseInspector}
            viewType={selectedNode.nodeType === 'alb' ? 'alb' : selectedNode.nodeType === 'acl' ? 'acl' : (selectedNode.Conditions && selectedNode.Statement ? 'combined' : selectedNode.Conditions ? 'alb' : 'acl')}
          />
        )}
      </Drawer>
    </Box>
  );
} 