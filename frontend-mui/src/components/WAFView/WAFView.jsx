import React, { useMemo, useState } from 'react';
import { Box, Typography, Paper, Drawer, IconButton } from '@mui/material';
import { useDataSource } from '../../context/DataSourceContext';
import FlowChart from '../tree/FlowChart';
import Tree from '../tree/NodeTransformer';
import RuleTransformer from '../tree/RuleTransformer';
import InspectorView from './InspectorView';
import CloseIcon from '@mui/icons-material/Close';
import AlbRuleTransformer from '../tree/AlbRuleTransformer';

// Helper to detect WAF vs ALB data
function detectDataType(data) {
  if (!data || !Array.isArray(data.Rules)) return 'unknown';
  if (data.Rules.some(rule => rule.Statement || rule.Action)) return 'waf';
  if (data.Rules.some(rule => rule.Conditions || rule.Actions)) return 'alb';
  return 'unknown';
}

export default function WAFView() {
  const { awsMode, jsonData } = useDataSource();
  // In a real app, you would get data from props or context
  // For now, use jsonData for JSON mode, or fetch from backend for AWS mode
  const data = jsonData; // This can be extended for AWS mode

  const dataType = useMemo(() => detectDataType(data), [data]);

  // Inspector state
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorRules, setInspectorRules] = useState([]);
  const [inspectorSelected, setInspectorSelected] = useState(null);

  // Filter state
  const [nameFilter, setNameFilter] = useState('*');
  const [actionFilter, setActionFilter] = useState('*');

  // Compute available name filter options (A-Z, 0-9, *) from current rules, case sensitive
  const nameFilterOptions = useMemo(() => {
    let allNames = [];
    if (dataType === 'waf' && data && Array.isArray(data.Rules)) {
      allNames = data.Rules.map(r => r.Name || r.name || r.Id || r.id || '');
    } else if (dataType === 'alb' && data && Array.isArray(data.Rules)) {
      allNames = data.Rules.map(r => r.Name || r.name || r.Id || r.id || '');
    }
    const initials = Array.from(new Set(allNames.map(n => n[0]).filter(Boolean)));
    initials.sort();
    return ['*', ...initials];
  }, [dataType, data]);

  // Compute available action filter options from current rules, case sensitive
  const actionFilterOptions = useMemo(() => {
    let allActions = [];
    if (dataType === 'waf' && data && Array.isArray(data.Rules)) {
      allActions = data.Rules.map(r => r.Action ? Object.keys(r.Action)[0] : (r.action || ''));
    } else if (dataType === 'alb' && data && Array.isArray(data.Rules)) {
      allActions = data.Rules.map(r => r.Actions && Array.isArray(r.Actions) ? r.Actions[0]?.Type : (r.action || ''));
    }
    const unique = Array.from(new Set(allActions.filter(Boolean)));
    unique.sort();
    return ['*', ...unique];
  }, [dataType, data]);

  // Filter rules according to filters
  const filteredRules = useMemo(() => {
    let base = [];
    if (dataType === 'waf' && data && Array.isArray(data.Rules)) {
      base = data.Rules;
    } else if (dataType === 'alb' && data && Array.isArray(data.Rules)) {
      base = data.Rules;
    }
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
  }, [dataType, data, nameFilter, actionFilter]);

  // Transform data for visualization
  const wafTransformed = useMemo(() => {
    if (dataType === 'waf' && filteredRules.length > 0) {
      const transformer = new RuleTransformer(filteredRules);
      return transformer.transformRules();
    }
    return null;
  }, [dataType, filteredRules]);

  // ALB transformation using AlbRuleTransformer
  const albTransformed = useMemo(() => {
    if (dataType === 'alb' && filteredRules.length > 0) {
      const transformer = new AlbRuleTransformer(filteredRules);
      return transformer.transformRules();
    }
    return null;
  }, [dataType, filteredRules]);

  // Handler for node/rule selection
  const handleNodeSelect = (nodeId) => {
    let rules = [];
    let selected = null;
    if (dataType === 'waf' && wafTransformed) {
      rules = data.Rules;
      selected = rules.find(r => r.Name === nodeId || r.name === nodeId || r.id === nodeId);
    } else if (dataType === 'alb' && albTransformed) {
      rules = data.Rules;
      selected = rules.find(r => r.Name === nodeId || r.name === nodeId || r.id === nodeId);
    }
    setInspectorRules(rules);
    setInspectorSelected(selected);
    setInspectorOpen(true);
  };

  return (
    <Box sx={{ width: '100%', height: '100%', p: 0, m: 0 }}>
      {dataType === 'waf' && wafTransformed ? (
        <Box sx={{ width: '100%', height: '100%', p: 0, m: 0 }}>
          <FlowChart
            allNodes={wafTransformed.nodes}
            allEdges={wafTransformed.edges}
            selectedNode={null}
            setSelectedNode={handleNodeSelect}
            style={{ width: '100%' }}
          />
        </Box>
      ) : dataType === 'alb' && albTransformed ? (
        <Box sx={{ width: '100%', height: '100%', p: 0, m: 0 }}>
          <FlowChart
            allNodes={albTransformed.nodes}
            allEdges={albTransformed.edges}
            selectedNode={null}
            setSelectedNode={handleNodeSelect}
            style={{ width: '100%' }}
          />
        </Box>
      ) : (
        <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6">No valid WAF or ALB data detected.</Typography>
        </Paper>
      )}
      <Drawer anchor="right" open={inspectorOpen} onClose={() => setInspectorOpen(false)} PaperProps={{ sx: { width: 700, maxWidth: '100vw' } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2 }}>
          <Typography variant="h6">Inspector</Typography>
          <IconButton onClick={() => setInspectorOpen(false)}><CloseIcon /></IconButton>
        </Box>
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <InspectorView rules={inspectorRules} showSubgraph={true} initialSelected={inspectorSelected} />
        </Box>
      </Drawer>
    </Box>
  );
} 