import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  TextField,
  Switch,
  FormControlLabel,
  CircularProgress,
  Divider,
  Alert,
  Slider,
  InputAdornment,
  Paper,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Help as HelpIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { getSettings, updateSettings } from '../services/api';
import type { SettingsData } from '../services/api';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SettingsData>({
    instagram_username: '',
    max_dms_per_day: 40,
    delay_between_dms: 30,
    use_proxies: false,
    proxy_rotation_interval: 1800,
    typing_speed_min: 0.05,
    typing_speed_max: 0.15
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const settingsData = await getSettings();
      setSettings(settingsData);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSliderChange = (name: keyof SettingsData) => (event: Event, newValue: number | number[]) => {
    setSettings(prev => ({
      ...prev,
      [name]: newValue
    }));
  };

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      await updateSettings(settings);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* Basic Settings Card */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" component="h2" gutterBottom>
                  Account Settings
                </Typography>
                
                <TextField
                  fullWidth
                  label="Instagram Username"
                  name="instagram_username"
                  value={settings.instagram_username}
                  onChange={handleInputChange}
                  margin="normal"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">@</InputAdornment>,
                  }}
                />
                
                <Alert severity="info" sx={{ mt: 2 }}>
                  <InfoIcon sx={{ mr: 1 }} />
                  Password is stored securely in the .env file and cannot be modified here.
                </Alert>
                
                <Divider sx={{ my: 3 }} />
                
                <Typography variant="h6" component="h2" gutterBottom>
                  Campaign Settings
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body1">
                      Max DMs Per Day
                    </Typography>
                    <Tooltip title="Instagram typically limits accounts to around 50-80 DMs per day. Setting this lower is safer.">
                      <IconButton size="small" sx={{ ml: 1 }}>
                        <HelpIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs>
                      <Slider
                        value={settings.max_dms_per_day}
                        onChange={handleSliderChange('max_dms_per_day')}
                        min={10}
                        max={100}
                        step={5}
                        marks={[
                          { value: 10, label: '10' },
                          { value: 50, label: '50' },
                          { value: 100, label: '100' }
                        ]}
                      />
                    </Grid>
                    <Grid item>
                      <TextField
                        value={settings.max_dms_per_day}
                        name="max_dms_per_day"
                        onChange={handleInputChange}
                        type="number"
                        InputProps={{
                          inputProps: { min: 10, max: 100 }
                        }}
                        sx={{ width: 80 }}
                      />
                    </Grid>
                  </Grid>
                </Box>
                
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body1">
                      Delay Between DMs (seconds)
                    </Typography>
                    <Tooltip title="Time to wait between sending DMs to different users. Higher values appear more human-like.">
                      <IconButton size="small" sx={{ ml: 1 }}>
                        <HelpIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs>
                      <Slider
                        value={settings.delay_between_dms}
                        onChange={handleSliderChange('delay_between_dms')}
                        min={10}
                        max={120}
                        step={5}
                        marks={[
                          { value: 10, label: '10s' },
                          { value: 60, label: '60s' },
                          { value: 120, label: '120s' }
                        ]}
                      />
                    </Grid>
                    <Grid item>
                      <TextField
                        value={settings.delay_between_dms}
                        name="delay_between_dms"
                        onChange={handleInputChange}
                        type="number"
                        InputProps={{
                          inputProps: { min: 10, max: 300 },
                          endAdornment: <InputAdornment position="end">sec</InputAdornment>
                        }}
                        sx={{ width: 110 }}
                      />
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Advanced Settings Card */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" component="h2" gutterBottom>
                  Proxy Settings
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.use_proxies}
                      onChange={handleInputChange}
                      name="use_proxies"
                      color="primary"
                    />
                  }
                  label="Use Proxies"
                />
                
                <Box sx={{ mt: 2, mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body1" color={settings.use_proxies ? 'textPrimary' : 'textSecondary'}>
                      Proxy Rotation Interval (minutes)
                    </Typography>
                    <Tooltip title="How often to change proxies during automation. Recommended: 20-30 minutes.">
                      <IconButton size="small" sx={{ ml: 1 }}>
                        <HelpIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs>
                      <Slider
                        value={settings.proxy_rotation_interval / 60}
                        onChange={(e, value) => handleSliderChange('proxy_rotation_interval')(e, (value as number) * 60)}
                        min={5}
                        max={60}
                        disabled={!settings.use_proxies}
                        marks={[
                          { value: 5, label: '5m' },
                          { value: 30, label: '30m' },
                          { value: 60, label: '60m' }
                        ]}
                      />
                    </Grid>
                    <Grid item>
                      <TextField
                        value={Math.round(settings.proxy_rotation_interval / 60)}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          setSettings(prev => ({
                            ...prev,
                            proxy_rotation_interval: value * 60
                          }));
                        }}
                        type="number"
                        disabled={!settings.use_proxies}
                        InputProps={{
                          inputProps: { min: 5, max: 120 },
                          endAdornment: <InputAdornment position="end">min</InputAdornment>
                        }}
                        sx={{ width: 110 }}
                      />
                    </Grid>
                  </Grid>
                </Box>
                
                <Divider sx={{ my: 3 }} />
                
                <Typography variant="h6" component="h2" sx={{ display: 'flex', alignItems: 'center' }}>
                  Advanced Settings
                  <Button 
                    size="small" 
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    sx={{ ml: 2 }}
                  >
                    {showAdvanced ? 'Hide' : 'Show'}
                  </Button>
                </Typography>
                
                {showAdvanced && (
                  <Box sx={{ mt: 2 }}>
                    <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                      <Typography variant="subtitle2" gutterBottom color="primary">
                        Typing Speed Configuration
                      </Typography>
                      
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="body2" gutterBottom>
                          Min Delay Between Keystrokes (seconds)
                        </Typography>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs>
                            <Slider
                              value={settings.typing_speed_min}
                              onChange={handleSliderChange('typing_speed_min')}
                              min={0.01}
                              max={0.3}
                              step={0.01}
                              marks={[
                                { value: 0.01, label: 'Fast' },
                                { value: 0.15, label: 'Medium' },
                                { value: 0.3, label: 'Slow' }
                              ]}
                            />
                          </Grid>
                          <Grid item>
                            <TextField
                              value={settings.typing_speed_min}
                              name="typing_speed_min"
                              onChange={handleInputChange}
                              type="number"
                              inputProps={{ step: 0.01, min: 0.01, max: 0.3 }}
                              sx={{ width: 80 }}
                            />
                          </Grid>
                        </Grid>
                      </Box>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" gutterBottom>
                          Max Delay Between Keystrokes (seconds)
                        </Typography>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs>
                            <Slider
                              value={settings.typing_speed_max}
                              onChange={handleSliderChange('typing_speed_max')}
                              min={0.05}
                              max={0.5}
                              step={0.01}
                              marks={[
                                { value: 0.05, label: 'Fast' },
                                { value: 0.25, label: 'Medium' },
                                { value: 0.5, label: 'Slow' }
                              ]}
                            />
                          </Grid>
                          <Grid item>
                            <TextField
                              value={settings.typing_speed_max}
                              name="typing_speed_max"
                              onChange={handleInputChange}
                              type="number"
                              inputProps={{ step: 0.01, min: 0.05, max: 0.5 }}
                              sx={{ width: 80 }}
                            />
                          </Grid>
                        </Grid>
                      </Box>
                      
                      {settings.typing_speed_max <= settings.typing_speed_min && (
                        <Alert severity="warning" sx={{ mt: 1 }}>
                          Maximum typing delay should be greater than minimum delay.
                        </Alert>
                      )}
                    </Paper>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          {/* Save Button */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchSettings}
                disabled={isLoading || isSaving}
              >
                Reset
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                onClick={handleSaveSettings}
                disabled={isLoading || isSaving || settings.typing_speed_max <= settings.typing_speed_min}
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default Settings;
