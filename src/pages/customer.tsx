import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { addDays, daysUntil, fmtLong, fmtShort, fmtStamp, fmtTimeLeft, inr, todayISO, type Booking, type Page } from "../data"
import { AppShell, type NavItem } from "../shell"
import { openSlots, useStore, type Profile } from "../store"
import { Badge, ConfirmModal, EMAIL_ERROR, EmptyState, Field, Icon, isEmail, isPhone, Modal, PHONE_ERROR, Rating, StatusBadge, useForm } from "../ui"

const customerNav: NavItem[] = [
  { label: "Overview", icon: "dashboard", page: "dashboard" },
  { label: "My bookings", icon: "calendar", page: "bookings" },
  { label: "Messages", icon: "message", page: "messages" },
  { label: "My profile", icon: "user", page: "profile" },
]

const isUpcoming = (b: Booking) => b.status === "Confirmed" || b.status === "Pending" || b.status === "Awaiting payment"

export function CustomerDashboard({ page }: { page: Page }) {
  const { go, bookings, threads, profile, messagePandit, payFor, pujas } = useStore()
  const mine = bookings.filter((b) => b.mine)
  const upcoming = mine
    .filter((b) => isUpcoming(b) && b.date >= todayISO())
    .sort((a, b) => a.date.localeCompare(b.date))
  const next = upcoming[0]
  const completed = mine.filter((b) => b.status === "Completed").length
  const unread = threads.reduce((sum, t) => sum + t.unread, 0)
  const title =
    page === "bookings"
      ? "My bookings"
      : page === "messages"
        ? "Messages"
        : page === "profile"
          ? "My profile"
          : `Good morning, ${profile.name.split(" ")[0]}`
  const nextIn = next ? daysUntil(next.date) : 0
  return (
    <AppShell role="customer" page={page} nav={customerNav} badges={{ messages: unread }}>
      <div className="dash-heading">
        <div>
          <h1>{title}</h1>
          <p>
            {page === "dashboard"
              ? "Here’s everything for your upcoming puja."
              : "Manage your PujaNow account and activity."}
          </p>
        </div>
        {page === "dashboard" && (
          <button type="button" className="button" onClick={() => go("assistant")}>
            Plan another puja
          </button>
        )}
      </div>
      {page === "messages" ? (
        <Messages />
      ) : page === "profile" ? (
        <ProfileForm who="customer" />
      ) : page === "bookings" ? (
        <MyBookings />
      ) : (
        <>
          {next ? (
            <div className="upcoming-banner">
              <div>
                <Badge tone={next.status === "Confirmed" ? "green" : "gold"}>{next.status}</Badge>
                <span className="overline">
                  YOUR NEXT PUJA · {nextIn === 0 ? "TODAY" : nextIn === 1 ? "TOMORROW" : `IN ${nextIn} DAYS`}
                </span>
                <h2>{next.pujaName}</h2>
                <p>
                  <Icon name="calendar" size={17} /> {fmtShort(next.date)}, {next.time} <i />{" "}
                  <Icon name="user" size={17} /> {next.panditName}
                </p>
                {next.status === "Awaiting payment" ? (
                  <button type="button" className="button light" onClick={() => payFor(next.id)}>
                    Pay now · {inr(next.total)}
                  </button>
                ) : (
                  <button type="button" className="button light" onClick={() => go("bookings")}>
                    View booking details
                  </button>
                )}
              </div>
              <img src={pujas.find((p) => p.id === next.pujaId)?.image} alt={next.pujaName} />
            </div>
          ) : (
            <EmptyState
              title="No upcoming pujas"
              text="When you book a puja, its details will appear here."
              action={
                <button type="button" className="button small" onClick={() => go("assistant")}>
                  Plan a puja
                </button>
              }
            />
          )}
          <div className="stat-grid customer-stats">
            <div>
              <Icon name="calendar" />
              <span>
                <b>{upcoming.length}</b>Upcoming {upcoming.length === 1 ? "booking" : "bookings"}
              </span>
            </div>
            <div>
              <Icon name="check" />
              <span>
                <b>{completed}</b>Completed pujas
              </span>
            </div>
            <div>
              <Icon name="message" />
              <span>
                <b>{unread}</b>Unread messages
              </span>
            </div>
          </div>
          {next && (
            <div className="dashboard-grid">
              <section className="dash-card">
                <div className="card-heading">
                  <h3>Booking timeline</h3>
                  <button type="button" onClick={() => go("bookings")}>View details</button>
                </div>
                {[
                  ["Request sent", fmtShort(next.createdAt), true],
                  [next.status === "Pending" ? "Waiting for your pandit" : "Pandit accepted", next.status === "Pending" ? fmtTimeLeft(next.expiresAt) : next.panditName, next.status !== "Pending"],
                  ["Payment and confirmation", next.status === "Confirmed" ? next.payment : next.status === "Awaiting payment" ? fmtTimeLeft(next.expiresAt) : "Due after your pandit accepts", next.status === "Confirmed"],
                  [next.samagri ? "Samagri dispatched" : "Checklist shared", `Expected ${fmtShort(addDays(-1, new Date(next.date + "T00:00:00")))}`, false],
                  ["Puja completed", fmtShort(next.date), false],
                ].map(([x, detail, done], i) => (
                  <div key={String(x)} className={`timeline-row ${done ? "done" : ""}`}>
                    <span>{done ? <Icon name="check" size={13} /> : i + 1}</span>
                    <div>
                      <b>{x}</b>
                      <small>{detail}</small>
                    </div>
                  </div>
                ))}
              </section>
              <section className="dash-card">
                <div className="card-heading">
                  <h3>Your pandit</h3>
                </div>
                <div className="dashboard-pandit">
                  <div className="small-avatar">{next.panditName.split(" ").map((w) => w[0]).slice(-2).join("")}</div>
                  <div>
                    <b>{next.panditName}</b>
                    <Rating value="4.9" />
                    <span>{next.location}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="button secondary full"
                  onClick={() => messagePandit(next.panditId)}
                >
                  <Icon name="message" size={17} /> Send a message
                </button>
              </section>
            </div>
          )}
        </>
      )}
    </AppShell>
  )
}

const bookingTabs = ["Upcoming", "Completed", "Closed"] as const

function MyBookings() {
  const { bookings, go, cancelBooking, toast, messagePandit, update, settings, payFor, rebook, viewBooking } = useStore()
  const [tab, setTab] = useState<(typeof bookingTabs)[number]>("Upcoming")
  const [viewing, setViewing] = useState<Booking | null>(null)
  const [cancelling, setCancelling] = useState<Booking | null>(null)
  const [moving, setMoving] = useState<Booking | null>(null)
  const [reviewing, setReviewing] = useState<Booking | null>(null)
  const mine = bookings.filter((b) => b.mine)
  const rows = mine
    .filter((b) => (tab === "Upcoming" ? isUpcoming(b) : tab === "Completed" ? b.status === "Completed" : ["Cancelled", "Declined", "Expired"].includes(b.status)))
    .sort((a, b) => a.date.localeCompare(b.date))
  return (
    <section className="dash-card">
      <div className="category-tabs left">
        {bookingTabs.map((x) => (
          <button
            type="button"
            key={x}
            aria-pressed={tab === x}
            className={tab === x ? "active" : ""}
            onClick={() => setTab(x)}
          >
            {x}
          </button>
        ))}
      </div>
      <div className="request-rows">
        {rows.map((b) => (
          <div key={b.id}>
            <span className="request-icon">
              <Icon name="fire" />
            </span>
            <span>
              <b>{b.pujaName}</b>
              <small>{fmtShort(b.date)} · {b.time} · {b.panditName}{b.expiresAt ? ` · ${fmtTimeLeft(b.expiresAt)}` : ""}</small>
              <small>
                <Icon name="location" size={13} />
                {b.location}
              </small>
            </span>
            <strong>{inr(b.total)}</strong>
            <StatusBadge status={b.status} />
            <div className="row-actions">
              <button type="button" className="button secondary small" onClick={() => setViewing(b)}>
                Details
              </button>
              {b.status === "Pending" && (
                <button type="button" className="button secondary small" onClick={() => viewBooking(b.id)}>
                  Track request
                </button>
              )}
              {b.status === "Awaiting payment" && (
                <button type="button" className="button small" onClick={() => payFor(b.id)}>
                  Pay now
                </button>
              )}
              {b.status === "Confirmed" && (
                <button type="button" className="button secondary small" onClick={() => setMoving(b)}>
                  Reschedule
                </button>
              )}
              {isUpcoming(b) && (
                <>
                  <button type="button" className="button secondary small" onClick={() => setCancelling(b)}>
                    Cancel
                  </button>
                  <button type="button" className={`button small ${b.status === "Awaiting payment" ? "secondary" : ""}`} onClick={() => messagePandit(b.panditId)}>
                    Message
                  </button>
                </>
              )}
              {(b.status === "Declined" || b.status === "Expired") && (
                <button type="button" className="button small" onClick={() => rebook(b)}>
                  Find another pandit
                </button>
              )}
              {b.status === "Completed" && (
                <button
                  type="button"
                  className="button small"
                  disabled={b.reviewed}
                  onClick={() => setReviewing(b)}
                >
                  {b.reviewed ? "Reviewed" : "Leave a review"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {rows.length === 0 && (
        <EmptyState
          title={`No ${tab.toLowerCase()} bookings`}
          action={
            tab === "Upcoming" && (
              <button type="button" className="button small" onClick={() => go("assistant")}>
                Plan a puja
              </button>
            )
          }
        />
      )}
      {viewing && (
        <Modal title={viewing.pujaName} onClose={() => setViewing(null)}>
          <dl className="detail-list">
            <dt>Booking ID</dt><dd>{viewing.id}</dd>
            <dt>Status</dt><dd>{viewing.status}</dd>
            <dt>Date & time</dt><dd>{fmtLong(viewing.date)} · {viewing.time}</dd>
            <dt>Pandit</dt><dd>{viewing.panditName}</dd>
            <dt>Location</dt><dd>{viewing.location}</dd>
            <dt>Samagri</dt><dd>{viewing.samagriNames.join(", ") || "Arranging it myself"}</dd>
            <dt>Dakshina</dt><dd>{inr(viewing.dakshina)}</dd>
            <dt>Total</dt><dd>{inr(viewing.total)}</dd>
            <dt>Payment</dt><dd>{viewing.payment} · {viewing.paymentStatus}</dd>
            {viewing.expiresAt && (
              <>
                <dt>Time left</dt><dd>{fmtTimeLeft(viewing.expiresAt)}</dd>
              </>
            )}
          </dl>
        </Modal>
      )}
      {cancelling && (
        <ConfirmModal
          title="Cancel this booking?"
          text={`${cancelling.pujaName} on ${fmtLong(cancelling.date)} will be cancelled${cancelling.paymentStatus === "Demo paid" ? " and a demo refund recorded. No real money is involved." : ". You have not been charged."} Free cancellation applies until ${settings.cancelWindow} before the puja.`}
          confirmLabel="Cancel booking"
          onClose={() => setCancelling(null)}
          onConfirm={() => {
            cancelBooking(cancelling.id)
            toast("Your booking has been cancelled")
          }}
        />
      )}
      {moving && <RescheduleModal booking={moving} onClose={() => setMoving(null)} />}
      {reviewing && (
        <ReviewModal
          booking={reviewing}
          onClose={() => setReviewing(null)}
          onSubmit={(rating, text) => {
            const b = reviewing
            update((s) => ({
              ...s,
              bookings: s.bookings.map((x) => (x.id === b.id ? { ...x, reviewed: true } : x)),
              reviews: [
                {
                  id: `rv${Date.now()}`,
                  panditId: b.panditId,
                  author: s.profile.name,
                  initials: s.profile.name.split(" ").map((w) => w[0]).slice(0, 2).join(""),
                  rating: `${rating}.0`,
                  text,
                  age: "Just now",
                },
                ...s.reviews,
              ],
            }))
            toast("Thank you for your review")
          }}
        />
      )}
    </section>
  )
}

function RescheduleModal({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const store = useStore()
  const { updateBooking, toast } = store
  const form = useForm({ date: booking.date, time: "" }, (v) => ({
    date: !v.date ? "Please choose a date" : v.date < todayISO() ? "Please choose a future date" : undefined,
    time: v.time ? undefined : "Please choose a time",
  }))
  const slots = form.values.date >= todayISO() ? openSlots(store, form.values.date, booking.panditId, booking.id) : []
  return (
    <Modal title="Reschedule booking" onClose={onClose}>
      <form
        noValidate
        onSubmit={form.submit((v) => {
          updateBooking(booking.id, { date: v.date, time: v.time })
          toast(`Booking moved to ${fmtShort(v.date)} at ${v.time}`)
          onClose()
        })}
      >
        <div className="form-grid">
          <Field label="New date" error={form.errors.date}>
            <input
              type="date"
              min={todayISO()}
              {...form.bind("date")}
              onChange={(e) => {
                form.setValues((v) => ({ ...v, time: "" }))
                form.bind("date").onChange(e)
              }}
            />
          </Field>
          <Field label="New time" error={form.errors.time}>
            <select {...form.bind("time")}>
              <option value="">Select a time</option>
              {slots.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="modal-actions">
          <button type="button" className="button secondary small" onClick={onClose}>
            Go back
          </button>
          <button type="submit" className="button small">
            Save new time
          </button>
        </div>
      </form>
    </Modal>
  )
}

function ReviewModal({
  booking,
  onClose,
  onSubmit,
}: {
  booking: Booking
  onClose: () => void
  onSubmit: (rating: string, text: string) => void
}) {
  const form = useForm({ rating: "5", text: "" }, (v) => ({
    text: v.text.trim().length < 5 ? "Please write a few words about your experience" : undefined,
  }))
  return (
    <Modal title={`Review ${booking.panditName}`} onClose={onClose}>
      <form
        noValidate
        onSubmit={form.submit((v) => {
          onSubmit(v.rating, v.text.trim())
          onClose()
        })}
      >
        <div className="form-grid">
          <Field label="Rating" className="wide">
            <select {...form.bind("rating")}>
              {["5", "4", "3", "2", "1"].map((r) => (
                <option key={r} value={r}>{r} out of 5</option>
              ))}
            </select>
          </Field>
          <Field label="Your review" className="wide" error={form.errors.text}>
            <textarea {...form.bind("text")} />
          </Field>
        </div>
        <div className="modal-actions">
          <button type="button" className="button secondary small" onClick={onClose}>
            Go back
          </button>
          <button type="submit" className="button small">
            Submit review
          </button>
        </div>
      </form>
    </Modal>
  )
}

function Messages() {
  const { threads, activeThread, openThread, sendMessage } = useStore()
  const thread = threads.find((t) => t.id === activeThread) ?? threads[0]
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const text = drafts[thread.id] ?? ""
  const space = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    openThread(thread.id)
  }, [thread.id])
  useEffect(() => {
    const el = space.current
    if (el) el.scrollTop = el.scrollHeight
  }, [thread.id, thread.messages.length])
  useEffect(() => {
    const el = input.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [text])

  const send = () => {
    const value = text.trim()
    if (!value) return
    sendMessage(thread.id, value)
    setDrafts({ ...drafts, [thread.id]: "" })
    input.current?.focus()
  }
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      send()
    }
  }
  return (
    <div className="messages-panel">
      <div className="conversation-list">
        <h3>Conversations</h3>
        {threads.map((t) => {
          const last = t.messages[t.messages.length - 1]
          return (
            <button
              type="button"
              key={t.id}
              className={t.id === thread.id ? "active" : ""}
              onClick={() => openThread(t.id)}
            >
              <div className={`small-avatar ${t.support ? "support" : ""}`}>{t.initials}</div>
              <span>
                <b>{t.name}</b>
                <small>{last ? last.text : "Start the conversation"}</small>
              </span>
              {t.unread > 0 && <i>{t.unread}</i>}
            </button>
          )
        })}
      </div>
      <div className="chat-area">
        <div className="chat-person">
          <div className={`small-avatar ${thread.support ? "support" : ""}`}>{thread.initials}</div>
          <span>
            <b>{thread.name}</b>
            <small>{thread.status}</small>
          </span>
        </div>
        <div className="message-space" ref={space}>
          {thread.messages.map((m) => (
            <div key={m.id} className={`chat-bubble ${m.from === "me" ? "me" : "ai"}`}>
              {m.text}
              <small>{fmtStamp(m.at)}</small>
            </div>
          ))}
          {thread.messages.length === 0 && (
            <p className="chat-empty">Say namaste to start this conversation.</p>
          )}
        </div>
        <div className="chat-input">
          <textarea
            ref={input}
            rows={1}
            placeholder="Write a message…"
            aria-label="Write a message"
            value={text}
            onChange={(e) => setDrafts({ ...drafts, [thread.id]: e.target.value })}
            onKeyDown={onKeyDown}
          />
          <button type="button" aria-label="Send message" onClick={send}>
            <Icon name="arrow" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function ProfileForm({ who }: { who: "customer" | "pandit" }) {
  const { profile, panditProfile, activePanditId, update, toast } = useStore()
  const current = who === "customer" ? profile : panditProfile
  const form = useForm<Profile>(current, (v) => ({
    name: v.name.trim().length < 2 ? "Enter your full name" : undefined,
    phone: isPhone(v.phone) ? undefined : PHONE_ERROR,
    email: isEmail(v.email) ? undefined : EMAIL_ERROR,
    address: v.address.trim().length < 5 ? "Enter your address" : undefined,
  }))
  return (
    <form
      className="form-card profile-form"
      noValidate
      onSubmit={form.submit((v) => {
        if (who === "pandit") update((s) => ({ ...s, panditProfiles: { ...s.panditProfiles, [activePanditId]: v } }))
        else
          // The same details appear at checkout, on the customer's bookings and in the admin list.
          update((s) => ({
            ...s,
            profile: v,
            draft: { ...s.draft, contact: { name: v.name, phone: v.phone, email: v.email } },
            bookings: s.bookings.map((b) => (b.mine ? { ...b, customer: v.name } : b)),
            customers: s.customers.map((c) =>
              c.email === s.profile.email ? { ...c, name: v.name, phone: v.phone, email: v.email } : c,
            ),
          }))
        toast("Your changes have been saved")
      })}
    >
      <h2>Personal information</h2>
      <div className="form-grid">
        <Field label="Full name" error={form.errors.name}>
          <input autoComplete="name" {...form.bind("name")} />
        </Field>
        <Field label="Phone number" error={form.errors.phone}>
          <input inputMode="tel" autoComplete="tel" {...form.bind("phone")} />
        </Field>
        <Field label="Email address" error={form.errors.email}>
          <input type="email" autoComplete="email" {...form.bind("email")} />
        </Field>
        <Field label="Preferred language">
          <select {...form.bind("language")}>
            <option>English & Hindi</option>
            <option>Hindi</option>
            <option>English</option>
            <option>Sanskrit</option>
            <option>Gujarati</option>
            <option>Marathi</option>
          </select>
        </Field>
        <Field label="Home address" className="wide" error={form.errors.address}>
          <input autoComplete="street-address" {...form.bind("address")} />
        </Field>
      </div>
      <button type="submit" className="button">Save changes</button>
    </form>
  )
}
