import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { 
  Box, 
  AppBar, 
  Toolbar, 
  IconButton, 
  Typography, 
  Drawer, 
  List, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Divider, 
  Chip,
  Avatar,
  useTheme,
  useMediaQuery,
  Tooltip
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Campaign as CampaignIcon,
  Person as PersonIcon,
  Assessment as AssessmentIcon,
  Settings as SettingsIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { startCampaign, stopCampaign } from '../services/api';

interface MainLayoutProps {
  systemStatus: string;
}

const MainLayout: React.FC<MainLayoutProps> = ({ systemStatus }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const drawerWidth = 240;

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setDrawerOpen(false);
    }
  };

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleStartCampaign = async () => {
    try {
      setIsLoading(true);
      await startCampaign();
      toast.success('Campaign started successfully');
    } catch (error) {
      toast.error('Failed to start campaign');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopCampaign = async () => {
    try {
      setIsLoading(true);
      await stopCampaign();
      toast.info('Campaign stopped');
    } catch (error) {
      toast.error('Failed to stop campaign');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Status indicator color based on system status
  const getStatusColor = () => {
    switch (systemStatus.toLowerCase()) {
      case 'running':
        return 'success';
      case 'stopped':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const navItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Campaigns', icon: <CampaignIcon />, path: '/campaigns' },
    { text: 'Users', icon: <PersonIcon />, path: '/users' },
    { text: 'Logs', icon: <AssessmentIcon />, path: '/logs' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
  ];

  const drawer = (
    <Box sx={{ width: drawerWidth }}>
      <Box sx={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
          Instagram Automation
        </Typography>
      </Box>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItemButton
            key={item.text}
            selected={location.pathname === item.path}
            onClick={() => handleNavigation(item.path)}
            sx={{
              my: 0.5,
              mx: 1,
              borderRadius: 1,
              '&.Mui-selected': {
                bgcolor: theme.palette.primary.light,
                color: theme.palette.primary.contrastText,
                '& .MuiListItemIcon-root': {
                  color: theme.palette.primary.contrastText,
                },
              },
            }}
          >
            <ListItemIcon sx={{ color: location.pathname === item.path ? theme.palette.primary.contrastText : 'inherit' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItemButton>
        ))}
      </List>
      <Divider sx={{ mt: 2 }} />
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="subtitle2" color="textSecondary">
          Campaign Control
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Tooltip title="Start Campaign">
            <IconButton
              color="success"
              disabled={isLoading || systemStatus.toLowerCase() === 'running'}
              onClick={handleStartCampaign}
              sx={{ bgcolor: 'rgba(76, 175, 80, 0.1)' }}
            >
              <StartIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Stop Campaign">
            <IconButton
              color="error"
              disabled={isLoading || systemStatus.toLowerCase() !== 'running'}
              onClick={handleStopCampaign}
              sx={{ bgcolor: 'rgba(244, 67, 54, 0.1)' }}
            >
              <StopIcon />
            </IconButton>
          </Tooltip>
          <Chip
            label={`Status: ${systemStatus}`}
            size="small"
            color={getStatusColor() as any}
            sx={{ ml: 1, flex: 1, justifyContent: 'center' }}
          />
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: theme.zIndex.drawer + 1,
          bgcolor: 'white',
          color: 'text.primary',
          boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.05)'
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={toggleDrawer}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="div">
              {navItems.find(item => item.path === location.pathname)?.text || 'Dashboard'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={`Status: ${systemStatus}`}
              size="small"
              color={getStatusColor() as any}
              sx={{ mr: 2, display: { xs: 'none', sm: 'flex' } }}
            />
            <Avatar 
              alt="User"
              src="/static/images/avatar/1.jpg"
              sx={{ width: 32, height: 32, cursor: 'pointer' }}
            />
          </Box>
        </Toolbar>
      </AppBar>
      <Drawer
        variant={isMobile ? "temporary" : "persistent"}
        open={drawerOpen}
        onClose={toggleDrawer}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
      >
        {drawer}
      </Drawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          pt: 10,
          width: { sm: `calc(100% - ${drawerOpen ? drawerWidth : 0}px)` },
          ml: { sm: drawerOpen ? `${drawerWidth}px` : 0 },
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          bgcolor: 'background.default',
          minHeight: '100vh',
          overflow: 'auto',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;
