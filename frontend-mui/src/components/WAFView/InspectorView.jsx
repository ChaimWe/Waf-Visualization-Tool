import React, { useState, useMemo, useRef } from 'react';
import { Box, Typography, Tabs, Tab, Stack, Chip, Divider } from '@mui/material';
import FlowChart from '../tree/FlowChart';
import RuleDetailsContent from './RuleDetailsContent';

function getRuleRelationships(rule, allRules) {
  // Find dependencies (rules this rule depends on)
  const dependencies = [];
  // Find dependents (rules that depend on this rule)
  const dependents = [];
  const ruleName = rule.Name || rule.name || rule.id;
  // Find all labels this rule references
  function findLabelMatch(obj) {
    if (!obj || typeof obj !== 'object') return [];
    let matches = [];
    if (obj.LabelMatchStatement && obj.LabelMatchStatement.Key) {
      matches.push(obj.LabelMatchStatement.Key);
    }
    Object.values(obj).forEach(val => {
      matches = matches.concat(findLabelMatch(val));
    });
    return matches;
  }
  const referencedLabels = findLabelMatch(rule.Statement);
  // For each referenced label, find the rule that emits it
  referencedLabels.forEach(label => {
    const parent = allRules.find(r => (r.RuleLabels || r.ruleLabels || []).some(l => (l.Name || l) === label));
    if (parent) dependencies.push(parent);
  });
  // Find all rules that reference a label emitted by this rule
  const emittedLabels = (rule.RuleLabels || rule.ruleLabels || []).map(l => l.Name || l);
  allRules.forEach(r => {
    const labels = findLabelMatch(r.Statement);
    if (labels.some(l => emittedLabels.includes(l))) {
      dependents.push(r);
    }
  });
  return { dependencies, dependents };
}

function summarizeRule(rule, relationships) {
  let summary = '';
  if (rule.Statement?.ByteMatchStatement) {
    summary += `This rule matches requests where the path contains "${rule.Statement.ByteMatchStatement.SearchString}". `;
  } else if (rule.Conditions) {
    summary += `This ALB rule matches requests with conditions: ` + rule.Conditions.map(c => `${c.Field}=${(c.Values || []).join(',')}`).join('; ') + '. ';
  } else {
    summary += 'This rule matches requests based on its statement logic. ';
  }
  if (relationships.dependencies.length > 0) {
    summary += `It depends on ${relationships.dependencies.length} other rule(s): ` + relationships.dependencies.map(r => r.Name || r.name || r.id).join(', ') + '. ';
    summary += 'These dependencies mean this rule will only match if those rules have emitted the required labels.';
  } else {
    summary += 'It does not depend on any other rules.';
  }
  if (relationships.dependents.length > 0) {
    summary += ` It is referenced by ${relationships.dependents.length} other rule(s): ` + relationships.dependents.map(r => r.Name || r.name || r.id).join(', ') + '. ';
    summary += 'This means other rules rely on the labels emitted by this rule.';
  } else {
    summary += ' No other rules directly depend on this rule.';
  }
  return summary;
}

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`rule-details-tabpanel-${index}`}
      aria-labelledby={`rule-details-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

function getDependencySubgraph(selectedNode, allNodes, allEdges) {
  if (!selectedNode) return { nodes: [], edges: [] };
  const nodeId = selectedNode.id || selectedNode.Name || selectedNode.name;
  const nodeMap = Object.fromEntries(allNodes.map(n => [String(n.id), n]));
  // Direct children
  const childIds = allEdges.filter(e => e.source === nodeId).map(e => e.target);
  // Direct parents
  const parentIds = allEdges.filter(e => e.target === nodeId).map(e => e.source);
  // Only the selected node, its direct parents, and direct children
  const directIds = [nodeId, ...childIds, ...parentIds];
  const filteredNodes = directIds.map(id => nodeMap[id]).filter(Boolean);
  // Include all edges between any of the displayed nodes
  const filteredNodeIds = new Set(directIds);
  const filteredEdges = allEdges.filter(
    e => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)
  );
  return { nodes: filteredNodes, edges: filteredEdges };
}

function getDependentsSubgraph(selectedNode, allNodes, allEdges) {
  if (!selectedNode) return { nodes: [], edges: [] };
  const nodeId = selectedNode.id || selectedNode.Name || selectedNode.name;
  const nodeMap = Object.fromEntries(allNodes.map(n => [String(n.id), n]));
  // Recursively collect all dependents (descendants)
  const collectDependents = (id, visited = new Set()) => {
    if (visited.has(id)) return visited;
    visited.add(id);
    allEdges.filter(e => e.source === id).forEach(e => collectDependents(e.target, visited));
    return visited;
  };
  const allDependentIds = collectDependents(nodeId);
  let filteredNodes = Array.from(allDependentIds).map(id => nodeMap[id]).filter(Boolean);
  const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
  const filteredEdges = allEdges.filter(
    e => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)
  );
  // If only the selected node is present and no dependents, show the node
  if (filteredNodes.length === 0) {
    const node = nodeMap[nodeId];
    return node ? { nodes: [node], edges: [] } : { nodes: [], edges: [] };
  }
  return { nodes: filteredNodes, edges: filteredEdges };
}

// Add extractWafEdges utility
function extractWafEdges(rules) {
  // Map label name to emitting rule name
  const labelToRule = {};
  rules.forEach(rule => {
    (rule.RuleLabels || rule.ruleLabels || []).forEach(label => {
      labelToRule[label.Name || label] = rule.Name || rule.name || rule.id;
    });
  });
  // Find LabelMatchStatement references
  const edges = [];
  rules.forEach(rule => {
    function findLabelMatch(obj) {
      if (!obj || typeof obj !== 'object') return;
      if (obj.LabelMatchStatement && obj.LabelMatchStatement.Key) {
        const label = obj.LabelMatchStatement.Key;
        if (labelToRule[label]) {
          edges.push({ source: labelToRule[label], target: rule.Name || rule.name || rule.id, id: `edge-${labelToRule[label]}-${rule.Name || rule.name || rule.id}` });
        }
      }
      Object.values(obj).forEach(findLabelMatch);
    }
    findLabelMatch(rule.Statement);
  });
  return edges;
}

// Extract content rendering from RuleDetailsSidebar
function RuleJsonContent({ rule }) {
  if (!rule) return null;
  return (
    <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 4, fontSize: 14, maxWidth: '100%', overflowX: 'auto' }}>{getJson(rule)}</pre>
  );
}
function RuleDependenciesContent({ rule, rules }) {
  const relationships = useMemo(() => rule && rules ? getRuleRelationships(rule, rules) : { dependencies: [], dependents: [] }, [rule, rules]);
  if (!rule) return null;
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>Dependencies</Typography>
      <Box sx={{ mb: 2 }}>
        {relationships.dependencies.length === 0 ? (
          <Typography variant="body2">No dependencies.</Typography>
        ) : (
          relationships.dependencies.map((r, i) => (
            <div key={i}>{r.Name || r.name || r.id}</div>
          ))
        )}
      </Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>Dependents</Typography>
      <Box sx={{ mb: 2 }}>
        {relationships.dependents.length === 0 ? (
          <Typography variant="body2">No dependents.</Typography>
        ) : (
          relationships.dependents.map((r, i) => (
            <div key={i}>{r.Name || r.name || r.id}</div>
          ))
        )}
      </Box>
    </Box>
  );
}
function RuleWarningsContent({ rule }) {
  if (!rule) return null;
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>Warnings</Typography>
      {(rule.warnings || []).length === 0 ? (
        <Typography variant="body2">No warnings.</Typography>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {(rule.warnings || []).map((issue, idx) => (
            <li key={idx} style={{ color: '#d32f2f' }}>{issue}</li>
          ))}
        </ul>
      )}
    </Box>
  );
}

const InspectorView = ({ rules, showSubgraph, initialSelected }) => {
  const [selected, setSelected] = useState(initialSelected || (rules && rules.length > 0 ? rules[0] : null));
  const [tab, setTab] = useState(4); // Default to Subgraph tab

  React.useEffect(() => {
    if (initialSelected) setSelected(initialSelected);
  }, [initialSelected]);

  // Prepare allNodes/allEdges for subgraph
  const allNodes = useMemo(() => rules.map(rule => ({ id: rule.Name || rule.name || rule.id, data: rule })), [rules]);
  const allEdges = useMemo(() => extractWafEdges(rules), [rules]);

  // Subgraph for selected rule: show dependencies (parents) and dependents (children)
  const { nodes: subNodes, edges: subEdges } = useMemo(() => {
    if (!showSubgraph || !selected) return { nodes: [], edges: [] };
    // Use getDependencySubgraph to get parents, center, and children
    const res = getDependencySubgraph(selected, allNodes, allEdges);
    const nodeId = selected.id || selected.Name || selected.name;
    const parents = res.nodes.filter(n => res.edges.some(e => e.target === nodeId && e.source === n.id));
    const children = res.nodes.filter(n => res.edges.some(e => e.source === nodeId && e.target === n.id));
    const center = res.nodes.find(n => n.id === nodeId);
    const spacingX = 250;
    const spacingY = 180;
    let nodes = [];
    // Parents row
    parents.forEach((n, i) => {
      nodes.push({
        ...n,
        position: { x: i * spacingX - ((parents.length - 1) * spacingX / 2), y: 0 },
        type: 'custom-node',
        data: { ...n.data, inPopup: true }
      });
    });
    // Center node
    if (center) {
      nodes.push({
        ...center,
        position: { x: 0, y: spacingY },
        type: 'custom-node',
        data: { ...center.data, inPopup: true }
      });
    }
    // Children row
    children.forEach((n, i) => {
      nodes.push({
        ...n,
        position: { x: i * spacingX - ((children.length - 1) * spacingX / 2), y: 2 * spacingY },
        type: 'custom-node',
        data: { ...n.data, inPopup: true }
      });
    });
    // Only include edges between these nodes
    const nodeIds = new Set(nodes.map(n => n.id));
    const edges = res.edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));
    return { nodes, edges };
  }, [showSubgraph, selected, allNodes, allEdges]);

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', background: 'rgba(255,255,255,0.95)' }}>
      {/* Left: Node list */}
      <div style={{ width: 260, borderRight: '1px solid #eee', height: '100%', background: '#fafbfc', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 48px)', padding: '24px 0' }}>
          {rules && rules.length > 0 ? rules.map((rule, idx) => {
            const name = rule.Name || rule.name || '';
            const priority = rule.Priority || rule.priority || '';
            return (
              <div
                key={rule.Name || rule.name || idx}
                onClick={() => { setSelected(rule); }}
                style={{
                  padding: '12px 24px',
                  cursor: 'pointer',
                  background: selected === rule ? '#e3f2fd' : 'transparent',
                  fontWeight: selected === rule ? 600 : 400,
                  borderLeft: selected === rule ? '4px solid #1976d2' : '4px solid transparent',
                  color: selected === rule ? '#1976d2' : '#222',
                  transition: 'background 0.2s, color 0.2s',
                }}
              >
                <div style={{ fontSize: 17 }}>{name}</div>
                <div style={{ fontSize: 13, color: '#888' }}>Priority: {priority}</div>
              </div>
            );
          }) : <div style={{ padding: 24, color: '#888' }}>No rules found.</div>}
        </div>
      </div>
      {/* Right: Panel with details/tabs, fills all remaining space */}
      <div style={{ flex: 1, minWidth: 0, height: '100%', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        {selected && (
          <>
            {/* Reverse tab order and preserve tab state per rule */}
            <Tabs
              value={(() => {
                // Use a ref to store tab state per rule
                if (!InspectorView._tabState) InspectorView._tabState = {};
                const ruleId = selected.Name || selected.name || selected.id;
                if (InspectorView._tabState[ruleId] === undefined) InspectorView._tabState[ruleId] = 4; // Default to Subgraph (now leftmost)
                return InspectorView._tabState[ruleId];
              })()}
              onChange={(_, v) => {
                const ruleId = selected.Name || selected.name || selected.id;
                if (!InspectorView._tabState) InspectorView._tabState = {};
                InspectorView._tabState[ruleId] = v;
                setTab(v);
              }}
              sx={{ mb: 2 }}
              TabIndicatorProps={{ style: { left: 0, right: 'auto' } }}
            >
              <Tab label="Subgraph" />
              <Tab label="Warnings" />
              <Tab label="Dependencies" />
              <Tab label="JSON" />
              <Tab label="Details" />
            </Tabs>
            {tab === 4 && <RuleDetailsContent rule={selected} rules={rules} showJsonTab={true} showCloseButton={false} viewType={selected.nodeType === 'alb' ? 'alb' : selected.nodeType === 'acl' ? 'acl' : (selected.Conditions && selected.Statement ? 'combined' : selected.Conditions ? 'alb' : 'acl')} activeSection="details" />}
            {tab === 3 && <RuleDetailsContent rule={selected} rules={rules} showJsonTab={true} showCloseButton={false} viewType={selected.nodeType === 'alb' ? 'alb' : selected.nodeType === 'acl' ? 'acl' : (selected.Conditions && selected.Statement ? 'combined' : selected.Conditions ? 'alb' : 'acl')} activeSection="json" />}
            {tab === 2 && <RuleDetailsContent rule={selected} rules={rules} showJsonTab={true} showCloseButton={false} viewType={selected.nodeType === 'alb' ? 'alb' : selected.nodeType === 'acl' ? 'acl' : (selected.Conditions && selected.Statement ? 'combined' : selected.Conditions ? 'alb' : 'acl')} activeSection="dependencies" />}
            {tab === 1 && <RuleDetailsContent rule={selected} rules={rules} showJsonTab={true} showCloseButton={false} viewType={selected.nodeType === 'alb' ? 'alb' : selected.nodeType === 'acl' ? 'acl' : (selected.Conditions && selected.Statement ? 'combined' : selected.Conditions ? 'alb' : 'acl')} activeSection="warnings" />}
            {tab === 0 && (
              <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, p: 0, m: 0, width: '100%' }}>
                {subNodes.length === 0 ? (
                  <Box sx={{ color: '#888', p: 4, textAlign: 'center' }}>No dependents for this rule.</Box>
                ) : (
                  <FlowChart
                    allNodes={subNodes}
                    allEdges={subEdges}
                    selectedNode={selected ? (selected.Name || selected.name) : null}
                    setSelectedNode={() => { }}
                    nodesPerRow={8}
                    orderBy={'dependency'}
                    style={{ width: '100%' }}
                  />
                )}
              </Box>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default InspectorView; 