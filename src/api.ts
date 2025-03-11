// src/api.ts
import axios from "axios";

const BASE_URL = "http://xgckgs8csgccswok4w0sgcwc.147.93.13.112.sslip.io/api"; // Cambia esta URL por la de tu backend

// Función para registro de usuario
export const registerUser = async (data: {
  username: string;
  email: string;
  password: string;
  role: string;
}) => {
  const response = await axios.post(`${BASE_URL}/auth/register`, data);
  return response.data;
};

// Función para login
export const loginUser = async (data: {
  username: string;
  password: string;
}) => {
  const response = await axios.post(`${BASE_URL}/auth/login`, data);
  return response.data;
};

// Función para obtener el "assets balance"
// Aquí se utiliza el endpoint de assets con query params, ajústalo según lo que devuelva tu API
export const fetchAssetsBalance = async () => {
  const response = await axios.get(`${BASE_URL}/assets/?page=2`);
  return response.data;
};
