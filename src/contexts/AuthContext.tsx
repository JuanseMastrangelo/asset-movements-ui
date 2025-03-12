import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, LoginCredentials, RegisterCredentials } from '../models';
import { authService } from '../services/api';
import { api } from '../services/api';
import { Spinner } from '@/components/ui/spinner';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loadUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to load the current user based on the stored accessToken
  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      // No token found, clear authentication and stop loading
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      // Attempt to fetch the user data
      const response = await api.get('users/me');
      setUser(response.data.data);
      setIsAuthenticated(true);
    } catch (error) {
      // On error, remove tokens and clear user data
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Execute loadUser when the component mounts
  useEffect(() => {
    console.log('AuthProvider mounted, loading user...');
    loadUser();
  }, [loadUser]);

  // Render a loading spinner until the initial load is complete
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Function to handle login
  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      const response = await authService.login(credentials);
      // Save tokens in localStorage
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      // Set user data and update authentication status
      setUser(response.user);
      setIsAuthenticated(true);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle user registration
  const register = async (credentials: RegisterCredentials) => {
    try {
      setIsLoading(true);
      const response = await authService.register(credentials);
      // Set user data and update authentication status
      setUser(response.user);
      setIsAuthenticated(true);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle logout
  const logout = () => {
    authService.logout();
    // Remove tokens from localStorage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    // Clear user data and update authentication status
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    isAuthenticated,
    user,
    login,
    register,
    logout,
    loadUser,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
