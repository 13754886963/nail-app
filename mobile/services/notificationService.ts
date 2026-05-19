import { apiClient } from './api';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  appointment_id: string | null;
  is_read: boolean;
  created_at: string;
}

export async function apiGetNotifications(): Promise<AppNotification[]> {
  const res = await apiClient.get<{ success: boolean; data: AppNotification[] }>('/notifications');
  return res.data.data;
}

export async function apiGetUnreadCount(): Promise<number> {
  const res = await apiClient.get<{ success: boolean; data: { count: number } }>('/notifications/unread-count');
  return res.data.data.count;
}

export async function apiMarkAllRead(): Promise<void> {
  await apiClient.patch('/notifications/read-all');
}
