import axios from 'axios';
import { LoginCredentials, RegisterCredentials, AuthResponse, Asset, CreateAssetDto, UpdateAssetDto, CreateClientDto, Client, ClientBalanceResponse } from '../models';
import { TransactionResponse } from '@/models/transaction';
import { TransactionRuleResponse } from '@/models/transactionRule';
import { toast } from 'sonner';
import { CreateUserDto, User } from '@/models/user';
import { CreateLogisticConfigDto, LogisticConfig, LogisticConfigResponse } from '@/models/logistic';
import { CalculateLogisticDto } from '@/models/logistic';
import { Denomination } from '@/models/denomination';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';


export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});


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
    console.log('API Response:', response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error('API Error:', error.config?.url, error.response?.status);
    
    // Obtener el mensaje de error
    const errorResponse = error.response?.data;
    let errorMessage = 'Ha ocurrido un error inesperado';

    if (errorResponse) {
      if (errorResponse.errors && errorResponse.errors.length > 0) {
        // Si hay errores específicos, mostrar el primero
        errorMessage = errorResponse.errors[0];
      } else if (errorResponse.message) {
        // Si no hay errores específicos pero hay un mensaje general
        errorMessage = errorResponse.message;
      }
    }

    const token = localStorage.getItem('accessToken'); // TODO: Para cuando el usuario no está autenticado y escribe mal las credenciales.
    // Manejar diferentes tipos de error
    if (error.response?.status === 401 && token) {
      toast.error('Sesión expirada. Por favor, inicie sesión nuevamente.');
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      toast.error('No tiene permisos para realizar esta acción');
    } else if (error.response?.status === 404) {
      toast.error('El recurso solicitado no existe');
    } else if (error.response?.status === 422 || error.response?.status === 400) {
      toast.error(errorMessage);
    } else {
      toast.error(errorMessage);
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

  create: async (client: CreateClientDto) => {
    const { data } = await api.post<Client>('/clients', client);
    return data;
  },

  update: async (id: string, client: Partial<Client>) => {
    const { data } = await api.patch<Client>(`/clients/${id}`, client);
    return data;
  },

  delete: async (id: string) => {
    await api.delete(`/clients/${id}`);
  },

  searchClients: async (name: string) => {
    const { data } = await api.get<{ data: Client[] }>('/clients/search', {
      params: { name },
    });
    return data;
  },

  getClientBalance: async (clientId: string) => {
    const { data } = await api.get<ClientBalanceResponse>(`/dashboard/client-balance/${clientId}`);
    return data;
  },
};

// Denominations Services
export const denominationsService = {
  getAll: async (): Promise<Denomination[]> => {
    const { data } = await api.get<{ data: Denomination[] }>('/denominations');
    return data.data;
  },

  create: async (denomination: { assetId: string; value: number; isActive: boolean }) => {
    const { data } = await api.post('/denominations', denomination);
    return data;
  },

  update: async (id: string, denomination: Partial<{ assetId: string; value: number; isActive: boolean }>) => {
    const { data } = await api.patch(`/denominations/${id}`, denomination);
    return data;
  },

  delete: async (id: string) => {
    await api.delete(`/denominations/${id}`);
  },
};

// Asset Services
export const assetService = {
  getAll: async (page = 1) => {
    try {
      const { data } = await api.get<{ data: Asset[]; total: number }>('/assets?page=' + page);
      return data;
    } catch (error) {
      console.error('Error fetching assets:', error);
      throw error;
    }
  },

  getById: async (id: string) => {
    try {
      const { data } = await api.get<Asset>(`/assets/${id}`);
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
    const { data } = await api.patch<Asset>(`/assets/${id}`, asset);
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

// Users Services
export const usersService = {
  getAll: async (page = 1) => {
    const { data } = await api.get<{ 
      data: User[]; 
      meta: { 
        pagination: { 
          totalPages: number 
        } 
      } 
    }>('/users', {
      params: { page },
    });
    return data;
  },

  create: async (user: CreateUserDto) => {
    const { data } = await api.post<User>('/users', user);
    return data;
  },

  update: async (id: string, user: Partial<User>) => {
    const { data } = await api.patch<User>(`/users/${id}`, user);
    return data;
  },

  enable: async (id: string) => {
    const { data } = await api.patch<User>(`/users/${id}/enable`);
    return data;
  },

  disable: async (id: string) => {
    const { data } = await api.patch<User>(`/users/${id}/disable`);
    return data;
  }
}; 

// Transaction Rules Services
export const transactionRulesService = {
  getAll: async (page = 1) => {
    const { data } = await api.get<TransactionRuleResponse>('/transaction-rules', {
      params: { page },
    });
    return data;
  },

  enable: async (id: string) => {
    const { data } = await api.patch(`/transaction-rules/${id}/enable`);
    return data;
  },

  disable: async (id: string) => {
    const { data } = await api.patch(`/transaction-rules/${id}/disable`);
    return data;
  },

  delete: async (id: string) => {
    await api.delete(`/transaction-rules/${id}`);
  },

  create: async (rule: { sourceAssetId: string; targetAssetId: string; isEnabled: boolean }) => {
    const { data } = await api.post('/transaction-rules', rule);
    return data;
  },
}; 

// Logistics Services
export const logisticsService = {
  getAll: async (page = 1) => {
    const { data } = await api.get<LogisticConfigResponse>('/logistics/settings', {
      params: { page },
    });
    return data;
  },
  create: async (config: CreateLogisticConfigDto) => {
    const { data } = await api.post<LogisticConfig>('/logistics/settings', config);
    return data;
  },
  calculateLogistic: async (dto: CalculateLogisticDto) => {
    const { data } = await api.post('/logistics/calculate', dto);
    return data;
  },
  updateLogisticConfig: async (id: string, updateData: Partial<CreateLogisticConfigDto>) => {
    const { data } = await api.patch(`/logistics/settings/${id}`, updateData);
    return data;
  },
  deleteLogisticConfig: async (id: string) => {
    await api.delete(`/logistics/settings/${id}`);
  },
}; 