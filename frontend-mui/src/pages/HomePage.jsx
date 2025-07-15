import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Grid, Paper, useTheme, Fade, Stack, Chip } from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BugReportIcon from '@mui/icons-material/BugReport';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SecurityIcon from '@mui/icons-material/Security';
import SpeedIcon from '@mui/icons-material/Speed';
import InsightsIcon from '@mui/icons-material/Insights';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CloudIcon from '@mui/icons-material/Cloud';
import logo from '../assets/1002079229-removebg-preview.png';
import AWSLoginDialog from '../components/AWSLoginDialog';
import { useAWSCredentials } from '../context/AWSCredentialsContext';

export default function HomePage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [awsLoginOpen, setAwsLoginOpen] = useState(false);
  const { isAuthenticated, credentials } = useAWSCredentials();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const features = [
    {
      icon: <VisibilityIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      title: 'Interactive Visualization',
      description: 'Explore your WAF rules through dynamic, interactive graphs that show relationships and dependencies at a glance.',
      action: () => navigate('/explorer'),
    },
    {
      icon: <BugReportIcon sx={{ fontSize: 40, color: theme.palette.success.main }} />,
      title: 'Rule Testing & Debugging',
      description: 'Test your WAF rules against real requests and see exactly how they behave in different scenarios.',
      action: () => navigate('/debugger'),
    },
    {
      icon: <SmartToyIcon sx={{ fontSize: 40, color: theme.palette.secondary.main }} />,
      title: 'AI-Powered Insights',
      description: 'Get intelligent recommendations and explanations about your WAF rules from our AI assistant.',
      action: () => navigate('/ai'),
    },
  ];

  const benefits = [
    {
      icon: <SecurityIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />,
      title: 'Enhanced Security',
      description: 'Identify gaps and optimize your WAF configuration for better protection.',
    },
    {
      icon: <SpeedIcon sx={{ fontSize: 32, color: theme.palette.success.main }} />,
      title: 'Improved Performance',
      description: 'Streamline your rules for faster processing and reduced latency.',
    },
    {
      icon: <InsightsIcon sx={{ fontSize: 32, color: theme.palette.secondary.main }} />,
      title: 'Better Understanding',
      description: 'Visualize complex rule relationships that are impossible to see in code alone.',
    },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: theme.palette.background.default,
        position: 'relative',
        fontFamily: 'Poppins, sans-serif',
        pt: 8,
      }}
    >
      {/* Overlay for better contrast */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.15)',
          zIndex: 0,
        }}
      />
      {/* Hero Section */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          textAlign: 'center',
          px: 2,
        }}
      >
        <Fade in={isVisible} timeout={1000}>
          <Box>
            <img src={logo} alt="Logo" style={{ height: 90, marginBottom: 16 }} />
            <Typography
              variant="h2"
              sx={{
                fontWeight: 700,
                mb: 2,
                color: theme.palette.mode === 'dark' ? '#fff' : '#222',
                textShadow: theme.palette.mode === 'dark'
                  ? '0 2px 10px rgba(0,0,0,0.5)'
                  : '0 2px 10px rgba(0,0,0,0.1)',
                lineHeight: 1.2,
                fontSize: { xs: '2.2rem', sm: '3.5rem' },
              }}
            >
              Visualize & Optimize Your
              <br />
              <Box
                component="span"
                sx={{
                  background: 'linear-gradient(45deg, #1976d2, #2e7d32)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                WAF Rules
              </Box>
            </Typography>
            <Typography variant="h5" sx={{ mb: 3, color: theme.palette.text.secondary }}>
              Powerful AWS WAF visualization, debugging, and insights—made easy.
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
              <Button
                onClick={() => navigate('/explorer')}
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon />}
                sx={{
                  background: 'linear-gradient(45deg, #1976d2, #2e7d32)',
                  color: '#fff',
                  borderRadius: 3,
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  px: 4,
                  py: 1.5,
                  boxShadow: 2,
                  '&:hover': {
                    background: 'linear-gradient(45deg, #1565c0, #1b5e20)',
                    boxShadow: 4,
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                Start Visualizing
                <ArrowForwardIcon />
              </Button>
              
              <Button
                variant="outlined"
                size="large"
                startIcon={<CloudIcon />}
                onClick={() => setAwsLoginOpen(true)}
                sx={{
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  px: 4,
                  py: 1.5,
                  borderRadius: 3,
                }}
              >
                {isAuthenticated ? 'AWS Connected' : 'Connect AWS'}
              </Button>
            </Stack>
            
            {isAuthenticated && credentials && (
              <Box sx={{ mt: 2 }}>
                <Chip 
                  label={`AWS: ${credentials.accountId} (${credentials.region})`}
                  color="success"
                  size="small"
                />
              </Box>
            )}
          </Box>
        </Fade>
      </Box>
      {/* Features Section */}
      <Box sx={{ position: 'relative', zIndex: 1, mt: 8, mb: 6, px: 2 }}>
        <Typography variant="h4" align="center" sx={{ fontWeight: 600, mb: 4 }}>
          Key Features
        </Typography>
        <Grid container spacing={4} justifyContent="center">
          {features.map((feature, idx) => (
            <Grid xs={12} sm={6} md={4} key={feature.title}>
              <Paper elevation={3} sx={{ p: 3, textAlign: 'center', borderRadius: 4 }}>
                {feature.icon}
                <Typography variant="h6" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
                  {feature.title}
                </Typography>
                <Typography variant="body1" sx={{ mb: 2, color: 'text.secondary' }}>
                  {feature.description}
                </Typography>
                <Button
                  variant="outlined"
                  endIcon={<ArrowForwardIcon />}
                  onClick={feature.action}
                  sx={{ fontWeight: 500, borderRadius: 3, fontSize: '1rem', px: 3, py: 1, '&:hover': { background: theme.palette.action.hover } }}
                >
                  Explore
                </Button>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
      {/* Benefits Section */}
      <Box sx={{ position: 'relative', zIndex: 1, mb: 8, px: 2 }}>
        <Typography variant="h4" align="center" sx={{ fontWeight: 600, mb: 4 }}>
          Why Use This Tool?
        </Typography>
        <Grid container spacing={4} justifyContent="center">
          {benefits.map((benefit) => (
            <Grid xs={12} sm={6} md={4} key={benefit.title}>
              <Paper elevation={1} sx={{ p: 3, textAlign: 'center', borderRadius: 4 }}>
                {benefit.icon}
                <Typography variant="h6" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
                  {benefit.title}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {benefit.description}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
      
      <AWSLoginDialog 
        open={awsLoginOpen} 
        onClose={() => setAwsLoginOpen(false)} 
      />
    </Box>
  );
} 