import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  TextField,
  CircularProgress,
  Alert,
  Paper,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Send as SendIcon,
  ExpandMore as ExpandMoreIcon,
  Speed as SpeedIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { getStatus, startCampaign, stopCampaign, sendTestDM } from '../services/api';
import type { CampaignStatus } from '../services/api';

const Campaigns: React.FC = () => {
  const [status, setStatus] = useState<CampaignStatus>({ status: 'loading', active: false });
  const [testUsername, setTestUsername] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  // Sample template messages
  const messageTemplates = [
    {
      title: "Business Partnership",
      template: "Hi there! 👋 I noticed your amazing content and think we could collaborate on something special. Our company specializes in [product/service] and we're looking for influencers like you. Would you be interested in discussing a partnership? We offer competitive compensation and would love to send you some free samples to try out. Let me know if this sounds interesting!"
    },
    {
      title: "Product Promotion",
      template: "Hey! I've been following your page and love your style. 🔥 I'm reaching out because we just launched a new [product] that I think would be perfect for your audience. We're offering a special 40% discount code for your followers, plus a free gift with purchase. Would you like to hear more about our collaboration opportunities?"
    },
    {
      title: "Event Invitation",
      template: "Hello! 👋 I'm organizing an exclusive event in [location] for content creators like yourself. It's going to be a great networking opportunity with brands, plus free products, photoshoots, and more! We would love to have you attend as our special guest. Are you available on [date]? I can share all the details if you're interested."
    }
  ];

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const statusData = await getStatus();
        setStatus(statusData);
      } catch (error) {
        console.error('Error fetching status:', error);
        toast.error('Failed to fetch campaign status');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();

    // Refresh status every 5 seconds
    const intervalId = setInterval(fetchStatus, 5000);
    return () => clearInterval(intervalId);
  }, []);

  const handleStartCampaign = async () => {
    try {
      setIsStarting(true);
      await startCampaign();
      toast.success('Campaign started successfully');
      const statusData = await getStatus();
      setStatus(statusData);
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
      toast.info('Campaign stopped');
      const statusData = await getStatus();
      setStatus(statusData);
    } catch (error) {
      console.error('Error stopping campaign:', error);
      toast.error('Failed to stop campaign');
    } finally {
      setIsStopping(false);
    }
  };

  const handleSendTestDM = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!testUsername) {
      toast.warning('Please enter a username');
      return;
    }

    if (!testMessage) {
      toast.warning('Please enter a message');
      return;
    }

    try {
      setIsSending(true);
      await sendTestDM(testUsername, testMessage);
      toast.success(`Test DM sent to @${testUsername}`);
      // Don't clear the form to allow for easy repeat testing
    } catch (error) {
      console.error('Error sending test DM:', error);
      toast.error('Failed to send test DM');
    } finally {
      setIsSending(false);
    }
  };

  const useTemplate = (template: string) => {
    setTestMessage(template);
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Campaign Management
      </Typography>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* Campaign Control Card */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" component="h2" gutterBottom>
                  Campaign Control
                </Typography>
                
                <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1, mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body1" fontWeight="medium">
                      Status: 
                      <span style={{ 
                        color: status.active ? '#4caf50' : '#ff9800', 
                        marginLeft: '8px' 
                      }}>
                        {status.status}
                      </span>
                    </Typography>
                    
                    {status.username && (
                      <Typography variant="body2" color="textSecondary">
                        Account: @{status.username}
                      </Typography>
                    )}
                  </Box>
                  
                  {status.error && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {status.error}
                    </Alert>
                  )}
                </Box>
                
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={6}>
                    <Button
                      variant="contained"
                      color="success"
                      fullWidth
                      startIcon={<StartIcon />}
                      onClick={handleStartCampaign}
                      disabled={status.active || isStarting}
                    >
                      {isStarting ? (
                        <>
                          <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                          Starting...
                        </>
                      ) : (
                        'Start Campaign'
                      )}
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Button
                      variant="contained"
                      color="error"
                      fullWidth
                      startIcon={<StopIcon />}
                      onClick={handleStopCampaign}
                      disabled={!status.active || isStopping}
                    >
                      {isStopping ? (
                        <>
                          <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                          Stopping...
                        </>
                      ) : (
                        'Stop Campaign'
                      )}
                    </Button>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />
                
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Campaign Statistics
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <SpeedIcon sx={{ color: 'primary.main', mr: 1 }} />
                          <Box>
                            <Typography variant="caption" color="textSecondary">
                              Progress
                            </Typography>
                            <Typography variant="body1" fontWeight="bold">
                              {status.processed_users || 0}/{status.total_users || 0}
                            </Typography>
                          </Box>
                        </Box>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <TimeIcon sx={{ color: 'primary.main', mr: 1 }} />
                          <Box>
                            <Typography variant="caption" color="textSecondary">
                              Next Proxy Rotation
                            </Typography>
                            <Typography variant="body1" fontWeight="bold">
                              {status.next_rotation || 'N/A'}
                            </Typography>
                          </Box>
                        </Box>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Test DM Card */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" component="h2" gutterBottom>
                  Send Test DM
                </Typography>
                
                <form onSubmit={handleSendTestDM}>
                  <TextField
                    fullWidth
                    label="Instagram Username"
                    value={testUsername}
                    onChange={(e) => setTestUsername(e.target.value.replace('@', ''))}
                    placeholder="username (without @)"
                    margin="normal"
                    required
                    InputProps={{
                      startAdornment: '@',
                    }}
                  />
                  
                  <TextField
                    fullWidth
                    label="Message"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Enter your message here"
                    margin="normal"
                    required
                    multiline
                    rows={4}
                  />
                  
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    startIcon={<SendIcon />}
                    disabled={isSending}
                    sx={{ mt: 2 }}
                    fullWidth
                  >
                    {isSending ? (
                      <>
                        <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                        Sending...
                      </>
                    ) : (
                      'Send Test DM'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </Grid>

          {/* Message Templates */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" component="h2" gutterBottom>
                  Message Templates
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Click on a template to use it for your test DMs or customize it for your campaign.
                </Typography>
                
                {messageTemplates.map((template, index) => (
                  <Accordion key={index} sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">{template.title}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" paragraph>
                        {template.template}
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => useTemplate(template.template)}
                      >
                        Use This Template
                      </Button>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default Campaigns;
