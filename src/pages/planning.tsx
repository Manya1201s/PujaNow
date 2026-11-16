import { useState, type FormEvent } from "react"
import { addDays, CITIES, fmtDay, fmtLong, fromISO, inr, todayISO, toISO } from "../data"
import { totalsFor, useStore } from "../store"
import { Badge, Icon } from "../ui"

const intents: [string, string][] = [
  ["We’re moving into a new home", "griha-pravesh"],
  ["Starting a new business", "ganesh"],
  ["Praying for family wellbeing", "mahamrityunjaya"],
  ["Celebrating a birthday or anniversary", "satyanarayan"],
]

const keywordMatches: [RegExp, string][] = [
  [/home|house|griha|flat|apartment|moving|move/i, "griha-pravesh"],
  [/business|shop|office|job|venture|startup|ganesh/i, "ganesh"],
  [/health|ill|sick|recover|wellbeing|healing|surgery/i, "mahamrityunjaya"],
  [/birthday|anniversary|gratitude|thank/i, "satyanarayan"],
  [/diwali|dhanteras|wealth|lakshmi|money|abundance/i, "lakshmi"],
  [/navratri|durga|festival/i, "durga"],
  [/ancestor|shraddh|pitru|remembrance|passed away/i, "pitru-shraddh"],
  [/planet|navgraha|graha|dosha|stars?\b/i, "navgraha"],
]

const pujaFor = (text: string) =>
  intents.find(([label]) => label === text)?.[1] ??
  keywordMatches.find(([pattern]) => pattern.test(text))?.[1] ??
  "satyanarayan"

function parseDate(text: string) {
  const match = /(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*|(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(\d{1,2})/i.exec(text)
  if (!match) return null
  const day = Number(match[1] ?? match[4])
  const name = (match[2] ?? match[3]).toLowerCase()
  const month = "janfebmaraprmayjunjulaugsepoctnovdec".indexOf(name) / 3
  const now = new Date()
  const candidate = new Date(now.getFullYear(), month, day)
  if (candidate.getMonth() !== month) return null
  if (toISO(candidate) < todayISO()) candidate.setFullYear(now.getFullYear() + 1)
  return toISO(candidate)
}

export function Assistant() {
  const { go, updateDraft, draft, pujas } = useStore()
  const [step, setStep] = useState(0)
  const [selected, setSelected] = useState("")
  const [text, setText] = useState("")
  const [hint, setHint] = useState("")
  const pujaId = selected ? pujaFor(selected) : draft.pujaId
  const puja = pujas.find((p) => p.id === pujaId)
  const suggested = addDays(39)

  const chooseIntent = (value: string) => {
    setSelected(value)
    setStep(1)
    updateDraft({ pujaId: pujaFor(value), intent: value })
  }
  const answer = (value: string, date: string | null) => {
    const city = CITIES.find((c) => value.toLowerCase().includes(c.toLowerCase()))
    updateDraft({ date, time: null, ...(city && city !== draft.city ? { city, address: city } : {}) })
    go("recommendation")
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const value = text.trim()
    if (!value) {
      setHint("Please type a few words so I can guide you.")
      return
    }
    setHint("")
    setText("")
    if (step === 0) chooseIntent(value)
    else answer(value, parseDate(value))
  }

  return (
    <main className="assistant-page">
      <div className="assistant-top">
        <button type="button" className="back-link" onClick={() => go("home")}>
          <Icon name="back" size={18} /> Back
        </button>
        <span>Your conversation is private</span>
      </div>
      <div className="assistant-panel">
        <div className="assistant-identity">
          <div>
            <span className="overline">PUJANOW ASSISTANT</span>
            <h1>Namaste, how can I help?</h1>
          </div>
        </div>
        <p className="assistant-intro">
          You don’t need to know the name of a puja. Simply tell me what’s
          happening in your life, and I’ll guide you thoughtfully.
        </p>
        <div className="chat-bubble ai">
          What occasion or intention would you like to plan a puja for?
        </div>
        {step > 0 && (
          <>
            <div className="chat-bubble me">{selected}</div>
            <div className="chat-bubble ai">
              {pujaId === "griha-pravesh"
                ? "That’s a wonderful milestone. When are you planning to move, and which city is your new home in?"
                : `Thank you for sharing. A ${puja?.name} could be very meaningful here. When would you like to hold it, and in which city?`}
            </div>
          </>
        )}
        <div className="prompt-grid">
          {step === 0
            ? intents.map(([x]) => (
                <button type="button" key={x} onClick={() => chooseIntent(x)}>
                  {x}
                  <Icon name="chevron" size={17} />
                </button>
              ))
            : [
                [`${fmtDay(suggested)}, ${draft.city}`, suggested],
                ["Sometime next month", null],
                ["I need help choosing a date", null],
              ].map(([label, date]) => (
                <button type="button" key={label} onClick={() => answer(label!, date)}>
                  {label}
                  <Icon name="chevron" size={17} />
                </button>
              ))}
        </div>
        <form className="chat-input" onSubmit={submit}>
          <input
            placeholder={step === 0 ? "Or describe it in your own words…" : "For example: 14 December, Gurugram"}
            aria-label="Your message"
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setHint("")
            }}
          />
          <button type="submit" aria-label="Send">
            <Icon name="arrow" />
          </button>
        </form>
        {hint && (
          <span className="field-error" role="alert">
            {hint}
          </span>
        )}
      </div>
    </main>
  )
}

export function Recommendation() {
  const store = useStore()
  const { go, draft } = store
  const { puja } = totalsFor(store)
  const when = draft.date
    ? fromISO(draft.date).toLocaleDateString("en-GB", { month: "long" })
    : "the coming weeks"
  const low = puja.price
  const high = Math.round(puja.price * 1.67)
  return (
    <main className="recommendation-page">
      <div className="progress-line">
        <span className="active" />
        <span className="active" />
        <span />
      </div>
      <div className="recommendation-head">
        <span className="overline">YOUR RECOMMENDATION</span>
        <h1>{puja.name}</h1>
        <p>
          Based on your occasion in {draft.city} and your plans for {when}, this
          is the most meaningful ceremony for your family.
        </p>
      </div>
      <div className="recommendation-card">
        <div className="reco-image">
          <img src={puja.image} alt="Traditional puja preparation" />
          <Badge tone="gold">96% match</Badge>
        </div>
        <div className="reco-copy">
          <h2>{puja.meta}</h2>
          <p>{puja.about}</p>
          <div className="reco-facts">
            <div>
              <Icon name="clock" />
              <span>
                Duration<b>{puja.time.replace("hrs", "hours")}</b>
              </span>
            </div>
            <div>
              <Icon name="calendar" />
              <span>
                Best timing<b>{draft.date ? fmtLong(draft.date) : "Flexible"}</b>
              </span>
            </div>
            <div>
              <Icon name="money" />
              <span>
                Estimated cost<b>{inr(low)}–{inr(high)}</b>
              </span>
            </div>
          </div>
          <h3>Your puja will include</h3>
          <div className="inline-checks">
            {puja.included.slice(0, 4).map((x) => (
              <span key={x}>
                <Icon name="check" />
                {x}
              </span>
            ))}
          </div>
          <button type="button" className="button" onClick={() => go("plan")}>
            Create my puja plan <Icon name="arrow" size={18} />
          </button>
          <button type="button" className="text-link" onClick={() => go("explore")}>
            Explore other options
          </button>
        </div>
      </div>
    </main>
  )
}

export function PujaPlan() {
  const store = useStore()
  const { go, draft, profile } = store
  const t = totalsFor(store)
  const family = profile.name.trim().split(/\s+/).pop()?.toUpperCase()
  const scheduled = Boolean(draft.date && draft.time)
  const steps = [
    {
      title: "Choose an auspicious time",
      text: scheduled ? `${fmtLong(draft.date!)} at ${draft.time}` : draft.date ? `${fmtLong(draft.date)}. Pick a time to continue.` : "Select a recommended muhurat for your puja.",
      action: scheduled ? "Change date & time" : "Select date & time",
      page: "booking" as const,
      done: scheduled,
    },
    {
      title: "Select your pandit",
      text: `${t.pandit.name} is selected. You can compare other verified experts.`,
      action: "View pandits",
      page: "pandits" as const,
      done: true,
    },
    {
      title: "Add your samagri",
      text: t.items.length ? t.items.map((x) => x.name).join(", ") : "Choose a complete kit or use our guided checklist.",
      action: "View samagri",
      page: "samagri" as const,
      done: t.items.length > 0,
    },
    {
      title: "Review and confirm",
      text: "Check your details and send your request. You pay only after your pandit accepts.",
      action: "Review booking",
      page: "checkout" as const,
      done: false,
    },
  ]
  const current = steps.findIndex((s) => !s.done)
  return (
    <main className="page-shell plan-page">
      <div className="plan-header">
        <div>
          <span className="overline">PERSONALISED FOR THE {family} FAMILY</span>
          <h1>Your {t.puja.name.replace(" Puja", "")} plan</h1>
          <p>
            {draft.date ? fmtLong(draft.date) : "Date to be selected"} · {draft.city} · {draft.familySize} family members
          </p>
        </div>
        <Badge>{scheduled ? "Plan ready" : "Plan in progress"}</Badge>
      </div>
      <div className="plan-layout">
        <div>
          {steps.map((x, i) => (
            <div className="plan-step" key={x.title}>
              <span className={i === current ? "current" : ""}>
                {x.done ? <Icon name="check" size={16} /> : i + 1}
              </span>
              <div>
                <h3>{x.title}</h3>
                <p>{x.text}</p>
              </div>
              <button type="button" onClick={() => go(x.page)}>
                {x.action} <Icon name="arrow" size={16} />
              </button>
            </div>
          ))}
        </div>
        <aside className="plan-summary">
          <h3>Your estimated total</h3>
          <div>
            <span>Pandit dakshina</span>
            <b>{inr(t.dakshina)}</b>
          </div>
          <div>
            <span>Samagri</span>
            <b>{inr(t.samagri)}</b>
          </div>
          <div>
            <span>Platform assurance</span>
            <b>{inr(t.fee)}</b>
          </div>
          <hr />
          <div className="total">
            <span>Estimated total</span>
            <b>{inr(t.total)}</b>
          </div>
          <p>You pay only after your pandit accepts. Payment is demo-only.</p>
          <div className="safe-note">
            <Icon name="shield" />
            <span>
              <b>PujaNow assurance</b>Verified pandit and support from planning
              to completion.
            </span>
          </div>
        </aside>
      </div>
    </main>
  )
}
