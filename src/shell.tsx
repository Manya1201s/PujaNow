import { useEffect, useRef, useState, type ReactNode } from "react"
import type { Page, Role } from "./data"
import { useStore } from "./store"
import { Brand, Dropdown, Icon } from "./ui"

export type NavItem = { label: string; icon: string; page: Page }

export function AppShell({
  role,
  page,
  nav,
  badges = {},
  children,
}: {
  role: Role
  page: Page
  nav: NavItem[]
  badges?: Partial<Record<Page, number>>
  children: ReactNode
}) {
  const { go, signOut, profile, panditProfile, notices, update, patch, pandits, activePanditId } = useStore()
  const [mobile, setMobile] = useState(false)
  const [query, setQuery] = useState("")
  const [noticesOpen, setNoticesOpen] = useState(false)
  const noticesRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!noticesRef.current?.contains(e.target as Node)) setNoticesOpen(false)
      if (!searchRef.current?.contains(e.target as Node)) setQuery("")
      // The open sidebar covers the menu button on phones, so tapping outside closes it.
      if (!(e.target as Element).closest?.(".sidebar, .app-topbar > .menu-button")) setMobile(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const mine = notices.filter((n) => n.role === role && (!n.panditId || n.panditId === activePanditId))
  const unread = mine.filter((n) => !n.read).length
  const q = query.trim().toLowerCase()
  const found = q ? nav.filter((x) => x.label.toLowerCase().includes(q)) : []
  const name = role === "admin" ? "Aarav Kapoor" : role === "pandit" ? panditProfile.name : profile.name
  const initials = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()

  return (
    <div className={`app-shell ${role}`}>
      <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
        <Brand inverse={role !== "customer"} />
        <div className="portal-label">
          {role === "customer"
            ? "My PujaNow"
            : role === "pandit"
              ? "Pandit partner"
              : "Super admin"}
        </div>
        {role === "pandit" && (
          <div className="portal-switch">
            <Dropdown
              ariaLabel="Demo: choose which pandit to view as"
              label={<>Demo: {pandits.find((p) => p.id === activePanditId)?.short} <Icon name="chevron" size={12} /></>}
              value={activePanditId}
              options={pandits.filter((p) => p.status === "Active").map((p) => ({ value: p.id, label: p.name }))}
              onChange={(id) => patch({ activePanditId: id })}
            />
          </div>
        )}
        <nav>
          {nav.map((x) => (
            <button
              type="button"
              key={x.page}
              className={page === x.page ? "active" : ""}
              onClick={() => {
                go(x.page)
                setMobile(false)
              }}
            >
              <Icon name={x.icon} size={19} />
              {x.label}
              {Boolean(badges[x.page]) && <i>{badges[x.page]}</i>}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <button type="button" onClick={signOut}>
            <Icon name="logout" />
            Sign out
          </button>
        </div>
      </aside>
      <div className="app-main">
        <header className="app-topbar">
          <button type="button" className="menu-button" aria-label="Open menu" onClick={() => setMobile(!mobile)}>
            <Icon name="menu" />
          </button>
          <div className="top-search" ref={searchRef}>
            <Icon name="search" size={17} />
            <input
              placeholder="Search"
              aria-label="Search pages"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {q && (
              <div className="popover" role="menu">
                {found.map((x) => (
                  <button
                    type="button"
                    role="menuitem"
                    key={x.page}
                    onClick={() => {
                      go(x.page)
                      setQuery("")
                    }}
                  >
                    {x.label}
                  </button>
                ))}
                {found.length === 0 && <span>No matching pages</span>}
              </div>
            )}
          </div>
          <div className="top-profile">
            <div className="dropdown" ref={noticesRef}>
              <button
                type="button"
                className="notification"
                aria-label={`Notifications, ${unread} unread`}
                aria-expanded={noticesOpen}
                onClick={() => setNoticesOpen(!noticesOpen)}
              >
                {unread}
              </button>
              {noticesOpen && (
                <div className="popover notices" role="menu">
                  <b>Notifications</b>
                  {mine.map((n) => (
                    <button
                      type="button"
                      role="menuitem"
                      key={n.id}
                      className={n.read ? "" : "active"}
                      onClick={() => {
                        update((s) => ({
                          ...s,
                          notices: s.notices.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
                        }))
                        setNoticesOpen(false)
                        go(n.page)
                      }}
                    >
                      {n.text}
                    </button>
                  ))}
                  {mine.length === 0 && <span>You’re all caught up</span>}
                </div>
              )}
            </div>
            <div className="small-avatar">{initials}</div>
            <span>
              <b>{name}</b>
              <small>
                {role === "admin"
                  ? "Platform administrator"
                  : role === "pandit"
                    ? "Verified partner"
                    : "Customer"}
              </small>
            </span>
          </div>
        </header>
        <div className="app-content">{children}</div>
      </div>
    </div>
  )
}
