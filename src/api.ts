import { api } from "./services/api";

export const registerUser = async (data: {
  username: string;
  email: string;
  password: string;
  role: string;
}) => {
  const response = await api.post('/auth/register', data);
  return response.data;
};

// Función para login
export const loginUser = async (data: {
  username: string;
  password: string;
}) => {
  const response = await api.post('/auth/login', data);
  return response.data;
};

export const fetchAssetsBalance = async () => {
  const response = await api.get('/assets/?page=2');
  return response.data;
};
