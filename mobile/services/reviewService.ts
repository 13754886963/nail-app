import { apiClient } from './api';

export interface Review {
  id: string;
  appointment_id: string;
  customer_id: string;
  customer_name: string;
  customer_avatar_url: string | null;
  rating: number;
  comment: string | null;
  artist_reply: string | null;
  artist_replied_at: string | null;
  created_at: string;
}

export async function apiGetAppointmentReview(appointmentId: string): Promise<Review | null> {
  const res = await apiClient.get<{ success: boolean; data: Review | null }>(
    `/appointments/${appointmentId}/review`
  );
  return res.data.data;
}

export async function apiSubmitReview(
  appointmentId: string,
  rating: number,
  comment?: string
): Promise<Review> {
  const res = await apiClient.post<{ success: boolean; data: Review }>(
    `/appointments/${appointmentId}/review`,
    { rating, comment: comment || undefined }
  );
  return res.data.data;
}

export async function apiReplyToReview(
  appointmentId: string,
  reply: string
): Promise<Review> {
  const res = await apiClient.patch<{ success: boolean; data: Review }>(
    `/appointments/${appointmentId}/review/reply`,
    { reply }
  );
  return res.data.data;
}

export async function apiGetArtistReviews(artistId: string): Promise<Review[]> {
  const res = await apiClient.get<{ success: boolean; data: Review[] }>(
    `/artists/${artistId}/reviews`
  );
  return res.data.data;
}
