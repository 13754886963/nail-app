import { apiClient } from './api';

export interface Category {
  id: string;
  name: string;
}

export interface NailStyle {
  id: string;
  artist_id: string;
  category_id: string;
  category_name: string;
  artist_name: string;
  title: string;
  description: string | null;
  tags: string[];
  image_url: string | null;
  created_at: string;
}

export async function apiGetCategories(): Promise<Category[]> {
  const res = await apiClient.get<{ success: boolean; data: Category[] }>('/categories');
  return res.data.data;
}

export async function apiGetMyStyles(limit = 12, offset = 0): Promise<NailStyle[]> {
  const res = await apiClient.get<{ success: boolean; data: NailStyle[] }>(
    `/styles/my?limit=${limit}&offset=${offset}`
  );
  return res.data.data;
}

export async function apiSearchStyles(q: string): Promise<NailStyle[]> {
  const res = await apiClient.get<{ success: boolean; data: NailStyle[] }>(
    `/styles/search?q=${encodeURIComponent(q)}`
  );
  return res.data.data;
}

export async function apiGetAllStyles(limit = 12, offset = 0, categoryId?: string): Promise<NailStyle[]> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (categoryId) params.set('categoryId', categoryId);
  const res = await apiClient.get<{ success: boolean; data: NailStyle[] }>(`/styles?${params}`);
  return res.data.data;
}

export interface StyleDetail extends NailStyle {
  artist_user_id: string;
  like_count: number;
  favorite_count: number;
  comment_count: number;
  is_liked: boolean;
  is_favorited: boolean;
  is_public: boolean;
}

export interface Comment {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
  parent_id: string | null;
  reply_to_user_name: string | null;
}

export async function apiGetStyleDetail(id: string): Promise<StyleDetail> {
  const res = await apiClient.get<{ success: boolean; data: StyleDetail }>(`/styles/${id}`);
  return res.data.data;
}

export async function apiToggleLike(id: string): Promise<boolean> {
  const res = await apiClient.post<{ success: boolean; data: { liked: boolean } }>(`/styles/${id}/like`);
  return res.data.data.liked;
}

export async function apiToggleFavorite(id: string): Promise<boolean> {
  const res = await apiClient.post<{ success: boolean; data: { favorited: boolean } }>(`/styles/${id}/favorite`);
  return res.data.data.favorited;
}

export async function apiGetComments(id: string): Promise<Comment[]> {
  const res = await apiClient.get<{ success: boolean; data: Comment[] }>(`/styles/${id}/comments`);
  return res.data.data;
}

export async function apiPostComment(
  id: string,
  content: string,
  parentId?: string,
  replyToUserName?: string,
): Promise<Comment> {
  const res = await apiClient.post<{ success: boolean; data: Comment }>(`/styles/${id}/comments`, {
    content,
    parent_id: parentId,
    reply_to_user_name: replyToUserName,
  });
  return res.data.data;
}

export async function apiUpdateStyle(
  id: string,
  data: { title?: string; description?: string; tags?: string[]; is_public?: boolean },
): Promise<void> {
  await apiClient.patch(`/styles/${id}`, data);
}

export async function apiDeleteStyle(id: string): Promise<void> {
  await apiClient.delete(`/styles/${id}`);
}

export async function apiCreateStyle(data: {
  uri: string;
  title: string;
  categoryId: string;
  description?: string;
  tags?: string[];
}): Promise<NailStyle> {
  const filename = data.uri.split('/').pop() ?? 'image.jpg';
  const ext = (filename.split('.').pop() ?? 'jpg').toLowerCase();
  const type = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;

  const formData = new FormData();
  formData.append('image', { uri: data.uri, name: filename, type } as unknown as Blob);
  formData.append('title', data.title);
  formData.append('categoryId', data.categoryId);
  if (data.description) formData.append('description', data.description);
  (data.tags ?? []).forEach((t) => formData.append('tags', t));

  const res = await apiClient.post<{ success: boolean; data: NailStyle }>(
    '/styles',
    formData,
    {
      transformRequest: (body, headers) => {
        if (headers) delete headers['Content-Type'];
        return body;
      },
    }
  );
  return res.data.data;
}
