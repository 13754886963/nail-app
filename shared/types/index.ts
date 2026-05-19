// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole = 'customer' | 'artist';

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

// ─── Salon ────────────────────────────────────────────────────────────────────

export interface BusinessHours {
  [day: string]: string; // e.g. { "mon": "10:00-20:00" }
}

export interface Salon {
  id: string;
  name: string;
  address: string;
  city: string;
  phone?: string;
  coverImageUrl?: string;
  businessHours?: BusinessHours;
  isActive: boolean;
  createdAt: string;
}

// ─── Artist ───────────────────────────────────────────────────────────────────

export interface Artist {
  id: string;
  userId: string;
  salonId?: string;
  bio?: string;
  yearsOfExperience?: number;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
  // joined
  user?: Pick<User, 'id' | 'name' | 'email'>;
  salon?: Pick<Salon, 'id' | 'name' | 'address' | 'city'>;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export interface Service {
  id: string;
  artistId: string;
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  isActive: boolean;
}

// ─── Category ─────────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
}

// ─── Nail Style ───────────────────────────────────────────────────────────────

export interface StyleImage {
  id: string;
  styleId: string;
  imageUrl: string;
  sortOrder: number;
}

export interface NailStyle {
  id: string;
  artistId: string;
  categoryId: string;
  title: string;
  description?: string;
  tags: string[];
  createdAt: string;
  // joined
  images?: StyleImage[];
  artist?: Pick<Artist, 'id' | 'avatarUrl'> & { user?: Pick<User, 'name'> };
  category?: Category;
}

// ─── Appointment ──────────────────────────────────────────────────────────────

export interface Appointment {
  id: string;
  customerId: string;
  artistId: string;
  serviceId: string;
  styleId?: string;
  salonId?: string;
  scheduledAt: string;
  status: AppointmentStatus;
  note?: string;
  createdAt: string;
  updatedAt: string;
  // joined
  artist?: Pick<Artist, 'id' | 'avatarUrl'> & { user?: Pick<User, 'name'> };
  service?: Pick<Service, 'id' | 'name' | 'price' | 'durationMinutes'>;
  style?: Pick<NailStyle, 'id' | 'title'> & { images?: StyleImage[] };
  salon?: Pick<Salon, 'id' | 'name' | 'address'>;
}

// ─── Favorite ─────────────────────────────────────────────────────────────────

export interface Favorite {
  id: string;
  userId: string;
  styleId: string;
  createdAt: string;
  style?: NailStyle;
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface ApiError {
  success: false;
  message: string;
  errors?: { field: string; message: string }[];
}
