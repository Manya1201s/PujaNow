import { useState, type ReactNode } from "react"
import { CATEGORIES, daysUntil, fmtShort, inr, LANGUAGES, defaultPujaImage, PUJA_TYPES, seedBookings, type Booking, type Complaint, type Customer, type Page, type Pandit, type Puja, type VerificationRequest } from "../data"
import { AppShell, type NavItem } from "../shell"
import { useStore } from "../store"
import { ConfirmModal, Dropdown, EmptyState, Field, Icon, isPhone, Modal, PHONE_ERROR, StatusBadge, useForm } from "../ui"
import { Stat } from "./pandit"

export const adminNav: NavItem[] = [
  { label: "Overview", icon: "dashboard", page: "admin-overview" },
  { label: "Customers", icon: "users", page: "customers" },
  { label: "Pandit management", icon: "user", page: "pandit-management" },
  {
    label: "Verification requests",
    icon: "shield",
    page: "admin-verification",
  },
  { label: "Puja catalogue", icon: "fire", page: "catalogue" },
  { label: "Bookings", icon: "calendar", page: "booking-management" },
  { label: "Payments", icon: "money", page: "payments" },
  { label: "Commission", icon: "briefcase", page: "commission" },
  { label: "Reviews & complaints", icon: "message", page: "complaints" },
  { label: "Reports & analytics", icon: "dashboard", page: "reports" },
  { label: "Platform settings", icon: "filter", page: "settings" },
]

const ranges: Record<string, (date: string) => boolean> = {
  "All time": () => true,
  "Past 30 days": (d) => daysUntil(d) >= -30 && daysUntil(d) <= 0,
  "Next 30 days": (d) => daysUntil(d) >= 0 && daysUntil(d) <= 30,
  "Past 90 days": (d) => daysUntil(d) >= -90 && daysUntil(d) <= 0,
}

function downloadCsv(name: string, header: string[], rows: (string | number)[][]) {
  // A leading apostrophe stops spreadsheet apps treating text cells as formulas.
  const cell = (v: string | number) => {
    const text = String(v)
    const safe = typeof v === "string" && /^[=+\-@]/.test(text) ? `'${text}` : text
    return `"${safe.replace(/"/g, '""')}"`
  }
  const csv = [header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n")
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
  const link = document.createElement("a")
  link.href = url
  link.download = `pujanow-${name}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

type Column<T> = { label: string; value: (row: T) => string | number; render?: (row: T) => ReactNode }

function DataCard<T extends { id: string }>({
  title,
  rows,
  columns,
  statusOf,
  actions,
  exportName,
  searchLabel = "Search",
  headerExtra,
}: {
  title: string
  rows: T[]
  columns: Column<T>[]
  statusOf?: (row: T) => string
  actions?: (row: T) => ReactNode
  exportName: string
  searchLabel?: string
  headerExtra?: ReactNode
}) {
  const { toast } = useStore()
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("")
  const q = query.trim().toLowerCase()
  const visible = rows.filter(
    (r) =>
      (!status || statusOf?.(r) === status) &&
      (!q || columns.some((c) => String(c.value(r)).toLowerCase().includes(q))),
  )
  const statuses = statusOf ? [...new Set(rows.map(statusOf))] : []
  return (
    <section className="dash-card">
      <div className="card-heading">
        <h3>{title}</h3>
        <div className="toolbar">
          <div className="search-box compact">
            <Icon name="search" size={16} />
            <input placeholder={searchLabel} aria-label={searchLabel} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          {statusOf && (
            <Dropdown
              className="button secondary small"
              label={<><Icon name="filter" size={15} /> {status || "Filter"}</>}
              value={status}
              options={[{ value: "", label: "All statuses" }, ...statuses.map((s) => ({ value: s, label: s }))]}
              onChange={setStatus}
            />
          )}
          {headerExtra}
          <button
            type="button"
            className="button small"
            onClick={() => {
              downloadCsv(exportName, columns.map((c) => c.label), visible.map((r) => columns.map((c) => c.value(r))))
              toast(`Exported ${visible.length} ${visible.length === 1 ? "row" : "rows"}`)
            }}
          >
            Export
          </button>
        </div>
      </div>
      {visible.length === 0 ? (
        <EmptyState title="No matching records" text="Try a different search or filter." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.label}>{c.label}</th>
                ))}
                {actions && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id}>
                  {columns.map((c) => (
                    <td key={c.label}>{c.render ? c.render(r) : c.value(r)}</td>
                  ))}
                  {actions && <td className="table-actions">{actions(r)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

const bookingColumns: Column<Booking>[] = [
  { label: "Booking ID", value: (b) => b.id },
  { label: "Customer", value: (b) => b.customer },
  { label: "Pandit", value: (b) => b.panditName },
  { label: "Puja", value: (b) => b.pujaName },
  { label: "Date", value: (b) => fmtShort(b.date) },
  { label: "Amount", value: (b) => inr(b.total) },
  { label: "Status", value: (b) => b.status, render: (b) => <StatusBadge status={b.status} /> },
]

export function AdminDashboard({ page }: { page: Page }) {
  const { verifications, complaints, bookings, pandits, customers, go } = useStore()
  const [range, setRange] = useState("All time")
  const heading = adminNav.find((x) => x.page === page)?.label || "Overview"
  const pendingReview = verifications.filter((v) => v.status === "Documents ready").length
  const openComplaints = complaints.filter((c) => c.status === "Open").length
  const inRange = bookings.filter((b) => ranges[range](b.date))
  const newBookings = Math.max(0, bookings.length - seedBookings().length)
  return (
    <AppShell role="admin" page={page} nav={adminNav} badges={{ "admin-verification": pendingReview, complaints: openComplaints }}>
      <div className="dash-heading">
        <div>
          <h1>{heading}</h1>
          <p>
            {page === "admin-overview"
              ? "Platform performance and operations at a glance."
              : "Manage, review and control platform operations."}
          </p>
        </div>
        <Dropdown
          className="button secondary"
          label={<><Icon name="calendar" size={17} /> {range}</>}
          value={range}
          options={Object.keys(ranges).map((r) => ({ value: r, label: r }))}
          onChange={setRange}
        />
      </div>
      {page === "customers" ? (
        <Customers />
      ) : page === "pandit-management" ? (
        <PanditManagement />
      ) : page === "admin-verification" ? (
        <VerificationTable />
      ) : page === "catalogue" ? (
        <Catalogue />
      ) : page === "booking-management" ? (
        <BookingManagement rows={inRange} />
      ) : page === "payments" ? (
        <Payments rows={inRange} />
      ) : page === "commission" ? (
        <Commission rows={inRange} />
      ) : page === "complaints" ? (
        <Complaints />
      ) : page === "reports" ? (
        <Reports rows={inRange} />
      ) : page === "settings" ? (
        <AdminSettings />
      ) : (
        <>
          <div className="stat-grid">
            <Stat
              title="Gross booking value"
              value="₹48.2L"
              note="+14.8% vs last month"
              icon="money"
            />
            <Stat
              title="Total bookings"
              value={(1284 + newBookings).toLocaleString("en-IN")}
              note={`+${92 + newBookings} this month`}
              icon="calendar"
            />
            <Stat
              title="Active customers"
              value={(9836 + customers.filter((c) => c.status === "Active").length).toLocaleString("en-IN")}
              note="+8.3% growth"
              icon="users"
            />
            <Stat
              title="Verified pandits"
              value={(2414 + pandits.filter((p) => p.status === "Active").length).toLocaleString("en-IN")}
              note={`${pendingReview} awaiting review`}
              icon="shield"
            />
          </div>
          <div className="dashboard-grid wide-left">
            <section className="dash-card">
              <div className="card-heading">
                <h3>Booking volume</h3>
                <span className="legend">
                  <i /> Completed <i /> New
                </span>
              </div>
              <div className="large-chart">
                {[38, 55, 48, 66, 62, 80, 72, 91, 75, 84, 89, 96].map(
                  (x, i) => (
                    <div key={i}>
                      <i style={{ height: `${x}%` }} />
                      <span>{i % 2 ? "" : "W" + (i / 2 + 1)}</span>
                    </div>
                  ),
                )}
              </div>
            </section>
            <section className="dash-card">
              <div className="card-heading">
                <h3>Operational health</h3>
              </div>
              {[
                ["Booking completion", "94.8%"],
                ["Pandit acceptance", "88.2%"],
                ["Payment success", "97.6%"],
                ["Support SLA met", "91.4%"],
              ].map((x) => (
                <div className="metric-row" key={x[0]}>
                  <span>{x[0]}</span>
                  <b>{x[1]}</b>
                  <i>
                    <em style={{ width: x[1] }} />
                  </i>
                </div>
              ))}
            </section>
          </div>
          <DataCard
            title="Recent bookings"
            rows={inRange}
            columns={bookingColumns}
            statusOf={(b) => b.status}
            exportName="recent-bookings"
            searchLabel="Search bookings"
            actions={() => (
              <button type="button" className="button secondary small" onClick={() => go("booking-management")}>
                Manage
              </button>
            )}
          />
        </>
      )}
    </AppShell>
  )
}

function Customers() {
  const { customers, bookings, update, toast } = useStore()
  const [viewing, setViewing] = useState<Customer | null>(null)
  const [changing, setChanging] = useState<Customer | null>(null)
  const countFor = (name: string) => bookings.filter((b) => b.customer === name).length
  return (
    <>
      <DataCard
        title="All customers"
        rows={customers}
        searchLabel="Search customers"
        exportName="customers"
        statusOf={(c) => c.status}
        columns={[
          { label: "Name", value: (c) => c.name },
          { label: "Email", value: (c) => c.email },
          { label: "Phone", value: (c) => c.phone },
          { label: "City", value: (c) => c.city },
          { label: "Bookings", value: (c) => countFor(c.name) },
          { label: "Status", value: (c) => c.status, render: (c) => <StatusBadge status={c.status} /> },
        ]}
        actions={(c) => (
          <>
            <button type="button" className="button secondary small" onClick={() => setViewing(c)}>View</button>
            <button type="button" className="button small" onClick={() => setChanging(c)}>
              {c.status === "Active" ? "Suspend" : "Reactivate"}
            </button>
          </>
        )}
      />
      {viewing && (
        <Modal title={viewing.name} onClose={() => setViewing(null)}>
          <dl className="detail-list">
            <dt>Email</dt><dd>{viewing.email}</dd>
            <dt>Phone</dt><dd>{viewing.phone}</dd>
            <dt>City</dt><dd>{viewing.city}</dd>
            <dt>Status</dt><dd>{viewing.status}</dd>
            <dt>Bookings</dt><dd>{countFor(viewing.name)}</dd>
          </dl>
        </Modal>
      )}
      {changing && (
        <ConfirmModal
          title={`${changing.status === "Active" ? "Suspend" : "Reactivate"} ${changing.name}?`}
          text="This changes the customer's status in this demo."
          confirmLabel={changing.status === "Active" ? "Suspend" : "Reactivate"}
          onClose={() => setChanging(null)}
          onConfirm={() => {
            const status = changing.status === "Active" ? "Suspended" : "Active"
            update((s) => ({ ...s, customers: s.customers.map((c) => (c.id === changing.id ? { ...c, status } : c)) }))
            toast(`${changing.name} is now ${status.toLowerCase()}`)
          }}
        />
      )}
    </>
  )
}

function PanditManagement() {
  const { pandits, update, toast } = useStore()
  const [viewing, setViewing] = useState<Pandit | null>(null)
  const [changing, setChanging] = useState<Pandit | null>(null)
  return (
    <>
      <DataCard
        title="All pandits"
        rows={pandits}
        searchLabel="Search pandits"
        exportName="pandits"
        statusOf={(p) => p.status}
        columns={[
          { label: "Name", value: (p) => p.name },
          { label: "City", value: (p) => p.city },
          { label: "Experience", value: (p) => p.exp },
          { label: "Languages", value: (p) => p.langs },
          { label: "Rating", value: (p) => p.rating },
          { label: "Status", value: (p) => p.status, render: (p) => <StatusBadge status={p.status} /> },
        ]}
        actions={(p) => (
          <>
            <button type="button" className="button secondary small" onClick={() => setViewing(p)}>View</button>
            <button type="button" className="button small" onClick={() => setChanging(p)}>
              {p.status === "Active" ? "Suspend" : "Reactivate"}
            </button>
          </>
        )}
      />
      {viewing && (
        <Modal title={viewing.name} onClose={() => setViewing(null)}>
          <p className="modal-text">{viewing.about}</p>
          <dl className="detail-list">
            <dt>City</dt><dd>{viewing.city}</dd>
            <dt>Experience</dt><dd>{viewing.exp}</dd>
            <dt>Languages</dt><dd>{viewing.langs}</dd>
            <dt>Starting price</dt><dd>{inr(viewing.price)}</dd>
            <dt>Specialisations</dt><dd>{viewing.specialisations.join(", ")}</dd>
          </dl>
        </Modal>
      )}
      {changing && (
        <ConfirmModal
          title={`${changing.status === "Active" ? "Suspend" : "Reactivate"} ${changing.name}?`}
          text={changing.status === "Active" ? "Suspended pandits no longer appear in customer search." : "This pandit will appear in customer search again."}
          confirmLabel={changing.status === "Active" ? "Suspend" : "Reactivate"}
          onClose={() => setChanging(null)}
          onConfirm={() => {
            const status = changing.status === "Active" ? "Suspended" : "Active"
            update((s) => ({ ...s, pandits: s.pandits.map((p) => (p.id === changing.id ? { ...p, status } : p)) }))
            toast(`${changing.name} is now ${status.toLowerCase()}`)
          }}
        />
      )}
    </>
  )
}

function VerificationTable() {
  const { verifications, update, toast, pujas } = useStore()
  const [query, setQuery] = useState("")
  const [reviewing, setReviewing] = useState<VerificationRequest | null>(null)
  const q = query.trim().toLowerCase()
  const rows = verifications.filter((v) => !q || [v.name, v.city, v.langs].join(" ").toLowerCase().includes(q))
  const decide = (v: VerificationRequest, approved: boolean) => {
    const parts = v.name.split(/\s+/)
    const initials = parts.map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    const partner: Pandit = {
      id: v.id,
      name: `Pandit ${v.name}`,
      short: `Pandit ${parts[0]}`,
      city: v.city,
      exp: v.exp,
      langs: v.langs,
      price: 3500,
      rating: "New",
      reviews: "0",
      initials,
      color: "#e3d7c8",
      about: `Newly verified PujaNow partner based in ${v.city}.`,
      bio: `${v.name} has ${v.exp} of experience and recently joined PujaNow as a verified partner.`,
      specialisations: pujas.slice(0, 3).map((p) => p.name),
      pujaIds: pujas.map((p) => p.id),
      status: "Active",
      available: true,
    }
    update((s) => ({
      ...s,
      verifications: s.verifications.map((x) => (x.id === v.id ? { ...x, status: approved ? "Approved" : "Rejected" } : x)),
      pandits: approved && !s.pandits.some((p) => p.id === v.id) ? [...s.pandits, partner] : s.pandits,
    }))
    toast(approved ? `${v.name} approved and added to pandits` : `${v.name} rejected`)
  }
  return (
    <section className="dash-card">
      <div className="card-heading">
        <h3>Pending verification requests</h3>
        <div className="search-box compact">
          <Icon name="search" size={16} />
          <input placeholder="Search applicant" aria-label="Search applicant" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>
      <div className="verification-list">
        {rows.map((x) => (
          <div key={x.id}>
            <div className="small-avatar">
              {x.name
                .split(" ")
                .map((a) => a[0])
                .slice(0, 2)}
            </div>
            <span>
              <b>{x.name}</b>
              <small>
                {x.city} · {x.exp} · {x.langs}
              </small>
            </span>
            <StatusBadge status={x.status} />
            <div className="row-actions">
              <button type="button" className="button secondary small" onClick={() => setReviewing(x)}>Review</button>
              <button
                type="button"
                disabled={x.status !== "Documents ready"}
                className="button small"
                onClick={() => decide(x, true)}
              >
                {x.status === "Approved" ? "Approved" : "Approve"}
              </button>
            </div>
          </div>
        ))}
      </div>
      {rows.length === 0 && <EmptyState title="No matching applicants" />}
      {reviewing && (
        <Modal title={`Review ${reviewing.name}`} onClose={() => setReviewing(null)}>
          <dl className="detail-list">
            <dt>City</dt><dd>{reviewing.city}</dd>
            <dt>Experience</dt><dd>{reviewing.exp}</dd>
            <dt>Languages</dt><dd>{reviewing.langs}</dd>
            <dt>ID document</dt><dd>{reviewing.document}</dd>
            <dt>Status</dt><dd>{reviewing.status}</dd>
          </dl>
          {reviewing.status === "Documents ready" && (
            <div className="modal-actions">
              <button
                type="button"
                className="button secondary small"
                onClick={() => {
                  decide(reviewing, false)
                  setReviewing(null)
                }}
              >
                Reject
              </button>
              <button
                type="button"
                className="button small"
                onClick={() => {
                  decide(reviewing, true)
                  setReviewing(null)
                }}
              >
                Approve
              </button>
            </div>
          )}
        </Modal>
      )}
    </section>
  )
}

function PujaForm({ puja, onClose }: { puja: Puja | null; onClose: () => void }) {
  const { update, toast } = useStore()
  const form = useForm(
    {
      name: puja?.name ?? "",
      meta: puja?.meta ?? "",
      price: puja ? String(puja.price) : "",
      time: puja?.time ?? "",
      hours: puja ? String(puja.hours) : "",
      category: puja?.categories[0] ?? "New beginnings",
      type: puja?.type ?? PUJA_TYPES[0],
    },
    (v) => ({
      name: v.name.trim().length < 3 ? "Enter the puja name" : undefined,
      meta: v.meta.trim().length < 5 ? "Enter a short description" : undefined,
      price: /^\d+$/.test(v.price) && Number(v.price) >= 100 ? undefined : "Enter a price of at least ₹100",
      time: v.time.trim() ? undefined : "Enter the duration, such as 2 hrs",
      hours: Number(v.hours) > 0 && Number(v.hours) <= 24 ? undefined : "Enter hours from 0.5 to 24",
    }),
  )
  return (
    <Modal title={puja ? `Edit ${puja.name}` : "Add a puja"} onClose={onClose}>
      <form
        noValidate
        onSubmit={form.submit((v) => {
          const fields = {
            name: v.name.trim(),
            meta: v.meta.trim(),
            price: Number(v.price),
            time: v.time.trim(),
            hours: Number(v.hours),
            type: v.type,
          }
          const newId = `puja-${Date.now()}`
          update((s) => ({
            ...s,
            // Without this, a new puja would have no pandit to book it with.
            pandits: puja ? s.pandits : s.pandits.map((p) => ({ ...p, pujaIds: [...p.pujaIds, newId] })),
            pujas: puja
              ? s.pujas.map((p) =>
                  p.id === puja.id
                    ? { ...p, ...fields, categories: [v.category, ...p.categories.filter((c) => c !== v.category)] }
                    : p,
                )
              : [
                  ...s.pujas,
                  {
                    ...fields,
                    id: newId,
                    image: defaultPujaImage,
                    categories: [v.category],
                    languages: LANGUAGES.slice(0, 2),
                    occasions: [],
                    benefits: [],
                    overline: v.category.toUpperCase(),
                    about: fields.meta,
                    included: ["Personalised sankalp for your family", "Complete Vedic rituals", "Guidance before and during the ceremony"],
                    prepare: "Your pandit will guide you through every detail before the ceremony.",
                    active: true,
                  },
                ],
          }))
          toast(puja ? "Puja updated" : "Puja added to the catalogue")
          onClose()
        })}
      >
        <div className="form-grid">
          <Field label="Puja name" className="wide" error={form.errors.name}>
            <input {...form.bind("name")} />
          </Field>
          <Field label="Short description" className="wide" error={form.errors.meta}>
            <input {...form.bind("meta")} />
          </Field>
          <Field label="Starting price (₹)" error={form.errors.price}>
            <input inputMode="numeric" {...form.bind("price")} />
          </Field>
          <Field label="Duration label" error={form.errors.time}>
            <input placeholder="2 hrs" {...form.bind("time")} />
          </Field>
          <Field label="Duration in hours" error={form.errors.hours}>
            <input inputMode="decimal" {...form.bind("hours")} />
          </Field>
          <Field label="Category">
            <select {...form.bind("category")}>
              {CATEGORIES.slice(1).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Puja type" className="wide">
            <select {...form.bind("type")}>
              {PUJA_TYPES.map((t) => (
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
            Save puja
          </button>
        </div>
      </form>
    </Modal>
  )
}

function Catalogue() {
  const { pujas, update, toast } = useStore()
  const [editing, setEditing] = useState<Puja | "new" | null>(null)
  return (
    <>
      <DataCard
        title="Puja catalogue"
        rows={pujas}
        searchLabel="Search pujas"
        exportName="catalogue"
        statusOf={(p) => (p.active ? "Active" : "Hidden")}
        headerExtra={
          <button type="button" className="button secondary small" onClick={() => setEditing("new")}>
            Add puja
          </button>
        }
        columns={[
          { label: "Puja", value: (p) => p.name },
          { label: "Category", value: (p) => p.categories.join(", ") },
          { label: "Type", value: (p) => p.type },
          { label: "Duration", value: (p) => p.time },
          { label: "Price", value: (p) => inr(p.price) },
          { label: "Status", value: (p) => (p.active ? "Active" : "Hidden"), render: (p) => <StatusBadge status={p.active ? "Active" : "Hidden"} /> },
        ]}
        actions={(p) => (
          <>
            <button type="button" className="button secondary small" onClick={() => setEditing(p)}>Edit</button>
            <button
              type="button"
              className="button small"
              onClick={() => {
                update((s) => ({ ...s, pujas: s.pujas.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x)) }))
                toast(p.active ? `${p.name} hidden from customers` : `${p.name} is visible to customers`)
              }}
            >
              {p.active ? "Hide" : "Show"}
            </button>
          </>
        )}
      />
      {editing && <PujaForm puja={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </>
  )
}

function BookingManagement({ rows }: { rows: Booking[] }) {
  const { respondToRequest, cancelBooking, completeBooking, toast } = useStore()
  const [viewing, setViewing] = useState<Booking | null>(null)
  const [cancelling, setCancelling] = useState<Booking | null>(null)
  const [completing, setCompleting] = useState<Booking | null>(null)
  return (
    <>
      <DataCard
        title="All bookings"
        rows={rows}
        columns={bookingColumns}
        statusOf={(b) => b.status}
        exportName="bookings"
        searchLabel="Search bookings"
        actions={(b) => (
          <>
            <button type="button" className="button secondary small" onClick={() => setViewing(b)}>View</button>
            {b.status === "Pending" && (
              <button type="button" className="button small" onClick={() => respondToRequest(b.id, true)}>
                Accept for pandit
              </button>
            )}
            {b.status === "Confirmed" && (
              <button type="button" className="button small" onClick={() => setCompleting(b)}>
                Mark completed
              </button>
            )}
            {(b.status === "Pending" || b.status === "Awaiting payment" || b.status === "Confirmed") && (
              <button type="button" className="button secondary small" onClick={() => setCancelling(b)}>Cancel</button>
            )}
          </>
        )}
      />
      {viewing && (
        <Modal title={`Booking ${viewing.id}`} onClose={() => setViewing(null)}>
          <dl className="detail-list">
            <dt>Puja</dt><dd>{viewing.pujaName}</dd>
            <dt>Customer</dt><dd>{viewing.customer}</dd>
            <dt>Pandit</dt><dd>{viewing.panditName}</dd>
            <dt>Date & time</dt><dd>{fmtShort(viewing.date)} · {viewing.time}</dd>
            <dt>Location</dt><dd>{viewing.location}</dd>
            <dt>Total</dt><dd>{inr(viewing.total)}</dd>
            <dt>Status</dt><dd>{viewing.status}</dd>
            <dt>Payment</dt><dd>{viewing.payment} · {viewing.paymentStatus}</dd>
            <dt>Pandit payout</dt><dd>{viewing.payoutStatus === "Released" ? `${inr(viewing.payout)} released after ${inr(viewing.commission)} commission` : viewing.payoutStatus}</dd>
          </dl>
        </Modal>
      )}
      {cancelling && (
        <ConfirmModal
          title={`Cancel ${cancelling.id}?`}
          text={`This cancels the booking for ${cancelling.customer}${cancelling.paymentStatus === "Demo paid" ? " and records a demo refund." : ". They have not been charged."}`}
          confirmLabel="Cancel booking"
          onClose={() => setCancelling(null)}
          onConfirm={() => {
            cancelBooking(cancelling.id)
            toast(`${cancelling.id} cancelled`)
          }}
        />
      )}
      {completing && (
        <ConfirmModal
          title={`Mark ${completing.id} as completed?`}
          text="This releases the pandit's share to their balance, less the platform commission. It is a demo record and no real money moves."
          confirmLabel="Mark completed"
          onClose={() => setCompleting(null)}
          onConfirm={() => {
            completeBooking(completing.id)
            toast(`${completing.id} completed and payment released`)
          }}
        />
      )}
    </>
  )
}

function Payments({ rows }: { rows: Booking[] }) {
  const { cancelBooking, toast } = useStore()
  const [refunding, setRefunding] = useState<Booking | null>(null)
  const collected = rows.filter((b) => b.paymentStatus === "Demo paid").reduce((sum, b) => sum + b.total, 0)
  const refunded = rows.filter((b) => b.paymentStatus === "Demo refund").reduce((sum, b) => sum + b.total, 0)
  return (
    <>
      <div className="stat-grid">
        <Stat title="Demo payments recorded" value={inr(collected)} note="Simulated, no real money" icon="money" />
        <Stat title="Demo refunds" value={inr(refunded)} note="Simulated, no real money" icon="briefcase" />
        <Stat title="Awaiting payment" value={String(rows.filter((b) => b.paymentStatus === "Awaiting").length)} note="Accepted, not yet paid" icon="clock" />
      </div>
      <DataCard
        title="Demo payment records"
        rows={rows}
        searchLabel="Search payments"
        exportName="payments"
        statusOf={(b) => b.paymentStatus}
        columns={[
          { label: "Booking ID", value: (b) => b.id },
          { label: "Customer", value: (b) => b.customer },
          { label: "Method", value: (b) => b.payment },
          { label: "Date", value: (b) => fmtShort(b.createdAt) },
          { label: "Amount", value: (b) => inr(b.total) },
          { label: "Status", value: (b) => b.paymentStatus, render: (b) => <StatusBadge status={b.paymentStatus} /> },
          { label: "Pandit payout", value: (b) => b.payoutStatus, render: (b) => <StatusBadge status={b.payoutStatus} /> },
        ]}
        actions={(b) =>
          b.paymentStatus === "Demo paid" && b.payoutStatus !== "Released" && (
            <button type="button" className="button secondary small" onClick={() => setRefunding(b)}>
              Record refund
            </button>
          )
        }
      />
      {refunding && (
        <ConfirmModal
          title={`Record a demo refund for ${refunding.id}?`}
          text={`This cancels the booking and marks ${inr(refunding.total)} as refunded on the demo record. No real money is moved.`}
          confirmLabel="Record refund"
          onClose={() => setRefunding(null)}
          onConfirm={() => {
            cancelBooking(refunding.id)
            toast("Demo refund recorded")
          }}
        />
      )}
    </>
  )
}

function Commission({ rows }: { rows: Booking[] }) {
  const { settings, patch, toast } = useStore()
  const rate = Number(settings.commission)
  const earning = rows.filter((b) => b.status === "Confirmed" || b.status === "Completed")
  const form = useForm({ rate: settings.commission }, (v) => ({
    rate: /^\d+(\.\d+)?$/.test(v.rate) && Number(v.rate) <= 50 ? undefined : "Enter a rate from 0 to 50",
  }))
  // Completed bookings keep the commission taken at the time. Others show the current rate.
  const commissionOn = (b: Booking) => (b.payoutStatus === "Released" ? b.commission : Math.round((b.dakshina * rate) / 100))
  return (
    <>
      <div className="stat-grid">
        <Stat title="Commission rate" value={`${rate}%`} note="Applied to dakshina" icon="briefcase" />
        <Stat title="Commission earned" value={inr(earning.reduce((sum, b) => sum + commissionOn(b), 0))} note={`From ${earning.length} bookings`} icon="money" />
        <Stat title="Pandit payouts" value={inr(earning.reduce((sum, b) => sum + b.dakshina - commissionOn(b), 0))} note="After commission" icon="users" />
      </div>
      <form
        className="form-card"
        noValidate
        onSubmit={form.submit((v) => {
          patch({ settings: { ...settings, commission: v.rate } })
          toast(`Commission rate set to ${v.rate}%`)
        })}
      >
        <h2>Default commission rate</h2>
        <div className="form-grid">
          <Field label="Rate (%)" error={form.errors.rate}>
            <input inputMode="decimal" {...form.bind("rate")} />
          </Field>
        </div>
        <button type="submit" className="button small commission-save">Update rate</button>
      </form>
      <DataCard
        title="Commission by booking"
        rows={earning}
        searchLabel="Search bookings"
        exportName="commission"
        columns={[
          { label: "Booking ID", value: (b) => b.id },
          { label: "Pandit", value: (b) => b.panditName },
          { label: "Dakshina", value: (b) => inr(b.dakshina) },
          { label: "Commission", value: (b) => inr(commissionOn(b)) },
          { label: "Pandit payout", value: (b) => inr(b.dakshina - commissionOn(b)) },
          { label: "Payout status", value: (b) => b.payoutStatus, render: (b) => <StatusBadge status={b.payoutStatus} /> },
        ]}
      />
    </>
  )
}

function Complaints() {
  const { complaints, reviews, update, toast } = useStore()
  const [resolving, setResolving] = useState<Complaint | null>(null)
  const [viewing, setViewing] = useState<Complaint | null>(null)
  const [note, setNote] = useState("")
  const [error, setError] = useState("")
  return (
    <>
      <DataCard
        title="Complaints"
        rows={complaints}
        searchLabel="Search complaints"
        exportName="complaints"
        statusOf={(c) => c.status}
        columns={[
          { label: "Reference", value: (c) => c.id },
          { label: "Customer", value: (c) => c.customer },
          { label: "Subject", value: (c) => c.subject },
          { label: "Booking", value: (c) => c.bookingId },
          { label: "Status", value: (c) => c.status, render: (c) => <StatusBadge status={c.status} /> },
        ]}
        actions={(c) => (
          <>
            <button type="button" className="button secondary small" onClick={() => setViewing(c)}>View</button>
            {c.status === "Open" && (
              <button
                type="button"
                className="button small"
                onClick={() => {
                  setResolving(c)
                  setNote("")
                  setError("")
                }}
              >
                Resolve
              </button>
            )}
          </>
        )}
      />
      <section className="dash-card reviews-page spaced">
        <div className="card-heading">
          <h3>Latest reviews</h3>
        </div>
        {reviews.map((r) => (
          <div className="review-row" key={r.id}>
            <div className="small-avatar">{r.initials}</div>
            <span>
              <b>{r.author}</b>
              <p>{r.text}</p>
            </span>
            <small>{r.age}</small>
          </div>
        ))}
      </section>
      {viewing && (
        <Modal title={viewing.subject} onClose={() => setViewing(null)}>
          <p className="modal-text">{viewing.detail}</p>
          <dl className="detail-list">
            <dt>Customer</dt><dd>{viewing.customer}</dd>
            <dt>Booking</dt><dd>{viewing.bookingId}</dd>
            <dt>Status</dt><dd>{viewing.status}</dd>
            {viewing.resolution && (
              <>
                <dt>Resolution</dt><dd>{viewing.resolution}</dd>
              </>
            )}
          </dl>
        </Modal>
      )}
      {resolving && (
        <Modal title={`Resolve ${resolving.id}`} onClose={() => setResolving(null)}>
          <p className="modal-text">{resolving.subject}</p>
          <label>
            Resolution note
            <textarea
              value={note}
              aria-invalid={error ? true : undefined}
              onChange={(e) => {
                setNote(e.target.value)
                setError("")
              }}
            />
            {error && <span className="field-error" role="alert">{error}</span>}
          </label>
          <div className="modal-actions">
            <button type="button" className="button secondary small" onClick={() => setResolving(null)}>
              Go back
            </button>
            <button
              type="button"
              className="button small"
              onClick={() => {
                if (!note.trim()) {
                  setError("Please add a resolution note")
                  return
                }
                update((s) => ({
                  ...s,
                  complaints: s.complaints.map((c) =>
                    c.id === resolving.id ? { ...c, status: "Resolved", resolution: note.trim() } : c,
                  ),
                }))
                toast(`${resolving.id} resolved`)
                setResolving(null)
              }}
            >
              Mark resolved
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}

const cityRevenue = [
  ["Delhi NCR", "₹18.4L", "38%"],
  ["Mumbai", "₹12.8L", "27%"],
  ["Bengaluru", "₹8.6L", "18%"],
  ["Pune", "₹5.2L", "11%"],
]
const topCategories = [
  ["Griha Pravesh", "32%"],
  ["Satyanarayan Puja", "24%"],
  ["Ganesh Puja", "18%"],
  ["Navgraha Shanti", "12%"],
]

function Reports({ rows }: { rows: Booking[] }) {
  const { toast } = useStore()
  return (
    <>
      <div className="stat-grid">
        <Stat
          title="Net revenue"
          value="₹6.24L"
          note="+12.2% growth"
          icon="money"
        />
        <Stat
          title="Avg. booking value"
          value="₹6,842"
          note="+₹340 this month"
          icon="briefcase"
        />
        <Stat
          title="Repeat rate"
          value="36.8%"
          note="+3.1 percentage points"
          icon="users"
        />
      </div>
      <div className="dashboard-grid">
        <section className="dash-card">
          <div className="card-heading">
            <h3>Revenue by city</h3>
            <button
              type="button"
              onClick={() => {
                downloadCsv("revenue-by-city", ["City", "Revenue", "Share"], cityRevenue)
                toast("Report exported")
              }}
            >
              Export
            </button>
          </div>
          {cityRevenue.map((x) => (
            <div className="metric-row" key={x[0]}>
              <span>{x[0]}</span>
              <b>{x[1]}</b>
              <i>
                <em style={{ width: x[2] }} />
              </i>
            </div>
          ))}
        </section>
        <section className="dash-card">
          <div className="card-heading">
            <h3>Top puja categories</h3>
            <button
              type="button"
              onClick={() => {
                downloadCsv("top-categories", ["Category", "Share"], topCategories)
                toast("Report exported")
              }}
            >
              Export
            </button>
          </div>
          {topCategories.map((x) => (
            <div className="metric-row" key={x[0]}>
              <span>{x[0]}</span>
              <b>{x[1]}</b>
              <i>
                <em style={{ width: x[1] }} />
              </i>
            </div>
          ))}
        </section>
      </div>
      <DataCard
        title="Bookings in this period"
        rows={rows}
        columns={bookingColumns}
        statusOf={(b) => b.status}
        exportName="report-bookings"
        searchLabel="Search bookings"
      />
    </>
  )
}

function AdminSettings() {
  const { settings, patch, toast, resetDemo } = useStore()
  const [resetting, setResetting] = useState(false)
  const form = useForm(settings, (v) => ({
    commission: /^\d+(\.\d+)?$/.test(v.commission) && Number(v.commission) <= 50 ? undefined : "Enter a rate from 0 to 50",
    phone: isPhone(v.phone) || /^\+91[\s\d]{10,14}$/.test(v.phone.trim()) ? undefined : PHONE_ERROR,
  }))
  return (
    <>
      <form
        className="form-card profile-form"
        noValidate
        onSubmit={form.submit((v) => {
          patch({ settings: v })
          toast("Platform settings saved")
        })}
      >
        <h2>Platform settings</h2>
        <div className="form-grid">
          <Field label="Default commission rate (%)" error={form.errors.commission}>
            <input inputMode="decimal" {...form.bind("commission")} />
          </Field>
          <Field label="Support phone" error={form.errors.phone}>
            <input inputMode="tel" {...form.bind("phone")} />
          </Field>
          <Field label="Booking cancellation window">
            <select {...form.bind("cancelWindow")}>
              <option>24 hours</option>
              <option>48 hours</option>
              <option>72 hours</option>
            </select>
          </Field>
          <Field label="Pandit response window">
            <select {...form.bind("responseHours")}>
              {["2", "6", "12", "24", "48"].map((h) => (
                <option key={h} value={h}>{h} hours</option>
              ))}
            </select>
          </Field>
          <Field label="Default settlement cycle">
            <select {...form.bind("settlement")}>
              <option>Daily (T+1)</option>
              <option>Weekly (T+7)</option>
              <option>Fortnightly (T+15)</option>
            </select>
          </Field>
        </div>
        <button type="submit" className="button">Save settings</button>
      </form>
      <section className="form-card profile-form">
        <h2>Demo data</h2>
        <p className="modal-text">
          Restore all bookings, messages and settings to their original sample
          data. The demo keeps everything in this browser only.
        </p>
        <button type="button" className="button secondary" onClick={() => setResetting(true)}>
          Reset demo data
        </button>
      </section>
      {resetting && (
        <ConfirmModal
          title="Reset all demo data?"
          text="Every booking, message and change you made in this browser will be replaced by the original sample data."
          confirmLabel="Reset demo data"
          onClose={() => setResetting(false)}
          onConfirm={() => {
            resetDemo()
            form.setValues({ commission: "12", phone: "+91 80471 88000", cancelWindow: "48 hours", settlement: "Weekly (T+7)", responseHours: "24" })
          }}
        />
      )}
    </>
  )
}
