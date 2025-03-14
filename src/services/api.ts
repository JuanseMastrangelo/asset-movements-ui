import axios from 'axios';
import { LoginCredentials, RegisterCredentials, AuthResponse, Asset, CreateAssetDto, UpdateAssetDto } from '../models';
import { TransactionResponse } from '@/models/transaction';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type Client = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag para evitar múltiples llamadas al refresh token
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(localStorage.getItem('accessToken') || '');
    }
  });
  failedQueue = [];
};

// Interceptor para agregar el token a las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores y refresh token
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.config.url, response.status); // Para debug
    return response;
  },
  (error) => {
    console.error('API Error:', error.config?.url, error.response?.status); // Para debug
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth Services
export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/login', credentials);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    return data;
  },

  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/register', credentials);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    return data;
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  checkAuth: async (): Promise<AuthResponse | null> => {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');

    if (!accessToken || !refreshToken) {
      return null;
    }

    try {
      // Intentar refresh del token
      const { data } = await axios.post<AuthResponse>(`${BASE_URL}/auth/refresh`, {
        refreshToken,
      });
      
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      
      return data;
    } catch {
      // Si falla el refresh, limpiar el storage
      authService.logout();
      return null;
    }
  },
};

// Client Services
export const clientService = {
  getAll: async (page = 1) => {
    const { data } = await api.get<{ data: Client[]; total: number }>('/clients', {
      params: { page },
    });
    return data;
  },

  getById: async (id: string) => {
    const { data } = await api.get<Client>(`/clients/${id}`);
    return data;
  },
};

// Asset Services
export const assetService = {
  getAll: async (page = 1) => {
    try {
      const { data } = await api.get<{ data: Asset[]; total: number }>('/assets', {
        params: { page },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      return data;
    } catch (error) {
      console.error('Error fetching assets:', error);
      throw error;
    }
  },

  getById: async (id: string) => {
    try {
      const { data } = await api.get<Asset>(`/assets/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      return data;
    } catch (error) {
      console.error('Error fetching asset:', error);
      throw error;
    }
  },

  create: async (asset: CreateAssetDto) => {
    const { data } = await api.post<Asset>('/assets', asset);
    return data;
  },

  update: async (id: string, asset: UpdateAssetDto) => {
    const { data } = await api.put<Asset>(`/assets/${id}`, asset);
    return data;
  },

  disable: async (id: string) => {
    const { data } = await api.patch<Asset>(`/assets/${id}/disable`);
    return data;
  },

  enable: async (id: string) => {
    const { data } = await api.patch<Asset>(`/assets/${id}/enable`);
    return data;
  },

  delete: async (id: string) => {
    await api.delete(`/assets/${id}`);
  },

  // Nuevos endpoints para el dashboard
  getStockSummary: async () => {
    const { data } = await api.get<{
      data: Array<{
        id: string;
        name: string;
        type: string;
        totalAmount: number;
      }>;
      meta: {
        status: number;
        message: string;
        timestamp: string;
        path: string;
      };
    }>('/dashboard/stock');
    return data;
  },

  getCurrentAccounts: async () => {
    const { data } = await api.get<{
      data: Array<{
        id: string;
        name: string;
        totalAmount: number;
      }>;
      meta: {
        status: number;
        message: string;
        timestamp: string;
        path: string;
      };
    }>('/dashboard/current-accounts');
    return data;
  },

  getAccountsSummary: async () => {
    const { data } = await api.get<{ type: string; balance: number }[]>('/assets/accounts');
    return data;
  },

  getPendingTasks: async () => {
    const { data } = await api.get<{
      data: {
        clients: Array<{
          clientId: string;
          clientName: string;
          transactions: Array<{
            id: string;
            date: string;
            notes: string;
            state: string;
          }>;
          assetTotals: Record<string, number>;
        }>;
        assets: Array<{
          id: string;
          name: string;
          type: string;
        }>;
        totals: Record<string, number>;
      };
      meta: {
        status: number;
        message: string;
        timestamp: string;
        path: string;
      };
    }>('/dashboard/pending-tasks');
    return data;
  },

  getAccountsBalance: async () => {
    const { data } = await api.get<{
      clientName: string;
      assets: { type: string; balance: number }[];
    }[]>('/accounts/balance');
    return data;
  },

  getTransactionHistory: async () => {
    const { data } = await api.get<{
      date: string;
      inherits: boolean;
      clientName: string;
      status: string;
      id: string;
    }[]>('/transactions/history');
    return data;
  },

  completeTask: async (taskId: string) => {
    const { data } = await api.patch(`/tasks/${taskId}/complete`);
    return data;
  },
}; 

// Transactions Services
export const transactionsService = {
  getOne: async (transactionId: string) => {
    try {
      const { data } = await api.get<TransactionResponse>(`/transactions/${transactionId}`);
      return data.data;
    } catch (error) {
      console.error('Error fetching assets:', error);
      throw error;
    }
  }
}; 