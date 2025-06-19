import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';

// Layouts
import MainLayoutNew from './layouts/MainLayoutNew';

// Pages
import Dashboard from './pages/Dashboard';
import Campaigns from './pages/Campaigns';
import Users from './pages/Users';
import Logs from './pages/Logs';
import Settings from './pages/Settings';
import Login from './pages/Login';

// Auth Context
import { AuthProvider, useAuth } from './contexts/AuthContext';

// API
import { getStatus } from './services/api';
import { ProtectedRouteProps } from './types';

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        height: '100vh'
      }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (!isAuthenticated) {
    // Redirect to login with the location they tried to visit
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline'>('offline');

  useEffect(() => {
    const checkBackendStatus = async () => {
      try {
        await getStatus();
        setBackendStatus('online');
      } catch (error) {
        console.error('Backend status check failed:', error);
        setBackendStatus('offline');
      } finally {
        setIsLoading(false);
      }
    };

    checkBackendStatus();

    // Poll backend status every 30 seconds
    const intervalId = setInterval(checkBackendStatus, 30000);
    return () => clearInterval(intervalId);
  }, []);

  if (isLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        height: '100vh'
      }}>
        <CircularProgress />
      </Box>
    );
  }

  if (backendStatus === 'offline') {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center',
        height: '100vh',
        p: 3,
        textAlign: 'center'
      }}>
        <h1>Backend Service Unavailable</h1>
        <p>
          The Instagram Automation service is currently offline. 
          Please make sure the backend API is running.
        </p>
      </Box>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <MainLayoutNew>
            <Dashboard />
          </MainLayoutNew>
        </ProtectedRoute>
      } />
      
      <Route path="/campaigns" element={
        <ProtectedRoute>
          <MainLayoutNew>
            <Campaigns />
          </MainLayoutNew>
        </ProtectedRoute>
      } />
      
      <Route path="/users" element={
        <ProtectedRoute>
          <MainLayoutNew>
            <Users />
          </MainLayoutNew>
        </ProtectedRoute>
      } />
      
      <Route path="/logs" element={
        <ProtectedRoute>
          <MainLayoutNew>
            <Logs />
          </MainLayoutNew>
        </ProtectedRoute>
      } />
      
      <Route path="/settings" element={
        <ProtectedRoute>
          <MainLayoutNew>
            <Settings />
          </MainLayoutNew>
        </ProtectedRoute>
      } />
      
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
