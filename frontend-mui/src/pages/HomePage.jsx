import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Stack, Grid, useTheme } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import logo from '../assets/Lightmode-logo.png';
import AWSLoginDialog from '../components/AWSLoginDialog';
import { useAWSCredentials } from '../context/AWSCredentialsContext';

export default function HomePage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const [awsLoginOpen, setAwsLoginOpen] = useState(false);

  const features = [
    {
      icon: <RemoveRedEyeIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      title: 'Interactive Visualization',
      description: 'Explore your WAF rules through dynamic, interactive graphs that show relationships and dependencies at a glance.',
      action: () => navigate('/explorer'),
    },
    {
      icon: <AccountTreeIcon sx={{ fontSize: 40, color: theme.palette.success.main }} />,
      title: 'Rule Testing & Debugging',
      description: 'Test your WAF rules against real requests and see exactly how they behave in different scenarios.',
      action: () => navigate('/debugger'),
    },
    {
      icon: <CloudUploadIcon sx={{ fontSize: 40, color: theme.palette.secondary.main }} />,
      title: 'AI-Powered Insights',
      description: 'Get intelligent recommendations and explanations about your WAF rules from our AI assistant.',
      action: () => navigate('/ai'),
    },
  ];

  const benefits = [
    {
      icon: <CheckCircleIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />,
      title: 'Enhanced Security',
      description: 'Identify gaps and optimize your WAF configuration for better protection.',
    },
    {
      icon: <CheckCircleIcon sx={{ fontSize: 32, color: theme.palette.success.main }} />,
      title: 'Improved Performance',
      description: 'Streamline your rules for faster processing and reduced latency.',
    },
    {
      icon: <CheckCircleIcon sx={{ fontSize: 32, color: theme.palette.secondary.main }} />,
      title: 'Better Understanding',
      description: 'Visualize complex rule relationships that are impossible to see in code alone.',
    },
  ];

  return (
    <Box sx={{ fontFamily: 'Poppins, sans-serif' }}>
      {/* Hero Section */}
      <Box
        sx={{
          backgroundColor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#f5f5f5',
          textAlign: 'center',
          py: 10,
          px: 2,
        }}
      >
        <img src={logo} alt="Logo" style={{ height: 80, marginBottom: 20 }} />
        <Typography variant="h2" fontWeight={700} gutterBottom>
          Powerful Visualization and Management
        </Typography>
        <Typography variant="h4" color="text.secondary" gutterBottom>
          For Your AWS WAF ACL and ALB Rules
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, margin: '0 auto', mb: 4 }}>
          Instantly explore complex rule sets, analyze dependencies, and debug your Web ACL or ALB configurations — all in one intuitive interface.
        </Typography>
        <Button
          variant="contained"
          size="large"
          startIcon={<RemoveRedEyeIcon />}
          onClick={() => navigate('/explorer')}
          sx={{ borderRadius: 3, fontWeight: 600, px: 4, py: 1.5 }}
        >
          Start Visualization
        </Button>
      </Box>

      {/* Features Section */}
      <Box sx={{ py: 8, px: 2 }}>
        <Typography variant="h4" align="center" fontWeight={700} gutterBottom>
          Key Features
        </Typography>
        <Grid container spacing={4} justifyContent="center">
          {features.map((feature) => (
            <Grid item xs={12} sm={6} md={4} key={feature.title}>
              <Box sx={{ textAlign: 'center', p: 3 }}>
                {feature.icon}
                <Typography variant="h6" fontWeight={600} sx={{ mt: 2 }}>
                  {feature.title}
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  {feature.description}
                </Typography>
                <Button
                  variant="outlined"
                  endIcon={<RemoveRedEyeIcon />}
                  onClick={feature.action}
                  sx={{ borderRadius: 3, px: 3 }}
                >
                  Explore
                </Button>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Benefits Section */}
      <Box sx={{ py: 8, px: 2, backgroundColor: theme.palette.mode === 'dark' ? '#121212' : '#fafafa' }}>
        <Typography variant="h4" align="center" fontWeight={700} gutterBottom>
          Why Use This Tool?
        </Typography>
        <Grid container spacing={4} justifyContent="center">
          {benefits.map((benefit) => (
            <Grid item xs={12} sm={6} md={4} key={benefit.title}>
              <Box sx={{ textAlign: 'center', p: 3 }}>
                {benefit.icon}
                <Typography variant="h6" fontWeight={600} sx={{ mt: 2 }}>
                  {benefit.title}
                </Typography>
                <Typography color="text.secondary">
                  {benefit.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>

      <AWSLoginDialog open={awsLoginOpen} onClose={() => setAwsLoginOpen(false)} />
    </Box>
  );
}
