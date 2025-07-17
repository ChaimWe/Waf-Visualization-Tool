import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import { useTheme } from '@mui/material/styles';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';  
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import DownloadIcon from '@mui/icons-material/Download';
// import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import MenuIcon from '@mui/icons-material/Menu';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/1002079229-removebg-preview.png';
import DeleteIcon from '@mui/icons-material/Delete';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import UploadIcon from '@mui/icons-material/Upload';
import { useDataSource } from '../context/DataSourceContext';
import Chip from '@mui/material/Chip';

export default function Topbar({ title = 'WAF Visualization Tool', aclData, albData, setAclData, setAlbData, clearAclData, clearAlbData, onMenuClick }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { awsMode } = useDataSource();
  // Upload menu
  const [uploadMenuAnchor, setUploadMenuAnchor] = React.useState(null);
  const uploadMenuOpen = Boolean(uploadMenuAnchor);
  const handleUploadMenuOpen = (event) => setUploadMenuAnchor(event.currentTarget);
  const handleUploadMenuClose = () => setUploadMenuAnchor(null);
  const aclInputRef = React.useRef();
  const albInputRef = React.useRef();
  const [deleteType, setDeleteType] = React.useState(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [hoveredDelete, setHoveredDelete] = React.useState(null);
  const [alert, setAlert] = React.useState({ open: false, message: '', severity: 'info' });
  const alertTimeoutRef = React.useRef();

  // Helper to show alert with auto-close
  const showAlert = (message, severity = 'info') => {
    setAlert({ open: true, message, severity });
    if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    alertTimeoutRef.current = setTimeout(() => {
      setAlert(a => ({ ...a, open: false }));
    }, 1500);
  };

  const handleAclUploadClick = () => {
    handleUploadMenuClose();
    setTimeout(() => {
      aclInputRef.current.click();
    }, 100);
  };
  const handleAlbUploadClick = () => {
    handleUploadMenuClose();
    setTimeout(() => {
      albInputRef.current.click();
    }, 100);
  };
  const handleFileChange = (type, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target.result);
        if (!jsonData || !Array.isArray(jsonData.Rules)) {
          showAlert(`Uploaded file must have a top-level 'Rules' array.`, 'error');
          console.error('Invalid file structure:', jsonData);
          // Reset input value so user can re-upload
          if (type === 'acl' && aclInputRef.current) aclInputRef.current.value = '';
          if (type === 'alb' && albInputRef.current) albInputRef.current.value = '';
          return;
        }
        handleUpload(type, jsonData, file.name);
        showAlert(`${type === 'acl' ? 'WAF' : 'ALB'} file uploaded successfully!`, 'success');
        console.log(`${type === 'acl' ? 'WAF' : 'ALB'} file uploaded:`, jsonData);
      } catch (error) {
        showAlert(`Error reading JSON file for ${type.toUpperCase()}: ${error.message}`, 'error');
        console.error('JSON parse error:', error);
      }
      // Always reset input value after upload
      if (type === 'acl' && aclInputRef.current) aclInputRef.current.value = '';
      if (type === 'alb' && albInputRef.current) albInputRef.current.value = '';
    };
    reader.readAsText(file);
  };
  // Upload handler
  const handleUpload = (type, data, name) => {
    if (type === 'acl') { setAclData(data); }
    else { setAlbData(data); }
  };
  // Delete logic
  const handleDeleteClick = (type) => {
    setDeleteType(type);
    setConfirmOpen(true);
  };
  const handleConfirmDelete = () => {
    if (deleteType === 'acl') {
      clearAclData();
      if (aclInputRef.current) aclInputRef.current.value = '';
      showAlert('WAF file deleted!', 'error');
    }
    if (deleteType === 'alb') {
      clearAlbData();
      if (albInputRef.current) albInputRef.current.value = '';
      showAlert('ALB file deleted!', 'error');
    }
    setConfirmOpen(false);
    setDeleteType(null);
  };
  const handleCancelDelete = () => {
    setConfirmOpen(false);
    setDeleteType(null);
  };
  // Count loaded files
  const loadedFiles = [aclData, albData].filter(Boolean).length;
  return (
    <AppBar
      position="fixed"
      sx={{
        width: '100%',
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        zIndex: theme.zIndex.drawer + 1,
        boxShadow: theme.shadows[2],
      }}
      elevation={1}
    >
      <Toolbar sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 40, px: 2, py: 0, gap: 2, flexWrap: 'nowrap' }}>
        {/* Left: Logo button */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/')} sx={{ p: 0, mr: 1 }}>
            <img src={logo} alt="Logo" style={{ height: 56, width: 56, objectFit: 'contain' }} />
          </IconButton>
          {onMenuClick && (
            <IconButton edge="start" color="inherit" aria-label="open drawer" onClick={onMenuClick} sx={{ ml: 1 }}>
              <MenuIcon />
            </IconButton>
          )}
        </Box>
        {/* Center: Upload and delete controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, justifyContent: { xs: 'flex-end', sm: 'center' } }}>
          {/* Upload Data Dropdown */}
          <Button
            variant="contained"
            size="medium"
            onClick={handleUploadMenuOpen}
            disabled={loadedFiles >= 2}
            startIcon={<UploadIcon />}
            sx={{
              minWidth: 140,
              borderRadius: 4,
              fontWeight: 700,
              fontSize: '1.05rem',
              px: { xs: 2, sm: 4 },
              py: 1.5,
              background: 'linear-gradient(90deg, #43a047 0%, #66bb6a 100%)',
              color: '#fff',
              boxShadow: 2,
              textTransform: 'none',
              letterSpacing: 0.5,
              '&:hover': {
                background: 'linear-gradient(90deg, #388e3c 0%, #43a047 100%)',
                boxShadow: 4,
              },
              transition: 'all 0.2s',
            }}
          >
            Upload Files
          </Button>
          {/* Hidden file inputs always present in DOM */}
          <input
            type="file"
            accept="application/json"
            ref={aclInputRef}
            onChange={e => handleFileChange('acl', e)}
            style={{ display: 'none' }}
          />
          <input
            type="file"
            accept="application/json"
            ref={albInputRef}
            onChange={e => handleFileChange('alb', e)}
            style={{ display: 'none' }}
          />
          <Menu anchorEl={uploadMenuAnchor} open={uploadMenuOpen} onClose={handleUploadMenuClose}>
            <MenuItem onClick={handleAclUploadClick}>ACL-WAF JSON</MenuItem>
            <MenuItem onClick={handleAlbUploadClick}>ALB JSON</MenuItem>
          </Menu>
          {/* Delete buttons for WAF/ALB */}
          {aclData && (
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              onClick={() => handleDeleteClick('acl')}
              onMouseEnter={() => setHoveredDelete('acl')}
              onMouseLeave={() => setHoveredDelete(null)}
              sx={{
                borderRadius: 3,
                fontWeight: 600,
                fontSize: '1rem',
                px: 2,
                py: 1,
                ml: 1,
                color: hoveredDelete === 'acl' ? '#fff' : theme.palette.grey[700],
                borderColor: hoveredDelete === 'acl' ? theme.palette.error.main : theme.palette.grey[400],
                background: hoveredDelete === 'acl' ? theme.palette.error.main : 'transparent',
                width: 64,
                minWidth: 64,
                maxWidth: 64,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
            >
              {hoveredDelete === 'acl' ? <DeleteIcon sx={{ color: '#fff' }} /> : 'WAF'}
            </Button>
          )}
          {albData && (
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              onClick={() => handleDeleteClick('alb')}
              onMouseEnter={() => setHoveredDelete('alb')}
              onMouseLeave={() => setHoveredDelete(null)}
              sx={{
                borderRadius: 3,
                fontWeight: 600,
                fontSize: '1rem',
                px: 2,
                py: 1,
                ml: 1,
                color: hoveredDelete === 'alb' ? '#fff' : theme.palette.grey[700],
                borderColor: hoveredDelete === 'alb' ? theme.palette.error.main : theme.palette.grey[400],
                background: hoveredDelete === 'alb' ? theme.palette.error.main : 'transparent',
                width: 64,
                minWidth: 64,
                maxWidth: 64,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
            >
              {hoveredDelete === 'alb' ? <DeleteIcon sx={{ color: '#fff' }} /> : 'ALB'}
            </Button>
          )}
          {/* Confirmation dialog */}
          {confirmOpen && (
            <Box sx={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 2000, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box sx={{ background: '#fff', p: 4, borderRadius: 2, boxShadow: 4, minWidth: 280 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Delete {deleteType === 'acl' ? 'WAF' : 'ALB'} file?</Typography>
                <Typography variant="body2" sx={{ mb: 3 }}>Are you sure you want to delete this file? This action cannot be undone.</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                  <Button onClick={handleCancelDelete} variant="outlined">Cancel</Button>
                  <Button onClick={handleConfirmDelete} variant="contained" color="error">Delete</Button>
                </Box>
              </Box>
            </Box>
          )}
        </Box>
        {/* Right: Utilities */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Online/Offline mode indicator (moved here, smaller, friendlier color) */}
          <Chip
            label={awsMode ? 'Online mode' : 'Offline mode'}
            color={awsMode ? 'primary' : 'default'}
            size="small"
            sx={{ fontWeight: 500, fontSize: '0.95rem', px: 1, mr: 1 }}
          />
          {/* Replace Download icon with profile photo */}
          <Tooltip title="Profile">
            <IconButton size="small">
              <Avatar sx={{ width: 48, height: 48 }}>U</Avatar>
            </IconButton>
          </Tooltip>
          {/* <Tooltip title="Help / Legend">
            <IconButton size="small">
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip> */}
        </Box>
      </Toolbar>
      {/* Alert for upload status */}
      {alert.open && (
        <Box sx={{ position: 'fixed', top: 80, left: 0, width: '100vw', zIndex: 3000, display: 'flex', justifyContent: 'center' }}>
          <Box sx={{ minWidth: 320 }}>
            <Alert severity={alert.severity}>
              {alert.message}
            </Alert>
          </Box>
        </Box>
      )}
    </AppBar>
  );
} 