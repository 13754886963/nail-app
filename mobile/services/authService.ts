import * as SecureStore from 'expo-secure-store';
import { apiClient } from './api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatar_url?: string | null;
  background_url?: string | null;
  role: 'customer' | 'artist';
  gender?: string | null;
  birthday?: string | null;
  location?: string | null;
}

const TOKEN_KEY = 'auth_token';

export async function apiRegister(data: {
  name: string;
  email: string;
  password: string;
  role: 'customer' | 'artist';
  phone?: string;
}): Promise<{ user: AuthUser; token: string }> {
  const res = await apiClient.post<{ success: boolean; data: { user: AuthUser; token: string } }>(
    '/auth/register',
    data
  );
  return res.data.data;
}

export async function apiLogin(
  email: string,
  password: string
): Promise<{ user: AuthUser; token: string }> {
  const res = await apiClient.post<{ success: boolean; data: { user: AuthUser; token: string } }>(
    '/auth/login',
    { email, password }
  );
  return res.data.data;
}

export async function apiFetchMe(): Promise<AuthUser> {
  const res = await apiClient.get<{ success: boolean; data: AuthUser }>('/auth/me');
  return res.data.data;
}

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getStoredToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
