import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { homeFor, parsePath, pathFor } from "./routes"
import {
  autoReplies,
  deadlineFor,
  inr,
  PAYMENT_WINDOW_HOURS,
  products,
  PANDIT_ID,
  PLATFORM_FEE,
  seedBookings,
  seedComplaints,
  seedCustomers,
  seedNotices,
  seedPandits,
  seedPayouts,
  seedPujas,
  seedReviews,
  seedThreads,
  seedVerifications,
  slotsFor,
  todayISO,
  type Booking,
  type Complaint,
  type Customer,
  type Notice,
  type Page,
  type Pandit,
  type Payout,
  type Puja,
  type Review,
  type Role,
  type Thread,
  type VerificationRequest,
} from "./data"

export type Profile = { name: string; phone: string; email: string; language: string; address: string }
export type Filters = Record<string, string[]>
export type Draft = {
  pujaId: string
  panditId: string
  date: string | null
  time: string | null
  city: string
  address: string
  familySize: number
  samagri: string[]
  contact: { name: string; phone: string; email: string }
  intent: string
}

export type State = {
  version: 2
  page: Page
  role: Role
  signedIn: boolean
  /** The URL to return to after signing in. */
  returnTo: string | null
  profile: Profile
  /** Which pandit the partner dashboard is showing. There is no real pandit login yet. */
  activePanditId: string
  panditProfiles: Record<string, Profile>
  draft: Draft
  explore: { category: string; query: string; filters: Filters }
  panditSearch: { language: string; filters: Filters }
  pujas: Puja[]
  pandits: Pandit[]
  bookings: Booking[]
  threads: Thread[]
  activeThread: string
  customers: Customer[]
  verifications: VerificationRequest[]
  complaints: Complaint[]
  reviews: Review[]
  payouts: Payout[]
  balances: Record<string, number>
  notices: Notice[]
  settings: { commission: string; phone: string; cancelWindow: string; settlement: string; responseHours: string }
  lastBookingId: string | null
}

const seed = (): State => ({
  version: 2,
  page: "home",
  role: "customer",
  signedIn: false,
  returnTo: null,
  profile: {
    name: "Ananya Sharma",
    phone: "+91 98765 43210",
    email: "ananya.sharma@example.com",
    language: "English & Hindi",
    address: "D-142, Sector 56, Gurugram, Haryana 122011",
  },
  activePanditId: PANDIT_ID,
  panditProfiles: {
    [PANDIT_ID]: {
      name: "Raghav Sharma",
      phone: "+91 98100 77120",
      email: "raghav.sharma@example.com",
      language: "Hindi",
      address: "Sector 31, Gurugram, Haryana 122001",
    },
  },
  draft: {
    pujaId: "griha-pravesh",
    panditId: PANDIT_ID,
    date: null,
    time: null,
    city: "Gurugram",
    address: "Sector 56, Gurugram",
    familySize: 4,
    samagri: ["griha-kit"],
    contact: { name: "Ananya Sharma", phone: "+91 98765 43210", email: "ananya.sharma@example.com" },
    intent: "",
  },
  explore: { category: "All pujas", query: "", filters: {} },
  panditSearch: { language: "", filters: {} },
  pujas: seedPujas,
  pandits: seedPandits,
  bookings: seedBookings(),
  threads: seedThreads(),
  activeThread: "pandit-raghav",
  customers: seedCustomers,
  verifications: seedVerifications,
  complaints: seedComplaints,
  reviews: seedReviews,
  payouts: seedPayouts(),
  balances: { [PANDIT_ID]: 24850 },
  notices: seedNotices,
  settings: { commission: "12", phone: "+91 80471 88000", cancelWindow: "48 hours", settlement: "Weekly (T+7)", responseHours: "24" },
  lastBookingId: null,
})

const STORAGE_KEY = "pujanow.demo.v1"
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "")
const currentPath = () => location.pathname.slice(BASE.length) || "/"

/** Keeps saved values only where they have the expected shape, so bad data cannot break a page. */
function restore(saved: Record<string, unknown>): State {
  const base = seed()
  const restored: Record<string, unknown> = { ...base }
  for (const [key, expected] of Object.entries(base)) {
    const value = saved[key]
    if (value === undefined) continue
    const sameShape =
      value !== null && typeof value === typeof expected && Array.isArray(value) === Array.isArray(expected)
    if (expected === null || sameShape) restored[key] = value
  }
  const state = restored as State
  // Catalogue photos and newly added sample pujas come from the code, while admin edits are kept.
  state.pujas = [
    ...state.pujas.map((p) => {
      const fresh = base.pujas.find((x) => x.id === p.id)
      return fresh ? { ...p, image: fresh.image } : p
    }),
    ...base.pujas.filter((x) => !state.pujas.some((p) => p.id === x.id)),
  ]
  state.pandits = state.pandits.map((p) => {
    const fresh = base.pandits.find((x) => x.id === p.id)
    return fresh ? { ...p, pujaIds: [...new Set([...p.pujaIds, ...fresh.pujaIds])] } : p
  })
  if (!state.threads.length) state.threads = base.threads
  // A date saved on an earlier visit may have passed since.
  if (state.draft.date && state.draft.date < todayISO()) state.draft = { ...state.draft, date: null, time: null }
  return state
}

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      if (saved?.version === 2) return restore(saved)
    }
  } catch {
    // Storage can be blocked or hold bad data, so fall back to the seed data.
  }
  return seed()
}

/** Clears saved data after an unexpected error, when the app cannot use its own reset. */
export function clearSavedData() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}

export const DASHBOARD_PAGES: Page[] = ["dashboard", "bookings", "messages", "profile"]

export function totalsFor(s: Pick<State, "draft" | "pujas" | "pandits">) {
  const puja =
    s.pujas.find((p) => p.id === s.draft.pujaId && p.active) ?? s.pujas.find((p) => p.active) ?? s.pujas[0]
  const eligible = (p: Pandit) => p.status === "Active" && p.available && p.pujaIds.includes(puja.id)
  const chosen = s.pandits.find((p) => p.id === s.draft.panditId)
  // A saved choice can become invalid, for example when an admin suspends the pandit.
  const pandit = (chosen && eligible(chosen) ? chosen : s.pandits.find(eligible)) ?? chosen ?? s.pandits[0]
  // A pandit's starting price sets how far they sit above or below the puja's listed price.
  const dakshina = Math.max(puja.price + pandit.price - 3500, 500)
  const items = products.filter((x) => s.draft.samagri.includes(x.id))
  const samagri = items.reduce((sum, x) => sum + x.price, 0)
  return {
    puja,
    pandit,
    hasPandit: eligible(pandit),
    dakshina,
    items,
    samagri,
    fee: PLATFORM_FEE,
    total: dakshina + samagri + PLATFORM_FEE,
  }
}

/** True when the saved date and time can still be booked with the selected pandit. */
export function scheduleIsValid(s: Pick<State, "draft" | "pujas" | "pandits" | "bookings">) {
  const { date, time } = s.draft
  return Boolean(date && time && date >= todayISO() && openSlots(s, date, totalsFor(s).pandit.id).includes(time))
}

const OPEN_STATUSES: Booking["status"][] = ["Pending", "Awaiting payment", "Confirmed"]

/** Times still free, leaving out slots the pandit already holds for another booking. */
export function openSlots(s: Pick<State, "bookings">, date: string, panditId: string, ignoreBookingId?: string) {
  const taken = s.bookings
    .filter((b) => b.panditId === panditId && b.date === date && b.id !== ignoreBookingId && OPEN_STATUSES.includes(b.status))
    .map((b) => b.time)
  return slotsFor(date, panditId).filter((t) => !taken.includes(t))
}

type NoticeLink = { title?: string; bookingId?: string; threadId?: string }
const addNotice = (s: State, role: Role, text: string, page: Page, panditId?: string, link: NoticeLink = {}): State => ({
  ...s,
  notices: [
    { id: `n${Date.now()}-${s.notices.length}`, role, panditId, text, page, read: false, at: new Date().toISOString(), ...link },
    ...s.notices,
  ],
})

/** Closes requests whose response or payment time has run out, and frees their slots. */
function expireBookings(s: State): State {
  const now = Date.now()
  const due = s.bookings.filter(
    (b) => (b.status === "Pending" || b.status === "Awaiting payment") && b.expiresAt && new Date(b.expiresAt).getTime() <= now,
  )
  if (!due.length) return s
  let next: State = {
    ...s,
    bookings: s.bookings.map((b) =>
      due.some((d) => d.id === b.id)
        ? { ...b, status: "Expired" as const, paymentStatus: "Not charged" as const, expiresAt: null }
        : b,
    ),
  }
  for (const b of due) {
    const text =
      b.status === "Pending"
        ? `${b.panditName} did not respond in time, so your ${b.pujaName} request expired. You have not been charged.`
        : `The payment time for your ${b.pujaName} booking ran out, so it expired. You have not been charged.`
    if (b.mine) next = addNotice(next, "customer", text, "bookings", undefined, { title: "Request expired", bookingId: b.id })
    next = addNotice(next, "pandit", `${b.pujaName} request from ${b.customer} expired`, "requests", b.panditId, { title: "Request expired" })
    next = addNotice(next, "admin", `${b.id} expired`, "booking-management")
  }
  return next
}

const routeParams = (s: State) => ({ pujaId: s.draft.pujaId, panditId: s.draft.panditId, bookingId: s.lastBookingId ?? undefined })

/** Works out what to show for a URL, sending people to sign in when it belongs to another role. */
function applyRoute(s: State, path: string): State {
  const route = parsePath(path)
  if (!route) return { ...s, page: "not-found" }
  if (route.area !== s.role) {
    if (s.role === "customer") return { ...s, page: "login", returnTo: path }
    return { ...s, page: homeFor(s.role) }
  }
  if (route.area === "customer" && !s.signedIn && (DASHBOARD_PAGES.includes(route.page) || route.page === "payment" || route.page === "confirmation")) {
    return { ...s, page: "login", returnTo: path }
  }
  if (route.page === "puja") {
    if (!s.pujas.some((p) => p.id === route.id && p.active)) return { ...s, page: "not-found" }
    return { ...s, page: "puja", draft: { ...s.draft, pujaId: route.id! } }
  }
  if (route.page === "pandit-profile") {
    const pandit = s.pandits.find((p) => p.id === route.id && p.status === "Active")
    if (!pandit) return { ...s, page: "not-found" }
    const offers = pandit.pujaIds.includes(s.draft.pujaId)
    return {
      ...s,
      page: "pandit-profile",
      draft: {
        ...s.draft,
        panditId: pandit.id,
        // The profile must show this pandit, so move to a puja they offer if needed.
        pujaId: offers ? s.draft.pujaId : pandit.pujaIds[0],
        // Each pandit has their own times.
        time: pandit.id === s.draft.panditId ? s.draft.time : null,
      },
    }
  }
  if (route.page === "confirmation" || route.page === "payment") {
    const booking = s.bookings.find((b) => b.id === route.id && b.mine)
    if (!booking) return { ...s, page: "not-found" }
    // Only an accepted, unpaid booking can be paid. Redirecting here also keeps Back working.
    const page = route.page === "payment" && booking.status !== "Awaiting payment" ? "confirmation" : route.page
    return { ...s, page, lastBookingId: booking.id }
  }
  if (route.page === "checkout" && !scheduleIsValid(s)) return { ...s, page: "booking" }
  return { ...s, page: route.page }
}

type Toast = { id: number; text: string; tone: "ok" | "error" }

function useStoreValue() {
  const [state, setRaw] = useState<State>(() => applyRoute(expireBookings(load()), currentPath()))
  const [toasts, setToasts] = useState<Toast[]>([])
  const ref = useRef(state)
  const replaceNext = useRef(true)

  // The ref is updated synchronously so a handler can update state and then navigate.
  const update = (fn: (s: State) => State) => {
    ref.current = fn(ref.current)
    setRaw(ref.current)
  }
  const patch = (p: Partial<State>) => update((s) => ({ ...s, ...p }))

  const toast = (text: string, tone: Toast["tone"] = "ok") => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, text, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600)
  }

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // The demo keeps working in memory when storage is unavailable.
    }
  }, [state])

  // Keeps the address bar in step with the page. Redirects replace the entry so Back is never trapped.
  const path = state.page === "not-found" ? null : pathFor(state.page, state.role, routeParams(state))
  useEffect(() => {
    if (path && path !== currentPath()) {
      if (replaceNext.current) history.replaceState(null, "", BASE + path)
      else history.pushState(null, "", BASE + path)
    }
    replaceNext.current = false
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [path])

  useEffect(() => {
    const onPop = () => {
      replaceNext.current = true
      update((s) => applyRoute(expireBookings(s), currentPath()))
    }
    addEventListener("popstate", onPop)
    return () => removeEventListener("popstate", onPop)
  }, [])

  // Response and payment deadlines keep running while the page stays open.
  useEffect(() => {
    const sweep = () => {
      const next = expireBookings(ref.current)
      if (next !== ref.current) update(() => next)
    }
    const timer = setInterval(sweep, 30000)
    document.addEventListener("visibilitychange", sweep)
    return () => {
      clearInterval(timer)
      document.removeEventListener("visibilitychange", sweep)
    }
  }, [])

  const go = (page: Page) => {
    const s = ref.current
    // A link to the current page has no page change to react to, so it returns to the top.
    if (page === s.page) window.scrollTo({ top: 0, behavior: "smooth" })
    if (s.role === "customer" && DASHBOARD_PAGES.includes(page) && !s.signedIn) {
      toast("Please sign in to continue")
      patch({ page: "login", returnTo: pathFor(page, "customer", routeParams(s)) })
      return
    }
    if (page === "checkout" && !scheduleIsValid(s)) {
      toast("Choose a date and time first")
      patch({ page: "booking" })
      return
    }
    patch({ page })
  }

  const goHome = () => {
    go(homeFor(ref.current.role))
  }

  const updateDraft = (p: Partial<Draft>) => update((s) => ({ ...s, draft: { ...s.draft, ...p } }))

  const signIn = (profile?: Partial<Profile>) => {
    update((s) => {
      const returnTo = s.returnTo
      const signedIn: State = {
        ...s,
        signedIn: true,
        role: "customer",
        returnTo: null,
        page: "dashboard",
        profile: { ...s.profile, ...profile },
        draft: profile?.name
          ? { ...s.draft, contact: { name: profile.name, phone: profile.phone ?? "", email: profile.email ?? "" } }
          : s.draft,
      }
      return returnTo && parsePath(returnTo)?.area === "customer" ? applyRoute(signedIn, returnTo) : signedIn
    })
  }

  // This demo holds one customer account per browser, so a new account starts with its own empty history.
  const register = (profile: Partial<Profile> & { name: string; email: string; phone: string }) => {
    update((s) => ({
      ...s,
      bookings: s.bookings.map((b) => ({ ...b, mine: false })),
      threads: [
        {
          id: "support",
          name: "PujaNow Support",
          initials: "PN",
          support: true,
          status: "Support team · Replies within 15 minutes",
          unread: 0,
          messages: [
            {
              id: "welcome",
              from: "them",
              text: `Namaste ${profile.name.split(" ")[0]}, welcome to PujaNow. Message us here if you need any help planning your puja.`,
              at: new Date().toISOString(),
            },
          ],
        },
      ],
      activeThread: "support",
      notices: s.notices.filter((n) => n.role !== "customer"),
      lastBookingId: null,
      customers: [
        ...s.customers,
        { id: `c${Date.now()}`, name: profile.name, email: profile.email, phone: profile.phone, city: "Not set", status: "Active" },
      ],
      draft: { ...s.draft, address: s.draft.city, samagri: [] },
    }))
    signIn(profile)
  }

  const enterRole = (role: Role) =>
    update((s) => {
      const returnTo = s.returnTo
      const entered: State = { ...s, role, page: homeFor(role), returnTo: null }
      return returnTo && parsePath(returnTo)?.area === role ? applyRoute(entered, returnTo) : entered
    })

  const signOut = () => {
    patch({ role: "customer", signedIn: false, page: "home", returnTo: null })
    toast("You have been signed out")
  }

  // Step 1: the customer sends a request. No payment is taken at this point.
  const createRequest = () => {
    const s = ref.current
    const t = totalsFor(s)
    const now = new Date()
    const id = `PN-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}-${String(Math.floor(1000 + Math.random() * 9000))}`
    const booking: Booking = {
      id,
      pujaId: t.puja.id,
      pujaName: t.puja.name,
      panditId: t.pandit.id,
      panditName: t.pandit.name,
      customer: s.draft.contact.name,
      mine: true,
      date: s.draft.date!,
      time: s.draft.time!,
      location: s.draft.address,
      dakshina: t.dakshina,
      samagri: t.samagri,
      samagriNames: t.items.map((x) => x.name),
      fee: t.fee,
      total: t.total,
      status: "Pending",
      payment: "Not started",
      paymentStatus: "Not due",
      payoutStatus: "None",
      commission: 0,
      payout: 0,
      expiresAt: deadlineFor(Number(s.settings.responseHours), s.draft.date!, s.draft.time!),
      createdAt: todayISO(),
    }
    update((cur) => ({
      ...addNotice(
        addNotice(cur, "pandit", `New booking request: ${t.puja.name} from ${booking.customer}`, "requests", t.pandit.id, { title: "New booking request", bookingId: id }),
        "admin",
        `New booking request ${id}`,
        "booking-management",
      ),
      signedIn: true,
      role: "customer",
      bookings: [booking, ...cur.bookings],
      lastBookingId: id,
      // Clearing the slot means a refresh cannot send the same request twice.
      draft: { ...cur.draft, date: null, time: null },
    }))
    return id
  }

  const updateBooking = (id: string, p: Partial<Booking>) =>
    update((s) => ({ ...s, bookings: s.bookings.map((b) => (b.id === id ? { ...b, ...p } : b)) }))

  // Step 2: the pandit accepts, which opens payment, or declines, which ends the request unpaid.
  const respondToRequest = (id: string, accepted: boolean) => {
    const current = expireBookings(ref.current)
    const b = current.bookings.find((x) => x.id === id)
    if (!b || b.status !== "Pending") {
      update(() => current)
      toast("This request is no longer open", "error")
      return
    }
    update(() => {
      let next: State = {
        ...current,
        bookings: current.bookings.map((x) =>
          x.id !== id
            ? x
            : accepted
              ? { ...x, status: "Awaiting payment" as const, paymentStatus: "Awaiting" as const, expiresAt: deadlineFor(PAYMENT_WINDOW_HOURS, x.date, x.time) }
              : { ...x, status: "Declined" as const, paymentStatus: "Not charged" as const, expiresAt: null },
        ),
      }
      if (b.mine) {
        next = addNotice(
          next,
          "customer",
          accepted
            ? `${b.panditName} accepted your ${b.pujaName} request. Payment is now due.`
            : `${b.panditName} declined your ${b.pujaName} request. You have not been charged.`,
          "bookings",
          undefined,
          { title: accepted ? "Booking accepted" : "Request declined", bookingId: id },
        )
      }
      return addNotice(next, "admin", `${b.panditName} ${accepted ? "accepted" : "declined"} ${b.id}`, "booking-management")
    })
    toast(accepted ? "Request accepted. The customer can now pay." : "Request declined. The customer has been told.")
  }

  // Step 3: payment confirms the booking. The pandit's share is held until the puja is completed.
  const payBooking = (id: string, label: string) => {
    const current = expireBookings(ref.current)
    const b = current.bookings.find((x) => x.id === id)
    if (!b || b.status !== "Awaiting payment") {
      update(() => current)
      return false
    }
    update(() => {
      const next: State = {
        ...current,
        lastBookingId: id,
        bookings: current.bookings.map((x) =>
          x.id === id
            ? { ...x, status: "Confirmed" as const, paymentStatus: "Demo paid" as const, payoutStatus: "Held" as const, payment: label, expiresAt: null }
            : x,
        ),
      }
      return addNotice(
        addNotice(next, "pandit", `${b.customer} paid for ${b.pujaName}. The booking is confirmed.`, "upcoming", b.panditId, { title: "Payment received", bookingId: id }),
        "admin",
        `${id} confirmed after demo payment`,
        "payments",
      )
    })
    return true
  }

  // Step 4: once the puja is completed, the held amount is released less the platform commission.
  const completeBooking = (id: string) => {
    update((s) => {
      const b = s.bookings.find((x) => x.id === id)
      if (!b || b.status !== "Confirmed") return s
      const commission = Math.round((b.dakshina * Number(s.settings.commission)) / 100)
      const payout = b.dakshina - commission
      const next: State = {
        ...s,
        balances: { ...s.balances, [b.panditId]: (s.balances[b.panditId] ?? 0) + payout },
        bookings: s.bookings.map((x) =>
          x.id === id ? { ...x, status: "Completed" as const, payoutStatus: "Released" as const, commission, payout } : x,
        ),
      }
      const withPandit = addNotice(next, "pandit", `${inr(payout)} released for ${b.pujaName} after ${inr(commission)} commission`, "earnings", b.panditId, { title: "Payment released" })
      return b.mine
        ? addNotice(withPandit, "customer", `Your ${b.pujaName} is complete. You can now leave a review.`, "bookings", undefined, { title: "Puja completed", bookingId: id })
        : withPandit
    })
  }

  const cancelBooking = (id: string) => {
    update((s) => {
      const b = s.bookings.find((x) => x.id === id)
      if (!b) return s
      const next: State = {
        ...s,
        bookings: s.bookings.map((x) =>
          x.id === id
            ? {
                ...x,
                status: "Cancelled" as const,
                paymentStatus: x.paymentStatus === "Demo paid" ? ("Demo refund" as const) : ("Not charged" as const),
                payoutStatus: "None" as const,
                expiresAt: null,
              }
            : x,
        ),
      }
      return addNotice(next, "pandit", `${b.pujaName} for ${b.customer} was cancelled`, "upcoming", b.panditId, { title: "Booking cancelled" })
    })
  }

  const openThread = (id: string) =>
    update((s) => ({
      ...s,
      activeThread: id,
      threads: s.threads.map((t) => (t.id === id ? { ...t, unread: 0 } : t)),
    }))

  const messagePandit = (panditId: string) => {
    const pandit = ref.current.pandits.find((p) => p.id === panditId)
    if (!pandit) return
    const id = `pandit-${panditId}`
    update((s) =>
      s.threads.some((t) => t.id === id)
        ? s
        : {
            ...s,
            threads: [
              { id, name: pandit.name, initials: pandit.initials, status: "Usually replies within a few hours", unread: 0, messages: [] },
              ...s.threads,
            ],
          },
    )
    openThread(id)
    go("messages")
  }

  const addMessage = (threadId: string, from: "me" | "them", text: string) =>
    update((s) => {
      const thread = s.threads.find((t) => t.id === threadId)
      const viewing = s.role === "customer" && s.page === "messages" && s.activeThread === threadId
      const withNotice =
        from === "them" && thread && !viewing
          ? addNotice(s, "customer", `${thread.name} sent you a new message`, "messages", undefined, { title: "New message", threadId })
          : s
      return {
      ...withNotice,
      threads: s.threads.map((t) =>
        t.id === threadId
          ? {
              ...t,
              // A reply landing in another conversation counts as unread.
              unread: from === "them" && !(s.activeThread === threadId && s.page === "messages") ? t.unread + 1 : t.unread,
              messages: [...t.messages, { id: `${Date.now()}-${t.messages.length}`, from, text, at: new Date().toISOString() }],
            }
          : t,
      ),
      }
    })

  const sendMessage = (threadId: string, text: string) => {
    addMessage(threadId, "me", text)
    const count = ref.current.threads.find((t) => t.id === threadId)?.messages.length ?? 0
    const replies = autoReplies[threadId] ?? autoReplies.default
    setTimeout(() => addMessage(threadId, "them", replies[count % replies.length]), 1500)
  }

  const resetDemo = () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Nothing to clear when storage is unavailable.
    }
    update(() => ({ ...seed(), role: ref.current.role, page: ref.current.page }))
    toast("Demo data has been reset")
  }

  const activePandit = state.pandits.find((p) => p.id === state.activePanditId)
  const panditProfile: Profile = state.panditProfiles[state.activePanditId] ?? {
    name: (activePandit?.name ?? "").replace(/^(Acharya|Pandit)\s+/, ""),
    phone: "+91 98100 77120",
    email: `${state.activePanditId}@example.com`,
    language: "Hindi",
    address: activePandit?.city ?? "",
  }

  return {
    ...state,
    toasts,
    update,
    patch,
    toast,
    go,
    goHome,
    updateDraft,
    notify: addNotice,
    panditProfile,
    signIn,
    register,
    signOut,
    enterRole,
    createRequest,
    updateBooking,
    respondToRequest,
    payBooking,
    completeBooking,
    cancelBooking,
    openThread,
    messagePandit,
    sendMessage,
    resetDemo,
    rebook: (b: Booking) => {
      update((s) => ({ ...s, draft: { ...s.draft, pujaId: b.pujaId, date: null, time: null } }))
      go("pandits")
    },
    /** Marks a notice read and opens what it is about. */
    openNotice: (n: Notice) => {
      update((s) => ({ ...s, notices: s.notices.map((x) => (x.id === n.id ? { ...x, read: true } : x)) }))
      const s = ref.current
      const booking = n.bookingId ? s.bookings.find((b) => b.id === n.bookingId && b.mine) : undefined
      if (n.role === "customer" && booking) {
        patch({ lastBookingId: booking.id })
        go(booking.status === "Awaiting payment" ? "payment" : "confirmation")
      } else if (n.threadId && s.threads.some((t) => t.id === n.threadId)) {
        openThread(n.threadId)
        go("messages")
      } else go(n.page)
    },
    markAllRead: (ids: string[]) =>
      update((s) => ({ ...s, notices: s.notices.map((x) => (ids.includes(x.id) ? { ...x, read: true } : x)) })),
    viewBooking: (id: string) => {
      patch({ lastBookingId: id })
      go("confirmation")
    },
    payFor: (id: string) => {
      patch({ lastBookingId: id })
      go("payment")
    },
    openExplore: (category: string) => {
      update((s) => ({ ...s, explore: { ...s.explore, category } }))
      go("explore")
    },
    viewPuja: (id: string) => {
      updateDraft({ pujaId: id })
      go("puja")
    },
    viewPandit: (id: string) => {
      update((s) => applyRoute(s, pathFor("pandit-profile", "customer", { panditId: id })))
    },
  }
}

type Store = ReturnType<typeof useStoreValue>
const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useStoreValue()
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useStore() {
  const store = useContext(StoreContext)
  if (!store) throw new Error("useStore must be used inside StoreProvider")
  return store
}
