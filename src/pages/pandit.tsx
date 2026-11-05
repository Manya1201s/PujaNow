import { useState } from "react"
import { daysUntil, fmtShort, fmtTimeLeft, inr, todayISO, type Booking, type Page } from "../data"
import { AppShell, type NavItem } from "../shell"
import { useStore } from "../store"
import { Badge, ConfirmModal, EmptyState, Icon, Modal, Rating, StatusBadge } from "../ui"
import { ProfileForm } from "./customer"

export const panditNav: NavItem[] = [
  { label: "Overview", icon: "dashboard", page: "dashboard" },
  { label: "Booking requests", icon: "briefcase", page: "requests" },
  { label: "Upcoming bookings", icon: "calendar", page: "upcoming" },
  { label: "Completed", icon: "check", page: "completed" },
  { label: "Earnings & payouts", icon: "money", page: "earnings" },
  { label: "Reviews", icon: "star", page: "reviews" },
  { label: "Profile management", icon: "user", page: "profile" },
]

export function Stat({
  title,
  value,
  note,
  icon,
}: {
  title: string
  value: string
  note: string
  icon: string
}) {
  return (
    <div className="stat-card">
      <span>
        <Icon name={icon} />
      </span>
      <small>{title}</small>
      <h2>{value}</h2>
      <p>{note}</p>
    </div>
  )
}

function usePanditBookings() {
  const { bookings, activePanditId } = useStore()
  const own = bookings.filter((b) => b.panditId === activePanditId)
  const byDate = (a: Booking, b: Booking) => a.date.localeCompare(b.date)
  return {
    requests: own.filter((b) => b.status === "Pending").sort(byDate),
    upcoming: own.filter((b) => b.status === "Confirmed" || b.status === "Awaiting payment").sort(byDate),
    completed: own.filter((b) => b.status === "Completed").sort((a, b) => b.date.localeCompare(a.date)),
  }
}

export function PanditDashboard({ page }: { page: Page }) {
  const { go, pandits, update, activePanditId, panditProfile } = useStore()
  const { requests, upcoming, completed } = usePanditBookings()
  const available = pandits.find((p) => p.id === activePanditId)?.available ?? true
  const held = upcoming.filter((b) => b.status === "Confirmed").reduce((sum, b) => sum + b.dakshina, 0)
  const setAvailable = (on: boolean) =>
    update((s) => ({
      ...s,
      pandits: s.pandits.map((p) => (p.id === activePanditId ? { ...p, available: on } : p)),
    }))
  const heading =
    page === "dashboard"
      ? `Good morning, ${panditProfile.name.split(" ")[0]}`
      : panditNav.find((x) => x.page === page)?.label || "Partner dashboard"
  const thisWeek = upcoming.filter((b) => daysUntil(b.date) <= 7).length
  return (
    <AppShell role="pandit" page={page} nav={panditNav} badges={{ requests: requests.length }}>
      <div className="dash-heading">
        <div>
          <h1>{heading}</h1>
          <p>
            {page === "dashboard"
              ? `You have ${requests.length} new ${requests.length === 1 ? "request" : "requests"} and ${thisWeek} ${thisWeek === 1 ? "puja" : "pujas"} this week.`
              : "Manage your services and PujaNow partner activity."}
          </p>
        </div>
        <div className={`availability-toggle ${available ? "" : "off"}`}>
          <span>
            <i />
            {available ? "Available for bookings" : "Not taking bookings"}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={available}
            aria-label="Available for bookings"
            onClick={() => setAvailable(!available)}
          >
            <i />
          </button>
        </div>
      </div>
      {page === "requests" ? (
        <RequestList />
      ) : page === "upcoming" ? (
        <BookingTable title="Upcoming bookings" rows={upcoming} canComplete />
      ) : page === "completed" ? (
        <BookingTable title="Completed bookings" rows={completed} showPayout />
      ) : page === "earnings" ? (
        <Earnings />
      ) : page === "reviews" ? (
        <Reviews />
      ) : page === "profile" ? (
        <ProfileForm who="pandit" />
      ) : (
        <>
          <div className="stat-grid">
            <Stat
              title="New requests"
              value={String(requests.length)}
              note="Respond before they expire"
              icon="briefcase"
            />
            <Stat
              title="Upcoming pujas"
              value={String(upcoming.length)}
              note={upcoming[0] ? `Next: ${fmtShort(upcoming[0].date)}, ${upcoming[0].time}` : "Nothing scheduled"}
              icon="calendar"
            />
            <Stat
              title="This month"
              value="₹38,450"
              note="+18% from last month"
              icon="money"
            />
            <Stat
              title="Your rating"
              value={pandits.find((p) => p.id === activePanditId)?.rating ?? ""}
              note={`${pandits.find((p) => p.id === activePanditId)?.reviews} family reviews`}
              icon="star"
            />
          </div>
          <div className="dashboard-grid wide-left">
            <section className="dash-card">
              <div className="card-heading">
                <h3>Upcoming bookings</h3>
                <button type="button" onClick={() => go("upcoming")}>View all</button>
              </div>
              <Table rows={upcoming.slice(0, 3)} />
            </section>
            <section className="dash-card earnings-mini">
              <div className="card-heading">
                <h3>Earnings overview</h3>
                <span>{new Date().toLocaleDateString("en-GB", { month: "long" })}</span>
              </div>
              <h2>₹38,450</h2>
              <p>{inr(held)} held until pujas are completed</p>
              <div className="mini-chart">
                {[45, 62, 48, 76, 58, 85, 72, 94, 80, 96].map((x, i) => (
                  <i key={i} style={{ height: `${x}%` }} />
                ))}
              </div>
              <div className="chart-labels">
                <span>1st</span>
                <span>Today</span>
              </div>
            </section>
          </div>
          <section className="dash-card">
            <div className="card-heading">
              <h3>New booking requests</h3>
              <button type="button" onClick={() => go("requests")}>
                View all {requests.length} requests
              </button>
            </div>
            <RequestRows limit={2} />
          </section>
        </>
      )}
    </AppShell>
  )
}

function Table({ rows, canComplete, showPayout }: { rows: Booking[]; canComplete?: boolean; showPayout?: boolean }) {
  const { completeBooking, toast, settings } = useStore()
  const [completing, setCompleting] = useState<Booking | null>(null)
  if (rows.length === 0) return <EmptyState title="Nothing to show yet" />
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {["Date & time", "Puja", "Customer", "Location", "Status"].map((x) => (
              <th key={x}>{x}</th>
            ))}
            {showPayout && <th>Payment released</th>}
            {canComplete && <th>Action</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{fmtShort(r.date)} · {r.time}</td>
              <td>{r.pujaName}</td>
              <td>{r.customer}</td>
              <td>{r.location}</td>
              <td><StatusBadge status={r.status} /></td>
              {showPayout && <td>{inr(r.payout)} after {inr(r.commission)} commission</td>}
              {canComplete && (
                <td className="table-actions">
                  {r.status === "Confirmed" ? (
                    <button type="button" className="button secondary small" onClick={() => setCompleting(r)}>
                      Mark completed
                    </button>
                  ) : (
                    fmtTimeLeft(r.expiresAt) + " to pay"
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {completing && (
        <ConfirmModal
          title="Mark this puja as completed?"
          text={`${completing.pujaName} for ${completing.customer} will move to your completed bookings, and ${inr(completing.dakshina - Math.round((completing.dakshina * Number(settings.commission)) / 100))} will be released to your balance after ${settings.commission}% platform commission. This is a demo record and no real money moves.`}
          confirmLabel="Mark completed"
          onClose={() => setCompleting(null)}
          onConfirm={() => {
            completeBooking(completing.id)
            toast("Booking completed and payment released")
          }}
        />
      )}
    </div>
  )
}

function BookingTable({ title, rows, canComplete, showPayout }: { title: string; rows: Booking[]; canComplete?: boolean; showPayout?: boolean }) {
  return (
    <section className="dash-card">
      <div className="card-heading">
        <h3>{title}</h3>
        <span>{rows.length} total</span>
      </div>
      <Table rows={rows} canComplete={canComplete} showPayout={showPayout} />
    </section>
  )
}

function RequestRows({ limit = 3 }: { limit?: number }) {
  const { respondToRequest } = useStore()
  const { requests } = usePanditBookings()
  const rows = requests.slice(0, limit)
  if (rows.length === 0) return <EmptyState title="No requests right now" text="New booking requests will appear here." />
  return (
    <div className="request-rows">
      {rows.map((r) => (
        <div key={r.id}>
          <span className="request-icon">
            <Icon name="fire" />
          </span>
          <span>
            <b>{r.pujaName.replace(" Puja", "")}</b>
            <small>
              {r.customer} · {fmtShort(r.date)} · {r.time} · {fmtTimeLeft(r.expiresAt)}
            </small>
            <small>
              <Icon name="location" size={13} />
              {r.location}
            </small>
          </span>
          <strong>{inr(r.dakshina)}</strong>
          <div className="row-actions">
            <button type="button" className="button secondary small" onClick={() => respondToRequest(r.id, false)}>
              Decline
            </button>
            <button type="button" className="button small" onClick={() => respondToRequest(r.id, true)}>
              Accept
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function RequestList() {
  const { settings } = useStore()
  const { requests } = usePanditBookings()
  return (
    <section className="dash-card">
      <div className="card-heading">
        <h3>{requests.length} {requests.length === 1 ? "request" : "requests"} awaiting your response</h3>
        {requests.length > 0 && <Badge tone="gold">Respond within {settings.responseHours} hours</Badge>}
      </div>
      <RequestRows limit={50} />
    </section>
  )
}

function Earnings() {
  const { balances, payouts, update, toast, bookings, activePanditId, settings } = useStore()
  const balance = balances[activePanditId] ?? 0
  const released = bookings.filter((b) => b.panditId === activePanditId && b.payoutStatus === "Released")
  const mine = payouts.filter((p) => p.panditId === activePanditId)
  const [withdrawing, setWithdrawing] = useState(false)
  const lifetime = 842000
  const held = bookings
    .filter((b) => b.panditId === activePanditId && b.payoutStatus === "Held")
    .reduce((sum, b) => sum + b.dakshina - Math.round((b.dakshina * Number(settings.commission)) / 100), 0)
  return (
    <>
      <div className="stat-grid">
        <Stat title="Available balance" value={inr(balance)} note={balance ? "Ready for payout" : "Nothing to withdraw"} icon="money" />
        <Stat title="Held until completed" value={inr(held)} note="After platform commission" icon="clock" />
        <Stat title="Lifetime earnings" value={`₹${(lifetime / 100000).toFixed(2)}L`} note="214 completed pujas" icon="briefcase" />
      </div>
      <section className="dash-card">
        <div className="card-heading">
          <h3>Payout history</h3>
          <button type="button" className="button small" disabled={!balance} onClick={() => setWithdrawing(true)}>
            Withdraw balance
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {["Reference", "Date", "Amount", "Status"].map((x) => (
                  <th key={x}>{x}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mine.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{fmtShort(p.date)}</td>
                  <td>{inr(p.amount)}</td>
                  <td><StatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="dash-card spaced">
        <div className="card-heading">
          <h3>Released after completed pujas</h3>
        </div>
        {released.length === 0 ? (
          <EmptyState title="Nothing released yet" text="Your share is released when a puja is marked completed." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {["Booking", "Puja", "Dakshina", "Commission", "Released"].map((x) => (
                    <th key={x}>{x}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {released.map((b) => (
                  <tr key={b.id}>
                    <td>{b.id}</td>
                    <td>{b.pujaName}</td>
                    <td>{inr(b.dakshina)}</td>
                    <td>{inr(b.commission)}</td>
                    <td>{inr(b.payout)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {withdrawing && (
        <ConfirmModal
          title="Withdraw balance?"
          text={`This records a demo payout of ${inr(balance)}. No real money will be transferred.`}
          confirmLabel="Withdraw"
          onClose={() => setWithdrawing(false)}
          onConfirm={() => {
            update((s) => ({
              ...s,
              balances: { ...s.balances, [activePanditId]: 0 },
              payouts: [
                { id: `PO-${3121 + s.payouts.length}`, panditId: activePanditId, date: todayISO(), amount: balance, status: "Processing" },
                ...s.payouts,
              ],
            }))
            toast("Demo payout recorded")
          }}
        />
      )}
    </>
  )
}

function Reviews() {
  const { reviews: allReviews, activePanditId, pandits } = useStore()
  const reviews = allReviews.filter((r) => r.panditId === activePanditId)
  const me = pandits.find((p) => p.id === activePanditId)
  const [replying, setReplying] = useState<string | null>(null)
  const [text, setText] = useState("")
  const [replies, setReplies] = useState<Record<string, string>>({})
  const [error, setError] = useState("")
  return (
    <section className="dash-card reviews-page">
      <div className="rating-summary">
        <h1>{me?.rating}</h1>
        <Rating value={me?.rating} />
        <p>Based on {me?.reviews} reviews</p>
      </div>
      {reviews.map((x) => (
        <div className="review-row" key={x.id}>
          <div className="small-avatar">{x.initials}</div>
          <span>
            <b>{x.author}</b>
            <Rating value={x.rating} />
            <p>{x.text}</p>
            {replies[x.id] && <p className="review-reply">Your reply: {replies[x.id]}</p>}
            {!replies[x.id] && (
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  setReplying(x.id)
                  setText("")
                  setError("")
                }}
              >
                Reply
              </button>
            )}
          </span>
          <small>{x.age}</small>
        </div>
      ))}
      {reviews.length === 0 && <EmptyState title="No reviews yet" />}
      {replying && (
        <Modal title="Reply to review" onClose={() => setReplying(null)}>
          <label>
            Your reply
            <textarea
              value={text}
              aria-invalid={error ? true : undefined}
              onChange={(e) => {
                setText(e.target.value)
                setError("")
              }}
            />
            {error && <span className="field-error" role="alert">{error}</span>}
          </label>
          <div className="modal-actions">
            <button type="button" className="button secondary small" onClick={() => setReplying(null)}>
              Go back
            </button>
            <button
              type="button"
              className="button small"
              onClick={() => {
                if (!text.trim()) {
                  setError("Please write a reply")
                  return
                }
                setReplies({ ...replies, [replying]: text.trim() })
                setReplying(null)
              }}
            >
              Post reply
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}
