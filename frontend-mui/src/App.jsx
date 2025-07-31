import * as React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import Toolbar from '@mui/material/Toolbar';
import { Alert, Button, Typography } from '@mui/material';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import HomePage from './pages/HomePage';
import ExplorerPage from './pages/ExplorerPage';
import AboutPage from './pages/AboutPage';
import AIPage from './pages/AIPage';
import RequestDebugger from './debugger/RequestDebugger';
import { useDataSource } from './context/DataSourceContext';


class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('Global error caught:', error, errorInfo);
    this.setState({ errorInfo });
  }
  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '100vh',
          p: 4,
          textAlign: 'center'
        }}>
          <Alert severity="error" sx={{ mb: 3, maxWidth: 600 }}>
            <Typography variant="h6" gutterBottom>
              Something went wrong
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {this.state.error?.message || 'An unexpected error occurred'}
            </Typography>
            <Button 
              variant="contained" 
              onClick={() => window.location.reload()}
              sx={{ mt: 1 }}
            >
              Reload Application
            </Button>
          </Alert>
        </Box>
      );
    }
    return this.props.children;
  }
}


export default function App() {
  const [sidebarOpen, setSidebarOpen] = React.useState(false); // Sidebar collapsed by default
  const { aclData, albData, setAclData, setAlbData, clearAclData, clearAlbData } = useDataSource();

  return (
    <GlobalErrorBoundary>
      <Router>
        <Box sx={{ width: '100%', height: '100vh', minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'row' }}>
          <CssBaseline />
          <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} variant="permanent" />
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, width: '100%' }}>
            <Topbar
              title="WAF Visualization Tool"
              aclData={aclData}
              albData={albData}
              setAclData={setAclData}
              setAlbData={setAlbData}
              clearAclData={clearAclData}
              clearAlbData={clearAlbData}
            />
            <Box
              component="main"
              sx={{ flex: 1, width: '100%', minWidth: 0, minHeight: 0, background: '#f5f6fa', p: 0, m: 0, boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}
            >
              <Toolbar />
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/explorer" element={<ExplorerPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/ai" element={<AIPage />} />
                <Route path="/debugger" element={<RequestDebugger />} />
              </Routes>
            </Box>
          </Box>
          <Box sx={{ width: '8px', minWidth: '8px', height: '100vh', background: 'transparent', flexShrink: 0 }} />
        </Box>
      </Router>
    </GlobalErrorBoundary>
  );
}
