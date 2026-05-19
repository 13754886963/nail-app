import { apiClient } from './api';

export type AppointmentStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';

export interface Appointment {
  id: string;
  customer_id: string;
  customer_name: string;
  artist_id: string;
  artist_name: string;
  style_id: string | null;
  style_title: string | null;
  style_image_url: string | null;
  reference_images: string[];
  scheduled_at: string;
  note: string | null;
  status: AppointmentStatus;
  reject_reason: string | null;
  created_at: string;
}

export async function apiBookAppointment(params: {
  artistId: string;
  scheduledAt: string;
  styleId?: string | null;
  note?: string | null;
  images: { uri: string; type?: string; fileName?: string }[];
}): Promise<Appointment> {
  const form = new FormData();
  form.append('artistId', params.artistId);
  form.append('scheduledAt', params.scheduledAt);
  if (params.styleId) form.append('styleId', params.styleId);
  if (params.note) form.append('note', params.note);
  params.images.forEach((img, i) => {
    form.append('images', {
      uri: img.uri,
      type: img.type ?? 'image/jpeg',
      name: img.fileName ?? `ref_${i}.jpg`,
    } as unknown as Blob);
  });
  const res = await apiClient.post<{ success: boolean; data: Appointment }>(
    '/appointments',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return res.data.data;
}

export async function apiGetMyAppointments(): Promise<Appointment[]> {
  const res = await apiClient.get<{ success: boolean; data: Appointment[] }>('/appointments/my');
  return res.data.data;
}

export async function apiGetIncomingAppointments(): Promise<Appointment[]> {
  const res = await apiClient.get<{ success: boolean; data: Appointment[] }>('/appointments/incoming');
  return res.data.data;
}

export async function apiGetAppointmentById(id: string): Promise<Appointment> {
  const res = await apiClient.get<{ success: boolean; data: Appointment }>(`/appointments/${id}`);
  return res.data.data;
}

export async function apiUpdateAppointmentStatus(
  id: string,
  action: 'confirm' | 'reject' | 'cancel' | 'complete',
  rejectReason?: string
): Promise<Appointment> {
  const res = await apiClient.patch<{ success: boolean; data: Appointment }>(
    `/appointments/${id}/status`,
    { action, rejectReason }
  );
  return res.data.data;
}

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  pending:   '待确认',
  confirmed: '已确认',
  rejected:  '已拒绝',
  cancelled: '已取消',
  completed: '已完成',
};

export const STATUS_COLOR: Record<AppointmentStatus, string> = {
  pending:   '#F59E0B',
  confirmed: '#10B981',
  rejected:  '#EF4444',
  cancelled: '#9CA3AF',
  completed: '#6366F1',
};
