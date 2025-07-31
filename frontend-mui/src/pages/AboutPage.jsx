import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Paper, useTheme, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function AboutPage() {
  const navigate = useNavigate();
  const theme = useTheme();

  const features = [
    'Interactive WAF/ALB Visualization: Dynamic graph-based interface showing relationships between AWS WAF and ALB rules',
    'Rule Testing & Debugging: Test your WAF rules against real requests with our advanced debugger',
    'AI-Powered Insights: Get intelligent recommendations and explanations about your WAF rules',
    'Multi-Data Source Support: Connect to AWS live or upload JSON configurations for offline analysis',
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: theme.palette.background.default,
        fontFamily: 'Poppins, sans-serif',
        pt: 8,
        px: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Box sx={{ mt: 4, mb: 2, textAlign: 'center' }}>
        <SecurityIcon sx={{ fontSize: 90, color: theme.palette.primary.main, mb: 2 }} />
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, color: theme.palette.primary.main }}>
          About WAF Visualization Tool
        </Typography>
      </Box>
      <Box sx={{ maxWidth: 800, width: '100%' }}>
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, borderRadius: 4, mb: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
            Purpose
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Our WAF Visualization Tool is designed to simplify the complex task of managing AWS Web Application Firewall (WAF) and Application Load Balancer (ALB) rules. By providing intuitive visual representations of rule relationships and dependencies, we help security teams better understand, debug, and optimize their AWS security configurations.
          </Typography>
        </Paper>
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, borderRadius: 4, mb: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
            Key Features
          </Typography>
          <List>
            {features.map((feature, idx) => (
              <ListItem key={idx} sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText primary={feature} />
              </ListItem>
            ))}
          </List>
        </Paper>
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, borderRadius: 4, mb: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
            How It Works
          </Typography>
          <Typography variant="body1">
            The tool connects to your AWS WAF and ALB configurations through secure API calls or accepts uploaded JSON files. It creates interactive visual representations of your rules and their relationships, allowing you to explore dependencies, analyze rule patterns, test requests, and get AI-powered insights for optimization.
          </Typography>
        </Paper>
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/explorer')}
            sx={{ fontWeight: 600, px: 4, py: 1.5, borderRadius: 3, fontSize: '1.1rem', boxShadow: 2, background: 'linear-gradient(45deg, #1976d2, #2e7d32)', color: '#fff', '&:hover': { background: 'linear-gradient(45deg, #1565c0, #1b5e20)', boxShadow: 4, transform: 'translateY(-2px)' } }}
          >
            Start Visualizing
          </Button>
        </Box>
      </Box>
    </Box>
  );
} 