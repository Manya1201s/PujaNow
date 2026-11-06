import { useEffect, useRef, useState } from "react"
import { demoBanks, FAIL_BANK, FAIL_CARD, FAIL_UPI, fmtLong, fmtShort, fmtTimeLeft, fromISO, inr, isRecommendedDate, defaultPujaImage, todayISO, toISO, type Booking as BookingRecord } from "../data"
import { openSlots, totalsFor, useStore } from "../store"
import { Badge, Brand, EMAIL_ERROR, Field, Icon, isEmail, isPhone, PHONE_ERROR, Rating, useForm } from "../ui"

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
const MONTHS = Array.from({ length: 12 }, (_, m) => new Date(2000, m, 1).toLocaleDateString("en-GB", { month: "long" }))
const MAX_YEARS_AHEAD = 2

export function Booking() {
  const store = useStore()
  const { go, draft, updateDraft } = store
  const t = totalsFor(store)
  const today = todayISO()
  const now = new Date()
  const selectedDate = draft.date && draft.date >= today ? draft.date : null
  const initial = selectedDate ? fromISO(selectedDate) : now
  const [view, setView] = useState({ year: initial.getFullYear(), month: initial.getMonth() })
  const [error, setError] = useState("")

  // A date saved on an earlier visit can have passed since, so clear it.
  useEffect(() => {
    if (draft.date && draft.date < today) updateDraft({ date: null, time: null })
  }, [])

  const first = new Date(view.year, view.month, 1)
  const leading = (first.getDay() + 6) % 7
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()
  const cells = Math.ceil((leading + daysInMonth) / 7) * 7
  const monthIndex = view.year * 12 + view.month
  const minIndex = now.getFullYear() * 12 + now.getMonth()
  const maxIndex = minIndex + MAX_YEARS_AHEAD * 12
  const moveTo = (index: number) => {
    const clamped = Math.min(maxIndex, Math.max(minIndex, index))
    setView({ year: Math.floor(clamped / 12), month: clamped % 12 })
  }
  const slots = selectedDate ? openSlots(store, selectedDate, t.pandit.id) : []
  // A saved time may not exist for this date or pandit any more.
  useEffect(() => {
    if (draft.time && !slots.includes(draft.time)) updateDraft({ time: null })
  }, [selectedDate, t.pandit.id])
  const heading = selectedDate
    ? `Available times for ${fromISO(selectedDate).getDate()} ${fromISO(selectedDate).toLocaleDateString("en-GB", { month: "long" })}`
    : "Select a date to see available times"

  const proceed = () => {
    if (!t.hasPandit) setError("No pandit is available for this puja right now.")
    else if (!selectedDate) setError("Please select a date.")
    else if (!draft.time) setError("Please select a time slot.")
    else go("checkout")
  }

  return (
    <main className="booking-page">
      <div className="booking-progress">
        <span className="done">1</span>
        <i />
        <span className="active">2</span>
        <i />
        <span>3</span>
        <i />
        <span>4</span>
        <div>
          <b>Pandit</b>
          <b>Date & time</b>
          <b>Details</b>
          <b>Payment</b>
        </div>
      </div>
      <div className="booking-layout">
        <div>
          <button type="button" className="back-link" onClick={() => go("pandit-profile")}>
            <Icon name="back" size={18} /> {t.pandit.short}’s profile
          </button>
          <h1>Choose a date & time</h1>
          <p>Recommended muhurats are based on your occasion and location.</p>
          <div className="calendar-card">
            <div className="calendar-head">
              <button type="button" aria-label="Previous month" disabled={monthIndex <= minIndex} onClick={() => moveTo(monthIndex - 1)}>
                <Icon name="back" size={17} />
              </button>
              <div className="calendar-title" role="group" aria-label="Month and year">
                <select aria-label="Month" value={view.month} onChange={(e) => moveTo(view.year * 12 + Number(e.target.value))}>
                  {MONTHS.map((name, m) => {
                    const index = view.year * 12 + m
                    return (
                      <option key={name} value={m} disabled={index < minIndex || index > maxIndex}>
                        {name}
                      </option>
                    )
                  })}
                </select>
                {/* A month that does not exist in the new year is moved to the nearest one that does. */}
                <select aria-label="Year" value={view.year} onChange={(e) => moveTo(Number(e.target.value) * 12 + view.month)}>
                  {Array.from({ length: MAX_YEARS_AHEAD + 1 }, (_, i) => now.getFullYear() + i).map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <button type="button" aria-label="Next month" disabled={monthIndex >= maxIndex} onClick={() => moveTo(monthIndex + 1)}>
                <Icon name="arrow" size={17} />
              </button>
            </div>
            <div className="calendar-grid">
              {WEEKDAYS.map((x) => (
                <b key={x}>{x}</b>
              ))}
              {Array.from({ length: cells }, (_, i) => {
                const n = i - leading + 1
                if (n < 1 || n > daysInMonth) return <button type="button" key={i} disabled aria-hidden="true" />
                const iso = toISO(new Date(view.year, view.month, n))
                const past = iso < today
                const recommended = !past && isRecommendedDate(iso)
                return (
                  <button
                    type="button"
                    key={i}
                    disabled={past}
                    aria-label={fmtLong(iso)}
                    aria-pressed={selectedDate === iso}
                    className={selectedDate === iso ? "selected" : recommended ? "recommended" : ""}
                    onClick={() => {
                      updateDraft({ date: iso, time: null })
                      setError("")
                    }}
                  >
                    {n}
                    {recommended && <i />}
                  </button>
                )
              })}
            </div>
            <div className="calendar-legend">
              <span>
                <i />
                Recommended muhurat
              </span>
              <span>
                <i />
                Available
              </span>
            </div>
          </div>
          <h2>{heading}</h2>
          {selectedDate && slots.length === 0 && (
            <p>No more times are available on this date. Please choose another day.</p>
          )}
          <div className="time-slots">
            {slots.map((x, i) => (
              <button
                type="button"
                key={x}
                aria-pressed={draft.time === x}
                className={draft.time === x ? "selected" : ""}
                onClick={() => {
                  updateDraft({ time: x })
                  setError("")
                }}
              >
                <span>{x}</span>
                {i < 2 && <small>Recommended</small>}
              </button>
            ))}
          </div>
        </div>
        <aside className="booking-summary">
          <h3>Booking summary</h3>
          <div className="summary-person">
            <div className="small-avatar">{t.pandit.initials}</div>
            <div>
              <b>{t.pandit.name}</b>
              <Rating value={t.pandit.rating} />
            </div>
          </div>
          <div className="summary-row">
            <Icon name="fire" />
            <span>
              <small>Puja</small>
              <b>{t.puja.name.replace(" Puja", "")}</b>
            </span>
          </div>
          <div className="summary-row">
            <Icon name="calendar" />
            <span>
              <small>Date & time</small>
              <b data-testid="summary-when">
                {selectedDate ? fmtShort(selectedDate) : "Select a date"} · {draft.time ?? "Select a time"}
              </b>
            </span>
          </div>
          <div className="summary-row">
            <Icon name="location" />
            <span>
              <small>Location</small>
              <b>{draft.address}</b>
            </span>
          </div>
          <hr />
          <div className="total">
            <span>Estimated total</span>
            <b>{inr(t.total)}</b>
          </div>
          {error && (
            <span className="field-error" role="alert">
              {error}
            </span>
          )}
          <button type="button" className="button full" onClick={proceed}>
            Continue to details <Icon name="arrow" size={18} />
          </button>
        </aside>
      </div>
    </main>
  )
}

type Method = "UPI" | "Card" | "Net banking"
type PayState = "idle" | "processing" | "failed" | "unavailable"

const formatCard = (v: string) =>
  v.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ")
const formatExpiry = (v: string) => {
  const digits = v.replace(/\D/g, "").slice(0, 4)
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
}
function luhn(num: string) {
  let sum = 0
  ;[...num].reverse().forEach((c, i) => {
    let d = Number(c)
    if (i % 2) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
  })
  return sum % 10 === 0
}
function expiryError(v: string) {
  const m = /^(\d{2})\/(\d{2})$/.exec(v)
  if (!m) return "Enter the expiry date as MM/YY"
  const month = Number(m[1])
  if (month < 1 || month > 12) return "Enter a month from 01 to 12"
  const end = new Date(2000 + Number(m[2]), month, 1)
  return end <= new Date() ? "This card has expired" : undefined
}

// Nothing typed here is saved. The values live in this component and are discarded on leaving.
function DemoPayment({
  booking,
  method,
  onMethod,
}: {
  booking: BookingRecord
  method: Method
  onMethod: (m: Method) => void
}) {
  const { payBooking, viewBooking } = useStore()
  const [state, setState] = useState<PayState>("idle")
  const [bank, setBank] = useState("")
  const [bankError, setBankError] = useState("")
  const upi = useForm({ id: "" }, (v) => ({
    id: !v.id.trim()
      ? "Enter your UPI ID"
      : /^[a-zA-Z0-9._-]{2,}@[a-zA-Z][a-zA-Z0-9.-]{1,}$/.test(v.id.trim())
        ? undefined
        : "Enter a valid UPI ID, such as yourname@upi",
  }))
  const card = useForm({ number: "", name: "", expiry: "", cvv: "" }, (v) => {
    const digits = v.number.replace(/\s/g, "")
    return {
      number: !digits ? "Enter the card number" : digits.length !== 16 || !luhn(digits) ? "Enter a valid 16-digit card number" : undefined,
      name: v.name.trim().length < 2 ? "Enter the name on the card" : undefined,
      expiry: expiryError(v.expiry),
      cvv: /^\d{3,4}$/.test(v.cvv) ? undefined : "Enter the 3 or 4 digit CVV",
    }
  })
  const busy = state === "processing"
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const run = (label: string, fails: boolean) => {
    setState("processing")
    setTimeout(() => {
      // Leaving the page mid-payment must not confirm a booking.
      if (!mounted.current) return
      if (fails) setState("failed")
      else if (payBooking(booking.id, label)) viewBooking(booking.id)
      else setState("unavailable")
    }, 1500)
  }
  const pay = () => {
    if (method === "UPI") {
      upi.submit((v) => run("UPI (demo)", v.id.trim().toLowerCase() === FAIL_UPI))()
    } else if (method === "Card") {
      card.submit((v) => {
        const digits = v.number.replace(/\s/g, "")
        run(`Card ending ${digits.slice(-4)} (demo)`, digits === FAIL_CARD)
      })()
    } else if (!bank) {
      setBankError("Please select a bank")
    } else {
      run(`${bank} (demo)`, bank === FAIL_BANK)
    }
  }

  return (
    <section
      className="form-card"
      onKeyDown={(e) => {
        if (e.key === "Enter" && !busy && (e.target as HTMLElement).tagName === "INPUT") pay()
      }}
    >
      <div className="demo-note" role="note">
        <Icon name="shield" />
        <span>
          <b>Demo payment only</b>
          No real money moves and nothing you type here is saved. Please do not
          enter real card or bank details. To simulate a failure, use{" "}
          {method === "UPI" ? <code>{FAIL_UPI}</code> : method === "Card" ? <code>4000 0000 0000 0002</code> : <code>{FAIL_BANK}</code>}.
          {method === "Card" && <> For a success, use <code>4242 4242 4242 4242</code>.</>}
        </span>
      </div>
      <div className="payment-tabs" role="tablist">
        {(["UPI", "Card", "Net banking"] as Method[]).map((m) => (
          <button
            type="button"
            role="tab"
            key={m}
            aria-selected={method === m}
            disabled={busy}
            className={method === m ? "active" : ""}
            onClick={() => {
              onMethod(m)
              setState("idle")
            }}
          >
            {m}
          </button>
        ))}
      </div>
      {method === "UPI" && (
        <Field label="UPI ID" error={upi.errors.id}>
          <input placeholder="yourname@upi" autoComplete="off" disabled={busy} {...upi.bind("id")} />
        </Field>
      )}
      {method === "Card" && (
        <div className="form-grid">
          <Field label="Card number" className="wide" error={card.errors.number}>
            <input
              placeholder="1234 5678 9012 3456"
              inputMode="numeric"
              autoComplete="off"
              disabled={busy}
              {...card.bind("number")}
              onChange={(e) => {
                e.target.value = formatCard(e.target.value)
                card.bind("number").onChange(e)
              }}
            />
          </Field>
          <Field label="Cardholder name" className="wide" error={card.errors.name}>
            <input placeholder="Name on card" autoComplete="off" disabled={busy} {...card.bind("name")} />
          </Field>
          <Field label="Expiry date" error={card.errors.expiry}>
            <input
              placeholder="MM/YY"
              inputMode="numeric"
              autoComplete="off"
              disabled={busy}
              {...card.bind("expiry")}
              onChange={(e) => {
                e.target.value = formatExpiry(e.target.value)
                card.bind("expiry").onChange(e)
              }}
            />
          </Field>
          <Field label="CVV" error={card.errors.cvv}>
            <input
              type="password"
              placeholder="123"
              inputMode="numeric"
              autoComplete="off"
              disabled={busy}
              {...card.bind("cvv")}
              onChange={(e) => {
                e.target.value = e.target.value.replace(/\D/g, "").slice(0, 4)
                card.bind("cvv").onChange(e)
              }}
            />
          </Field>
        </div>
      )}
      {method === "Net banking" && (
        <div className="bank-list" role="radiogroup" aria-label="Choose a demo bank">
          {demoBanks.map((b) => (
            <button
              type="button"
              role="radio"
              key={b}
              aria-checked={bank === b}
              disabled={busy}
              className={bank === b ? "active" : ""}
              onClick={() => {
                setBank(b)
                setBankError("")
                setState("idle")
              }}
            >
              <Icon name={bank === b ? "check" : "briefcase"} size={16} />
              {b}
            </button>
          ))}
          {bankError && (
            <span className="field-error" role="alert">
              {bankError}
            </span>
          )}
        </div>
      )}
      <div className="secure-box">
        <Icon name="shield" />
        <span>
          <b>This is a demonstration</b>A payment gateway has not been
          connected yet, so no payment is actually processed.
        </span>
      </div>
      {state === "failed" && (
        <div className="pay-failure" role="alert">
          <b>Demo payment failed</b>
          This is a simulated failure and no money was involved. Check the
          details or choose another method, then try again.
        </div>
      )}
      {state === "unavailable" && (
        <div className="pay-failure" role="alert">
          <b>This booking can no longer be paid</b>
          The payment time has run out or the booking has changed. You have not
          been charged.
        </div>
      )}
      <button type="button" className="button full" disabled={busy || state === "unavailable"} onClick={pay}>
        {busy ? "Processing demo payment…" : state === "failed" ? `Try demo payment again · ${inr(booking.total)}` : `Complete demo payment · ${inr(booking.total)}`}
      </button>
    </section>
  )
}

function OrderCard({
  pujaName,
  image,
  date,
  time,
  dakshina,
  items,
  fee,
  total,
  method,
  cancelWindow,
}: {
  pujaName: string
  image: string
  date: string | null
  time: string | null
  dakshina: number
  items: { name: string; price: number }[]
  fee: number
  total: number
  method?: string
  cancelWindow: string
}) {
  return (
    <aside className="order-card">
      <h3>Your booking</h3>
      <img src={image} alt={pujaName} />
      <h2>{pujaName}</h2>
      <p>{date ? fmtLong(date) : ""} · {time}</p>
      <div>
        <span>Pandit dakshina</span>
        <b>{inr(dakshina)}</b>
      </div>
      {items.map((x) => (
        <div key={x.name}>
          <span>{x.name}</span>
          <b>{inr(x.price)}</b>
        </div>
      ))}
      <div>
        <span>PujaNow assurance</span>
        <b>{inr(fee)}</b>
      </div>
      {method && (
        <div data-testid="summary-method">
          <span>Payment method</span>
          <b>{method}</b>
        </div>
      )}
      <hr />
      <div className="total">
        <span>Total</span>
        <b>{inr(total)}</b>
      </div>
      <small>Free cancellation until {cancelWindow} before the puja</small>
    </aside>
  )
}

export function Checkout() {
  const store = useStore()
  const { go, draft, updateDraft, settings, createRequest, viewBooking } = store
  const t = totalsFor(store)
  // The slot is cleared once the request is sent, while this page still shows what was chosen.
  const [{ date, time }] = useState({ date: draft.date, time: draft.time })
  const form = useForm(
    { ...draft.contact, address: draft.address },
    (v) => ({
      name: v.name.trim().length < 2 ? "Enter your full name" : undefined,
      phone: isPhone(v.phone) ? undefined : PHONE_ERROR,
      email: isEmail(v.email) ? undefined : EMAIL_ERROR,
      address: v.address.trim().length < 5 ? "Enter the address for your puja" : undefined,
    }),
  )
  const hasKit = draft.samagri.includes("griha-kit")
  const setKit = (on: boolean) =>
    updateDraft({
      samagri: on ? [...new Set([...draft.samagri, "griha-kit"])] : draft.samagri.filter((x) => x !== "griha-kit"),
    })
  const sendRequest = form.submit((v) => {
    updateDraft({
      contact: { name: v.name.trim(), phone: v.phone.trim(), email: v.email.trim() },
      address: v.address.trim(),
    })
    viewBooking(createRequest())
  })

  return (
    <main className="checkout-page">
      <div className="checkout-header">
        <Brand />
        <span>
          Demo checkout <Icon name="shield" size={17} />
        </span>
      </div>
      <div className="checkout-layout">
        <div>
          <button type="button" className="back-link" onClick={() => go("booking")}>
            <Icon name="back" size={18} /> Back
          </button>
          <h1>Complete your booking</h1>
          <p>Booking for {t.puja.name.replace(" Puja", "")} with {t.pandit.name}</p>
          <form noValidate onSubmit={sendRequest}>
            <section className="form-card">
              <h2>Contact details</h2>
              <div className="form-grid">
                <Field label="Full name" error={form.errors.name}>
                  <input autoComplete="name" {...form.bind("name")} />
                </Field>
                <Field label="Phone number" error={form.errors.phone}>
                  <input inputMode="tel" autoComplete="tel" {...form.bind("phone")} />
                </Field>
                <Field label="Email address" className="wide" error={form.errors.email}>
                  <input type="email" autoComplete="email" {...form.bind("email")} />
                </Field>
                <Field label="Puja address" className="wide" error={form.errors.address}>
                  <input autoComplete="street-address" {...form.bind("address")} />
                </Field>
              </div>
            </section>
            <section className="form-card">
              <div className="section-inline">
                <div>
                  <h2>Samagri</h2>
                  <p>Everything needed for your ceremony.</p>
                </div>
                <Badge tone="gold">Recommended</Badge>
              </div>
              <label className="radio-card">
                <input type="radio" checked={hasKit} onChange={() => setKit(true)} name="kit" />
                <span>
                  <b>Complete premium kit</b>
                  <small>
                    35+ fresh and quality-checked items · Delivered 1 day
                    before
                  </small>
                </span>
                <b>₹1,899</b>
              </label>
              <label className="radio-card">
                <input type="radio" checked={!hasKit} onChange={() => setKit(false)} name="kit" />
                <span>
                  <b>I’ll arrange it myself</b>
                  <small>We’ll send you a complete checklist</small>
                </span>
                <b>₹0</b>
              </label>
            </section>
            <div className="secure-box">
              <Icon name="shield" />
              <span>
                <b>No payment is due yet</b>
                {t.pandit.short} has {settings.responseHours} hours to accept or
                decline. You only pay if they accept.
              </span>
            </div>
            <button type="submit" className="button full mobile-full">
              Send booking request <Icon name="arrow" size={18} />
            </button>
          </form>
        </div>
        <OrderCard
          pujaName={t.puja.name}
          image={t.puja.image}
          date={date}
          time={time}
          dakshina={t.dakshina}
          items={t.items}
          fee={t.fee}
          total={t.total}
          cancelWindow={settings.cancelWindow}
        />
      </div>
    </main>
  )
}

export function Payment() {
  const { go, bookings, lastBookingId, pujas, settings, viewBooking } = useStore()
  const booking = bookings.find((b) => b.id === lastBookingId)
  const [method, setMethod] = useState<Method>("UPI")
  // Only an accepted, unpaid booking can be paid, so a refresh or the back button cannot pay twice.
  useEffect(() => {
    if (booking && booking.status !== "Awaiting payment") viewBooking(booking.id)
  }, [booking?.status])
  if (!booking || booking.status !== "Awaiting payment") return null
  return (
    <main className="checkout-page">
      <div className="checkout-header">
        <Brand />
        <span>
          Demo checkout <Icon name="shield" size={17} />
        </span>
      </div>
      <div className="checkout-layout">
        <div>
          <button type="button" className="back-link" onClick={() => go("bookings")}>
            <Icon name="back" size={18} /> Back
          </button>
          <h1>Payment details</h1>
          <p>
            {booking.panditName} accepted your request. Pay to confirm your
            booking · {fmtTimeLeft(booking.expiresAt)}
          </p>
          <DemoPayment booking={booking} method={method} onMethod={setMethod} />
        </div>
        <OrderCard
          pujaName={booking.pujaName}
          image={pujas.find((p) => p.id === booking.pujaId)?.image ?? defaultPujaImage}
          date={booking.date}
          time={booking.time}
          dakshina={booking.dakshina}
          items={booking.samagriNames.length ? [{ name: booking.samagriNames.join(", "), price: booking.samagri }] : []}
          fee={booking.fee}
          total={booking.total}
          method={`${method} (demo)`}
          cancelWindow={settings.cancelWindow}
        />
      </div>
    </main>
  )
}

const statusCopy: Record<BookingRecord["status"], { overline: string; title: string; text: (b: BookingRecord, window: string) => string }> = {
  Pending: {
    overline: "REQUEST SENT",
    title: "Your request is with your pandit.",
    text: (b) => `${b.panditName} will accept or decline it (${fmtTimeLeft(b.expiresAt)}). No payment is due unless they accept.`,
  },
  "Awaiting payment": {
    overline: "REQUEST ACCEPTED",
    title: "Your pandit has accepted.",
    text: (b) => `Pay to confirm your booking with ${b.panditName} (${fmtTimeLeft(b.expiresAt)}).`,
  },
  Confirmed: {
    overline: "DEMO BOOKING CONFIRMED",
    title: "Your sacred beginning is all set.",
    text: (b) => `This demo booking is saved to your account and shared with ${b.panditName}. No real payment was processed.`,
  },
  Completed: {
    overline: "PUJA COMPLETED",
    title: "Your puja is complete.",
    text: (b) => `We hope your ceremony with ${b.panditName} was a meaningful one.`,
  },
  Declined: {
    overline: "REQUEST DECLINED",
    title: "This pandit isn’t available.",
    text: (b) => `${b.panditName} declined this request. You have not been charged.`,
  },
  Expired: {
    overline: "REQUEST EXPIRED",
    title: "This request has expired.",
    text: () => "The time to respond or pay ran out, so the slot has been released. You have not been charged.",
  },
  Cancelled: {
    overline: "BOOKING CANCELLED",
    title: "This booking was cancelled.",
    text: (b) => (b.paymentStatus === "Demo refund" ? "A demo refund has been recorded. No real money was involved." : "You have not been charged."),
  },
}

export function Confirmation() {
  const { go, bookings, lastBookingId, settings, payFor, rebook } = useStore()
  const booking = bookings.find((b) => b.id === lastBookingId)
  if (!booking) {
    return (
      <main className="confirmation-page">
        <h1>No recent booking</h1>
        <p>Plan a puja to see your confirmation here.</p>
        <div className="hero-actions">
          <button type="button" className="button" onClick={() => go("assistant")}>
            Plan a puja
          </button>
        </div>
      </main>
    )
  }
  const copy = statusCopy[booking.status]
  const closed = booking.status === "Declined" || booking.status === "Expired" || booking.status === "Cancelled"
  return (
    <main className="confirmation-page">
      <div className={`success-mark ${closed ? "closed" : ""}`}>
        <Icon name={closed ? "close" : booking.status === "Pending" ? "clock" : "check"} size={38} />
      </div>
      <span className="overline">{copy.overline}</span>
      <h1>{copy.title}</h1>
      <p>{copy.text(booking, settings.cancelWindow)}</p>
      <div className="confirmation-card">
        <div>
          <span>BOOKING ID</span>
          <b>{booking.id}</b>
        </div>
        <hr />
        <h2>{booking.pujaName}</h2>
        <div className="confirmation-grid">
          <span>
            <Icon name="calendar" />
            <small>Date & time</small>
            <b>{fmtShort(booking.date)} · {booking.time}</b>
          </span>
          <span>
            <Icon name="user" />
            <small>Your pandit</small>
            <b>{booking.panditName}</b>
          </span>
          <span>
            <Icon name="location" />
            <small>At your home</small>
            <b>{booking.location}</b>
          </span>
          <span>
            <Icon name="briefcase" />
            <small>Samagri</small>
            <b>{booking.samagriNames.length ? "Delivered 1 day before" : "Checklist shared"}</b>
          </span>
          <span>
            <Icon name="money" />
            <small>{booking.paymentStatus === "Demo paid" ? "Demo payment" : "Total"}</small>
            <b>{inr(booking.total)}{booking.paymentStatus === "Demo paid" ? ` · ${booking.payment}` : ""}</b>
          </span>
        </div>
      </div>
      <div className="hero-actions">
        {booking.status === "Awaiting payment" && (
          <button type="button" className="button" onClick={() => payFor(booking.id)}>
            Pay now · {inr(booking.total)}
          </button>
        )}
        {closed && (
          <button type="button" className="button" onClick={() => rebook(booking)}>
            Find another pandit
          </button>
        )}
        <button
          type="button"
          className={booking.status === "Awaiting payment" || closed ? "button secondary" : "button"}
          onClick={() => go("bookings")}
        >
          View my booking
        </button>
        <button type="button" className="button secondary" onClick={() => go("home")}>
          Back to home
        </button>
      </div>
      <p className="support-line">
        <Icon name="phone" size={17} /> Need help? Call PujaNow support at {settings.phone}
      </p>
    </main>
  )
}
