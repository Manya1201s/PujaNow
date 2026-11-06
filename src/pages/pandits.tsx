import { lazy, Suspense, useState } from "react"
import { addDays, CITIES, fmtDay, fmtShort, inr, isPanditFree, LANGUAGES, todayISO, type Pandit } from "../data"
import { openSlots, totalsFor, useStore } from "../store"
// The map library is large, so it loads only when this page is opened.
const PanditMap = lazy(() => import("./pandit-map").then((m) => ({ default: m.PanditMap })))
import { Badge, Dropdown, EmptyState, Field, FilterButton, Icon, isPhone, PanditCard, PHONE_ERROR, Rating, useForm } from "../ui"

const priceBands: Record<string, (p: number) => boolean> = {
  "Under ₹3,300": (p) => p < 3300,
  "₹3,300–₹3,600": (p) => p >= 3300 && p <= 3600,
  "Above ₹3,600": (p) => p > 3600,
}
const ratingBands: Record<string, (r: number) => boolean> = {
  "4.9 and above": (r) => r >= 4.9,
  "4.8 and above": (r) => r >= 4.8,
}

export function FindPandit() {
  const { pandits, pujas, draft, updateDraft, panditSearch, update, go } = useStore()
  const set = (p: Partial<typeof panditSearch>) =>
    update((s) => ({ ...s, panditSearch: { ...s.panditSearch, ...p } }))
  const f = panditSearch.filters
  const puja = pujas.find((p) => p.id === draft.pujaId) ?? pujas[0]
  const results = pandits.filter(
    (p: Pandit) =>
      p.status === "Active" &&
      p.available &&
      p.pujaIds.includes(puja.id) &&
      (!draft.date || isPanditFree(p.id, draft.date)) &&
      (!panditSearch.language || p.langs.includes(panditSearch.language)) &&
      (!f.city?.length || f.city.includes(p.city)) &&
      (!f.price?.length || f.price.some((o) => priceBands[o](p.price))) &&
      (!f.rating?.length || f.rating.some((o) => ratingBands[o](parseFloat(p.rating)))),
  )
  const dateOptions = [
    { value: "", label: "Any date" },
    ...Array.from({ length: 8 }, (_, i) => {
      const value = addDays(i)
      return { value, label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : fmtDay(value) }
    }),
    { value: "calendar", label: "More dates…" },
  ]
  const city = f.city?.length === 1 ? f.city[0] : draft.city
  return (
    <main className="page-shell">
      <div className="result-header">
        <div>
          <span className="overline">
            {city.toUpperCase()} · {draft.date ? fmtShort(draft.date).toUpperCase() : "ANY DATE"}
          </span>
          <h1>Choose your pandit</h1>
          <p>All experts below are verified and available for your {puja.name}.</p>
        </div>
        <FilterButton
          groups={[
            { key: "city", label: "City", options: [...new Set(pandits.map((p) => p.city))] },
            { key: "price", label: "Starting price", options: Object.keys(priceBands) },
            { key: "rating", label: "Rating", options: Object.keys(ratingBands) },
          ]}
          applied={f}
          onApply={(filters) => set({ filters })}
        />
      </div>
      <div className="filter-bar">
        <Dropdown
          ariaLabel="Choose puja"
          label={<>{puja.name.replace(" Puja", "")} <Icon name="chevron" size={15} /></>}
          value={puja.id}
          options={pujas.filter((p) => p.active).map((p) => ({ value: p.id, label: p.name }))}
          onChange={(pujaId) => updateDraft({ pujaId })}
        />
        <Dropdown
          ariaLabel="Choose date"
          label={<>{draft.date ? fmtDay(draft.date) : "Any date"} <Icon name="chevron" size={15} /></>}
          value={draft.date ?? ""}
          options={dateOptions}
          onChange={(value) => {
            if (value === "calendar") go("booking")
            else updateDraft({ date: value || null, time: null })
          }}
        />
        <Dropdown
          ariaLabel="Choose language"
          label={<>{panditSearch.language || "Any language"} <Icon name="chevron" size={15} /></>}
          value={panditSearch.language}
          options={[{ value: "", label: "Any language" }, ...LANGUAGES.map((l) => ({ value: l, label: l }))]}
          onChange={(language) => set({ language })}
        />
        <span>
          {results.length} {results.length === 1 ? "pandit" : "pandits"} available
        </span>
      </div>
      <div className="result-layout">
        <div className="result-list">
          {results.map((p) => (
            <PanditCard key={p.id} item={p} />
          ))}
          {results.length === 0 && (
            <EmptyState
              title="No pandits match your choices"
              text="Try another date or language, or clear your filters."
              action={
                <button
                  type="button"
                  className="button secondary small"
                  onClick={() => {
                    set({ language: "", filters: {} })
                    updateDraft({ date: null, time: null })
                  }}
                >
                  Clear choices
                </button>
              }
            />
          )}
        </div>
        <Suspense fallback={<aside className="map-card" aria-label="Loading the map" />}>
          <PanditMap pandits={results} city={draft.city} />
        </Suspense>
      </div>
    </main>
  )
}

export function Emergency() {
  const { go, updateDraft, toast, pujas, settings, profile, signedIn } = useStore()
  const form = useForm(
    { pujaId: "", when: "As soon as possible", city: "Gurugram", locality: "", phone: signedIn ? profile.phone : "+91 " },
    (v) => ({
      pujaId: v.pujaId ? undefined : "Please select a puja",
      city: v.city.trim() ? undefined : "Enter your city",
      locality: v.locality.trim() ? undefined : "Enter your neighbourhood",
      phone: isPhone(v.phone) ? undefined : PHONE_ERROR,
    }),
  )
  const submit = form.submit((v) => {
    updateDraft({
      pujaId: v.pujaId,
      date: todayISO(),
      time: null,
      city: v.city.trim(),
      address: `${v.locality.trim()}, ${v.city.trim()}`,
    })
    toast("Priority request noted. Choose an available pandit below.")
    go("pandits")
  })
  return (
    <main className="page-shell emergency-page">
      <button type="button" className="back-link" onClick={() => go("home")}>
        <Icon name="back" size={18} /> Back to home
      </button>
      <div className="emergency-head">
        <div>
          <Badge tone="red">Priority booking</Badge>
          <h1>Find a pandit for today</h1>
          <p>
            Tell us where and when you need support. We’ll show you the nearby
            verified pandits who are free today.
          </p>
        </div>
        <span>
          <Icon name="phone" size={22} />
          <small>Prefer to call?</small>
          <b>{settings.phone}</b>
        </span>
      </div>
      <div className="emergency-layout">
        <form className="form-card" noValidate onSubmit={submit}>
          <h2>What do you need help with?</h2>
          <div className="form-grid">
            <Field label="Puja or occasion" error={form.errors.pujaId}>
              <select {...form.bind("pujaId")}>
                <option value="">Select a puja</option>
                {pujas.filter((p) => p.active).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Preferred time">
              <select {...form.bind("when")}>
                <option>As soon as possible</option>
                <option>Within 3 hours</option>
                <option>This evening</option>
              </select>
            </Field>
            <Field label="City" error={form.errors.city}>
              <input list="pujanow-cities" {...form.bind("city")} />
              <datalist id="pujanow-cities">
                {CITIES.map((c) => <option key={c} value={c} />)}
              </datalist>
            </Field>
            <Field label="Locality" error={form.errors.locality}>
              <input placeholder="Enter your neighbourhood" {...form.bind("locality")} />
            </Field>
            <Field label="Phone number" className="wide" error={form.errors.phone}>
              <input inputMode="tel" {...form.bind("phone")} />
            </Field>
          </div>
          <button type="submit" className="button full">
            Find available pandits now <Icon name="arrow" size={17} />
          </button>
        </form>
        <aside className="emergency-note">
          <Icon name="shield" size={26} />
          <h3>How priority booking works</h3>
          <ol>
            <li>We alert nearby verified pandits immediately.</li>
            <li>You receive a call when an expert accepts.</li>
            <li>Pricing is confirmed before you book.</li>
          </ol>
          <p>
            Average matching time in Gurugram: <b>12 minutes</b>
          </p>
        </aside>
      </div>
    </main>
  )
}

export function PanditProfile() {
  const store = useStore()
  const { go, updateDraft, messagePandit, signedIn } = store
  const { puja, dakshina } = totalsFor(store)
  // The profile always shows the pandit whose page this is.
  const pandit = store.pandits.find((p) => p.id === store.draft.panditId) ?? totalsFor(store).pandit
  const dates = Array.from({ length: 14 }, (_, i) => addDays(i + 1)).filter((d) => isPanditFree(pandit.id, d))
  const openings = dates
    .flatMap((date) => openSlots(store, date, pandit.id).map((time) => ({ date, time })))
    .slice(0, 3)
  const [picked, setPicked] = useState(0)
  const choose = () => {
    const slot = openings[picked]
    if (slot) updateDraft({ date: slot.date, time: slot.time })
    go("booking")
  }
  return (
    <main className="page-shell">
      <button type="button" className="back-link" onClick={() => go("pandits")}>
        <Icon name="back" size={18} /> Search results
      </button>
      <div className="profile-hero">
        <div className="profile-avatar">{pandit.initials}</div>
        <div className="profile-main">
          <div className="verified">
            <Icon name="shield" size={17} /> Identity & credentials verified
          </div>
          <h1>{pandit.name}</h1>
          <div className="profile-stats">
            <Rating value={pandit.rating} reviews={pandit.reviews} />
            <span>{pandit.exp} experience</span>
            <span>{pandit.city}</span>
          </div>
          <p>{pandit.about}</p>
          <div className="tag-row">
            {pandit.langs.split(", ").map((l) => (
              <span key={l}>{l}</span>
            ))}
          </div>
        </div>
        <aside>
          <span>For {puja.name.replace(" Puja", "")}</span>
          <h2>{inr(dakshina)}</h2>
          <small>Includes travel within {pandit.city}</small>
          <button type="button" className="button full" onClick={() => go("booking")}>
            Check availability
          </button>
          <button
            type="button"
            className="button secondary full"
            onClick={() => (signedIn ? messagePandit(pandit.id) : go("messages"))}
          >
            <Icon name="message" size={17} /> Message
          </button>
        </aside>
      </div>
      <div className="profile-content">
        <div className="content-card">
          <h2>About {pandit.short}</h2>
          <p>{pandit.bio}</p>
          <h2>Specialisations</h2>
          <div className="specialisation-grid">
            {pandit.specialisations.map((x) => (
              <span key={x}>
                <Icon name="check" size={15} />
                {x}
              </span>
            ))}
          </div>
          <h2>What families say</h2>
          <div className="review-card">
            <Rating value={pandit.rating} />
            <p>
              “Pandit ji was patient, punctual and explained each mantra
              beautifully. Our parents felt completely at ease.”
            </p>
            <b>Neha & Arjun Mehta</b>
            <span>{puja.name.replace(" Puja", "")}</span>
          </div>
        </div>
        <aside className="availability-card">
          <h3>Next available</h3>
          {openings.map((x, i) => (
            <button
              type="button"
              key={x.date + x.time}
              aria-pressed={i === picked}
              className={i === picked ? "active" : ""}
              onClick={() => setPicked(i)}
            >
              <Icon name="calendar" size={18} />
              {fmtDay(x.date)} · {x.time}
            </button>
          ))}
          <button type="button" className="button full" onClick={choose}>
            Choose a time
          </button>
        </aside>
      </div>
    </main>
  )
}
