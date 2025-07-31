import React, { useMemo, useState, useEffect } from 'react';
import { Box, Typography, Tabs, Tab, Stack, Chip, Divider, IconButton, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTheme } from '@mui/material/styles';

// Helper functions (copied from RuleDetailsSidebar)
function getRuleRelationships(rule, allRules) {
  const dependencies = [];
  const ruleName = rule?.Name || rule?.name || rule?.id;
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
  const referencedLabels = findLabelMatch(rule?.Statement);
  referencedLabels.forEach(label => {
    const parent = (allRules || []).find(r => (r.RuleLabels || r.ruleLabels || []).some(l => (l.Name || l) === label));
    if (parent) dependencies.push(parent);
  });
  const emittedLabels = (rule?.RuleLabels || rule?.ruleLabels || []).map(l => l.Name || l);
  const dependents = (allRules || []).filter(r => {
    const labels = findLabelMatch(r.Statement);
    return labels.some(l => emittedLabels.includes(l));
  });
  return { dependencies, dependents };
}

function summarizeRule(rule, relationships) {
  let summary = '';
  if (rule?.Statement?.ByteMatchStatement) {
    summary += `This rule matches requests where the path contains "${rule.Statement.ByteMatchStatement.SearchString}". `;
  } else if (rule?.Conditions) {
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

function getFields(data) {
  const name = data?.Name || data?.name || '';
  const priority = data?.Priority || data?.priority || '';
  const action = data?.Action ? Object.keys(data.Action)[0] : (data?.action || '');
  const type = data?.Type || data?.type || (data?.Statement ? Object.keys(data.Statement)[0] : '');
  const labels = (data?.RuleLabels || data?.ruleLabels || []).map(l => l.Name || l).filter(Boolean);
  const metric = data?.VisibilityConfig?.MetricName || data?.metric || '';
  return { name, priority, action, type, labels, metric };
}

function getJson(data) {
  let jsonData = data;
  if (typeof jsonData === 'string') {
    try {
      jsonData = JSON.parse(jsonData);
    } catch (e) {}
  }
  return JSON.stringify(jsonData, null, 2);
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

// Helper: Render details for ACL (WAF) rules
function renderAclDetails(rule) {
  return (
    <>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Chip label={rule.action || 'No Action'} color="info" variant="outlined" />
        <Chip label={`Priority: ${rule.priority}`} color="error" variant="outlined" />
        {rule.Type && <Chip label={`Type: ${rule.Type}`} color="default" variant="outlined" />}
        {rule.VisibilityConfig?.MetricName && <Chip label={`Metric: ${rule.VisibilityConfig.MetricName}`} color="primary" variant="outlined" />}
      </Stack>
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>Statement</Typography>
      <Box sx={{ mb: 2 }}>
        {rule.Statement ? (
          <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, fontSize: 14, maxWidth: '100%', overflowX: 'auto' }}>{JSON.stringify(rule.Statement, null, 2)}</pre>
        ) : (
          <Typography variant="body2">No statement found.</Typography>
        )}
      </Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>Labels Emitted</Typography>
      <Box sx={{ mb: 2 }}>
        {(rule.RuleLabels || rule.ruleLabels || []).length > 0 ? (
          (rule.RuleLabels || rule.ruleLabels).map((l, i) => <Chip key={i} label={l.Name || l} color="success" variant="outlined" sx={{ mr: 1, mb: 1 }} />)
        ) : (
          <Typography variant="body2">No labels emitted.</Typography>
        )}
      </Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>Visibility Config</Typography>
      <Box sx={{ mb: 2 }}>
        {rule.VisibilityConfig ? (
          <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, fontSize: 14, maxWidth: '100%', overflowX: 'auto' }}>{JSON.stringify(rule.VisibilityConfig, null, 2)}</pre>
        ) : (
          <Typography variant="body2">No visibility config.</Typography>
        )}
      </Box>
      {rule.RuleGroupArn && (
        <>
          <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>Rule Group</Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>{rule.RuleGroupArn}</Typography>
        </>
      )}
      {rule.LastModifiedTime && (
        <Typography variant="body2" sx={{ mb: 2 }}>Last Modified: {rule.LastModifiedTime}</Typography>
      )}
    </>
  );
}

// Helper: Render details for ALB rules
function renderAlbDetails(rule) {
  return (
    <>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Chip label={rule.action || rule.Actions?.[0]?.Type || 'No Action'} color="info" variant="outlined" />
        <Chip label={`Priority: ${rule.priority || rule.Priority}`} color="error" variant="outlined" />
        {rule.Type && <Chip label={`Type: ${rule.Type}`} color="default" variant="outlined" />}
        {rule.Status && <Chip label={`Status: ${rule.Status}`} color="default" variant="outlined" />}
      </Stack>
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>Conditions</Typography>
      <Box sx={{ mb: 2 }}>
        {(rule.Conditions || []).length > 0 ? (
          rule.Conditions.map((cond, i) => (
            <div key={i}><strong>{cond.Field}:</strong> {(cond.Values || []).join(', ')}</div>
          ))
        ) : (
          <Typography variant="body2">No conditions found.</Typography>
        )}
      </Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>Actions</Typography>
      <Box sx={{ mb: 2 }}>
        {(rule.Actions || []).length > 0 ? (
          rule.Actions.map((act, i) => (
            <div key={i}><strong>{act.Type}:</strong> {act.TargetGroupArn || act.RedirectConfig ? JSON.stringify(act.RedirectConfig || act.FixedResponseConfig || act.AuthenticateOidcConfig || act.AuthenticateCognitoConfig || act, null, 2) : ''}</div>
          ))
        ) : (
          <Typography variant="body2">No actions found.</Typography>
        )}
      </Box>
      {rule.TargetGroupArn && (
        <>
          <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>Target Group</Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>{rule.TargetGroupArn}</Typography>
        </>
      )}
      {rule.LastModifiedTime && (
        <Typography variant="body2" sx={{ mb: 2 }}>Last Modified: {rule.LastModifiedTime}</Typography>
      )}
    </>
  );
}

// Helper: Render details for Combined view (WAF + ALB)
function renderCombinedDetails(rule) {
  // Try to show both WAF and ALB fields if present
  return (
    <>
      <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>Combined Rule Details</Typography>
      <Divider sx={{ my: 2 }} />
      {rule.nodeType === 'acl' || rule.Statement ? (
        <>
          <Typography variant="subtitle2" sx={{ fontWeight: 500, mb: 1 }}>WAF (ACL) Section</Typography>
          {renderAclDetails(rule)}
        </>
      ) : null}
      {rule.nodeType === 'alb' || rule.Conditions ? (
        <>
          <Typography variant="subtitle2" sx={{ fontWeight: 500, mb: 1 }}>ALB Section</Typography>
          {renderAlbDetails(rule)}
        </>
      ) : null}
    </>
  );
}

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_API_KEY = import.meta.env.VITE_REACT_APP_OPENAI_API_KEY;

function useAISummary(rule, viewType) {
  const [aiSummary, setAiSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!rule || !OPENAI_API_KEY) {
      setAiSummary('');
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    async function fetchSummary() {
      setLoading(true);
      setError(null);
      setAiSummary('');
      const prompt = `You are an expert AWS cloud engineer. Summarize the following AWS ${viewType === 'alb' ? 'ALB' : viewType === 'combined' ? 'WAF and ALB' : 'WAF'} rule for a professional AWS manager.\n- Explain what the rule does, its action, and its impact in plain English.\n- Highlight any important labels, conditions, or priorities.\n- Briefly state why this rule is important for security or routing.\nRule JSON:\n${JSON.stringify(rule, null, 2)}`;
      try {
        const response = await fetch(OPENAI_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: 'You are an expert in AWS WAF and ALB rules. Answer as a professional AWS manager.' },
              { role: 'user', content: prompt }
            ],
            max_tokens: 256,
            temperature: 0.7,
          }),
        });
        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.statusText}`);
        }
        const data = await response.json();
        const aiText = data.choices?.[0]?.message?.content || '';
        if (!cancelled) setAiSummary(aiText);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to fetch AI summary.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchSummary();
    return () => { cancelled = true; };
  }, [rule, viewType]);

  return { aiSummary, loading, error };
}

const RuleDetailsContent = ({ rule, rules, onClose, showJsonTab = true, showCloseButton = false, viewType, activeSection }) => {
  const theme = useTheme();
  const [tab, setTab] = useState(0);
  const relationships = useMemo(() => rule && rules ? getRuleRelationships(rule, rules) : { dependencies: [], dependents: [] }, [rule, rules]);
  // Use AI summary hook
  const { aiSummary, loading: aiLoading, error: aiError } = useAISummary(rule, viewType);
  const fallbackSummary = useMemo(() => rule ? summarizeRule(rule, relationships) : '', [rule, relationships]);

  if (!rule) {
    return <Typography variant="body1" sx={{ color: '#888', p: 3 }}>Select a rule to see details.</Typography>;
  }

  // Tabs: Details, JSON (optional), Dependencies, Warnings
  const tabLabels = [
    'Details',
    ...(showJsonTab ? ['JSON'] : []),
    'Dependencies',
    'Warnings',
  ];

  // Determine which details renderer to use
  let detailsContent;
  if (viewType === 'alb') {
    detailsContent = renderAlbDetails(rule);
  } else if (viewType === 'combined') {
    detailsContent = renderCombinedDetails(rule);
  } else {
    detailsContent = renderAclDetails(rule);
  }

  // Helper renderers for each section
  const renderDetailsSection = () => (
    <>
      <Box sx={{ mb: 2, p: 2, bgcolor: '#f5f7fa', borderRadius: 2, minHeight: 64 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>🧠 AI Summary</Typography>
        {aiLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={18} />
            <Typography variant="body2" sx={{ color: '#888' }}>Generating summary...</Typography>
          </Box>
        ) : aiError ? (
          <Typography variant="body2" sx={{ color: 'error.main' }}>AI error: {aiError}<br/>Fallback: {fallbackSummary}</Typography>
        ) : aiSummary ? (
          <Typography variant="body2" sx={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>{aiSummary}</Typography>
        ) : (
          <Typography variant="body2" sx={{ color: '#888' }}>{fallbackSummary}</Typography>
        )}
      </Box>
      {detailsContent}
    </>
  );

  const renderJsonContent = () => (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>Statement</Typography>
      <pre style={{ 
        background: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f5f5f5', 
        padding: 12, 
        borderRadius: 4, 
        fontSize: 14, 
        maxWidth: '100%', 
        overflowX: 'auto',
        color: theme.palette.text.primary
      }}>{JSON.stringify(rule.Statement, null, 2)}</pre>
      
      {rule.VisibilityConfig && (
        <>
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Visibility Config</Typography>
          <pre style={{ 
            background: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f5f5f5', 
            padding: 12, 
            borderRadius: 4, 
            fontSize: 14, 
            maxWidth: '100%', 
            overflowX: 'auto',
            color: theme.palette.text.primary
          }}>{JSON.stringify(rule.VisibilityConfig, null, 2)}</pre>
        </>
      )}
    </Box>
  );

  const renderJsonSection = () => (
    <Box sx={{ p: 2 }}>
      <pre style={{ 
        background: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f5f5f5', 
        padding: 16, 
        borderRadius: 4, 
        fontSize: 14, 
        maxWidth: '100%', 
        overflowX: 'auto',
        color: theme.palette.text.primary
      }}>{getJson(rule)}</pre>
    </Box>
  );
  const renderDependenciesSection = () => (
    <>
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
    </>
  );
  const renderWarningsSection = () => (
    <>
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
    </>
  );

  // If activeSection is provided, render only that section (no tabs)
  if (activeSection) {
    let sectionContent = null;
    if (activeSection === 'details') sectionContent = renderDetailsSection();
    else if (activeSection === 'json') sectionContent = renderJsonSection();
    else if (activeSection === 'dependencies') sectionContent = renderDependenciesSection();
    else if (activeSection === 'warnings') sectionContent = renderWarningsSection();
    return (
      <Box sx={{ flex: 1, width: '100%', p: 4, boxSizing: 'border-box', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', m: 0 }}>
        {showCloseButton && (
          <IconButton onClick={onClose} sx={{ mb: 1 }} aria-label="Close details">
            <ArrowBackIcon />
          </IconButton>
        )}
        <Typography variant="h5" sx={{ mb: 2 }}>
          Rule: {rule.Name || rule.name || rule.id}
        </Typography>
        {sectionContent}
      </Box>
    );
  }

  // Default: render with tabs (popup/drawer mode)
  return (
    <Box sx={{ flex: 1, width: '100%', p: 4, boxSizing: 'border-box', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', m: 0 }}>
      {showCloseButton && (
        <IconButton onClick={onClose} sx={{ mb: 1 }} aria-label="Close details">
          <ArrowBackIcon />
        </IconButton>
      )}
      <Typography variant="h5" sx={{ mb: 2 }}>
        Rule: {rule.Name || rule.name || rule.id}
      </Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        {tabLabels.map((label, idx) => <Tab key={label} label={label} />)}
      </Tabs>
      <TabPanel value={tab} index={0}>{renderDetailsSection()}</TabPanel>
      {showJsonTab && (
        <TabPanel value={tab} index={1}>{renderJsonSection()}</TabPanel>
      )}
      <TabPanel value={tab} index={showJsonTab ? 2 : 1}>{renderDependenciesSection()}</TabPanel>
      <TabPanel value={tab} index={showJsonTab ? 3 : 2}>{renderWarningsSection()}</TabPanel>
    </Box>
  );
};

export default RuleDetailsContent; 