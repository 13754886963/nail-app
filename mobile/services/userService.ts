import { apiClient } from './api';
import type { AuthUser } from './authService';

export interface FavoriteStyle {
  id: string;
  title: string;
  artist_name: string;
  category_name: string;
  image_url: string | null;
}

export interface MyComment {
  id: string;
  content: string;
  created_at: string;
  style_id: string;
  style_title: string;
  style_image_url: string | null;
  artist_name: string;
}

export interface FollowingArtist {
  artist_id: string;
  user_id: string;
  name: string;
  avatar_url: string | null;
  works_count: number;
  follower_count: number;
}

export async function apiUpdateProfile(data: {
  name?: string;
  phone?: string | null;
  email?: string;
  gender?: string | null;
  birthday?: string | null;
  location?: string | null;
}): Promise<AuthUser> {
  const res = await apiClient.patch<{ success: boolean; data: AuthUser }>('/users/me', data);
  return res.data.data;
}

export async function apiGetStats(): Promise<Record<string, number>> {
  const res = await apiClient.get<{ success: boolean; data: Record<string, number> }>('/users/me/stats');
  return res.data.data;
}

// TODO: 测试用，上线前删除
export async function apiDevSwitchUser(targetId: string): Promise<{ user: AuthUser; token: string }> {
  const res = await apiClient.post<{ success: boolean; data: { user: AuthUser; token: string } }>(
    '/users/me/dev-switch-user',
    { targetId },
  );
  return res.data.data;
}

export async function apiGetMyFavorites(): Promise<FavoriteStyle[]> {
  const res = await apiClient.get<{ success: boolean; data: FavoriteStyle[] }>('/users/me/favorites');
  return res.data.data;
}

export async function apiGetMyComments(): Promise<MyComment[]> {
  const res = await apiClient.get<{ success: boolean; data: MyComment[] }>('/users/me/comments');
  return res.data.data;
}

export async function apiGetMyFollowing(): Promise<FollowingArtist[]> {
  const res = await apiClient.get<{ success: boolean; data: FollowingArtist[] }>('/users/me/following');
  return res.data.data;
}

export async function apiChangePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await apiClient.patch('/users/me/password', { currentPassword, newPassword });
}

function buildImageFormData(field: string, uri: string): FormData {
  const filename = uri.split('/').pop() ?? `${field}.jpg`;
  const ext = (filename.split('.').pop() ?? 'jpg').toLowerCase();
  const type = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
  const formData = new FormData();
  formData.append(field, { uri, name: filename, type } as unknown as Blob);
  return formData;
}

export async function apiUploadAvatar(uri: string): Promise<AuthUser> {
  const formData = buildImageFormData('avatar', uri);
  const res = await apiClient.post<{ success: boolean; data: AuthUser }>(
    '/users/me/avatar',
    formData,
    {
      transformRequest: (data, headers) => {
        if (headers) delete headers['Content-Type'];
        return data;
      },
    }
  );
  return res.data.data;
}

export async function apiUploadBackground(uri: string): Promise<AuthUser> {
  const formData = buildImageFormData('background', uri);
  const res = await apiClient.post<{ success: boolean; data: AuthUser }>(
    '/users/me/background',
    formData,
    {
      transformRequest: (data, headers) => {
        if (headers) delete headers['Content-Type'];
        return data;
      },
    }
  );
  return res.data.data;
}
