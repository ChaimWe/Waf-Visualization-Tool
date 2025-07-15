import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, useTheme, CircularProgress, Alert, Button, Drawer, ToggleButton, ToggleButtonGroup, Stack } from '@mui/material';
import { useParams } from 'react-router-dom';
import { useDataSource } from '../context/DataSourceContext';
import FlowChart from '../components/tree/FlowChart';
import InspectorView from '../components/WAFView/InspectorView';
import RuleTransformer from '../components/tree/RuleTransformer';
import RuleDetailsSidebar from '../components/WAFView/RuleDetailsSidebar';

export default function AlbAclPage() {
  const theme = useTheme();
  const { albId, aclId } = useParams();
  const { aclData, albData, awsMode } = useDataSource();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [useJsonMode, setUseJsonMode] = useState(false);
  const [viewMode, setViewMode] = useState('tree');
  const [drawerWidth, setDrawerWidth] = useState(500);
  const [selectedNode, setSelectedNode] = useState(null);
  const [nodesPerRow, setNodesPerRow] = useState(8);
  const [orderBy, setOrderBy] = useState('dependency');
  const [ruleSet, setRuleSet] = useState('both'); // 'acl', 'alb', or 'both'

  // --- Combined ALB+ACL graph construction ---
  const combinedGraph = React.useMemo(() => {
    if (!data?.alb || !data?.acl) return { nodes: [], edges: [] };
    const alb = data.alb;
    const acl = data.acl;
    // 0. ALB node
    const albNode = {
      id: `alb-${alb.AlbArn || alb.Id || alb.Name}`,
      type: 'custom-node',
      data: { ...alb, nodeType: 'alb', label: alb.Name || alb.AlbArn || 'ALB' }
    };
    // 1. Listeners
    const listeners = (alb.listeners || alb.Listeners || []).map(listener => ({
      id: `listener-${listener.ListenerArn || listener.Name || listener.Id}`,
      type: 'custom-node',
      data: { ...listener, nodeType: 'listener', label: listener.Name || listener.ListenerArn || 'Listener' }
    }));
    // 2. ALB Rules
    const albRules = (alb.rules || alb.Rules || []).map(rule => ({
      id: `albrule-${rule.RuleArn || rule.Name || rule.Id}`,
      type: 'custom-node',
      data: { ...rule, nodeType: 'albrule', label: rule.Name || rule.RuleArn || 'ALB Rule' }
    }));
    // 3. Target Groups
    const targets = (alb.targetGroups || alb.TargetGroups || []).map(tg => ({
      id: `target-${tg.TargetGroupArn || tg.Name || tg.Id}`,
      type: 'custom-node',
      data: { ...tg, nodeType: 'target', label: tg.Name || tg.TargetGroupArn || 'Target Group' }
    }));
    // 4. ACL node
    const aclNode = {
      id: `acl-${acl.AclId || acl.Id || acl.Name}`,
      type: 'custom-node',
      data: { ...acl, nodeType: 'acl', label: acl.Name || acl.AclId || 'ACL' }
    };
    // 5. WAF Rules
    const wafRules = (acl.rules || acl.Rules || []).map(rule => ({
      id: `wafrule-${rule.Name || rule.Id}`,
      type: 'custom-node',
      data: { ...rule, nodeType: 'wafrule', label: rule.Name || 'WAF Rule' }
    }));
    // --- Edges ---
    const edges = [];
    // Direct ALB → ACL edge if globally attached
    if (
      alb.AclId === (acl.AclId || acl.Id || acl.Name) ||
      (alb.attachedAcls || alb.AttachedAcls || []).includes(acl.AclId || acl.Id || acl.Name)
    ) {
      edges.push({
        id: `edge-${albNode.id}-${aclNode.id}`,
        source: albNode.id,
        target: aclNode.id,
        type: 'custom',
        edgeType: 'direct',
        label: 'ALB attached to ACL',
      });
    }
    // Listener → ALB Rule
    (alb.listeners || alb.Listeners || []).forEach(listener => {
      const listenerId = `listener-${listener.ListenerArn || listener.Name || listener.Id}`;
      (listener.Rules || listener.rules || []).forEach(ruleRef => {
        const ruleId = `albrule-${ruleRef.RuleArn || ruleRef.Name || ruleRef.Id}`;
        edges.push({
          id: `edge-${listenerId}-${ruleId}`,
          source: listenerId,
          target: ruleId,
          type: 'custom',
          edgeType: 'listener-rule',
          label: 'Listener → Rule',
        });
      });
    });
    // ALB Rule → ACL (if attached)
    (alb.rules || alb.Rules || []).forEach(rule => {
      const ruleId = `albrule-${rule.RuleArn || rule.Name || rule.Id}`;
      if (
        rule.AclId === (acl.AclId || acl.Id || acl.Name) ||
        alb.AclId === (acl.AclId || acl.Id || acl.Name) ||
        (alb.attachedAcls || alb.AttachedAcls || []).includes(acl.AclId || acl.Id || acl.Name)
      ) {
        edges.push({
          id: `edge-${ruleId}-${aclNode.id}`,
          source: ruleId,
          target: aclNode.id,
          type: 'custom',
          edgeType: 'rule-acl',
          label: 'Rule → ACL',
        });
      }
    });
    // ACL → WAF Rules
    wafRules.forEach(wafRule => {
      edges.push({
        id: `edge-${aclNode.id}-${wafRule.id}`,
        source: aclNode.id,
        target: wafRule.id,
        type: 'custom',
        edgeType: 'acl-wafrule',
        label: 'ACL → WAF Rule',
      });
    });
    // ALB Rule → Target Group (with action annotation)
    (alb.rules || alb.Rules || []).forEach(rule => {
      const ruleId = `albrule-${rule.RuleArn || rule.Name || rule.Id}`;
      const actionType = rule.Actions ? (rule.Actions[0]?.Type || 'Unknown') : (rule.action || '');
      (rule.TargetGroupArns || rule.targetGroups || []).forEach(tgRef => {
        const tgId = `target-${tgRef.TargetGroupArn || tgRef.Name || tgRef.Id || tgRef}`;
        edges.push({
          id: `edge-${ruleId}-${tgId}`,
          source: ruleId,
          target: tgId,
          type: 'custom',
          edgeType: 'rule-target',
          label: actionType ? `Action: ${actionType}` : 'Rule → Target',
        });
      });
    });
    // --- Shared Contexts: IPs, Ports, Policies ---
    // Map IPs/ports in ALB and ACL rules, add edges for shared context
    const albRuleObjs = (alb.rules || alb.Rules || []);
    const aclRuleObjs = (acl.rules || acl.Rules || []);
    albRuleObjs.forEach((albRule, i) => {
      const albRuleId = `albrule-${albRule.RuleArn || albRule.Name || albRule.Id}`;
      const albIPs = (albRule.Conditions || albRule.conditions || []).flatMap(c => c.SourceIpConfig?.Values || []);
      const albPorts = (albRule.Conditions || albRule.conditions || []).flatMap(c => c.PortConfig?.Values || []);
      aclRuleObjs.forEach((aclRule, j) => {
        const aclRuleId = `wafrule-${aclRule.Name || aclRule.Id}`;
        const aclIPs = (aclRule.Statement?.IPSetReferenceStatement?.IPSetForwardedIpConfig?.HeaderName ? [aclRule.Statement.IPSetReferenceStatement.IPSetForwardedIpConfig.HeaderName] : [])
          .concat(aclRule.Statement?.IPSetReferenceStatement?.Addresses || []);
        const aclPorts = aclRule.Statement?.PortMatchStatement?.Ports || [];
        // Shared IPs
        if (albIPs.length && aclIPs.length && albIPs.some(ip => aclIPs.includes(ip))) {
          edges.push({
            id: `edge-sharedip-${albRuleId}-${aclRuleId}`,
            source: aclRuleId,
            target: albRuleId,
            type: 'custom',
            edgeType: 'shared-ip',
            label: 'Shared IP',
            style: { strokeDasharray: '6 4' },
          });
        }
        // Shared Ports
        if (albPorts.length && aclPorts.length && albPorts.some(port => aclPorts.includes(port))) {
          edges.push({
            id: `edge-sharedport-${albRuleId}-${aclRuleId}`,
            source: aclRuleId,
            target: albRuleId,
            type: 'custom',
            edgeType: 'shared-port',
            label: 'Shared Port',
            style: { strokeDasharray: '2 2' },
          });
        }
        // Shared Policy (if both reference same policy name/arn)
        const albPol = albRule.PolicyArn || albRule.PolicyName;
        const aclPol = aclRule.PolicyArn || aclRule.PolicyName;
        if (albPol && aclPol && albPol === aclPol) {
          edges.push({
            id: `edge-sharedpol-${albRuleId}-${aclRuleId}`,
            source: aclRuleId,
            target: albRuleId,
            type: 'custom',
            edgeType: 'shared-policy',
            label: 'Shared Policy',
            style: { strokeDasharray: '1 6' },
          });
        }
      });
    });
    // --- Conditional Dependencies: allow/deny/redirect ---
    // Annotate edges based on rule actions
    albRuleObjs.forEach(albRule => {
      const albRuleId = `albrule-${albRule.RuleArn || albRule.Name || albRule.Id}`;
      const actionType = albRule.Actions ? (albRule.Actions[0]?.Type || 'Unknown') : (albRule.action || '');
      if (actionType.toLowerCase() === 'redirect') {
        edges.push({
          id: `edge-redirect-${albRuleId}`,
          source: albRuleId,
          target: albNode.id,
          type: 'custom',
          edgeType: 'redirect',
          label: 'Redirect',
          style: { strokeDasharray: '1 4', stroke: '#ff9800' },
        });
      }
      if (actionType.toLowerCase() === 'fixed-response') {
        edges.push({
          id: `edge-fixedresp-${albRuleId}`,
          source: albRuleId,
          target: albNode.id,
          type: 'custom',
          edgeType: 'fixed-response',
          label: 'Fixed Response',
          style: { strokeDasharray: '1 1', stroke: '#9c27b0' },
        });
      }
    });
    aclRuleObjs.forEach(aclRule => {
      const aclRuleId = `wafrule-${aclRule.Name || aclRule.Id}`;
      const action = aclRule.Action?.Type || aclRule.Action?.type || '';
      if (action.toLowerCase() === 'allow') {
        edges.push({
          id: `edge-allow-${aclRuleId}`,
          source: aclRuleId,
          target: albNode.id,
          type: 'custom',
          edgeType: 'allow',
          label: 'Allow',
          style: { strokeDasharray: '6 2', stroke: '#4caf50' },
        });
      }
      if (action.toLowerCase() === 'block' || action.toLowerCase() === 'deny') {
        edges.push({
          id: `edge-deny-${aclRuleId}`,
          source: aclRuleId,
          target: albNode.id,
          type: 'custom',
          edgeType: 'deny',
          label: 'Deny',
          style: { strokeDasharray: '0', stroke: '#f44336' },
        });
      }
    });
    // --- Collect all nodes ---
    const nodes = [
      aclNode, // ACL first for top position
      albNode,
      ...listeners,
      ...albRules,
      ...wafRules,
      ...targets
    ];
    return { nodes, edges };
  }, [data]);

  // Node selection handler for combined graph
  const handleNodeSelect = (nodeId) => {
    // Find node in combinedGraph.nodes
    const found = combinedGraph.nodes.find(n => n.id === nodeId);
    setSelectedNode(found ? found.data : null);
  };
  const handleCloseInspector = () => setSelectedNode(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    
    // If not in AWS mode, only use JSON data
    if (!awsMode) {
      if (aclData && albData) {
        setUseJsonMode(true);
        setData({
          alb: albData,
          acl: aclData
        });
        setLoading(false);
      } else {
        setUseJsonMode(true);
        setData(null);
        setLoading(false);
      }
      return;
    }
    // If in AWS mode, try to fetch from API
    if (awsMode) {
      // If both JSONs are present, prefer JSON mode
      if (aclData && albData) {
        setUseJsonMode(true);
        setData({
          alb: albData,
          acl: aclData
        });
        setLoading(false);
        return;
      }
      fetch(`http://localhost:5000/api/alb-acl/${albId}/${aclId}`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch ALB+ACL details');
          return res.json();
        })
        .then(data => {
          setData(data);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [albId, aclId, aclData, albData, awsMode]);

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        minHeight: '100vh',
        minWidth: '100vw',
        p: 0,
        m: 0,
        background: theme.palette.background.default,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top bar with title and controls */}
      <Box sx={{ px: { xs: 2, sm: 4 }, pt: 4, pb: 2, background: 'transparent', zIndex: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          ALB + ACL Details
        </Typography>
        <Typography variant="h6" sx={{ mb: 2 }}>
          ALB ID: {albId} | ACL ID: {aclId}
        </Typography>
        {useJsonMode && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Using JSON data mode (no AWS API connection)
          </Alert>
        )}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 0 }}>
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
        </Stack>
      </Box>
      {/* Main content area: tree/inspector view */}
      <Box
        sx={{
          flex: 1,
          width: '100vw',
          height: '100%',
          minHeight: 0,
          minWidth: 0,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          p: 0,
          m: 0,
          overflow: 'auto', // <-- allow scrolling if content overflows
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ p: 4 }}>
            <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
            {aclData && albData && (
              <Button 
                variant="contained" 
                onClick={() => {
                  setUseJsonMode(true);
                  setData({ alb: albData, acl: aclData });
                  setError(null);
                }}
                sx={{ mt: 1 }}
              >
                Use JSON Data Instead
              </Button>
            )}
          </Box>
        ) : combinedGraph.nodes.length > 0 ? (
          <Box sx={{ position: 'relative', width: '100%', height: '100%', flex: 1, minHeight: 0, minWidth: 0, overflow: 'auto' }}>
            {viewMode === 'tree' ? (
              <FlowChart
                allNodes={combinedGraph.nodes}
                allEdges={combinedGraph.edges}
                selectedNode={selectedNode ? selectedNode.id : null}
                setSelectedNode={handleNodeSelect}
                nodesPerRow={nodesPerRow}
                orderBy={orderBy}
                style={{ width: '100%', height: '100%' }}
              />
            ) : (
              <InspectorView rules={combinedGraph.nodes.map(n => n.data)} showSubgraph={true} style={{ width: '100%', height: '100%', overflow: 'auto' }} />
            )}
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
                  zIndex: 2001
                }
              }}
            >
              {selectedNode && (
                <RuleDetailsSidebar rule={selectedNode} rules={combinedGraph.nodes.map(n => n.data)} onClose={handleCloseInspector} />
              )}
            </Drawer>
          </Box>
        ) : (
          <Box sx={{ p: 4 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {awsMode
                ? 'No ALB+ACL data found.\nPlease upload your ACL/ALB JSON data using the upload button above, or log in with AWS credentials to fetch live data.'
                : 'No ALB+ACL JSON data found. Please upload your ACL/ALB JSON data using the upload button above.'}
            </Typography>
            <Button variant="contained" sx={{ mt: 1 }} onClick={() => window.location.reload()}>Reload</Button>
          </Box>
        )}
      </Box>
    </Box>
  );
} 