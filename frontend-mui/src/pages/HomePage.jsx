import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BugReportIcon from '@mui/icons-material/BugReport';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';

const FeatureCard = ({ icon, title, description }) => (
  <Box
    sx={{
      width: { xs: '100%', sm: '300px' },
      height: '300px',
      border: '1px solid #e0e0e0',
      borderRadius: '16px',
      boxShadow: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      p: 2,
      m: 1,
      textAlign: 'center',
      transition: 'transform 0.3s',
      '&:hover': {
        transform: 'scale(1.02)',
      },
    }}
  >
    <Box sx={{ fontSize: 40, mb: 1 }}>{icon}</Box>
    <Typography variant="h6" fontWeight="bold" gutterBottom>
      {title}
    </Typography>
    <Typography variant="body2" color="text.secondary">
      {description}
    </Typography>
  </Box>
);

const Section = ({ title, features, bgColor }) => (
  <Box sx={{ backgroundColor: bgColor, py: 6, px: 2 }}>
    <Typography variant="h4" align="center" fontWeight="bold" gutterBottom>
      {title}
    </Typography>
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      justifyContent="center"
      alignItems="center"
      flexWrap="wrap"
      spacing={2}
    >
      {features.map((feature, index) => (
        <FeatureCard key={index} {...feature} />
      ))}
    </Stack>
  </Box>
);

const HomePage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <VisibilityIcon color="primary" fontSize="large" />,
      title: 'Interactive Visualization',
      description:
        'Explore your WAF rules through dynamic, interactive graphs that show relationships and dependencies at a glance.',
    },
    {
      icon: <BugReportIcon color="success" fontSize="large" />,
      title: 'Rule Testing & Debugging',
      description:
        'Test your WAF rules against real requests and see exactly how they behave in different scenarios.',
    },
    {
      icon: <CloudUploadIcon sx={{ color: 'purple' }} fontSize="large" />,
      title: 'AI-Powered Insights',
      description:
        'Get intelligent recommendations and explanations about your WAF rules from our AI assistant.',
    },
  ];

  const whyUse = [
    {
      icon: <VisibilityIcon color="primary" fontSize="large" />,
      title: 'Instant Clarity',
      description:
        'Visualizing your rules helps uncover logic issues and hidden dependencies.',
    },
    {
      icon: <BugReportIcon color="success" fontSize="large" />,
      title: 'Save Time & Errors',
      description:
        'Debugging visually is faster and helps reduce misconfigurations.',
    },
    {
      icon: <CloudUploadIcon sx={{ color: 'purple' }} fontSize="large" />,
      title: 'AI-Driven Efficiency',
      description:
        'Let our assistant help you refine your rule sets with confidence.',
    },
  ];

  return (
    <Box>
      {/* Header Section */}
      <Box
        sx={{
          backgroundColor: '#f5f6fa',
          py: 10,
          px: 2,
          textAlign: 'center',
        }}
      >
        <Typography variant="h3" fontWeight="bold" gutterBottom>
          Powerful Visualization for Your AWS WAF ACL
        </Typography>
        <Typography variant="h5" gutterBottom>
          Analyze, Understand, and Optimize Your Rules Instantly
        </Typography>
        <Typography variant="body1" color="text.secondary" mb={4}>
          Upload your JSON config and explore your rule structure, dependencies, and logic flow — effortlessly.
        </Typography>
        <Button size="large" variant="contained" onClick={() => navigate('/explorer')}>
          Start Visualization
        </Button>
      </Box>

      {/* Key Features Section */}
      <Section title="Key Features" features={features} bgColor="#ffffff" />

      {/* Why Use Section */}
      <Section title="Why Use This Tool?" features={whyUse} bgColor="#f5f6fa" />
    </Box>
  );
};

export default HomePage;
