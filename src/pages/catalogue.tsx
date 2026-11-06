import photoCredits from "../photo-credits.json"
import { CATEGORIES, infoPages, inr, LANGUAGES, products, PUJA_TYPES, SUPPORT_PHONE, type Page, type Puja } from "../data"
import { totalsFor, useStore, type Filters } from "../store"
import { EmptyState, FilterButton, filterCount, Icon, PageTitle, PujaCard, Badge } from "../ui"

const priceRanges: Record<string, (price: number) => boolean> = {
  "Under ₹3,000": (p) => p < 3000,
  "₹3,000–₹5,000": (p) => p >= 3000 && p <= 5000,
  "Above ₹5,000": (p) => p > 5000,
}
const durations: Record<string, (hours: number) => boolean> = {
  "Up to 2 hours": (h) => h <= 2,
  "2–3 hours": (h) => h > 2 && h <= 3,
  "More than 3 hours": (h) => h > 3,
}

const anyOf = (selected: string[] | undefined, test: (option: string) => boolean) =>
  !selected?.length || selected.some(test)

function matches(p: Puja, category: string, query: string, f: Filters) {
  if (category !== "All pujas" && !p.categories.includes(category)) return false
  const text = [p.name, p.meta, p.type, ...p.categories, ...p.occasions, ...p.benefits].join(" ").toLowerCase()
  if (!query.toLowerCase().split(/\s+/).filter(Boolean).every((word) => text.includes(word))) return false
  return (
    anyOf(f.price, (o) => priceRanges[o](p.price)) &&
    anyOf(f.duration, (o) => durations[o](p.hours)) &&
    anyOf(f.language, (o) => p.languages.includes(o)) &&
    anyOf(f.type, (o) => p.type === o)
  )
}

export function Explore() {
  const { pujas, explore, update } = useStore()
  const set = (p: Partial<typeof explore>) =>
    update((s) => ({ ...s, explore: { ...s.explore, ...p } }))
  const results = pujas.filter(
    (p) => p.active && matches(p, explore.category, explore.query, explore.filters),
  )
  const hasNarrowing = explore.category !== "All pujas" || explore.query || filterCount(explore.filters) > 0
  return (
    <main className="page-shell">
      <PageTitle
        overline="PUJA CATALOGUE"
        title="Find the right puja for every moment"
        text="Explore thoughtfully curated rituals with clear guidance, inclusions and transparent pricing."
      />
      <div className="search-row">
        <div className="search-box">
          <Icon name="search" />
          <input
            placeholder="Search pujas, occasions or benefits"
            aria-label="Search pujas"
            value={explore.query}
            onChange={(e) => set({ query: e.target.value })}
          />
        </div>
        <FilterButton
          groups={[
            { key: "price", label: "Price range", options: Object.keys(priceRanges) },
            { key: "duration", label: "Duration", options: Object.keys(durations) },
            { key: "language", label: "Language", options: LANGUAGES },
            { key: "type", label: "Puja type", options: PUJA_TYPES },
          ]}
          applied={explore.filters}
          onApply={(filters) => set({ filters })}
        />
      </div>
      <div className="category-tabs">
        {CATEGORIES.map((x) => (
          <button
            type="button"
            key={x}
            aria-pressed={explore.category === x}
            className={explore.category === x ? "active" : ""}
            onClick={() => set({ category: x })}
          >
            {x}
          </button>
        ))}
      </div>
      {results.length > 0 ? (
        <div className="card-grid catalogue">
          {results.map((p) => (
            <PujaCard key={p.id} item={p} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No pujas match your search"
          text="Try a different word, choose another category or clear your filters."
          action={
            hasNarrowing && (
              <button
                type="button"
                className="button secondary small"
                onClick={() => set({ category: "All pujas", query: "", filters: {} })}
              >
                Clear search and filters
              </button>
            )
          }
        />
      )}
    </main>
  )
}

export function PujaDetails() {
  const { go, pujas, draft } = useStore()
  const puja = pujas.find((p) => p.id === draft.pujaId) ?? pujas[0]
  return (
    <main className="detail-shell">
      <button type="button" className="back-link" onClick={() => go("explore")}>
        <Icon name="back" size={18} /> All pujas
      </button>
      <div className="detail-hero">
        <div>
          <span className="overline">{puja.overline}</span>
          <h1>{puja.name}</h1>
          <p>{puja.about}</p>
          <div className="detail-chips">
            <span>
              <Icon name="clock" />
              {puja.time.replace("hrs", "hours")}
            </span>
            <span>
              <Icon name="users" />
              Ideal for families
            </span>
            <span>
              <Icon name="message" />
              {puja.languages.join(" or ")}
            </span>
          </div>
        </div>
        <img src={puja.image} alt="Puja offerings" />
      </div>
      <div className="two-column">
        <div className="content-card">
          <h2>About this puja</h2>
          <p>{puja.about}</p>
          <h2>What’s included</h2>
          <ul className="check-list">
            {puja.included.map((x) => (
              <li key={x}>
                <span>
                  <Icon name="check" size={16} />
                </span>
                {x}
              </li>
            ))}
          </ul>
          <h2>How to prepare</h2>
          <p>{puja.prepare}</p>
        </div>
        <aside className="booking-card">
          <span>Packages from</span>
          <h2>{inr(puja.price)}</h2>
          <p>Final price depends on your city, pandit and samagri selection.</p>
          <button type="button" className="button full" onClick={() => go("pandits")}>
            Find an available pandit
          </button>
          <button
            type="button"
            className="button secondary full"
            onClick={() => go("assistant")}
          >
            Personalise this puja
          </button>
          <div className="safe-note">
            <Icon name="shield" />
            <span>
              <b>Book with confidence</b>Verified experts · Demo checkout ·
              Support throughout
            </span>
          </div>
        </aside>
      </div>
    </main>
  )
}

export function Samagri() {
  const store = useStore()
  const { go, draft, updateDraft, toast } = store
  const totals = totalsFor(store)
  const toggle = (id: string, name: string) => {
    const added = draft.samagri.includes(id)
    updateDraft({ samagri: added ? draft.samagri.filter((x) => x !== id) : [...draft.samagri, id] })
    toast(added ? `${name} removed from your plan` : `${name} added to your plan`)
  }
  return (
    <main className="page-shell">
      <PageTitle
        overline="PUJANOW SAMAGRI"
        title="Every essential, thoughtfully arranged"
        text="Quality-checked puja kits curated by experts and delivered fresh to your doorstep."
      />
      <div className="card-grid">
        {products.map((x) => {
          const added = draft.samagri.includes(x.id)
          return (
            <article className="product-card" key={x.id}>
              <img src={x.image} alt={x.name} />
              <div>
                <Badge tone="gold">Expert curated</Badge>
                <h3>{x.name}</h3>
                <p>{x.meta}</p>
                <div>
                  <b>{inr(x.price)}</b>
                  <button
                    type="button"
                    className={`button small ${added ? "secondary" : ""}`}
                    aria-pressed={added}
                    onClick={() => toggle(x.id, x.name)}
                  >
                    {added ? "Remove from plan" : "Add to plan"}
                  </button>
                </div>
              </div>
            </article>
          )
        })}
      </div>
      <div className="samagri-bar">
        <span>
          <b>{totals.items.length} {totals.items.length === 1 ? "item" : "items"} in your plan</b>
          Samagri total: {inr(totals.samagri)}
        </span>
        <button type="button" className="button small" onClick={() => go("plan")}>
          Review my plan <Icon name="arrow" size={16} />
        </button>
      </div>
    </main>
  )
}

export function PhotoCredits() {
  return (
    <main className="page-shell">
      <PageTitle
        overline="PHOTO CREDITS"
        title="Photography"
        text="The puja photos on PujaNow come from Wikimedia Commons. We thank the photographers for sharing their work."
      />
      <div className="content-card">
        <ul className="credit-list">
          {photoCredits.map((c) => (
            <li key={c.id}>
              <b>{c.usedFor}</b>
              <span>
                “{c.title}” by {c.author}, licensed under{" "}
                {c.licenseUrl ? (
                  <a href={c.licenseUrl} target="_blank" rel="noopener noreferrer">
                    {c.license}
                  </a>
                ) : (
                  c.license
                )}
                .{" "}
                <a href={c.source} target="_blank" rel="noopener noreferrer">
                  View the original
                </a>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}

export function InfoPage({ page }: { page: Page }) {
  const { settings } = useStore()
  const info = infoPages[page]!
  return (
    <main className="page-shell">
      <PageTitle overline={info.overline} title={info.title} text={info.text} />
      <div className="content-card">
        {info.sections.map(([heading, body]) => (
          <div key={heading}>
            <h2>{heading}</h2>
            <p>{body.replace(SUPPORT_PHONE, settings.phone)}</p>
          </div>
        ))}
      </div>
    </main>
  )
}
