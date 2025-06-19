// API Response Types
export interface StatusResponse {
  status: 'idle' | 'running' | 'paused' | 'error' | 'loading';
  active: boolean;
  error?: string;
  username?: string;
  total_users?: number;
  processed_users?: number;
  next_rotation?: string;
  remaining_dms_today?: number;
  proxy_ip?: string;
  last_activity?: string;
}

export interface User {
  username: string;
  processed: boolean;
  timestamp?: string;
}

export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
  raw: string;
}

export interface Settings {
  instagram_username: string;
  max_dms_per_day: number;
  delay_between_dms: number;
  use_proxies: boolean;
  proxy_rotation_interval: number;
  typing_speed_min: number;
  typing_speed_max: number;
}

// Auth Context Types
export interface AuthUser {
  username: string;
  token?: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

// Component Props Types
export interface ProtectedRouteProps {
  children: React.ReactNode;
}

export interface MainLayoutProps {
  children?: React.ReactNode;
}

// Utility Types
export type NavItem = {
  label: string;
  path: string;
  icon: React.ReactNode;
};
