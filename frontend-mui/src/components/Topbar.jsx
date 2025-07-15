import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import { useTheme } from '@mui/material/styles';
import Chip from '@mui/material/Chip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import { useThemeContext } from '../context/ThemeContext';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import logoLight from '../assets/1002079229-removebg-preview.png';
import logoDark from '../assets/1002079229-removebg-preview-modified.png';
import Button from '@mui/material/Button';
import DownloadIcon from '@mui/icons-material/Download';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import MenuIcon from '@mui/icons-material/Menu';
import Typography from '@mui/material/Typography';

export default function Topbar({ title = 'WAF Visualization Tool', viewMode, setViewMode, ruleSet, setRuleSet, clearAclData, clearAlbData, aclData, albData, setAclData, setAlbData, onMenuClick }) {
  const theme = useTheme();
  const { darkTheme } = useThemeContext();
  // Logo selection
  const [uploadMenuAnchor, setUploadMenuAnchor] = React.useState(null);
  const uploadMenuOpen = Boolean(uploadMenuAnchor);
  const handleUploadMenuOpen = (event) => setUploadMenuAnchor(event.currentTarget);
  const handleUploadMenuClose = () => setUploadMenuAnchor(null);
  const aclInputRef = React.useRef();
  const albInputRef = React.useRef();
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
        handleUpload(type, jsonData, file.name);
      } catch (error) {
        alert(`Error reading JSON file for ${type.toUpperCase()}: ${error.message}`);
      }
    };
    reader.readAsText(file);
  };

  // Upload handler
  const handleUpload = (type, data, name) => {
    if (type === 'acl') { setAclData(data); }
    else { setAlbData(data); }
  };

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
        {/* Left: Menu button and logo/title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {onMenuClick && (
            <IconButton edge="start" color="inherit" aria-label="open drawer" onClick={onMenuClick} sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
        </Box>
        {/* All controls on one line */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
          {/* Upload Data Dropdown */}
          <Box>
            <Button
              variant="outlined"
              size="small"
              onClick={handleUploadMenuOpen}
              sx={{ minWidth: 140, borderRadius: 3, fontWeight: 600, fontSize: '1rem', px: 3, py: 1 }}
            >
              {(aclData || albData) ? 'Replace Data' : 'Upload Data'}
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
              <MenuItem onClick={handleAclUploadClick}>Upload ACL/WAF JSON</MenuItem>
              <MenuItem onClick={handleAlbUploadClick}>Upload ALB JSON</MenuItem>
            </Menu>
          </Box>
          {/* Clear Data Buttons */}
          {aclData && (
            <Button variant="outlined" color="primary" size="small" onClick={clearAclData} sx={{ ml: 1, borderRadius: 3, fontWeight: 600, fontSize: '1rem', px: 3, py: 1 }}>
              Clear ACL
            </Button>
          )}
          {albData && (
            <Button variant="outlined" color="success" size="small" onClick={clearAlbData} sx={{ ml: 1, borderRadius: 3, fontWeight: 600, fontSize: '1rem', px: 3, py: 1 }}>
              Clear ALB
            </Button>
          )}
          {(aclData) && <Chip label="ACL Loaded" color="primary" size="small" sx={{ fontWeight: 500, letterSpacing: 0.5 }} />}
          {(albData) && <Chip label="ALB Loaded" color="success" size="small" sx={{ fontWeight: 500, letterSpacing: 0.5 }} />}
          <Chip label="JSON Mode" color="info" size="small" sx={{ fontWeight: 500, letterSpacing: 0.5 }} />
        </Box>
        {/* Right: Utilities */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Export">
            <IconButton size="small">
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Help / Legend">
            <IconButton size="small">
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
} 