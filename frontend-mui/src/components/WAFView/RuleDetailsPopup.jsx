import React, { useState, useMemo } from 'react';
import {
  Drawer,
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Divider,
  Tooltip,
  Stack,
  useTheme,
  Tabs,
  Tab
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DependencyTreePopup from './DependencyTreePopup';
import RuleDetailsContent from './RuleDetailsContent';

// Utility: Extract WAF dependency edges from rules
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
          edges.push({ source: labelToRule[label], target: rule.Name || rule.name || rule.id });
        }
      }
      Object.values(obj).forEach(findLabelMatch);
    }
    findLabelMatch(rule.Statement);
  });
  return edges;
}

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
  // Basic summary of what the rule does
  let summary = '';
  if (rule.Statement?.ByteMatchStatement) {
    summary += `This rule matches requests where the path contains "${rule.Statement.ByteMatchStatement.SearchString}". `;
  } else if (rule.Conditions) {
    summary += `This ALB rule matches requests with conditions: ` + rule.Conditions.map(c => `${c.Field}=${(c.Values || []).join(',')}`).join('; ') + '. ';
  } else {
    summary += 'This rule matches requests based on its statement logic. ';
  }
  // Add relationships
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

const RuleDetailsPopup = ({ open, onClose, rule, dataArray, centerNode, onOpenChat, aiSummary, responseStyle, allNodes, warnings }) => {
  const theme = useTheme();
  const [tab, setTab] = useState(0);
  // Compute edges for WAF rules
  const edges = useMemo(() => extractWafEdges(dataArray), [dataArray]);
  if (!rule) {
    return null;
  }
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: 500, maxWidth: '100vw', p: 0, boxShadow: 6 } }}
    >
      <RuleDetailsContent rule={rule} rules={dataArray} onClose={onClose} showJsonTab={false} showCloseButton={true} viewType={rule.nodeType === 'alb' ? 'alb' : rule.nodeType === 'acl' ? 'acl' : (rule.Conditions && rule.Statement ? 'combined' : rule.Conditions ? 'alb' : 'acl')} />
    </Drawer>
  );
};

export default RuleDetailsPopup; 