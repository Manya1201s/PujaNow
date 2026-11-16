import { supabase } from '@/lib/supabase';
import type {
  Category, Puja, Pandit, Booking, Review, Notification,
  SamagriProduct, SamagriCategory, SamagriOrder, SamagriOrderItem,
  Profile, BookingStatus, PaymentStatus,
} from '@/types';
import { generateRef } from '@/lib/utils';
import { changeBookingStatus } from '@/lib/bookingRequests';

// ---- Categories ----
export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return data as Category[];
}

// ---- Pujas ----
export async function fetchPujas(opts?: {
  categorySlug?: string;
  search?: string;
  sort?: 'popularity' | 'price_low' | 'price_high';
  featuredOnly?: boolean;
}): Promise<Puja[]> {
  let query = supabase
    .from('pujas')
    .select('*, category:categories(*)')
    .eq('is_active', true);

  if (opts?.featuredOnly) query = query.eq('is_featured', true);
  if (opts?.search) query = query.or(`name.ilike.%${opts.search}%,description.ilike.%${opts.search}%`);

  if (opts?.sort === 'price_low') query = query.order('starting_price', { ascending: true });
  else if (opts?.sort === 'price_high') query = query.order('starting_price', { ascending: false });
  else query = query.order('popularity', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  let pujas = data as Puja[];

  if (opts?.categorySlug) {
    pujas = pujas.filter((p) => p.category?.slug === opts.categorySlug);
  }
  return pujas;
}

export async function fetchPujaBySlug(slug: string): Promise<Puja | null> {
  const { data, error } = await supabase
    .from('pujas')
    .select('*, category:categories(*)')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data as Puja | null;
}

// ---- Pandits ----
export async function fetchPandits(opts?: {
  search?: string;
  specialization?: string;
  location?: string;
}): Promise<Pandit[]> {
  const query = supabase
    .from('pandits')
    .select('*')
    .eq('verification_status', 'verified')
    .order('rating', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  let pandits = data as Pandit[];

  if (opts?.search) {
    const s = opts.search.toLowerCase();
    pandits = pandits.filter(
      (p) =>
        p.display_name.toLowerCase().includes(s) ||
        p.location.toLowerCase().includes(s) ||
        p.specializations.some((sp) => sp.toLowerCase().includes(s)),
    );
  }
  if (opts?.specialization) {
    pandits = pandits.filter((p) =>
      p.specializations.some((s) => s.toLowerCase().includes(opts.specialization!.toLowerCase())),
    );
  }
  if (opts?.location) {
    const loc = opts.location.toLowerCase();
    pandits = pandits.filter((p) =>
      p.location.toLowerCase().includes(loc),
    );
  }
  return pandits;
}

export async function fetchPanditById(id: string): Promise<Pandit | null> {
  const { data, error } = await supabase
    .from('pandits')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as Pandit | null;
}

export async function fetchPanditsForPuja(pujaId: string): Promise<Pandit[]> {
  const { data, error } = await supabase
    .from('puja_pandits')
    .select('pandit:pandits(*)')
    .eq('puja_id', pujaId);
  if (error) throw error;
  const rows = (data || []) as unknown as { pandit: Pandit | null }[];
  return rows.map((row) => row.pandit).filter((pandit): pandit is Pandit => Boolean(pandit));
}

// ---- Bookings ----
export async function fetchBookingsForCustomer(customerId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Booking[];
}

export async function fetchBookingsForPanditProfile(profileId: string): Promise<Booking[]> {
  // First find the pandit row for this profile
  const { data: pandit } = await supabase
    .from('pandits')
    .select('id')
    .eq('profile_id', profileId)
    .maybeSingle();
  if (!pandit) return [];
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('pandit_id', pandit.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Booking[];
}

export async function fetchAllBookings(): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Booking[];
}

export async function createBooking(input: {
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
  payment_method: string;
}): Promise<Booking> {
  const booking_ref = generateRef('PN');
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      ...input,
      booking_ref,
      status: 'pending',
      // No payment gateway is connected, so never mark an online booking as paid.
      payment_status: 'pending',
    })
    .select('*')
    .single();
  if (error) throw error;

  // Create notification for the pandit if there is one
  if (input.pandit_id) {
    const { data: pandit } = await supabase
      .from('pandits')
      .select('profile_id')
      .eq('id', input.pandit_id)
      .maybeSingle();
    if (pandit?.profile_id) {
      const booking = data as Booking;
      const when = new Date(`${input.scheduled_date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      await supabase.from('notifications').insert({
        user_id: pandit.profile_id,
        type: 'booking_request',
        title: 'New booking request',
        body: `${input.customer_name} requested ${input.puja_name} on ${when} at ${input.scheduled_time} in ${input.city}. Tap to accept or decline.`,
        // Opens the pandit's Bookings tab with this request's details.
        link: `/pandit-dashboard/bookings?booking=${booking.id}`,
      });
    }
  }

  return data as Booking;
}

/**
 * Changes a booking's status (e.g. a devotee cancelling). Only matches while the booking is still in one of
 * `from`, so stale screens can't overwrite newer decisions. Notifications to the devotee and the pandit are
 * sent by the database trigger pn_bookings_after_status_change.
 */
export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus,
  from: BookingStatus[] = ['pending', 'confirmed'],
): Promise<Booking> {
  return changeBookingStatus(bookingId, status, { from });
}

export async function updatePaymentStatus(
  bookingId: string,
  paymentStatus: PaymentStatus,
): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({ payment_status: paymentStatus })
    .eq('id', bookingId);
  if (error) throw error;
}

// ---- Reviews ----
export async function fetchReviewsForPandit(panditId: string): Promise<(Review & { customer_name?: string })[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, customer:profiles(full_name)')
    .eq('pandit_id', panditId)
    .eq('is_published', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data || []) as unknown as (Review & { customer?: { full_name: string | null } | null })[];
  return rows.map((r) => ({
    ...r,
    customer_name: r.customer?.full_name || 'Anonymous',
  })) as (Review & { customer_name?: string })[];
}

export async function createReview(input: {
  booking_id: string;
  customer_id: string;
  pandit_id: string;
  rating: number;
  comment: string;
}): Promise<void> {
  const { error } = await supabase.from('reviews').insert({
    ...input,
    is_published: true,
  });
  if (error) throw error;
}

// ---- Notifications ----
export async function fetchNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Notification[];
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) throw error;
}

// ---- Samagri ----
export async function fetchSamagriCategories(): Promise<SamagriCategory[]> {
  const { data, error } = await supabase
    .from('samagri_categories')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return data as SamagriCategory[];
}

export async function fetchSamagriProducts(opts?: {
  categorySlug?: string;
  search?: string;
  sort?: 'price_low' | 'price_high' | 'name';
}): Promise<SamagriProduct[]> {
  let query = supabase
    .from('samagri_products')
    .select('*, category:samagri_categories(*)')
    .eq('is_active', true);

  if (opts?.sort === 'price_low') query = query.order('price', { ascending: true });
  else if (opts?.sort === 'price_high') query = query.order('price', { ascending: false });
  else query = query.order('name', { ascending: true });

  const { data, error } = await query;
  if (error) throw error;
  let products = data as SamagriProduct[];

  if (opts?.search) {
    const s = opts.search.toLowerCase();
    products = products.filter(
      (p) => p.name.toLowerCase().includes(s) || (p.description?.toLowerCase().includes(s) ?? false),
    );
  }
  if (opts?.categorySlug) {
    products = products.filter((p) => p.category?.slug === opts.categorySlug);
  }
  return products;
}

export async function createSamagriOrder(input: {
  customer_id: string;
  items: { product: SamagriProduct; quantity: number }[];
  address: string;
  city: string;
  pincode: string;
  payment_method: string;
}): Promise<SamagriOrder> {
  const order_ref = generateRef('SM');
  const total = input.items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const { data: order, error: orderError } = await supabase
    .from('samagri_orders')
    .insert({
      customer_id: input.customer_id,
      order_ref,
      total,
      // Keep orders pending until a real payment or fulfillment integration updates them.
      status: 'pending',
      payment_method: input.payment_method,
      address: input.address,
      city: input.city,
      pincode: input.pincode,
    })
    .select('*')
    .single();
  if (orderError) throw orderError;

  const orderItems = input.items.map((i) => ({
    order_id: order.id,
    product_id: i.product.id,
    product_name: i.product.name,
    product_image: i.product.image_url,
    unit_price: i.product.price,
    quantity: i.quantity,
    subtotal: i.product.price * i.quantity,
  }));
  const { error: itemsError } = await supabase.from('samagri_order_items').insert(orderItems);
  if (itemsError) throw itemsError;

  return order as SamagriOrder;
}

export async function fetchSamagriOrders(customerId: string): Promise<(SamagriOrder & { items?: SamagriOrderItem[] })[]> {
  const { data: orders, error } = await supabase
    .from('samagri_orders')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!orders || orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);
  const { data: items } = await supabase
    .from('samagri_order_items')
    .select('*')
    .in('order_id', orderIds);
  const itemsByOrder = (items || []).reduce((acc, item) => {
    (acc[item.order_id] = acc[item.order_id] || []).push(item);
    return acc;
  }, {} as Record<string, SamagriOrderItem[]>);

  return orders.map((o) => ({
    ...o,
    items: itemsByOrder[o.id] || [],
  })) as (SamagriOrder & { items?: SamagriOrderItem[] })[];
}

// ---- Profiles ----
export async function fetchAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Profile[];
}

export async function updateProfile(
  id: string,
  updates: Partial<Pick<Profile, 'full_name' | 'phone' | 'location' | 'bio' | 'avatar_url'>>,
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
}

export async function fetchPanditForProfile(profileId: string): Promise<Pandit | null> {
  const { data, error } = await supabase
    .from('pandits')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle();
  if (error) throw error;
  return data as Pandit | null;
}

export async function createPanditProfile(input: {
  profile_id: string;
  display_name: string;
  experience_years: number;
  languages: string[];
  specializations: string[];
  location: string;
  base_price: number;
  bio: string;
}): Promise<Pandit> {
  const { data, error } = await supabase
    .from('pandits')
    .insert({
      ...input,
      verification_status: 'pending',
      is_available: true,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as Pandit;
}

export async function updatePanditProfile(
  panditId: string,
  updates: Partial<Pick<Pandit, 'display_name' | 'experience_years' | 'languages' | 'specializations' | 'location' | 'base_price' | 'bio' | 'is_available'>>,
): Promise<Pandit> {
  // verification_status, rating and counters are protected by the pn_pandits_guard trigger.
  const { data, error } = await supabase
    .from('pandits')
    .update(updates)
    .eq('id', panditId)
    .select('*')
    .single();
  if (error) throw error;
  return data as Pandit;
}

// ---- Admin (RLS returns every row only when the caller's profile role is 'admin') ----
export async function fetchAllPanditsForAdmin(): Promise<Pandit[]> {
  const { data, error } = await supabase
    .from('pandits')
    .select('*')
    .order('display_name');
  if (error) throw error;
  return data as Pandit[];
}
