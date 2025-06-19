import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Alert,
  Chip,
  CircularProgress,
  Paper,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Search as SearchIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import { getUsers, getProcessedUsers, uploadCSV } from '../services/api';

const Users: React.FC = () => {
  const [users, setUsers] = useState<string[]>([]);
  const [processedUsers, setProcessedUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [newUsername, setNewUsername] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'processed' | 'pending'>('all');

  // Load users data on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    // Apply filters and search when data or filters change
    let result = [...users];
    
    // Apply active tab filter
    if (activeTab === 'processed') {
      result = result.filter(user => processedUsers.includes(user));
    } else if (activeTab === 'pending') {
      result = result.filter(user => !processedUsers.includes(user));
    }
    
    // Apply search filter
    if (searchTerm) {
      result = result.filter(user => 
        user.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredUsers(result);
  }, [users, processedUsers, searchTerm, activeTab]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const [usersData, processedUsersData] = await Promise.all([
        getUsers(),
        getProcessedUsers()
      ]);
      
      setUsers(usersData);
      setProcessedUsers(processedUsersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  // File upload handler with react-dropzone
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    
    // Check if file is CSV
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }
    
    try {
      setIsUploading(true);
      await uploadCSV(file);
      toast.success('CSV uploaded successfully');
      fetchUsers(); // Refresh the users list
    } catch (error) {
      console.error('Error uploading CSV:', error);
      toast.error('Failed to upload CSV');
    } finally {
      setIsUploading(false);
    }
  }, []);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    multiple: false
  });

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleAddUser = async () => {
    if (!newUsername) {
      toast.warning('Please enter a username');
      return;
    }
    
    // Clean the username (remove @ if present)
    const cleanUsername = newUsername.replace('@', '').trim();
    
    if (!cleanUsername) {
      toast.warning('Please enter a valid username');
      return;
    }
    
    // Check if username already exists
    if (users.includes(cleanUsername)) {
      toast.info(`@${cleanUsername} is already in your list`);
      setNewUsername('');
      return;
    }
    
    try {
      // In a real implementation, this would call an API to add a single user
      // For now, we'll just update the local state
      setUsers(prev => [...prev, cleanUsername]);
      toast.success(`@${cleanUsername} added successfully`);
      setNewUsername('');
    } catch (error) {
      console.error('Error adding user:', error);
      toast.error('Failed to add user');
    }
  };

  const isProcessed = (username: string) => processedUsers.includes(username);

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Target Users
      </Typography>

      <Grid container spacing={3}>
        {/* Upload CSV Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h2" gutterBottom>
                Upload User List (CSV)
              </Typography>
              
              <Paper 
                {...getRootProps()} 
                sx={{ 
                  p: 3, 
                  bgcolor: 'background.default', 
                  border: '2px dashed',
                  borderColor: isDragActive ? 'primary.main' : 'divider',
                  borderRadius: 2,
                  textAlign: 'center',
                  cursor: 'pointer',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'rgba(64, 93, 230, 0.04)'
                  }
                }}
              >
                <input {...getInputProps()} />
                {isUploading ? (
                  <CircularProgress size={30} />
                ) : (
                  <>
                    <UploadIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />
                    <Typography variant="body1" gutterBottom>
                      {isDragActive ? 'Drop the CSV file here' : 'Drag & drop a CSV file here, or click to select'}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      The CSV should contain Instagram usernames (with or without @ symbol)
                    </Typography>
                  </>
                )}
              </Paper>
              
              <Alert severity="info" sx={{ mt: 2 }}>
                CSV column names that are automatically detected: "username", "user", "instagram", "handle", "ig", "account"
              </Alert>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Add Single User Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h2" gutterBottom>
                Add Single User
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                <TextField
                  fullWidth
                  label="Instagram Username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value.replace('@', ''))}
                  placeholder="username"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">@</InputAdornment>,
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddUser()}
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleAddUser}
                  startIcon={<AddIcon />}
                  sx={{ ml: 1, height: 56 }}
                >
                  Add
                </Button>
              </Box>
              
              <Box sx={{ mt: 4 }}>
                <Typography variant="subtitle1" gutterBottom>
                  User Statistics
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default', textAlign: 'center' }}>
                      <Typography variant="h5" color="primary">
                        {users.length}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Total Users
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={4}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default', textAlign: 'center' }}>
                      <Typography variant="h5" color="success.main">
                        {processedUsers.length}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Processed
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={4}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default', textAlign: 'center' }}>
                      <Typography variant="h5" color="warning.main">
                        {users.length - processedUsers.length}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Pending
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* User List */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" component="h2">
                  User List
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip 
                    label={`All (${users.length})`}
                    color={activeTab === 'all' ? 'primary' : 'default'}
                    onClick={() => setActiveTab('all')}
                    clickable
                  />
                  <Chip 
                    label={`Processed (${processedUsers.length})`}
                    color={activeTab === 'processed' ? 'primary' : 'default'}
                    onClick={() => setActiveTab('processed')}
                    clickable
                  />
                  <Chip 
                    label={`Pending (${users.length - processedUsers.length})`}
                    color={activeTab === 'pending' ? 'primary' : 'default'}
                    onClick={() => setActiveTab('pending')}
                    clickable
                  />
                </Box>
              </Box>
              
              <TextField
                fullWidth
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
              
              {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Username</TableCell>
                          <TableCell align="center">Status</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredUsers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} align="center">
                              <Typography color="textSecondary" sx={{ py: 3 }}>
                                {searchTerm 
                                  ? 'No users match your search' 
                                  : 'No users added yet. Upload a CSV or add users manually.'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredUsers
                            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                            .map((username) => (
                              <TableRow key={username} hover>
                                <TableCell>@{username}</TableCell>
                                <TableCell align="center">
                                  <Chip 
                                    size="small"
                                    label={isProcessed(username) ? 'Processed' : 'Pending'}
                                    color={isProcessed(username) ? 'success' : 'default'}
                                    icon={isProcessed(username) ? <CheckCircleIcon /> : undefined}
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  <IconButton 
                                    size="small" 
                                    color="error"
                                    onClick={() => {
                                      setUsers(users.filter(u => u !== username));
                                      toast.info(`@${username} removed from target list`);
                                    }}
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  
                  <TablePagination
                    component="div"
                    count={filteredUsers.length}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Users;
