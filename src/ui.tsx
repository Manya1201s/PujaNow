import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode, type RefObject } from "react"
import { createPortal } from "react-dom"
import { inr, type Pandit, type Puja } from "./data"
import { useStore, type Filters } from "./store"

const iconPaths: Record<string, ReactNode> = {
  arrow: (
    <>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </>
  ),
  back: (
    <>
      <path d="M19 12H5m6-6-6 6 6 6" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  close: (
    <>
      <path d="m6 6 12 12M18 6 6 18" />
    </>
  ),
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  fire: (
    <path d="M12 22c4 0 7-3 7-7 0-3-2-6-5-9 0 3-2 4-3 5 0-4-2-7-4-9 0 5-3 7-3 12 0 4 3 8 8 8Z" />
  ),
  heart: (
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
  ),
  location: (
    <>
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  message: (
    <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
  ),
  money: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M7 9h.01M17 15h.01" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  shield: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  star: (
    <path d="m12 2 3 6 7 .9-5 4.8 1.2 6.8L12 17.3l-6.2 3.2L7 13.7 2 8.9 9 8Z" />
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V4h8v3M3 12h18" />
    </>
  ),
  bell: (
    <>
      <path d="M10.268 21a2 2 0 0 0 3.464 0" />
      <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
    </>
  ),
  logout: (
    <>
      <path d="M10 17l5-5-5-5M15 12H3M21 19V5a2 2 0 0 0-2-2h-4" />
    </>
  ),
  filter: <path d="M4 5h16M7 12h10M10 19h4" />,
  more: (
    <>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </>
  ),
  phone: (
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4 13 13 0 0 0 2.8.7 2 2 0 0 1 1.7 2Z" />
  ),
}

export function Icon({
  name,
  size = 20,
  className = "",
}: {
  name: string
  size?: number
  className?: string
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {iconPaths[name]}
    </svg>
  )
}

export function Brand({ inverse = false }: { inverse?: boolean }) {
  const { goHome } = useStore()
  return (
    <button
      type="button"
      className={`brand ${inverse ? "inverse" : ""}`}
      onClick={goHome}
      aria-label="PujaNow home"
    >
      <span className="brand-mark">
        <span />
      </span>
      <span>
        Puja<span>Now</span>
      </span>
    </button>
  )
}

export function Rating({
  value = "4.9",
  reviews,
}: {
  value?: string
  reviews?: string
}) {
  return (
    <span className="rating">
      <Icon name="star" size={15} />
      <b>{value}</b>
      {reviews && <span>({reviews})</span>}
    </span>
  )
}

export type Tone = "green" | "gold" | "red" | "gray" | "blue"

export function Badge({
  children,
  tone = "green",
}: {
  children: ReactNode
  tone?: Tone
}) {
  return (
    <span className={`badge ${tone}`}>
      <span className="badge-dot" />
      {children}
    </span>
  )
}

const statusTones: Record<string, Tone> = {
  Confirmed: "green",
  Completed: "green",
  Active: "green",
  Resolved: "green",
  Approved: "green",
  Paid: "green",
  "Demo paid": "green",
  Pending: "gold",
  "Awaiting payment": "gold",
  Held: "gold",
  Released: "green",
  Expired: "gray",
  "Not due": "gray",
  "Not charged": "gray",
  None: "gray",
  Open: "gold",
  Awaiting: "gold",
  Processing: "gold",
  "Documents ready": "gold",
  Cancelled: "red",
  Declined: "red",
  Suspended: "red",
  Rejected: "red",
  Hidden: "gray",
  "Demo refund": "gray",
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTones[status] ?? "gray"}>{status}</Badge>
}

export function PageTitle({
  overline,
  title,
  text,
}: {
  overline?: string
  title: string
  text?: string
}) {
  return (
    <div className="page-title">
      {overline && <span className="overline">{overline}</span>}
      <h1>{title}</h1>
      {text && <p>{text}</p>}
    </div>
  )
}

export function PujaCard({ item }: { item: Puja }) {
  const { viewPuja } = useStore()
  return (
    <article
      className="puja-card"
      role="button"
      tabIndex={0}
      onClick={() => viewPuja(item.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          viewPuja(item.id)
        }
      }}
    >
      <img src={item.image} alt="Indian puja ceremony" />
      <div className="card-body">
        <span className="eyebrow">
          {item.popular ? "MOST BOOKED" : item.categories[0]?.toUpperCase()}
        </span>
        <h3>{item.name}</h3>
        <p>{item.meta}</p>
        <div className="card-meta">
          <span>
            <Icon name="clock" size={16} />
            {item.time}
          </span>
          <span>
            From <b>{inr(item.price)}</b>
          </span>
        </div>
      </div>
    </article>
  )
}

export function PanditCard({ item }: { item: Pandit }) {
  const { viewPandit } = useStore()
  return (
    <article className="pandit-card">
      <div className="pandit-avatar" style={{ background: item.color }}>
        {item.initials}
      </div>
      <div className="pandit-info">
        <div className="verified">
          <Icon name="shield" size={16} /> PujaNow verified
        </div>
        <h3>{item.name}</h3>
        <Rating value={item.rating} reviews={item.reviews} />
        <p>
          <Icon name="location" size={16} />
          {item.city} · {item.exp} experience
        </p>
        <p>
          <Icon name="message" size={16} />
          {item.langs}
        </p>
        <div className="pandit-price">
          <span>
            Starts at <b>{inr(item.price)}</b>
          </span>
          <button
            type="button"
            className="button outline small"
            onClick={() => viewPandit(item.id)}
          >
            View profile
          </button>
        </div>
      </div>
    </article>
  )
}

// ---- Forms ----

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())
export const isPhone = (v: string) => /^(\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}$/.test(v.trim())
export const PHONE_ERROR = "Enter a valid 10-digit Indian mobile number"
export const EMAIL_ERROR = "Enter a valid email address"

type FormElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
type Errors<T> = Partial<Record<keyof T, string | undefined>>

export function useForm<T extends Record<string, string>>(
  initial: T,
  validate: (v: T) => Errors<T>,
) {
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<Errors<T>>({})
  return {
    values,
    errors,
    setValues,
    bind: (key: keyof T) => ({
      value: values[key],
      "aria-invalid": errors[key] ? true : undefined,
      onChange: (e: ChangeEvent<FormElement>) => {
        setValues((v) => ({ ...v, [key]: e.target.value }))
        setErrors((x) => ({ ...x, [key]: undefined }))
      },
    }),
    // Runs the callback only when every field passes validation.
    submit: (done: (v: T) => void) => (e?: FormEvent) => {
      e?.preventDefault()
      const found = validate(values)
      setErrors(found)
      if (!Object.values(found).some(Boolean)) done(values)
    },
  }
}

export function Field({
  label,
  error,
  className,
  children,
}: {
  label: ReactNode
  error?: string
  className?: string
  children: ReactNode
}) {
  return (
    <label className={className}>
      {label}
      {children}
      {error && (
        <span className="field-error" role="alert">
          {error}
        </span>
      )}
    </label>
  )
}

// ---- Overlays ----

function useOutsideClick(ref: RefObject<HTMLElement | null>, onOutside: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside()
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  })
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  })
  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal-card" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmModal({
  title,
  text,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string
  text: string
  confirmLabel: string
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="modal-text">{text}</p>
      <div className="modal-actions">
        <button type="button" className="button secondary small" onClick={onClose}>
          Go back
        </button>
        <button
          type="button"
          className="button small"
          onClick={() => {
            onConfirm()
            onClose()
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

export type Option = { value: string; label: string }

export function Dropdown({
  label,
  options,
  value,
  onChange,
  className,
  ariaLabel,
}: {
  label: ReactNode
  options: Option[]
  value?: string
  onChange: (value: string) => void
  className?: string
  ariaLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useOutsideClick(ref, () => setOpen(false))
  return (
    <div className="dropdown" ref={ref}>
      <button
        type="button"
        className={className}
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen(!open)}
      >
        {label}
      </button>
      {open && (
        <div className="popover" role="menu">
          {options.map((o) => (
            <button
              type="button"
              role="menuitem"
              key={o.value}
              className={o.value === value ? "active" : ""}
              onClick={() => {
                onChange(o.value)
                setOpen(false)
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export const filterCount = (f: Filters) =>
  Object.values(f).reduce((sum, list) => sum + list.length, 0)

export function FilterButton({
  groups,
  applied,
  onApply,
}: {
  groups: { key: string; label: string; options: string[] }[]
  applied: Filters
  onApply: (f: Filters) => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Filters>(applied)
  const ref = useRef<HTMLDivElement>(null)
  // Closing keeps the applied filters and discards choices that were never applied.
  const close = () => {
    setOpen(false)
    setDraft(applied)
  }
  useOutsideClick(ref, () => {
    if (open) close()
  })
  const count = filterCount(applied)
  const toggle = (key: string, option: string) => {
    const list = draft[key] ?? []
    setDraft({
      ...draft,
      [key]: list.includes(option) ? list.filter((x) => x !== option) : [...list, option],
    })
  }
  return (
    <div className="dropdown" ref={ref}>
      <button
        type="button"
        className="button secondary"
        aria-expanded={open}
        onClick={() => {
          if (open) close()
          else {
            setDraft(applied)
            setOpen(true)
          }
        }}
      >
        <Icon name="filter" size={18} /> Filters{count > 0 && ` (${count})`}
      </button>
      {open && (
        <div className="filter-panel" role="dialog" aria-label="Filters">
          <div className="modal-head">
            <h3>Filters</h3>
            <button type="button" onClick={close} aria-label="Close filters">
              <Icon name="close" size={16} />
            </button>
          </div>
          {groups.map((g) => (
            <div className="filter-group" key={g.key}>
              <b>{g.label}</b>
              <div>
                {g.options.map((o) => (
                  <button
                    type="button"
                    key={o}
                    aria-pressed={(draft[g.key] ?? []).includes(o)}
                    className={(draft[g.key] ?? []).includes(o) ? "active" : ""}
                    onClick={() => toggle(g.key, o)}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="modal-actions">
            <button
              type="button"
              className="button secondary small"
              onClick={() => {
                setDraft({})
                onApply({})
              }}
            >
              Clear filters
            </button>
            <button
              type="button"
              className="button small"
              onClick={() => {
                onApply(draft)
                setOpen(false)
              }}
            >
              Apply filters
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function EmptyState({
  title,
  text,
  action,
}: {
  title: string
  text?: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  )
}

export function Toasts() {
  const { toasts } = useStore()
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.tone}`} role="status">
          {t.text}
        </div>
      ))}
    </div>
  )
}
