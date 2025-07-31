import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  IconButton,
  Fade,
  Tooltip,
  useTheme,
  Box,
  Divider,
} from '@mui/material';
import {
  AccountTree as TreeIcon,
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  BugReport as DebugIcon,
  SmartToy as AIIcon,
  MergeType as MergeIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
} from '@mui/icons-material';
import HomeIcon from '@mui/icons-material/Home';
import { useThemeContext } from '../context/ThemeContext';

const miniDrawerWidth = 56;
const drawerWidth = 240;

export default function Sidebar({ open, setOpen, variant = 'permanent' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { darkTheme, setDarkTheme } = useThemeContext();

  const isSelected = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.includes(path);
  };

  const handleThemeToggle = () => {
    setDarkTheme(!darkTheme);
  };

  const menuItems = [
    { key: 'home', label: 'Home', icon: <HomeIcon />, onClick: () => navigate('/') },
    { key: 'tree', label: 'WAF Tree', icon: <TreeIcon />, onClick: () => navigate('/explorer') },
    { key: 'debugger', label: 'Request Debugger', icon: <DebugIcon />, onClick: () => navigate('/debugger') },
    { key: 'ai', label: 'AI Assistant', icon: <AIIcon />, onClick: () => navigate('/ai') },
  ];

  return (
    <Drawer
      variant={variant}
      open={open}
      sx={{
        zIndex: 1300,
        width: open ? drawerWidth : miniDrawerWidth,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
        transition: theme.transitions.create('width', {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
        '& .MuiDrawer-paper': {
          width: open ? drawerWidth : miniDrawerWidth,
          boxSizing: 'border-box',
          background: theme.palette.mode === 'dark' ? '#181818' : '#fff',
          color: theme.palette.mode === 'dark' ? '#fff' : '#333',
          borderRight: 'none',
          boxShadow: '4px 0 12px rgba(0,0,0,0.1)',
          overflowX: 'hidden',
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          top: '64px',
          height: 'calc(100% - 64px)',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          px: [1],
        }}
      >
        <IconButton onClick={() => setOpen(!open)}>
          {open ? <ChevronLeftIcon sx={{ color: theme.palette.text.primary }} /> : <MenuIcon sx={{ color: theme.palette.text.primary }} />}
        </IconButton>
      </Toolbar>
      
      {/* Navigation Menu Items */}
      <List sx={{ flexGrow: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.key} disablePadding sx={{ display: 'block' }}>
            <ListItemButton
              selected={isSelected(item.key === 'home' ? '/' : item.key === 'tree' ? '/explorer' : item.key === 'debugger' ? '/debugger' : item.key === 'ai' ? '/ai' : '')}
              onClick={item.onClick}
              sx={{
                minHeight: 48,
                justifyContent: open ? 'initial' : 'center',
                px: open ? 2.5 : 1,
                '&.Mui-selected': {
                  bgcolor: theme.palette.action.selected,
                  '&:hover': {
                    bgcolor: theme.palette.action.selected,
                  },
                },
                '&:hover': {
                  bgcolor: theme.palette.action.hover,
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: open ? 2 : 'auto',
                  justifyContent: 'center',
                  color: theme.palette.text.primary,
                }}
              >
                <Tooltip title={!open ? item.label : ''} placement="right">
                  <span>{item.icon}</span>
                </Tooltip>
              </ListItemIcon>
              <Fade in={open} timeout={400} unmountOnExit>
                <ListItemText
                  primary={item.label}
                  sx={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    '& .MuiTypography-root': {
                      fontWeight: isSelected(item.path) ? 600 : 400,
                      color: theme.palette.text.primary,
                    },
                  }}
                />
              </Fade>
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* Theme Toggle at Bottom */}
      <Box sx={{ p: 1 }}>
        <Divider sx={{ mb: 1 }} />
        <ListItem disablePadding sx={{ display: 'block' }}>
          <ListItemButton
            onClick={handleThemeToggle}
            sx={{
              minHeight: 48,
              justifyContent: open ? 'initial' : 'center',
              px: open ? 2.5 : 1,
              '&:hover': {
                bgcolor: theme.palette.action.hover,
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: open ? 2 : 'auto',
                justifyContent: 'center',
                color: theme.palette.text.primary,
              }}
            >
              <Tooltip title={!open ? (darkTheme ? 'Light Mode' : 'Dark Mode') : ''} placement="right">
                <span>
                  {darkTheme ? <LightModeIcon /> : <DarkModeIcon />}
                </span>
              </Tooltip>
            </ListItemIcon>
            <Fade in={open} timeout={400} unmountOnExit>
              <ListItemText
                primary={darkTheme ? 'Light Mode' : 'Dark Mode'}
                sx={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  '& .MuiTypography-root': {
                    color: theme.palette.text.primary,
                  },
                }}
              />
            </Fade>
          </ListItemButton>
        </ListItem>
      </Box>
    </Drawer>
  );
} 