import { apiClient } from './api';

export interface ArtistProfile {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string | null;
  background_url: string | null;
  location: string | null;
  bio: string | null;
  years_of_experience: number | null;
  is_part_time: boolean;
  works_count: number;
  likes_count: number;
  favorites_count: number;
  served_count: number;
  follower_count: number;
  is_followed: boolean;
  avg_rating: number;
  review_count: number;
}

export interface ArtistStyle {
  id: string;
  artist_id: string;
  category_name: string;
  title: string;
  image_url: string | null;
  created_at: string;
}

export async function apiListArtists(search?: string): Promise<ArtistProfile[]> {
  const params = search ? `?q=${encodeURIComponent(search)}` : '';
  const res = await apiClient.get<{ success: boolean; data: ArtistProfile[] }>(`/artists${params}`);
  return res.data.data;
}

export async function apiGetArtistProfile(artistId: string): Promise<ArtistProfile> {
  const res = await apiClient.get<{ success: boolean; data: ArtistProfile }>(`/artists/${artistId}`);
  return res.data.data;
}

export async function apiGetArtistStyles(artistId: string): Promise<ArtistStyle[]> {
  const res = await apiClient.get<{ success: boolean; data: ArtistStyle[] }>(`/artists/${artistId}/styles`);
  return res.data.data;
}

export async function apiToggleFollow(
  artistId: string
): Promise<{ is_followed: boolean; follower_count: number }> {
  const res = await apiClient.post<{ success: boolean; data: { is_followed: boolean; follower_count: number } }>(
    `/artists/${artistId}/follow`
  );
  return res.data.data;
}

export async function apiUpdateArtistProfile(data: {
  bio?: string | null;
  years_of_experience?: number | null;
  is_part_time?: boolean;
}): Promise<void> {
  await apiClient.patch('/artists/me', data);
}

export async function apiGetMyArtistProfile(): Promise<ArtistProfile> {
  const res = await apiClient.get<{ success: boolean; data: ArtistProfile }>('/artists/me');
  return res.data.data;
}

export interface ReceivedComment {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar_url: string | null;
  content: string;
  created_at: string;
  style_id: string;
  style_title: string;
  style_image_url: string | null;
}

export async function apiGetMyReceivedComments(): Promise<ReceivedComment[]> {
  const res = await apiClient.get<{ success: boolean; data: ReceivedComment[] }>('/artists/me/received-comments');
  return res.data.data;
}
