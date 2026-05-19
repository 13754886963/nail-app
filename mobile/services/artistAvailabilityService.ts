import { apiClient } from './api';

export interface DayAvailability {
  day_of_week: number;
  is_available: boolean;
  start_time: string; // "HH:MM"
  end_time: string;   // "HH:MM"
}

export async function apiGetArtistAvailability(artistId: string): Promise<DayAvailability[]> {
  const res = await apiClient.get<{ success: boolean; data: DayAvailability[] }>(
    `/artists/${artistId}/availability`
  );
  return res.data.data;
}

export async function apiGetMyAvailability(): Promise<DayAvailability[]> {
  const res = await apiClient.get<{ success: boolean; data: DayAvailability[] }>(
    '/artists/me/availability'
  );
  return res.data.data;
}

export async function apiSetMyAvailability(schedule: DayAvailability[]): Promise<DayAvailability[]> {
  const res = await apiClient.put<{ success: boolean; data: DayAvailability[] }>(
    '/artists/me/availability',
    { schedule }
  );
  return res.data.data;
}
