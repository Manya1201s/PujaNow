// The URL for every page. This file has no runtime imports so the browser tests can use it directly.
import type { Page, Role } from "./data"

const customerPaths: Partial<Record<Page, string>> = {
  home: "/",
  explore: "/pujas",
  assistant: "/assistant",
  recommendation: "/assistant/recommendation",
  plan: "/plan",
  pandits: "/pandits",
  booking: "/book",
  checkout: "/book/details",
  samagri: "/samagri",
  emergency: "/emergency",
  login: "/login",
  register: "/register",
  partner: "/become-a-partner",
  onboarding: "/become-a-partner/apply",
  about: "/about",
  trust: "/trust-and-safety",
  help: "/help",
  privacy: "/privacy",
  terms: "/terms",
  refunds: "/refund-policy",
  credits: "/photo-credits",
  dashboard: "/account",
  bookings: "/account/bookings",
  messages: "/account/messages",
  profile: "/account/profile",
}

const panditPaths: Partial<Record<Page, string>> = {
  dashboard: "/partner",
  requests: "/partner/requests",
  upcoming: "/partner/upcoming",
  completed: "/partner/completed",
  earnings: "/partner/earnings",
  reviews: "/partner/reviews",
  profile: "/partner/profile",
}

const adminPaths: Partial<Record<Page, string>> = {
  "admin-overview": "/admin",
  customers: "/admin/customers",
  "pandit-management": "/admin/pandits",
  "admin-verification": "/admin/verification",
  catalogue: "/admin/catalogue",
  "booking-management": "/admin/bookings",
  payments: "/admin/payments",
  commission: "/admin/commission",
  complaints: "/admin/complaints",
  reports: "/admin/reports",
  settings: "/admin/settings",
}

const tables: Record<Role, Partial<Record<Page, string>>> = {
  customer: customerPaths,
  pandit: panditPaths,
  admin: adminPaths,
}

export const homeFor = (role: Role): Page =>
  role === "customer" ? "home" : role === "pandit" ? "dashboard" : "admin-overview"

export type RouteParams = { pujaId?: string; panditId?: string; bookingId?: string }

export function pathFor(page: Page, role: Role, params: RouteParams = {}): string {
  if (role === "customer") {
    if (page === "puja") return `/pujas/${params.pujaId}`
    if (page === "pandit-profile") return `/pandits/${params.panditId}`
    if (page === "confirmation") return `/account/bookings/${params.bookingId}`
    if (page === "payment") return `/account/bookings/${params.bookingId}/pay`
  }
  return tables[role][page] ?? tables[role][homeFor(role)]!
}

export type Route = { page: Page; area: Role; id?: string }

export function parsePath(rawPath: string): Route | null {
  const path = rawPath.length > 1 ? rawPath.replace(/\/+$/, "") : rawPath
  for (const area of ["customer", "pandit", "admin"] as Role[]) {
    for (const [page, known] of Object.entries(tables[area])) {
      if (known === path) return { page: page as Page, area }
    }
  }
  let m = /^\/pujas\/([^/]+)$/.exec(path)
  if (m) return { page: "puja", area: "customer", id: m[1] }
  m = /^\/pandits\/([^/]+)$/.exec(path)
  if (m) return { page: "pandit-profile", area: "customer", id: m[1] }
  m = /^\/account\/bookings\/([^/]+)\/pay$/.exec(path)
  if (m) return { page: "payment", area: "customer", id: m[1] }
  m = /^\/account\/bookings\/([^/]+)$/.exec(path)
  if (m) return { page: "confirmation", area: "customer", id: m[1] }
  return null
}
