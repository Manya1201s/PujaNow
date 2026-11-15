// Demo data and pure helpers for the PujaNow frontend MVP. There is no backend yet.

export type Role = "customer" | "pandit" | "admin"
export type Page = "home" | "explore" | "puja" | "assistant" | "recommendation" | "plan" | "pandits" | "pandit-profile" | "booking" | "checkout" | "confirmation" | "dashboard" | "bookings" | "messages" | "profile" | "emergency" | "samagri" | "login" | "register" | "partner" | "onboarding" | "verification" | "requests" | "upcoming" | "completed" | "earnings" | "reviews" | "admin-overview" | "customers" | "pandit-management" | "admin-verification" | "catalogue" | "booking-management" | "payments" | "commission" | "complaints" | "reports" | "settings" | "about" | "trust" | "help" | "privacy" | "terms" | "refunds" | "payment" | "not-found" | "credits"

// Each puja has its own photo, stored in public/assets/pujas. Credits are in src/photo-credits.json.
const pujaPhoto = (name: string) => `${import.meta.env.BASE_URL}assets/pujas/${name}.jpg`
/** Used for pujas an administrator adds, until they can upload their own photo. */
export const defaultPujaImage = pujaPhoto("default")
const thaliImage =
  "https://images.unsplash.com/photo-1680490964889-67a5ab8d8b54?auto=format&fit=crop&w=700&q=85"

export const CATEGORIES = [
  "All pujas",
  "New beginnings",
  "Wellbeing",
  "Prosperity",
  "Festivals",
  "Ancestral rituals",
]
export const PUJA_TYPES = ["Home ceremony", "Havan & jaap", "Festival puja", "Ancestral ritual"]
export const LANGUAGES = ["Hindi", "English", "Sanskrit", "Gujarati", "Marathi"]
export const CITIES = ["Gurugram", "New Delhi", "Noida", "Jaipur", "Pune", "Ahmedabad", "Mumbai", "Bengaluru"]
export const PLATFORM_FEE = 299
export const PANDIT_ID = "raghav"
export const SUPPORT_PHONE = "+91 80471 88000"
export const PAYMENT_WINDOW_HOURS = 24

export type Puja = {
  id: string
  name: string
  meta: string
  time: string
  hours: number
  price: number
  image: string
  categories: string[]
  type: string
  languages: string[]
  occasions: string[]
  benefits: string[]
  overline: string
  about: string
  included: string[]
  prepare: string
  popular?: boolean
  active: boolean
}

const standardIncluded = [
  "Personalised sankalp for your family",
  "Complete Vedic rituals",
  "Guidance before and during the ceremony",
  "Digital preparation checklist",
  "Optional complete samagri kit",
]
const standardPrepare =
  "Choose an auspicious date, clean the space before the ceremony and keep an area free for the puja setup. Your pandit will guide you through every detail."

export const seedPujas: Puja[] = [
  {
    id: "griha-pravesh",
    name: "Griha Pravesh Puja",
    meta: "For a blessed new beginning",
    time: "2–3 hrs",
    hours: 3,
    price: 5100,
    image: pujaPhoto("griha-pravesh"),
    categories: ["New beginnings"],
    type: "Home ceremony",
    languages: ["Hindi", "English"],
    occasions: ["moving into a new home", "housewarming", "first home"],
    benefits: ["positive energy", "harmony", "prosperity", "purification", "vastu"],
    overline: "NEW HOME CEREMONY",
    about:
      "Griha Pravesh is performed before entering and residing in a new home. The ceremony includes Vastu Shanti, Ganesh Puja and a sacred havan to harmonise the energies of the space.",
    included: [
      "Personalised sankalp for your family",
      "Complete Vedic rituals and havan",
      "Guidance before and during the ceremony",
      "Digital preparation checklist",
      "Optional complete samagri kit",
    ],
    prepare:
      "Choose an auspicious date, clean your home before the ceremony and keep the north-east area free for the puja setup. Your pandit will guide you through every detail.",
    popular: true,
    active: true,
  },
  {
    id: "satyanarayan",
    name: "Satyanarayan Puja",
    meta: "For prosperity and gratitude",
    time: "2 hrs",
    hours: 2,
    price: 3500,
    image: pujaPhoto("satyanarayan"),
    categories: ["Prosperity", "Wellbeing"],
    type: "Home ceremony",
    languages: ["Hindi", "English", "Sanskrit"],
    occasions: ["birthday", "anniversary", "gratitude", "family gathering"],
    benefits: ["prosperity", "gratitude", "family harmony"],
    overline: "GRATITUDE CEREMONY",
    about:
      "Satyanarayan Puja is a devotional ceremony of gratitude to Lord Vishnu, often held on milestones such as birthdays and anniversaries, with the recitation of the Satyanarayan Katha.",
    included: standardIncluded,
    prepare: standardPrepare,
    popular: true,
    active: true,
  },
  {
    id: "ganesh",
    name: "Ganesh Puja",
    meta: "For success and new ventures",
    time: "1.5 hrs",
    hours: 1.5,
    price: 2500,
    image: pujaPhoto("ganesh"),
    categories: ["New beginnings", "Prosperity"],
    type: "Home ceremony",
    languages: ["Hindi", "English", "Marathi"],
    occasions: ["starting a new business", "new job", "new venture"],
    benefits: ["success", "removing obstacles", "wisdom"],
    overline: "NEW VENTURE CEREMONY",
    about:
      "Ganesh Puja invokes Lord Ganesha, the remover of obstacles, and is traditionally performed before beginning a business, a new role or any important undertaking.",
    included: standardIncluded,
    prepare: standardPrepare,
    popular: true,
    active: true,
  },
  {
    id: "lakshmi",
    name: "Lakshmi Puja",
    meta: "For abundance and household wellbeing",
    time: "2–3 hrs",
    hours: 3,
    price: 5100,
    image: pujaPhoto("lakshmi"),
    categories: ["Prosperity", "Festivals"],
    type: "Festival puja",
    languages: ["Hindi", "English", "Gujarati"],
    occasions: ["diwali", "dhanteras", "new financial year"],
    benefits: ["abundance", "wealth", "prosperity"],
    overline: "PROSPERITY CEREMONY",
    about:
      "Lakshmi Puja honours Goddess Lakshmi and is most commonly performed on Diwali, inviting abundance and wellbeing into the household.",
    included: standardIncluded,
    prepare: standardPrepare,
    active: true,
  },
  {
    id: "mahamrityunjaya",
    name: "Mahamrityunjaya Jaap",
    meta: "For health and protection",
    time: "2 hrs",
    hours: 2,
    price: 3500,
    image: pujaPhoto("mahamrityunjaya"),
    categories: ["Wellbeing"],
    type: "Havan & jaap",
    languages: ["Hindi", "Sanskrit"],
    occasions: ["illness recovery", "family wellbeing", "difficult times"],
    benefits: ["health", "healing", "protection", "peace of mind"],
    overline: "WELLBEING RITUAL",
    about:
      "The Mahamrityunjaya Jaap is a recitation dedicated to Lord Shiva, offered with prayers for health, healing and protection for family members.",
    included: standardIncluded,
    prepare: standardPrepare,
    active: true,
  },
  {
    id: "navgraha",
    name: "Navgraha Shanti",
    meta: "For balance and planetary harmony",
    time: "1.5 hrs",
    hours: 1.5,
    price: 2500,
    image: pujaPhoto("navgraha"),
    categories: ["Wellbeing"],
    type: "Havan & jaap",
    languages: ["Hindi", "Sanskrit", "Marathi"],
    occasions: ["family wellbeing", "marriage preparation", "career challenges"],
    benefits: ["balance", "peace", "planetary harmony"],
    overline: "HARMONY RITUAL",
    about:
      "Navgraha Shanti is offered to the nine planetary deities, with prayers for balance and calm during periods of change.",
    included: standardIncluded,
    prepare: standardPrepare,
    active: true,
  },
  {
    id: "durga",
    name: "Navratri Durga Puja",
    meta: "For strength during Navratri",
    time: "3 hrs",
    hours: 3,
    price: 4200,
    image: pujaPhoto("durga"),
    categories: ["Festivals"],
    type: "Festival puja",
    languages: ["Hindi", "English", "Gujarati"],
    occasions: ["navratri", "durga ashtami", "festival"],
    benefits: ["strength", "courage", "protection"],
    overline: "FESTIVAL CEREMONY",
    about:
      "Navratri Durga Puja honours Goddess Durga through the festival's sacred days, with kalash sthapana, aarti and family prayers.",
    included: standardIncluded,
    prepare: standardPrepare,
    active: true,
  },
  {
    id: "pitru-shraddh",
    name: "Pitru Paksha Shraddh",
    meta: "For honouring your ancestors",
    time: "2 hrs",
    hours: 2,
    price: 3100,
    image: pujaPhoto("pitru-shraddh"),
    categories: ["Ancestral rituals"],
    type: "Ancestral ritual",
    languages: ["Hindi", "Sanskrit"],
    occasions: ["pitru paksha", "death anniversary", "remembrance"],
    benefits: ["ancestral blessings", "remembrance", "peace"],
    overline: "ANCESTRAL RITUAL",
    about:
      "Shraddh is a ritual of remembrance offered to departed family members, traditionally observed during Pitru Paksha or on a death anniversary.",
    included: standardIncluded,
    prepare: standardPrepare,
    active: true,
  },
  {
    id: "narayan-bali",
    name: "Narayan Bali Puja",
    meta: "For family peace across generations",
    time: "4–5 hrs",
    hours: 5,
    price: 7500,
    image: pujaPhoto("narayan-bali"),
    categories: ["Ancestral rituals"],
    type: "Ancestral ritual",
    languages: ["Hindi", "Sanskrit", "Marathi"],
    occasions: ["ancestral peace", "family remembrance"],
    benefits: ["ancestral peace", "family harmony"],
    overline: "ANCESTRAL RITUAL",
    about:
      "Narayan Bali is an elaborate ancestral ritual performed by families seeking peace for departed relatives, guided closely by an experienced pandit.",
    included: standardIncluded,
    prepare: standardPrepare,
    active: true,
  },
  {
    id: "rudrabhishek",
    name: "Rudrabhishek",
    meta: "For Lord Shiva’s blessings and peace",
    time: "2–3 hrs",
    hours: 3,
    price: 4100,
    image: pujaPhoto("rudrabhishek"),
    categories: ["Wellbeing"],
    type: "Havan & jaap",
    languages: ["Hindi", "Sanskrit"],
    occasions: ["shravan", "mahashivratri", "monday prayers"],
    benefits: ["peace", "health", "removing obstacles", "spiritual growth"],
    overline: "SHIVA ABHISHEK",
    about:
      "Rudrabhishek is the ritual bathing of the Shiva lingam with milk, water, honey and bel leaves while the Rudram is chanted, offered for peace, health and Lord Shiva’s blessings.",
    included: standardIncluded,
    prepare: standardPrepare,
    active: true,
  },
  {
    id: "vivah",
    name: "Vivah Puja",
    meta: "For a sacred Hindu wedding",
    time: "3–4 hrs",
    hours: 4,
    price: 11000,
    image: pujaPhoto("vivah"),
    categories: ["New beginnings"],
    type: "Home ceremony",
    languages: ["Hindi", "Sanskrit", "English"],
    occasions: ["wedding", "marriage", "shaadi"],
    benefits: ["marital harmony", "blessings for the couple", "family union"],
    overline: "WEDDING CEREMONY",
    about:
      "Vivah Puja covers the sacred rituals of a Hindu wedding, including kanyadaan, the seven pheras around the sacred fire and the exchange of vows, led by an experienced pandit.",
    included: [
      "Pre-wedding consultation with your family",
      "Complete Vedic wedding rituals and havan",
      "Guidance through the seven pheras",
      "Coordination with your family on the day",
      "Optional complete samagri kit",
    ],
    prepare:
      "Share your muhurat and venue details early. Your pandit will plan the order of rituals with your family and the venue.",
    active: true,
  },
]

export type Pandit = {
  id: string
  name: string
  short: string
  city: string
  exp: string
  langs: string
  price: number
  rating: string
  reviews: string
  initials: string
  color: string
  about: string
  bio: string
  specialisations: string[]
  pujaIds: string[]
  status: "Active" | "Suspended"
  available: boolean
}

const allPujaIds = seedPujas.map((p) => p.id)

export const seedPandits: Pandit[] = [
  {
    id: "raghav",
    name: "Acharya Raghav Sharma",
    short: "Acharya Raghav",
    city: "Gurugram",
    exp: "18 years",
    langs: "Hindi, Sanskrit, English",
    price: 3500,
    rating: "4.9",
    reviews: "186",
    initials: "RS",
    color: "#ead6c2",
    about:
      "Vedic scholar specialising in Griha Pravesh, Satyanarayan Puja and family ceremonies. Known for explaining every ritual with warmth and clarity.",
    bio: "Trained at Sampurnanand Sanskrit Vishwavidyalaya, Acharya Raghav has guided more than 1,200 families through important spiritual milestones. He takes special care to explain the significance of each step.",
    specialisations: ["Griha Pravesh", "Satyanarayan Puja", "Ganesh Puja", "Navgraha Shanti", "Marriage rituals", "Mundan ceremony"],
    pujaIds: allPujaIds,
    status: "Active",
    available: true,
  },
  {
    id: "mohit",
    name: "Pandit Mohit Trivedi",
    short: "Pandit Mohit",
    city: "New Delhi",
    exp: "12 years",
    langs: "Hindi, Gujarati, English",
    price: 3200,
    rating: "4.8",
    reviews: "124",
    initials: "MT",
    color: "#d7ddd2",
    about: "Warm and punctual pandit who conducts household and festival ceremonies in Hindi, Gujarati and English.",
    bio: "Pandit Mohit has conducted household and festival ceremonies across Delhi NCR for over a decade, with a particular focus on young families performing a ritual for the first time.",
    specialisations: ["Griha Pravesh", "Lakshmi Puja", "Navratri Durga Puja", "Satyanarayan Puja"],
    pujaIds: ["griha-pravesh", "lakshmi", "durga", "satyanarayan", "ganesh", "vivah"],
    status: "Active",
    available: true,
  },
  {
    id: "vivek",
    name: "Acharya Vivek Joshi",
    short: "Acharya Vivek",
    city: "Noida",
    exp: "15 years",
    langs: "Hindi, Marathi, Sanskrit",
    price: 3800,
    rating: "4.9",
    reviews: "211",
    initials: "VJ",
    color: "#e3d7c8",
    about: "Scholar of Vedic and ancestral rituals, known for precise recitation and patient guidance.",
    bio: "Acharya Vivek is sought after for wellbeing and ancestral rituals, and helps families understand each stage of the ceremony before it begins.",
    specialisations: ["Mahamrityunjaya Jaap", "Navgraha Shanti", "Pitru Paksha Shraddh", "Narayan Bali", "Ganesh Puja"],
    pujaIds: ["griha-pravesh", "mahamrityunjaya", "navgraha", "pitru-shraddh", "narayan-bali", "ganesh", "rudrabhishek"],
    status: "Active",
    available: true,
  },
  {
    id: "anand",
    name: "Pandit Anand Mishra",
    short: "Pandit Anand",
    city: "Gurugram",
    exp: "9 years",
    langs: "Hindi, English",
    price: 3000,
    rating: "4.7",
    reviews: "88",
    initials: "AM",
    color: "#e6dccb",
    about: "Friendly pandit for home ceremonies, often chosen by families holding their first puja.",
    bio: "Pandit Anand focuses on home ceremonies and shares a simple preparation checklist with each family in advance.",
    specialisations: ["Griha Pravesh", "Ganesh Puja", "Satyanarayan Puja"],
    pujaIds: ["griha-pravesh", "ganesh", "satyanarayan", "lakshmi"],
    status: "Active",
    available: true,
  },
]

export type Product = { id: string; name: string; meta: string; price: number; image: string }
export const products: Product[] = [
  { id: "griha-kit", name: "Complete Griha Pravesh Kit", meta: "35+ items · Serves 6", price: 1899, image: pujaPhoto("samagri-kit") },
  { id: "havan", name: "Premium Havan Essentials", meta: "Organic, temple-grade ingredients", price: 899, image: pujaPhoto("samagri-havan") },
  { id: "thali", name: "Brass Puja Thali Set", meta: "Hand-finished · 8 pieces", price: 1499, image: thaliImage },
]

export const demoBanks = [
  "Demo National Bank",
  "Demo Heritage Bank",
  "Demo City Bank",
  "Demo Cooperative Bank",
  "Demo Failure Bank",
]
export const FAIL_UPI = "fail@upi"
export const FAIL_CARD = "4000000000000002"
export const FAIL_BANK = "Demo Failure Bank"

// ---- Dates ----

const pad = (n: number) => String(n).padStart(2, "0")
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const fromISO = (s: string) => {
  const [y, m, d] = s.split("-").map(Number)
  return new Date(y, m - 1, d)
}
export const todayISO = () => toISO(new Date())
export const addDays = (n: number, from = new Date()) =>
  toISO(new Date(from.getFullYear(), from.getMonth(), from.getDate() + n))
export const daysUntil = (iso: string) =>
  Math.round((fromISO(iso).getTime() - fromISO(todayISO()).getTime()) / 86400000)
export const fmtShort = (iso: string) =>
  fromISO(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
export const fmtLong = (iso: string) =>
  fromISO(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
export const fmtDay = (iso: string) => {
  const d = fromISO(iso)
  return `${d.toLocaleDateString("en-GB", { weekday: "short" })}, ${fmtShort(iso)}`
}

export function fmtStamp(at: string) {
  const d = new Date(at)
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  const iso = toISO(d)
  if (iso === todayISO()) return `Today, ${time}`
  if (iso === addDays(-1)) return `Yesterday, ${time}`
  return `${fmtShort(iso)}, ${time}`
}

export const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN")

export function hash(s: string) {
  let h = 7
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h
}

const toMinutes = (t: string) => {
  const m = /(\d+):(\d+) (AM|PM)/.exec(t)!
  return ((Number(m[1]) % 12) + (m[3] === "PM" ? 12 : 0)) * 60 + Number(m[2])
}

/** Deterministic demo availability: the same date and pandit always give the same slots. */
export function slotsFor(date: string, panditId: string) {
  if (!isPanditFree(panditId, date)) return []
  const all =["8:20 AM", "9:40 AM", "11:45 AM", "2:15 PM", "4:30 PM", "6:00 PM"]
  const skip = hash(date + panditId) % 6
  const slots = all.filter((_, i) => i !== skip && i !== (skip + 3) % 6)
  if (date !== todayISO()) return slots
  const now = new Date()
  return slots.filter((t) => toMinutes(t) > now.getHours() * 60 + now.getMinutes() + 120)
}
/** Start of the puja as a real moment in time. */
export function pujaStart(date: string, time: string) {
  const start = fromISO(date)
  const m = /(d+):(d+) (AM|PM)/.exec(time)
  if (m) start.setMinutes(toMinutes(time))
  return start
}
/** A response or payment deadline, which can never fall after the puja has begun. */
export function deadlineFor(hours: number, date: string, time: string) {
  const end = Math.min(Date.now() + hours * 3600000, pujaStart(date, time).getTime())
  return new Date(end).toISOString()
}
export function fmtTimeLeft(at: string | null) {
  if (!at) return ""
  const mins = Math.ceil((new Date(at).getTime() - Date.now()) / 60000)
  if (mins <= 0) return "Time is up"
  if (mins < 60) return `${mins} min left`
  const hrs = Math.ceil(mins / 60)
  return `${hrs} ${hrs === 1 ? "hr" : "hrs"} left`
}
export const isRecommendedDate = (date: string) => fromISO(date).getDate() % 14 <= 1
export const isPanditFree = (panditId: string, date: string) => hash(panditId + date) % 6 !== 0

// ---- Map locations ----
// No real addresses exist yet. Pandits are placed at demo positions near their city's centre,
// and the map labels them as demo locations.

export type Point = { lat: number; lng: number }

/** Approximate public city-centre coordinates, used only to place demo markers. */
const CITY_CENTRES: Record<string, Point> = {
  Gurugram: { lat: 28.4595, lng: 77.0266 },
  "New Delhi": { lat: 28.6139, lng: 77.209 },
  Noida: { lat: 28.5355, lng: 77.391 },
  Jaipur: { lat: 26.9124, lng: 75.7873 },
  Pune: { lat: 18.5204, lng: 73.8567 },
  Ahmedabad: { lat: 23.0225, lng: 72.5714 },
  Mumbai: { lat: 19.076, lng: 72.8777 },
  Bengaluru: { lat: 12.9716, lng: 77.5946 },
}

export const cityCentre = (city: string): Point | null => CITY_CENTRES[city.trim()] ?? null

/** A fixed demo position 2–8 km from the pandit's city centre. Not a real address. */
export function demoPosition(p: Pick<Pandit, "id" | "city">): Point | null {
  const centre = cityCentre(p.city)
  if (!centre) return null
  const h = hash(p.id)
  const angle = ((h % 360) * Math.PI) / 180
  const km = 2 + ((h >>> 9) % 7)
  return {
    lat: centre.lat + (km / 111) * Math.cos(angle),
    lng: centre.lng + (km / (111 * Math.cos((centre.lat * Math.PI) / 180))) * Math.sin(angle),
  }
}

/** Straight-line distance in kilometres. */
export function distanceKm(a: Point, b: Point) {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(x))
}

// ---- Records ----

// Pending (pandit to respond) -> Awaiting payment -> Confirmed (paid) -> Completed (payout released).
// A request can also end as Declined, Expired or Cancelled, and then no payment is collected.
export type BookingStatus = "Pending" | "Awaiting payment" | "Confirmed" | "Completed" | "Cancelled" | "Declined" | "Expired"
export type PaymentStatus = "Not due" | "Awaiting" | "Demo paid" | "Demo refund" | "Not charged"
export type PayoutStatus = "None" | "Held" | "Released"
export type Booking = {
  id: string
  pujaId: string
  pujaName: string
  panditId: string
  panditName: string
  customer: string
  mine: boolean
  date: string
  time: string
  location: string
  dakshina: number
  samagri: number
  samagriNames: string[]
  fee: number
  total: number
  status: BookingStatus
  payment: string
  paymentStatus: PaymentStatus
  payoutStatus: PayoutStatus
  commission: number
  payout: number
  /** When the pandit's response or the customer's payment is due. */
  expiresAt: string | null
  createdAt: string
  reviewed?: boolean
}

function seedBooking(
  id: string,
  pujaId: string,
  panditId: string,
  customer: string,
  offset: number,
  time: string,
  location: string,
  total: number,
  status: BookingStatus,
  mine = false,
): Booking {
  const puja = seedPujas.find((p) => p.id === pujaId)!
  const pandit = seedPandits.find((p) => p.id === panditId)!
  const samagri = mine && total > puja.price + PLATFORM_FEE ? total - puja.price - PLATFORM_FEE : 0
  const dakshina = total - samagri - PLATFORM_FEE
  const open = status === "Pending" || status === "Awaiting payment"
  const released = status === "Completed"
  const commission = released ? Math.round(dakshina * 0.12) : 0
  return {
    id,
    pujaId,
    pujaName: puja.name,
    panditId,
    panditName: pandit.name,
    customer,
    mine,
    date: addDays(offset),
    time,
    location,
    dakshina,
    samagri,
    samagriNames: samagri ? ["Complete Griha Pravesh Kit"] : [],
    fee: PLATFORM_FEE,
    total,
    status,
    payment: open ? "Not started" : "UPI (demo)",
    paymentStatus: status === "Pending" ? "Not due" : status === "Awaiting payment" ? "Awaiting" : "Demo paid",
    payoutStatus: released ? "Released" : status === "Confirmed" ? "Held" : "None",
    commission,
    payout: released ? dakshina - commission : 0,
    expiresAt: open ? new Date(Date.now() + 22 * 3600000).toISOString() : null,
    createdAt: addDays(Math.min(offset, 0) - 9),
  }
}

export const seedBookings = (): Booking[] => [
  seedBooking("PN-2412-0836", "griha-pravesh", "raghav", "Ananya Sharma", 9, "8:20 AM", "Sector 56, Gurugram", 7298, "Confirmed", true),
  seedBooking("PN-2411-0512", "satyanarayan", "raghav", "Ananya Sharma", -32, "10:00 AM", "Sector 56, Gurugram", 3799, "Completed", true),
  seedBooking("PN-2410-0433", "ganesh", "mohit", "Ananya Sharma", -74, "9:40 AM", "Sector 56, Gurugram", 2799, "Completed", true),
  seedBooking("PN-2409-0287", "lakshmi", "raghav", "Ananya Sharma", -120, "6:00 PM", "Sector 56, Gurugram", 5399, "Completed", true),
  seedBooking("PN-2412-0902", "satyanarayan", "raghav", "Rohit Mehta", 11, "10:00 AM", "New Delhi", 3799, "Confirmed"),
  seedBooking("PN-2412-0911", "ganesh", "raghav", "Kavya Sethi", 14, "9:15 AM", "Noida", 2799, "Confirmed"),
  seedBooking("PN-2212-0711", "satyanarayan", "mohit", "Rohit Mehta", -18, "11:45 AM", "New Delhi", 5499, "Completed"),
  seedBooking("PN-2112-0618", "ganesh", "vivek", "Kavya Sethi", 6, "2:15 PM", "Noida", 4199, "Pending"),
  seedBooking("PN-2410-0350", "navgraha", "raghav", "Rohit Mehta", -45, "9:40 AM", "New Delhi", 2799, "Completed"),
  seedBooking("PN-2501-0101", "griha-pravesh", "raghav", "Meera Kapoor", 9, "11:45 AM", "Sector 56, Gurugram", 5399, "Pending"),
  seedBooking("PN-2501-0102", "satyanarayan", "raghav", "Ritika Malhotra", 12, "11:00 AM", "DLF Phase 2, Gurugram", 3799, "Pending"),
  seedBooking("PN-2501-0103", "navgraha", "raghav", "Nikhil Gupta", 15, "9:30 AM", "Golf Course Road", 5099, "Pending"),
  seedBooking("PN-2501-0104", "navgraha", "vivek", "Ananya Sharma", 12, "9:40 AM", "Sector 56, Gurugram", 2799, "Awaiting payment", true),
]

export type Message = { id: string; from: "me" | "them"; text: string; at: string }
export type Thread = {
  id: string
  name: string
  initials: string
  support?: boolean
  status: string
  unread: number
  messages: Message[]
}

const ago = (minutes: number) => new Date(Date.now() - minutes * 60000).toISOString()

export const seedThreads = (): Thread[] => [
  {
    id: "pandit-raghav",
    name: "Acharya Raghav Sharma",
    initials: "RS",
    status: "Usually replies within an hour",
    unread: 2,
    messages: [
      { id: "r1", from: "them", text: "Namaste Ananya ji. I have received the details for your Griha Pravesh.", at: ago(1560) },
      { id: "r2", from: "me", text: "Namaste Pandit ji. Is there anything we should prepare ourselves?", at: ago(1510) },
      { id: "r3", from: "them", text: "Yes, please keep the kalash ready. The rest will be included in your samagri kit.", at: ago(95) },
      { id: "r4", from: "them", text: "I will arrive about 30 minutes early to set up in the north-east corner.", at: ago(92) },
    ],
  },
  {
    id: "support",
    name: "PujaNow Support",
    initials: "PN",
    support: true,
    status: "Support team · Replies within 15 minutes",
    unread: 0,
    messages: [
      { id: "s1", from: "me", text: "Hi, could you confirm when my samagri kit will be delivered?", at: ago(2980) },
      { id: "s2", from: "them", text: "Your samagri kit is confirmed. It will be delivered one day before your puja.", at: ago(2950) },
    ],
  },
  {
    id: "pandit-mohit",
    name: "Pandit Mohit Trivedi",
    initials: "MT",
    status: "Usually replies within a few hours",
    unread: 0,
    messages: [
      { id: "m1", from: "them", text: "It was a pleasure conducting the Ganesh Puja for your family.", at: ago(100000) },
      { id: "m2", from: "me", text: "Thank you Pandit ji. Everyone at home felt very much at ease.", at: ago(99800) },
    ],
  },
]

export const autoReplies: Record<string, string[]> = {
  support: [
    "Thanks for reaching out. A member of the PujaNow team is looking into this for you.",
    "Noted. We have added this to your booking so your pandit can see it too.",
  ],
  default: [
    "Namaste. I have noted this and will keep it in mind for the ceremony.",
    "That works well. Please let me know if anything else changes.",
    "Certainly. We can go through the details together before the puja begins.",
  ],
}

export type Customer = { id: string; name: string; email: string; phone: string; city: string; status: "Active" | "Suspended" }
export const seedCustomers: Customer[] = [
  { id: "c1", name: "Ananya Sharma", email: "ananya.sharma@example.com", phone: "+91 98765 43210", city: "Gurugram", status: "Active" },
  { id: "c2", name: "Rohit Mehta", email: "rohit.mehta@example.com", phone: "+91 98110 22345", city: "New Delhi", status: "Active" },
  { id: "c3", name: "Kavya Sethi", email: "kavya.sethi@example.com", phone: "+91 99710 56781", city: "Noida", status: "Active" },
  { id: "c4", name: "Ritika Malhotra", email: "ritika.m@example.com", phone: "+91 98189 44120", city: "Gurugram", status: "Active" },
  { id: "c5", name: "Nikhil Gupta", email: "nikhil.gupta@example.com", phone: "+91 98730 90876", city: "Gurugram", status: "Active" },
  { id: "c6", name: "Meera Kapoor", email: "meera.kapoor@example.com", phone: "+91 99990 31245", city: "Gurugram", status: "Active" },
]

export type VerificationRequest = {
  id: string
  name: string
  city: string
  exp: string
  langs: string
  document: string
  status: "Documents ready" | "Approved" | "Rejected"
}
export const seedVerifications: VerificationRequest[] = [
  { id: "v1", name: "Mahesh Chandra Joshi", city: "Jaipur", exp: "16 years", langs: "Hindi, Sanskrit", document: "aadhaar-mahesh.pdf", status: "Documents ready" },
  { id: "v2", name: "Kunal Vyas", city: "Ahmedabad", exp: "11 years", langs: "Hindi, Gujarati", document: "passport-kunal.pdf", status: "Documents ready" },
  { id: "v3", name: "Deepak Shastri", city: "Pune", exp: "14 years", langs: "Hindi, Marathi", document: "pan-deepak.jpg", status: "Documents ready" },
]

export type Complaint = {
  id: string
  customer: string
  subject: string
  detail: string
  bookingId: string
  status: "Open" | "Resolved"
  resolution?: string
}
export const seedComplaints: Complaint[] = [
  { id: "CM-1042", customer: "Rohit Mehta", subject: "Pandit arrived 40 minutes late", detail: "The ceremony still went well, but we were not told about the delay.", bookingId: "PN-2212-0711", status: "Open" },
  { id: "CM-1038", customer: "Kavya Sethi", subject: "Samagri kit missing an item", detail: "The kit did not include the coconut listed on the checklist.", bookingId: "PN-2112-0618", status: "Open" },
  { id: "CM-1021", customer: "Nikhil Gupta", subject: "Requested an updated invoice", detail: "Needed the invoice re-issued in my company's name.", bookingId: "PN-2501-0103", status: "Resolved", resolution: "Invoice re-issued by support." },
]

export type Review = { id: string; panditId: string; author: string; initials: string; rating: string; text: string; age: string }
export const seedReviews: Review[] = [
  { id: "rv1", panditId: "raghav", author: "Ananya Sharma", initials: "AS", rating: "5.0", text: "The entire ceremony was explained so beautifully.", age: "2 days ago" },
  { id: "rv2", panditId: "raghav", author: "Rohit Mehta", initials: "RM", rating: "5.0", text: "Punctual, patient and very knowledgeable.", age: "3 days ago" },
  { id: "rv3", panditId: "raghav", author: "Kavya Sethi", initials: "KS", rating: "5.0", text: "Our family felt completely comfortable throughout.", age: "4 days ago" },
]

export type Payout = { id: string; panditId: string; date: string; amount: number; status: "Paid" | "Processing" }
export const seedPayouts = (): Payout[] => [
  { id: "PO-3120", panditId: "raghav", date: addDays(-7), amount: 18400, status: "Paid" },
  { id: "PO-3094", panditId: "raghav", date: addDays(-14), amount: 21250, status: "Paid" },
  { id: "PO-3051", panditId: "raghav", date: addDays(-21), amount: 16900, status: "Paid" },
]

export type Notice = {
  id: string
  role: Role
  panditId?: string
  title?: string
  text: string
  page: Page
  /** When set, opening the notice goes to this booking or conversation instead of the page. */
  bookingId?: string
  threadId?: string
  at?: string
  read: boolean
}

const noticeTitles: Partial<Record<Page, string>> = {
  messages: "New message",
  bookings: "Booking update",
  requests: "New booking request",
  upcoming: "Booking update",
  earnings: "Earnings update",
  "admin-verification": "Verification request",
  complaints: "New complaint",
  "booking-management": "Booking update",
  payments: "Payment update",
}
/** Older saved notices have no title, so one is taken from where they lead. */
export const noticeTitle = (n: Notice) => n.title ?? noticeTitles[n.page] ?? "Update"
export const seedNotices: Notice[] = [
  { id: "n1", role: "customer", title: "New message", text: "Acharya Raghav sent you a new message", page: "messages", threadId: "pandit-raghav", at: ago(92), read: false },
  { id: "n2", role: "customer", title: "Booking accepted", text: "Acharya Vivek accepted your Navgraha Shanti request. Payment is now due.", page: "bookings", bookingId: "PN-2501-0104", at: ago(120), read: false },
  { id: "n3", role: "pandit", panditId: "raghav", title: "New booking requests", text: "You have new booking requests", page: "requests", at: ago(60), read: false },
  { id: "n4", role: "pandit", panditId: "raghav", title: "Payout completed", text: "Your latest payout was completed", page: "earnings", at: ago(10080), read: false },
  { id: "n5", role: "admin", title: "Verification requests", text: "New pandit verification requests are waiting", page: "admin-verification", at: ago(180), read: false },
  { id: "n6", role: "admin", title: "New complaint", text: "A complaint needs your review", page: "complaints", at: ago(1440), read: false },
]

export const infoPages: Partial<Record<Page, { overline: string; title: string; text: string; sections: [string, string][] }>> = {
  about: {
    overline: "ABOUT PUJANOW",
    title: "Sacred moments, made simpler",
    text: "PujaNow helps families plan meaningful pujas with trusted experts.",
    sections: [
      ["What we do", "We bring together puja planning, verified pandits and samagri in one simple booking, so families can focus on the moment rather than the logistics."],
      ["This demo", "You are viewing an interactive frontend demonstration of the PujaNow MVP. Bookings, messages and payments use demo data stored only in this browser."],
    ],
  },
  trust: {
    overline: "TRUST & SAFETY",
    title: "Booking with confidence",
    text: "How we approach verification, reviews and support.",
    sections: [
      ["Pandit verification", "Partners submit identity documents and details of their experience, which an administrator reviews before approving the profile."],
      ["Reviews", "Families can review a pandit after a completed puja, which helps others choose with confidence."],
      ["Reporting a concern", "Contact support from your messages at any time. Administrators track each complaint until it is resolved."],
    ],
  },
  help: {
    overline: "HELP CENTRE",
    title: "How can we help?",
    text: "Answers to the most common questions.",
    sections: [
      ["How does booking work?", "Send a booking request and your pandit has a set time to accept or decline it. No payment is due until they accept. If they decline or do not respond in time, you pay nothing. Your booking is confirmed once you pay, and the pandit's payment is released after the puja, less the platform commission."],
      ["How do I change my booking?", "Open My bookings from your account, then choose Reschedule or Cancel on the booking."],
      ["How do I contact my pandit?", "Open Messages from your account and select the conversation with your pandit."],
      ["How do I test a payment?", "All payments are demo-only and no money moves. Checkout explains which sample details simulate a success or a failure."],
      ["How do I reach support?", `Message PujaNow Support from your account, or call ${SUPPORT_PHONE}.`],
    ],
  },
  privacy: {
    overline: "PRIVACY",
    title: "Privacy policy",
    text: "Placeholder copy for this demo. The final policy has not been published yet.",
    sections: [["In this demo", "Details you enter are kept in this browser's local storage and are not sent to a server. Payment details and passwords are not saved at all."]],
  },
  terms: {
    overline: "TERMS",
    title: "Terms of service",
    text: "Placeholder copy for this demo. The final terms have not been published yet.",
    sections: [["In this demo", "Bookings made here are demonstrations only. They do not create a real service or payment obligation."]],
  },
  refunds: {
    overline: "REFUNDS",
    title: "Refund policy",
    text: "Placeholder copy for this demo. The final policy has not been published yet.",
    sections: [["In this demo", "Cancelling a booking marks a demo refund on the record. No real money is taken or returned."]],
  },
}
