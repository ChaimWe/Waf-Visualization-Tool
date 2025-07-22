import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, TextField, Button, Typography, CircularProgress, Paper, Select, MenuItem, FormControl, InputLabel, Switch, FormControlLabel } from '@mui/material';
import { useTheme } from '@mui/material';
import { useThemeContext } from '../../context/ThemeContext';
import SmartToyIcon from '@mui/icons-material/SmartToy';

// Instructions for different AI response styles
const styleInstructions = {
  concise: 'Summarize each rule briefly.',
  detailed: 'Provide a detailed, step-by-step explanation for each rule.',
  table: 'Return your answer as a markdown table, no extra text.',
  bullet: 'Return your answer as a list of bullet points, one per line, no extra text.',
  human: 'Explain the rules in simple, non-technical language.',
  json: 'Return only a JSON object as specified.'
};

function parseMarkdownTable(md) {
  const lines = md.trim().split(/\r?\n/).filter(line => line.trim().startsWith('|'));
  if (lines.length < 2) return null;
  const header = lines[0].split('|').map(cell => cell.trim()).filter(Boolean);
  const rows = lines.slice(2).map(line => line.split('|').map(cell => cell.trim()).filter(Boolean));
  return { header, rows };
}

function renderMarkdownTable(md) {
  const table = parseMarkdownTable(md);
  if (!table) return <span>{md}</span>;
  return (
    <table style={{ borderCollapse: 'collapse', width: '100%', margin: '8px 0' }}>
      <thead>
        <tr>
          {table.header.map((cell, i) => (
            <th key={i} style={{ border: '1px solid #ccc', padding: 4, background: '#f5f5f5', fontWeight: 'bold' }}>{cell}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j} style={{ border: '1px solid #ccc', padding: 4 }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function renderJsonBlock(text) {
  let json = null;
  try {
    const match = text.match(/```json([\s\S]*?)```/i);
    if (match) {
      json = JSON.parse(match[1]);
    } else {
      json = JSON.parse(text.replace(/```json|```/g, ''));
    }
  } catch {
    return <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4 }}>{text}</pre>;
  }
  return <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4 }}>{JSON.stringify(json, null, 2)}</pre>;
}

export default function AIChatPanel({ rule, allRules, edges = [], isAIPage = false }) {
  const theme = useTheme();
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Chat state management
  const [messages, setMessages] = useState([
    { sender: 'ai', text: isAIPage
      ? 'Hi! Ask me anything about your WAF rules and I will help you understand, analyze, or improve them.'
      : 'Hi! Ask me anything about this rule and I will help you understand or improve it.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [responseStyle, setResponseStyle] = useState('concise');
  const [seeAllRules, setSeeAllRules] = useState(true);
  const [scrollSpeed, setScrollSpeed] = useState('normal');
  const [activeTab, setActiveTab] = useState('chat');
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Calculate parent and child rules for the current rule
  const ruleId = String(rule?.id || '');
  const parentIds = edges.filter(e => String(e.target) === ruleId).map(e => String(e.source));
  const childIds = edges.filter(e => String(e.source) === ruleId).map(e => String(e.target));
  const parentRules = (allRules || []).filter((r, index) => parentIds.includes(String(index)));
  const childRules = (allRules || []).filter((r, index) => childIds.includes(String(index)));
  const parentNames = parentRules.map(r => r.Name).join(', ') || 'None';
  const childNames = childRules.map(r => r.Name).join(', ') || 'None';

  // Scroll logic
  const isAtBottom = () => {
    const container = containerRef.current;
    if (!container) return false;
    const threshold = 20;
    return container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
  };

  const handleScroll = useCallback(() => {
    setShouldAutoScroll(isAtBottom());
  }, []);

  const scrollToBottom = useCallback(() => {
    if (!shouldAutoScroll || !containerRef.current) return;
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [shouldAutoScroll]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // Accepts a flag to distinguish between keyboard (Enter) and mouse (button)
  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { sender: 'user', text: input };
    setMessages(msgs => [...msgs, userMsg]);
    setLoading(true);
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 50); // Slight delay helps if input is re-rendered

    try {
      const apiKey = import.meta.env.VITE_REACT_APP_OPENAI_API_KEY;
      // WARNING: Sending all rules may hit token limits for very large datasets.
      const context = seeAllRules && Array.isArray(allRules) && allRules.length > 0
        ? `Rules: ${JSON.stringify(allRules)}`
        : rule && Object.keys(rule).length > 0
          ? `Rule: ${JSON.stringify(rule)}`
          : '';
      const prompt = `${context}\nUser: ${input}\nAI:`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are an expert in AWS WAF rules. Answer user questions about the rules provided.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 512,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        let errorMsg = `OpenAI API error: ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.error && errorData.error.message) {
            errorMsg += ` - ${errorData.error.message}`;
          }
        } catch {}
        throw new Error(errorMsg);
      }
      const data = await response.json();
      const aiText = data.choices?.[0]?.message?.content || 'No response from AI.';
      setMessages(msgs => [...msgs, { sender: 'ai', text: aiText }]);
    } catch (err) {
      setMessages(msgs => [...msgs, { sender: 'ai', text: `Error: ${err.message || err}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleStyleChange = (e) => {
    setResponseStyle(e.target.value);
    setMessages([
      { sender: 'ai', text: isAIPage
        ? 'Hi! Ask me anything about your WAF rules and I will help you understand, analyze, or improve them.'
        : (rule?.id ? 'Hi! Ask me anything about this rule and I will help you understand or improve it.' : 'Hi! Ask me anything about your WAF rules and I will help you understand, analyze, or improve them.') }
    ]);
    setInput('');
  };

  const renderAiMessage = (msg) => {
    if (msg.sender !== 'ai') return <span>{msg.text}</span>;
    if (responseStyle === 'bullet') {
      const lines = msg.text
        .split(/\n|\r/)
        .map(line => line.trim())
        .filter(line => line && (line.startsWith('-') || line.startsWith('•') || /^[a-zA-Z0-9]/.test(line)));
      return (
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {lines.map((line, idx) => (
            <li key={idx} style={{ marginBottom: 4 }}>{line.replace(/^[-•]\s*/, '')}</li>
          ))}
        </ul>
      );
    }
    if (responseStyle === 'table' && msg.text.includes('|')) {
      return renderMarkdownTable(msg.text);
    }
    if (responseStyle === 'json') {
      return renderJsonBlock(msg.text);
    }
    if (['detailed', 'human', 'concise'].includes(responseStyle)) {
      const html = msg.text.replace(/^(#+)\s*(.*)$/gm, (m, hashes, title) => `<b>${title.trim()}</b>`)
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/\n/g, '<br/>');
      return <span dangerouslySetInnerHTML={{ __html: html }} />;
    }
    return <span>{msg.text}</span>;
  };

  return (
    <Paper elevation={6} sx={{
      p: 0,
      mt: 0,
      width: '100%',
      minWidth: 900,
      borderRadius: 4,
      boxShadow: 6,
      background: theme.palette.background.paper,
      color: theme.palette.text.primary,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: 480,
      position: 'relative',
    }}>
      {/* Header with settings icon */}
      <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <SmartToyIcon color="primary" sx={{ fontSize: 28, mr: 1 }} />
        <Typography variant="h6" fontWeight={700} sx={{ flex: 1, textAlign: 'center' }}>
          AI Chat
        </Typography>
        <Button
          aria-label="Settings"
          onClick={() => setSettingsOpen(true)}
          sx={{ minWidth: 0, p: 0.5, ml: 'auto' }}
        >
          <span role="img" aria-label="settings">⚙️</span>
        </Button>
      </Box>
      {/* Settings Popover */}
      {settingsOpen && (
        <Box sx={{
          position: 'absolute',
          top: 56,
          right: 16,
          zIndex: 10,
          bgcolor: theme.palette.background.paper,
          boxShadow: 4,
          borderRadius: 2,
          p: 2,
          minWidth: 180,
        }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Settings</Typography>
          <FormControl size="small" sx={{ minWidth: 140, mb: 1 }}>
            <InputLabel>Style</InputLabel>
            <Select value={responseStyle} label="Style" onChange={handleStyleChange}>
              <MenuItem value="concise">Concise</MenuItem>
              <MenuItem value="detailed">Detailed</MenuItem>
              <MenuItem value="bullet">Bullet</MenuItem>
              <MenuItem value="table">Table</MenuItem>
              <MenuItem value="human">Human</MenuItem>
              <MenuItem value="json">JSON</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ textAlign: 'right' }}>
            <Button size="small" onClick={() => setSettingsOpen(false)}>Close</Button>
          </Box>
        </Box>
      )}
      {/* Chat Area */}
      <Box ref={containerRef} sx={{
        width: '100%',
        flex: 1,
        minHeight: 500,
        overflowY: 'auto',
        p: 2,
        background: theme.palette.mode === 'dark' ? '#23272f' : '#f7f9fc',
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}>
        {messages.map((msg, idx) => (
          <Box
            key={idx}
            sx={{
              display: 'flex',
              justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              width: '100%',
            }}
          >
            <Box
              sx={{
                maxWidth: '85%',
                bgcolor: msg.sender === 'user' ? 'primary.main' : 'grey.200',
                color: msg.sender === 'user' ? '#fff' : 'text.primary',
                px: 2,
                py: 1,
                borderRadius: 3,
                mb: 0.5,
                boxShadow: 1,
                fontSize: 15,
                wordBreak: 'break-word',
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: msg.sender === 'user' ? 600 : 400, color: msg.sender === 'user' ? '#fff' : 'secondary.main', mb: 0.5 }}>
                {msg.sender === 'user' ? 'You' : 'AI'}:
              </Typography>
              <Box>{renderAiMessage(msg)}</Box>
            </Box>
          </Box>
        ))}
        <div ref={messagesEndRef} />
      </Box>
      {/* Input Area */}
      <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1, p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
        <TextField
          fullWidth
          size="small"
          variant="outlined"
          placeholder="Type your question..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
          sx={{ bgcolor: '#fff', borderRadius: 2 }}
          inputRef={inputRef}
          autoFocus
        />
        <Button
          variant="contained"
          onMouseDown={e => e.preventDefault()} // Prevent button from taking focus
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          sx={{
            minWidth: 90,
            fontWeight: 600,
            borderRadius: 3,
            fontSize: '1.1rem',
            px: 2,
            py: 1,
            background: 'linear-gradient(45deg, #1976d2, #2e7d32)',
            color: '#fff',
            boxShadow: 2,
            '&:hover': {
              background: 'linear-gradient(45deg, #1565c0, #1b5e20)',
              boxShadow: 4,
              transform: 'translateY(-2px)'
            }
          }}
        >
          {loading ? <CircularProgress size={20} /> : 'Send'}
        </Button>
      </Box>
    </Paper>
  );
} 