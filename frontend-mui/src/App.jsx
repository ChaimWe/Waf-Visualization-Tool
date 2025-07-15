import * as React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import InboxIcon from '@mui/icons-material/MoveToInbox';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import MenuIcon from '@mui/icons-material/Menu';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import HomePage from './pages/HomePage';
import ExplorerPage from './pages/ExplorerPage';
import AboutPage from './pages/AboutPage';
import AlbPage from './pages/AlbPage';
import AlbAclPage from './pages/AlbAclPage';
import AIPage from './pages/AIPage';
import RequestDebugger from './debugger/RequestDebugger';
import { ThemeProvider } from './context/ThemeContext';
import { DataSourceProvider, useDataSource } from './context/DataSourceContext';
import { AWSCredentialsProvider } from './context/AWSCredentialsContext';

const drawerWidth = 240;

const navItems = [
  { text: 'Home', path: '/' },
  { text: 'Explorer', path: '/explorer' },
  { text: 'About', path: '/about' },
  { text: 'AI', path: '/ai' },
  { text: 'ALB', path: '/alb/1' }, // Example static ALB id for navigation
  { text: 'ALB + ACL', path: '/alb-acl/1/1' }, // Example static ids
];

export default function App(props) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false); // Sidebar collapsed by default
  const { aclData, albData, setAclData, setAlbData, clearAclData, clearAlbData } = useDataSource();

  return (
    <Router>
      <Box sx={{ width: '100%', height: '100vh', minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
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
              <Route path="/alb/:albId" element={<AlbPage />} />
              <Route path="/alb-acl/:albId/:aclId" element={<AlbAclPage />} />
            </Routes>
          </Box>
        </Box>
        <Box sx={{ width: '8px', minWidth: '8px', height: '100vh', background: 'transparent', flexShrink: 0 }} />
      </Box>
    </Router>
  );
}
