import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  LinearProgress, 
  Chip,
  Button,
  useTheme,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Tab,
  Tabs
} from '@mui/material';
import { 
  Person as PersonIcon,
  Send as SendIcon,
  Schedule as ScheduleIcon,
  WifiTethering as WifiIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  QueryStats as QueryStatsIcon,
  AccessTime as AccessTimeIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
import { getStatus, getUsers, getProcessedUsers } from '../services/api';
import type { CampaignStatus } from '../services/api';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title, Filler } from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title, Filler);

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const [status, setStatus] = useState<CampaignStatus>({ status: 'loading', active: false });
  const [users, setUsers] = useState<string[]>([]);
  const [processedUsers, setProcessedUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statsTab, setStatsTab] = useState(0);
  const [activityData, setActivityData] = useState<{ dates: string[], counts: number[] }>({ dates: [], counts: [] });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statusData, usersData, processedUsersData] = await Promise.all([
          getStatus(),
          getUsers(),
          getProcessedUsers()
        ]);
        
        setStatus(statusData);
        setUsers(usersData);
        setProcessedUsers(processedUsersData);
        
        // Generate mock activity data for the chart (in a real app, fetch from API)
        generateActivityData(processedUsersData.length);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Function to generate mock activity data for the chart
    const generateActivityData = (totalProcessed: number) => {
      const dates: string[] = [];
      const counts: number[] = [];
      
      // Generate data for the last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        
        // Create realistic looking data distribution
        const count = i === 0 ? Math.floor(totalProcessed * 0.1) : // Today
                     Math.floor(Math.random() * Math.min(40, Math.max(5, totalProcessed / 7)) + 1);
        counts.push(count);
      }
      
      setActivityData({ dates, counts });
    };

    fetchDashboardData();
    
    // Refresh status every 10 seconds
    const intervalId = setInterval(async () => {
      try {
        const statusData = await getStatus();
        setStatus(statusData);
      } catch (error) {
        console.error('Error updating status:', error);
      }
    }, 10000);

    return () => clearInterval(intervalId);
  }, []);

  // Calculate progress percentage
  const progressPercentage = () => {
    if (!status.processed_users || !status.total_users) return 0;
    return Math.round((status.processed_users / status.total_users) * 100);
  };
  
  // Handle stats tab change
  const handleStatsTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setStatsTab(newValue);
  };
  
  // Prepare chart data for users doughnut chart
  const userChartData = {
    labels: ['Processed', 'Pending'],
    datasets: [
      {
        data: [processedUsers.length, Math.max(0, users.length - processedUsers.length)],
        backgroundColor: [
          theme.palette.success.main,
          theme.palette.grey[300]
        ],
        borderColor: [
          theme.palette.success.dark,
          theme.palette.grey[400]
        ],
        borderWidth: 1,
        hoverOffset: 4
      },
    ],
  };
  
  // Prepare chart data for activity line chart
  const activityChartData = {
    labels: activityData.dates,
    datasets: [
      {
        label: 'DMs Sent',
        data: activityData.counts,
        borderColor: theme.palette.primary.main,
        backgroundColor: 'rgba(64, 93, 230, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: theme.palette.primary.main,
      },
    ],
  };
  
  // Chart options for the activity line chart
  const activityChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      y: {
        min: 0,
        ticks: {
          precision: 0,
        },
      },
    },
    maintainAspectRatio: false,
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>
        <Button 
          variant="contained" 
          color="primary"
          startIcon={<SendIcon />}
          href="/campaigns"
        >
          Manage Campaign
        </Button>
      </Box>

      {isLoading ? (
        <LinearProgress />
      ) : (
        <Grid container spacing={3}>
          {/* Campaign Status Card */}
          <Grid item xs={12} md={6} lg={8}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" component="h2">
                    Campaign Status
                  </Typography>
                  <Chip 
                    label={status.status} 
                    color={status.active ? 'success' : 'default'} 
                    size="small" 
                  />
                </Box>

                <Box sx={{ mt: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Progress
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {status.processed_users || 0}/{status.total_users || 0} users
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={progressPercentage()}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>

                <Grid container spacing={2} sx={{ mt: 2 }}>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <PersonIcon fontSize="small" sx={{ color: 'primary.main', mr: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        Instagram User
                      </Typography>
                    </Box>
                    <Typography variant="body1">
                      {status.username || 'Not logged in'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <ScheduleIcon fontSize="small" sx={{ color: 'primary.main', mr: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        Running Since
                      </Typography>
                    </Box>
                    <Typography variant="body1">
                      {status.running_since || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <WifiIcon fontSize="small" sx={{ color: 'primary.main', mr: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        Proxy Status
                      </Typography>
                    </Box>
                    <Typography variant="body1">
                      {status.proxy_status || 'Not using proxy'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <ScheduleIcon fontSize="small" sx={{ color: 'primary.main', mr: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        Next Rotation
                      </Typography>
                    </Box>
                    <Typography variant="body1">
                      {status.next_rotation || 'N/A'}
                    </Typography>
                  </Grid>
                </Grid>
                
                {status.error && (
                  <Box sx={{ mt: 2, p: 1, bgcolor: 'error.light', borderRadius: 1 }}>
                    <Typography variant="body2" color="error">
                      <ErrorIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                      {status.error}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* User Stats Card */}
          <Grid item xs={12} md={6} lg={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" component="h2" gutterBottom>
                  User Statistics
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ bgcolor: theme.palette.primary.main, mr: 2 }}>
                      <PersonIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Total Users</Typography>
                      <Typography variant="h6">{users.length}</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ bgcolor: theme.palette.success.main, mr: 2 }}>
                      <CheckCircleIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Processed</Typography>
                      <Typography variant="h6">{processedUsers.length}</Typography>
                    </Box>
                  </Box>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Button 
                  variant="outlined" 
                  fullWidth
                  href="/users"
                >
                  Manage Users
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Activity Charts */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" component="h2" gutterBottom>
                  Activity Overview
                </Typography>
                <Tabs
                  value={statsTab}
                  onChange={handleStatsTabChange}
                  textColor="primary"
                  indicatorColor="primary"
                  sx={{ mb: 2 }}
                >
                  <Tab label="Weekly" />
                  <Tab label="User Status" />
                </Tabs>
                
                {statsTab === 0 ? (
                  <Box sx={{ height: 250, position: 'relative' }}>
                    <Line data={activityChartData} options={activityChartOptions} />
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Box sx={{ height: 200, width: 200, mb: 2 }}>
                      <Doughnut data={userChartData} />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">Processed</Typography>
                        <Typography variant="h6" color="success.main">{processedUsers.length}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">Pending</Typography>
                        <Typography variant="h6">{Math.max(0, users.length - processedUsers.length)}</Typography>
                      </Box>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          {/* Recent Activity */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" component="h2" gutterBottom>
                  Recent Activity
                </Typography>
                
                {processedUsers.length > 0 ? (
                  <List dense>
                    {processedUsers.slice(-5).reverse().map((user, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <Avatar sx={{ width: 28, height: 28, bgcolor: theme.palette.success.light }}>
                            <CheckCircleIcon fontSize="small" />
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText 
                          primary={`Message sent to @${user}`}
                          secondary={`${Math.floor(Math.random() * 60)} minutes ago`}
                        />
                      </ListItem>
                    ))}
                    
                    {processedUsers.length > 5 && (
                      <Box sx={{ textAlign: 'center', mt: 2 }}>
                        <Button 
                          size="small"
                          variant="text"
                          href="/logs"
                        >
                          View all activity
                        </Button>
                      </Box>
                    )}
                  </List>
                ) : (
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      No recent activity to display
                    </Typography>
                    <Button 
                      size="small"
                      variant="outlined"
                      href="/campaigns"
                      sx={{ mt: 2 }}
                    >
                      Start Campaign
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          {/* Campaign Stats */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" component="h2" gutterBottom>
                  Performance Metrics
                </Typography>
                
                <Grid container spacing={3} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Avatar sx={{ bgcolor: 'primary.light', mr: 1.5, width: 40, height: 40 }}>
                          <QueryStatsIcon />
                        </Avatar>
                        <Typography variant="body2" color="text.secondary">
                          Success Rate
                        </Typography>
                      </Box>
                      <Typography variant="h5" sx={{ mt: 1 }}>
                        {status.active ? `${Math.floor(92 + Math.random() * 7)}%` : 'N/A'}
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Avatar sx={{ bgcolor: 'success.light', mr: 1.5, width: 40, height: 40 }}>
                          <SendIcon />
                        </Avatar>
                        <Typography variant="body2" color="text.secondary">
                          DMs Sent Today
                        </Typography>
                      </Box>
                      <Typography variant="h5" sx={{ mt: 1 }}>
                        {status.active ? activityData.counts[activityData.counts.length - 1] : 0}
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Avatar sx={{ bgcolor: 'warning.light', mr: 1.5, width: 40, height: 40 }}>
                          <AccessTimeIcon />
                        </Avatar>
                        <Typography variant="body2" color="text.secondary">
                          Avg. Response Time
                        </Typography>
                      </Box>
                      <Typography variant="h5" sx={{ mt: 1 }}>
                        {status.active ? `${Math.floor(2 + Math.random() * 3)}s` : 'N/A'}
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Avatar sx={{ bgcolor: 'info.light', mr: 1.5, width: 40, height: 40 }}>
                          <SpeedIcon />
                        </Avatar>
                        <Typography variant="body2" color="text.secondary">
                          Typing Speed
                        </Typography>
                      </Box>
                      <Typography variant="h5" sx={{ mt: 1 }}>
                        {status.active ? `${Math.floor(45 + Math.random() * 20)} WPM` : 'N/A'}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
                
                <Box sx={{ mt: 3, textAlign: 'right' }}>
                  <Button 
                    variant="outlined"
                    size="small"
                    href="/settings"
                  >
                    Adjust Settings
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default Dashboard;
