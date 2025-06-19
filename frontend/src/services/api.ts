import axios, { AxiosResponse } from 'axios';

// Setup axios defaults
const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface CampaignStatus {
  status: 'idle' | 'running' | 'paused' | 'error' | 'loading';
  active: boolean;
  username?: string;
  processed_users?: number;
  total_users?: number;
  running_since?: string;
  error?: string;
  proxy_status?: string;
  current_proxy?: string;
  next_rotation?: string;
}

export interface SettingsData {
  instagram_username: string;
  max_dms_per_day: number;
  delay_between_dms: number;
  use_proxies: boolean;
  proxy_rotation_interval: number;
  typing_speed_min: number;
  typing_speed_max: number;
}

// API Endpoints

// Status
export const getStatus = async (): Promise<CampaignStatus> => {
  const response: AxiosResponse<CampaignStatus> = await API.get('/status');
  return response.data;
};

// Campaign Control
export const startCampaign = async (): Promise<any> => {
  const response: AxiosResponse<any> = await API.post('/start');
  return response.data;
};

export const stopCampaign = async (): Promise<any> => {
  const response: AxiosResponse<any> = await API.post('/stop');
  return response.data;
};

// Users
export const getUsers = async (): Promise<string[]> => {
  const response: AxiosResponse<string[]> = await API.get('/users');
  return response.data;
};

export const getProcessedUsers = async (): Promise<string[]> => {
  const response: AxiosResponse<string[]> = await API.get('/processed-users');
  return response.data;
};

export const uploadCSV = async (file: File): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response: AxiosResponse<any> = await API.post('/upload-csv', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Logs
export const getLogs = async (type: string = 'all'): Promise<string[]> => {
  const response: AxiosResponse<string[]> = await API.get(`/logs/${type}`);
  return response.data;
};

// Settings
export const getSettings = async (): Promise<SettingsData> => {
  const response: AxiosResponse<SettingsData> = await API.get('/settings');
  return response.data;
};

export const updateSettings = async (settings: Partial<SettingsData>): Promise<SettingsData> => {
  const response: AxiosResponse<SettingsData> = await API.post('/settings', settings);
  return response.data;
};

// Test DM
export const sendTestDM = async (username: string, message: string): Promise<any> => {
  const response: AxiosResponse<any> = await API.post('/send-test-dm', { username, message });
  return response.data;
};

// Error handler for api calls
API.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);
