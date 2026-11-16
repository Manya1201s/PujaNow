export type UserRole = 'customer' | 'pandit' | 'admin';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  location: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
}

export interface Puja {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description: string | null;
  category_id: string | null;
  image_url: string | null;
  starting_price: number;
  duration_mins: number;
  popularity: number;
  benefits: string[] | null;
  samagri_items: string[] | null;
  is_featured: boolean;
  is_active: boolean;
  category?: Category | null;
}

export interface Pandit {
  id: string;
  profile_id: string | null;
  display_name: string;
  photo_url: string | null;
  experience_years: number;
  languages: string[];
  specializations: string[];
  location: string;
  service_radius_km: number;
  rating: number;
  total_reviews: number;
  total_bookings: number;
  base_price: number;
  verification_status: VerificationStatus;
  is_available: boolean;
  bio: string | null;
  // Phase 2 (pandit management). Written only by admins / the pn_pandits_guard trigger.
  rejection_reason?: string | null;
  reviewed_at?: string | null;
  submitted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type VerificationStatus = 'pending' | 'verified' | 'rejected';

/** A puja the pandit offers (public.puja_pandits) with the puja's catalogue details. */
export interface PanditService {
  id: string;
  puja_id: string;
  pandit_id: string;
  custom_price: number | null;
  puja?: Pick<Puja, 'id' | 'name' | 'slug' | 'starting_price' | 'duration_mins' | 'is_active'> | null;
}

/** public.pandit_weekly_availability. weekday: 0 = Sunday … 6 = Saturday. Times are 'HH:MM:SS'. */
export interface WeeklySlot {
  id: string;
  pandit_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
}

/** public.pandit_blocked_dates. blocked_date is 'YYYY-MM-DD'. */
export interface BlockedDate {
  id: string;
  pandit_id: string;
  blocked_date: string;
  note: string | null;
}

/** public.pandit_verification_events (admins only). */
export interface VerificationEvent {
  id: string;
  pandit_id: string;
  from_status: string | null;
  to_status: VerificationStatus;
  reason: string | null;
  actor_id: string | null;
  created_at: string;
  actor?: { full_name: string | null; email: string } | null;
}

export interface PujaPandit {
  id: string;
  puja_id: string;
  pandit_id: string;
  custom_price: number | null;
  pandit?: Pandit;
  puja?: Puja;
}

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rejected';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Booking {
  id: string;
  customer_id: string;
  pandit_id: string | null;
  puja_id: string | null;
  puja_name: string;
  pandit_name: string | null;
  scheduled_date: string;
  scheduled_time: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  address: string;
  city: string;
  pincode: string | null;
  instructions: string | null;
  amount: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
  payment_method: string | null;
  booking_ref: string;
  /** Why the pandit declined (booking-requests migration). */
  rejection_reason?: string | null;
  /** When the pandit accepted or declined (set by the server). */
  responded_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  booking_id: string;
  customer_id: string;
  pandit_id: string;
  rating: number;
  comment: string | null;
  is_published: boolean;
  created_at: string;
}

export type NotificationType =
  | 'booking_request' | 'booking_accepted' | 'booking_rejected'
  | 'booking_confirmed' | 'booking_cancelled' | 'payment_status'
  | 'reminder' | 'message' | 'admin_announcement';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface SamagriCategory {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
}

export interface SamagriProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category_id: string | null;
  image_url: string | null;
  price: number;
  unit: string;
  stock: number;
  is_active: boolean;
  category?: SamagriCategory | null;
}

export interface SamagriOrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

export interface SamagriOrder {
  id: string;
  customer_id: string;
  order_ref: string;
  total: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  payment_method: string | null;
  address: string;
  city: string;
  pincode: string | null;
  created_at: string;
  items?: SamagriOrderItem[];
}
