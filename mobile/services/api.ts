import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useToastStore } from '../stores/toastStore';

const BASE_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://54.248.67.35:3000/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('auth_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401) {
      SecureStore.deleteItemAsync('auth_token');
    } else if (!error.response || status >= 500) {
      useToastStore.getState().show('网络异常，请稍后重试');
    }
    return Promise.reject(error);
  }
);
