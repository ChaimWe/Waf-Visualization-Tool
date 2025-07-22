import * as React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import Toolbar from '@mui/material/Toolbar';
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
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    // Optionally log error to a service
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, color: '#b71c1c', fontSize: 20 }}>
          <b>Something went wrong:</b> {String(this.state.error)}
        </div>
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
