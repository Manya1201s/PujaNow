import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { useEffect, useRef, useState } from "react"
import { cityCentre, demoPosition, distanceKm, inr, type Pandit, type Point } from "../data"
import { useStore } from "../store"
import { EmptyState, Rating } from "../ui"

const RADII = [10, 25, 50]
const FALLBACK_CITY = "Gurugram"
const shortPrice = (n: number) => `₹${(n / 1000).toFixed(1)}k`

/** Builds an element with text only, so names and cities can never be read as HTML. */
function el(tag: string, className: string, text?: string) {
  const node = document.createElement(tag)
  node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function popupFor(p: Pandit, km: number, onView: (id: string) => void) {
  const root = el("div", "map-popup")
  const avatar = el("div", "map-popup-avatar", p.initials)
  avatar.style.backgroundColor = p.color
  avatar.setAttribute("aria-hidden", "true")
  const info = el("div", "map-popup-info")
  info.append(
    el("b", "", p.name),
    el("span", "map-popup-rating", `★ ${p.rating}${p.reviews !== "0" ? ` (${p.reviews})` : ""}`),
    el("span", "map-popup-meta", `${km.toFixed(1)} km away · demo location`),
  )
  const foot = el("div", "map-popup-foot")
  const price = el("span", "", "Starts at ")
  price.append(el("b", "", inr(p.price)))
  const view = el("button", "button small", "View profile") as HTMLButtonElement
  view.type = "button"
  view.addEventListener("click", () => onView(p.id))
  foot.append(price, view)
  root.append(avatar, info, foot)
  return root
}

export function PanditMap({ pandits, city }: { pandits: Pandit[]; city: string }) {
  const { viewPandit, toast } = useStore()
  const [view, setView] = useState<"map" | "list">("map")
  const [radius, setRadius] = useState(25)
  // The real location is used only on this page and is never saved.
  const [mine, setMine] = useState<Point | null>(null)
  const [locating, setLocating] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layers = useRef<L.LayerGroup | null>(null)

  const knownCity = cityCentre(city) ? city : FALLBACK_CITY
  const home = mine ?? cityCentre(knownCity)!
  const homeLabel = mine ? "Your location" : `Your area (demo: ${knownCity} centre)`
  const placed = pandits
    .map((pandit) => ({ pandit, at: demoPosition(pandit) }))
    .filter((x): x is { pandit: Pandit; at: Point } => x.at !== null)
    .map((x) => ({ ...x, km: distanceKm(home, x.at) }))
    .sort((a, b) => a.km - b.km)
  const nearby = placed.filter((x) => x.km <= radius)
  const unplaced = pandits.length - placed.length

  // Create the map when the map view is shown, and remove it when it is hidden.
  useEffect(() => {
    if (view !== "map" || !box.current) return
    const m = L.map(box.current, { zoomControl: false, scrollWheelZoom: false })
    L.control.zoom({ position: "topright" }).addTo(m)
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(m)
    layers.current = L.layerGroup().addTo(m)
    map.current = m
    // The card's size is only final after layout.
    const resize = setTimeout(() => m.invalidateSize(), 0)
    return () => {
      clearTimeout(resize)
      // Stop any pan or zoom in progress first, or Leaflet errors when it finishes on a removed map.
      m.stop()
      m.off()
      m.remove()
      map.current = null
      layers.current = null
    }
  }, [view])

  // Redraw the markers whenever the results, radius or location change.
  const key = `${view}|${radius}|${home.lat},${home.lng}|${placed.map((x) => x.pandit.id).join()}`
  useEffect(() => {
    const m = map.current
    const group = layers.current
    if (!m || !group) return
    group.clearLayers()
    // The view is set from the radius itself. A layer's own bounds are unknown until the map has a view.
    m.fitBounds(L.latLng(home.lat, home.lng).toBounds(radius * 2000), { padding: [12, 12], animate: false })
    L.circle([home.lat, home.lng], {
      radius: radius * 1000,
      color: "#762f38",
      weight: 1,
      fillColor: "#762f38",
      fillOpacity: 0.05,
      interactive: false,
    }).addTo(group)
    const you = L.marker([home.lat, home.lng], {
      icon: L.divIcon({ className: "user-pin", html: "<span></span>", iconSize: [18, 18] }),
      title: homeLabel,
      keyboard: false,
      zIndexOffset: 1000,
    }).addTo(group)
    you.bindTooltip(el("span", "", homeLabel), { direction: "top", offset: [0, -10], className: "map-tooltip" })
    for (const { pandit, at, km } of placed) {
      L.marker([at.lat, at.lng], {
        icon: L.divIcon({
          className: `pandit-pin${km > radius ? " far" : ""}`,
          html: `<span>${shortPrice(pandit.price)}</span>`,
          // A real size, so the whole price label can be clicked and shows keyboard focus.
          iconSize: [52, 26],
          iconAnchor: [26, 34],
          popupAnchor: [0, -32],
        }),
        title: `${pandit.name}, from ${inr(pandit.price)}`,
        alt: `${pandit.name}, from ${inr(pandit.price)}`,
        riseOnHover: true,
      })
        .bindPopup(() => popupFor(pandit, km, viewPandit), { className: "map-popup-shell", maxWidth: 260, minWidth: 220 })
        .addTo(group)
    }
  }, [key])

  const locate = () => {
    if (!("geolocation" in navigator)) {
      toast("Your browser cannot share its location", "error")
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        setMine({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        toast("Showing pandits near your location")
      },
      () => {
        setLocating(false)
        toast("Location access was not allowed, so a demo location is shown", "error")
      },
      { timeout: 10000, maximumAge: 300000 },
    )
  }

  return (
    <aside className="map-card" aria-label="Nearby pandits">
      <div className="map-toolbar">
        <div className="map-toggle" role="group" aria-label="Map or list">
          {(["map", "list"] as const).map((v) => (
            <button
              type="button"
              key={v}
              aria-pressed={view === v}
              className={view === v ? "active" : ""}
              onClick={() => setView(v)}
            >
              {v === "map" ? "Map" : "List"}
            </button>
          ))}
        </div>
        <select aria-label="Search radius" value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
          {RADII.map((r) => (
            <option key={r} value={r}>
              Within {r} km
            </option>
          ))}
        </select>
        <button type="button" className="map-locate" onClick={mine ? () => setMine(null) : locate} disabled={locating}>
          {locating ? "Locating…" : mine ? "Use demo location" : "Use my location"}
        </button>
      </div>
      {view === "map" ? (
        <div className="map-canvas" ref={box} role="region" aria-label="Map of nearby pandits" />
      ) : (
        <div className="map-list">
          {nearby.map(({ pandit, km }) => (
            <div key={pandit.id} className="map-list-row">
              <div className="small-avatar" style={{ background: pandit.color }}>
                {pandit.initials}
              </div>
              <span>
                <b>{pandit.name}</b>
                <Rating value={pandit.rating} />
                <small>{km.toFixed(1)} km away · from {inr(pandit.price)}</small>
              </span>
              <button type="button" className="button outline small" onClick={() => viewPandit(pandit.id)}>
                View profile
              </button>
            </div>
          ))}
          {nearby.length === 0 && (
            <EmptyState title={`No pandits within ${radius} km`} text="Try a larger radius or clear some filters." />
          )}
        </div>
      )}
      <div className="map-label">
        <b>
          {nearby.length} {nearby.length === 1 ? "pandit" : "pandits"} nearby
        </b>
        <span>
          Within {radius} km of {mine ? "your location" : `your area (${knownCity})`}
          {unplaced > 0 && ` · ${unplaced} without a map location`}
        </span>
        <span className="map-demo-note">
          Demo locations: pandit positions are placeholders near each city’s
          centre, not real addresses.
        </span>
      </div>
    </aside>
  )
}
