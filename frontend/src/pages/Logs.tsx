import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Tabs,
  Tab,
  CircularProgress,
  TextField,
  IconButton,
  Paper,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  GetApp as DownloadIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { getLogs } from '../services/api';
import { toast } from 'react-toastify';

interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
  raw: string;
}

const Logs: React.FC = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [timeRange, setTimeRange] = useState('all');
  const [logLevel, setLogLevel] = useState('all');
  const logsEndRef = useRef<null | HTMLDivElement>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initial load of logs
    fetchLogs();

    // Cleanup interval on unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Auto-refresh setup
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(fetchLogs, 10000);
    } else if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh]);

  useEffect(() => {
    // Apply filters when logs, search query, or filters change
    applyFilters();
  }, [logs, searchQuery, activeTab, timeRange, logLevel]);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const logsData = await getLogs(activeTab !== 'all' ? activeTab : 'all');
      
      // Parse raw logs into structured format
      const parsedLogs: LogEntry[] = logsData.map((rawLog: string) => {
        try {
          // Assuming log format: "[TIMESTAMP] [LEVEL] MESSAGE"
          const timestampMatch = rawLog.match(/^\[(.*?)\]/);
          const levelMatch = rawLog.match(/\[(INFO|WARNING|ERROR)\]/i);
          
          const timestamp = timestampMatch ? timestampMatch[1] : 'Unknown time';
          const level = (levelMatch ? levelMatch[1].toUpperCase() : 'INFO') as 'INFO' | 'WARNING' | 'ERROR';
          let message = rawLog;
          
          // Remove timestamp and level from message
          if (timestampMatch) message = message.replace(timestampMatch[0], '').trim();
          if (levelMatch) message = message.replace(levelMatch[0], '').trim();
          
          return {
            timestamp,
            level,
            message,
            raw: rawLog
          };
        } catch (error) {
          return {
            timestamp: 'Parse Error',
            level: 'ERROR',
            message: rawLog,
            raw: rawLog
          };
        }
      });
      
      setLogs(parsedLogs);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('Failed to load logs');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...logs];
    
    // Filter by tab
    if (activeTab === 'error') {
      filtered = filtered.filter(log => log.level === 'ERROR');
    } else if (activeTab === 'sent') {
      filtered = filtered.filter(log => log.raw.includes('Sent') || log.raw.includes('DM sent'));
    }
    
    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(log => 
        log.raw.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Filter by log level
    if (logLevel !== 'all') {
      filtered = filtered.filter(log => log.level === logLevel.toUpperCase());
    }
    
    // Filter by time range
    if (timeRange !== 'all') {
      const now = new Date();
      const cutoffTime = new Date();
      
      switch (timeRange) {
        case '1h':
          cutoffTime.setHours(now.getHours() - 1);
          break;
        case '6h':
          cutoffTime.setHours(now.getHours() - 6);
          break;
        case '24h':
          cutoffTime.setDate(now.getDate() - 1);
          break;
        case '7d':
          cutoffTime.setDate(now.getDate() - 7);
          break;
      }
      
      filtered = filtered.filter(log => {
        try {
          const logTime = new Date(log.timestamp);
          return logTime >= cutoffTime;
        } catch {
          return true; // Include entries with unparseable timestamps
        }
      });
    }
    
    setFilteredLogs(filtered);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };
  
  const handleRefresh = () => {
    fetchLogs();
  };
  
  const handleClearSearch = () => {
    setSearchQuery('');
  };
  
  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const downloadLogs = () => {
    const logText = filteredLogs.map(log => log.raw).join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `instagram-automation-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'ERROR':
        return <ErrorIcon fontSize="small" color="error" />;
      case 'WARNING':
        return <WarningIcon fontSize="small" color="warning" />;
      default:
        return <InfoIcon fontSize="small" color="info" />;
    }
  };

  const getLogRowStyle = (level: string) => {
    switch (level) {
      case 'ERROR':
        return { borderLeft: '4px solid #f44336', backgroundColor: 'rgba(244, 67, 54, 0.05)' };
      case 'WARNING':
        return { borderLeft: '4px solid #ff9800', backgroundColor: 'rgba(255, 152, 0, 0.05)' };
      default:
        return { borderLeft: '4px solid #2196f3' };
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        System Logs
      </Typography>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={activeTab} onChange={handleTabChange} aria-label="log tabs">
              <Tab label="All Logs" value="all" />
              <Tab label="Error Logs" value="error" />
              <Tab label="Sent DMs" value="sent" />
            </Tabs>
          </Box>
          
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <TextField
              placeholder="Search logs..."
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ flexGrow: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleClearSearch}>
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
            />
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Log Level</InputLabel>
              <Select
                value={logLevel}
                label="Log Level"
                onChange={(e) => setLogLevel(e.target.value)}
              >
                <MenuItem value="all">All Levels</MenuItem>
                <MenuItem value="info">Info</MenuItem>
                <MenuItem value="warning">Warning</MenuItem>
                <MenuItem value="error">Error</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                label="Time Range"
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <MenuItem value="all">All Time</MenuItem>
                <MenuItem value="1h">Last Hour</MenuItem>
                <MenuItem value="6h">Last 6 Hours</MenuItem>
                <MenuItem value="24h">Last 24 Hours</MenuItem>
                <MenuItem value="7d">Last 7 Days</MenuItem>
              </Select>
            </FormControl>
            
            <Button 
              variant="outlined" 
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              disabled={isLoading}
            >
              Refresh
            </Button>
            
            <Button
              variant="outlined"
              color={autoRefresh ? "primary" : "inherit"}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? "Auto-refresh: ON" : "Auto-refresh: OFF"}
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={downloadLogs}
              disabled={filteredLogs.length === 0}
            >
              Download
            </Button>
          </Box>
          
          <Divider />
          
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredLogs.length > 0 ? (
            <Box sx={{ 
              maxHeight: '60vh', 
              overflow: 'auto', 
              p: 2, 
              bgcolor: 'background.default',
              borderRadius: 1,
              m: 2
            }}>
              {filteredLogs.map((log, index) => (
                <Paper 
                  key={index} 
                  elevation={0}
                  sx={{ 
                    p: 1, 
                    mb: 1, 
                    ...getLogRowStyle(log.level),
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    {getLogIcon(log.level)}
                    <Typography 
                      variant="caption" 
                      sx={{ ml: 1, color: 'text.secondary', fontWeight: 'medium' }}
                    >
                      {log.timestamp}
                    </Typography>
                    <Chip 
                      label={log.level} 
                      size="small" 
                      color={
                        log.level === 'ERROR' ? 'error' : 
                        log.level === 'WARNING' ? 'warning' : 'info'
                      }
                      sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                    />
                  </Box>
                  <Typography variant="body2" sx={{ ml: 3, wordBreak: 'break-word' }}>
                    {log.message}
                  </Typography>
                </Paper>
              ))}
              <div ref={logsEndRef} />
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="textSecondary">
                {searchQuery ? 'No logs match your search' : 'No logs available'}
              </Typography>
            </Box>
          )}
          
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="body2" color="textSecondary">
              {filteredLogs.length} {filteredLogs.length === 1 ? 'entry' : 'entries'} found
            </Typography>
            
            <Box>
              <Button 
                size="small" 
                onClick={scrollToBottom}
                disabled={filteredLogs.length === 0}
              >
                Scroll to Bottom
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Logs;
