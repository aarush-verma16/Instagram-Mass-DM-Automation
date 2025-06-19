import React, { useState, useEffect } from 'react';
import { styled, Theme, useTheme } from '@mui/material/styles';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  Divider,
  IconButton,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  Avatar,
  Menu,
  MenuItem,
  useMediaQuery,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Campaign as CampaignIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Article as LogsIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  AccountCircle,
  Logout as LogoutIcon
} from '@mui/icons-material';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from 'react-toastify';

import { getStatus, startCampaign, stopCampaign, CampaignStatus } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const drawerWidth = 240;

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })<{
  open?: boolean;
}>(({ theme, open }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: `-${drawerWidth}px`,
  ...(open && {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: 0,
  }),
}));

const AppBarStyled = styled(AppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})<{
  open?: boolean;
}>(({ theme, open }) => ({
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: `${drawerWidth}px`,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: 'center',
}));

interface MainLayoutProps {
  children?: React.ReactNode;
}

const MainLayoutNew: React.FC<MainLayoutProps> = ({ children }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [open, setOpen] = useState(!isMobile);
  const [status, setStatus] = useState<CampaignStatus>({ status: 'loading', active: false });
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
  const menuOpen = Boolean(anchorEl);
  const currentPath = location.pathname;

  // Navigation items
  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { path: '/campaigns', label: 'Campaigns', icon: <CampaignIcon /> },
    { path: '/users', label: 'Users', icon: <PeopleIcon /> },
    { path: '/logs', label: 'Logs', icon: <LogsIcon /> },
    { path: '/settings', label: 'Settings', icon: <SettingsIcon /> }
  ];

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await getStatus();
        setStatus(data);
      } catch (error) {
        console.error('Error fetching status:', error);
      }
    };

    fetchStatus();
    
    // Poll status every 10 seconds
    const intervalId = setInterval(fetchStatus, 10000);
    
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    // Close drawer on mobile when route changes
    if (isMobile) {
      setOpen(false);
    }
  }, [location.pathname, isMobile]);

  useEffect(() => {
    // Respond to screen size changes
    setOpen(!isMobile);
  }, [isMobile]);

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const handleStartCampaign = async () => {
    try {
      setIsStarting(true);
      await startCampaign();
      toast.success('Campaign started successfully');
      // Refresh status
      const data = await getStatus();
      setStatus(data);
    } catch (error) {
      console.error('Error starting campaign:', error);
      toast.error('Failed to start campaign');
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopCampaign = async () => {
    try {
      setIsStopping(true);
      await stopCampaign();
      toast.info('Campaign stopped successfully');
      // Refresh status
      const data = await getStatus();
      setStatus(data);
    } catch (error) {
      console.error('Error stopping campaign:', error);
      toast.error('Failed to stop campaign');
    } finally {
      setIsStopping(false);
    }
  };

  const handleUserMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleUserMenuClose();
    logout();
    navigate('/login');
    toast.info('You have been logged out');
  };

  const getPageTitle = () => {
    const item = navItems.find(item => item.path === currentPath);
    return item ? item.label : 'Dashboard';
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <AppBarStyled position="fixed" open={open}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerToggle}
            edge="start"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {getPageTitle()}
          </Typography>
          
          {/* Campaign Controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
            {status.status !== 'loading' && (
              <Tooltip title={status.active ? 'Campaign is running' : 'Campaign is not active'}>
                <Chip 
                  label={status.active ? 'Active' : 'Idle'}
                  color={status.active ? 'success' : 'default'}
                  size="small"
                  sx={{ mr: 2 }}
                />
              </Tooltip>
            )}
            
            {!status.active ? (
              <Button
                variant="contained"
                color="success"
                size="small"
                startIcon={isStarting ? <CircularProgress size={16} color="inherit" /> : <StartIcon />}
                onClick={handleStartCampaign}
                disabled={isStarting || status.status === 'loading'}
                sx={{ mr: 1 }}
              >
                {isStarting ? 'Starting...' : 'Start'}
              </Button>
            ) : (
              <Button
                variant="contained"
                color="error"
                size="small"
                startIcon={isStopping ? <CircularProgress size={16} color="inherit" /> : <StopIcon />}
                onClick={handleStopCampaign}
                disabled={isStopping || status.status === 'loading'}
                sx={{ mr: 1 }}
              >
                {isStopping ? 'Stopping...' : 'Stop'}
              </Button>
            )}
          </Box>
          
          {/* User Menu */}
          <Tooltip title={user?.username || 'User'}>
            <IconButton
              color="inherit"
              aria-controls={menuOpen ? 'user-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={menuOpen ? 'true' : undefined}
              onClick={handleUserMenuClick}
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                {user?.username?.[0].toUpperCase() || 'U'}
              </Avatar>
            </IconButton>
          </Tooltip>
          <Menu
            id="user-menu"
            anchorEl={anchorEl}
            open={menuOpen}
            onClose={handleUserMenuClose}
            MenuListProps={{
              'aria-labelledby': 'user-button',
            }}
          >
            <MenuItem disabled>
              <ListItemIcon>
                <AccountCircle fontSize="small" />
              </ListItemIcon>
              <ListItemText>@{user?.username || 'user'}</ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Logout</ListItemText>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBarStyled>
      
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
        variant={isMobile ? "temporary" : "persistent"}
        anchor="left"
        open={open}
        onClose={isMobile ? handleDrawerToggle : undefined}
      >
        <DrawerHeader>
          <Typography variant="h6" color="primary" fontWeight="bold">
            Instagram Automation
          </Typography>
        </DrawerHeader>
        
        <Divider />
        
        <List>
          {navItems.map((item) => (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                component={Link}
                to={item.path}
                selected={currentPath === item.path}
                sx={{
                  '&.Mui-selected': {
                    bgcolor: 'rgba(64, 93, 230, 0.08)',
                    borderRight: '3px solid',
                    borderColor: 'primary.main',
                    '&:hover': {
                      bgcolor: 'rgba(64, 93, 230, 0.12)',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ color: currentPath === item.path ? 'primary.main' : 'inherit' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        
        <Box sx={{ flexGrow: 1 }} />
        
        <Box sx={{ p: 2 }}>
          <Typography variant="caption" color="text.secondary" component="div">
            Campaign Status: {status.status}
          </Typography>
          {status.processed_users !== undefined && status.total_users !== undefined && (
            <Typography variant="caption" color="text.secondary" component="div">
              Progress: {status.processed_users}/{status.total_users}
            </Typography>
          )}
        </Box>
      </Drawer>
      
      <Main open={open}>
        <DrawerHeader />
        <Box sx={{ py: 1 }}>
          {children || <Outlet />}
        </Box>
      </Main>
    </Box>
  );
};

export default MainLayoutNew;
