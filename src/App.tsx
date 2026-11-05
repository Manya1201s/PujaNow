import { Component, useState, type ReactNode } from "react"
import { infoPages, type Page } from "./data"
import { Assistant, PujaPlan, Recommendation } from "./pages/planning"
import { adminNav, AdminDashboard } from "./pages/admin"
import { GenericAuth, Login, Onboarding } from "./pages/auth"
import { Booking, Checkout, Confirmation, Payment } from "./pages/booking"
import { Explore, InfoPage, PujaDetails, Samagri } from "./pages/catalogue"
import { CustomerDashboard } from "./pages/customer"
import { panditNav, PanditDashboard } from "./pages/pandit"
import { Emergency, FindPandit, PanditProfile } from "./pages/pandits"
import { clearSavedData, DASHBOARD_PAGES, StoreProvider, useStore } from "./store"
import { Brand, Icon, PageTitle, PanditCard, PujaCard, Rating, Toasts } from "./ui"

const heroImage =
  "https://images.unsplash.com/photo-1730130596425-197566414dc4?auto=format&fit=crop&w=1400&q=88"

function Header({ go }: { go: (p: Page) => void }) {
  const { signedIn, profile } = useStore()
  const [open, setOpen] = useState(false)
  const account = () => go(signedIn ? "dashboard" : "login")
  const accountLabel = signedIn ? profile.name.split(" ")[0] : "Sign in"
  return (
    <header className="site-header">
      <div className="header-inner">
        <Brand />
        <nav className={open ? "open" : ""}>
          <button
            onClick={() => {
              go("explore")
              setOpen(false)
            }}
          >
            Explore pujas
          </button>
          <button
            onClick={() => {
              go("pandits")
              setOpen(false)
            }}
          >
            Find a pandit
          </button>
          <button
            onClick={() => {
              go("samagri")
              setOpen(false)
            }}
          >
            Samagri
          </button>
          <button
            onClick={() => {
              go("assistant")
              setOpen(false)
            }}
          >
            AI Puja Assistant
          </button>
          <button
            className="nav-account"
            onClick={() => {
              account()
              setOpen(false)
            }}
          >
            {accountLabel}
          </button>
        </nav>
        <div className="header-actions">
          <button className="text-button" onClick={account}>
            <Icon name="user" size={18} /> {accountLabel}
          </button>
          <button className="button small" onClick={() => go("assistant")}>
            Plan a puja
          </button>
          <button
            className="menu-button"
            onClick={() => setOpen(!open)}
            aria-label="Open menu"
          >
            <Icon name={open ? "close" : "menu"} />
          </button>
        </div>
      </div>
    </header>
  )
}

function Home({ go }: { go: (p: Page) => void }) {
  const { pujas, pandits, openExplore } = useStore()
  const popular = pujas.filter((p) => p.popular && p.active).slice(0, 3)
  const featured = pandits.filter((p) => p.status === "Active").slice(0, 3)
  return (
    <>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="trust-pill">
              <Icon name="shield" size={16} /> Trusted by 12,000+ families
            </div>
            <h1>
              Every sacred moment,
              <br />
              <em>beautifully planned.</em>
            </h1>
            <p>
              From choosing the right puja to finding a verified pandit and
              arranging every samagri — PujaNow brings it all together.
            </p>
            <div className="hero-actions">
              <button className="button" onClick={() => go("assistant")}>
                Help me choose a puja <Icon name="arrow" size={18} />
              </button>
              <button
                className="button secondary"
                onClick={() => go("pandits")}
              >
                Find a pandit
              </button>
            </div>
            <div className="hero-proof">
              <div className="avatar-stack">
                <span>AS</span>
                <span>RK</span>
                <span>NM</span>
                <span>+2k</span>
              </div>
              <Rating value="4.9" />
              <span>based on 2,400+ bookings</span>
            </div>
          </div>
          <div className="hero-visual">
            <img
              src={heroImage}
              alt="Indian family celebrating a puja at home"
            />
            <div className="floating-card top">
              <span className="float-icon">
                <Icon name="check" />
              </span>
              <div>
                <b>Booking confirmed</b>
                <span>Griha Pravesh · 24 Nov</span>
              </div>
            </div>
            <div className="floating-card bottom">
              <div className="float-avatar">RS</div>
              <div>
                <b>Acharya Raghav</b>
                <span>
                  <Rating value="4.9" /> · Verified
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="occasion-strip">
          <span>What are you planning?</span>
          {[
            "Moving into a new home",
            "A new beginning",
            "Family wellbeing",
            "Festival or occasion",
          ].map((x, i) => (
            <button
              key={x}
              onClick={() => (i === 0 ? go("assistant") : openExplore(["New beginnings", "Wellbeing", "Festivals"][i - 1]))}
            >
              <Icon
                name={
                  i === 0
                    ? "location"
                    : i === 1
                      ? "fire"
                      : i === 2
                        ? "heart"
                        : "calendar"
                }
                size={19}
              />
              {x}
              <Icon name="chevron" size={16} />
            </button>
          ))}
          <button className="urgent-link" onClick={() => go("emergency")}>
            <Icon name="clock" size={19} />
            Need a pandit today
            <Icon name="chevron" size={16} />
          </button>
        </section>

        <section className="section">
          <div className="section-heading">
            <div>
              <span className="overline">POPULAR PUJAS</span>
              <h2>Thoughtfully planned for every occasion</h2>
              <p>
                Clear inclusions, transparent pricing, and expert guidance at
                every step.
              </p>
            </div>
            <button className="link-button" onClick={() => go("explore")}>
              View all pujas <Icon name="arrow" size={17} />
            </button>
          </div>
          <div className="card-grid">
            {popular.map((p) => (
              <PujaCard key={p.id} item={p} />
            ))}
          </div>
        </section>

        <section className="assistant-promo">
          <div>
            <span className="overline light">PUJANOW AI ASSISTANT</span>
            <h2>Not sure which puja is right?</h2>
            <p>
              Tell us about your occasion in your own words. Our assistant will
              recommend the most meaningful puja and create a plan tailored to
              your family.
            </p>
            <button className="button light" onClick={() => go("assistant")}>
              Start a guided conversation <Icon name="arrow" size={18} />
            </button>
          </div>
          <div className="chat-preview">
            <div className="mini-chat">
              <span className="mini-brand">P</span>
              <p>
                Namaste, I’m here to help. What occasion are you planning for?
              </p>
            </div>
            <div className="mini-chat user">
              <p>We’re moving into our first home in December.</p>
            </div>
            <div className="typing">
              <i />
              <i />
              <i />
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-heading">
            <div>
              <span className="overline">TRUSTED EXPERTS</span>
              <h2>Verified pandits, chosen with care</h2>
              <p>
                Every pandit is identity-verified and personally reviewed by our
                team.
              </p>
            </div>
            <button className="link-button" onClick={() => go("pandits")}>
              Browse all pandits <Icon name="arrow" size={17} />
            </button>
          </div>
          <div className="pandit-grid">
            {featured.map((p) => (
              <PanditCard key={p.id} item={p} />
            ))}
          </div>
        </section>

        <section className="how-section">
          <span className="overline">SIMPLE BY DESIGN</span>
          <h2>Your puja, planned in three easy steps</h2>
          <div className="steps">
            {[
              [
                "01",
                "Share your occasion",
                "Tell us what you’re celebrating or seeking guidance for.",
              ],
              [
                "02",
                "Choose your pandit",
                "Compare verified experts, languages, experience and pricing.",
              ],
              [
                "03",
                "We handle the details",
                "Confirm your booking and add complete samagri in one place.",
              ],
            ].map((x) => (
              <div className="step" key={x[0]}>
                <span>{x[0]}</span>
                <h3>{x[1]}</h3>
                <p>{x[2]}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer go={go} />
    </>
  )
}

function Footer({ go }: { go: (p: Page) => void }) {
  return (
    <footer>
      <div className="footer-main">
        <div>
          <Brand inverse />
          <p>
            Puja planning. Trusted pandits.
            <br />
            One simple booking.
          </p>
        </div>
        <div>
          <b>Discover</b>
          <button onClick={() => go("explore")}>Explore pujas</button>
          <button onClick={() => go("pandits")}>Find a pandit</button>
          <button onClick={() => go("samagri")}>Puja samagri</button>
        </div>
        <div>
          <b>Company</b>
          <button onClick={() => go("about")}>About PujaNow</button>
          <button onClick={() => go("trust")}>Trust & safety</button>
          <button onClick={() => go("help")}>Help centre</button>
        </div>
        <div>
          <b>For pandits</b>
          <button onClick={() => go("partner")}>Become a partner</button>
          <button onClick={() => go("login")}>Partner login</button>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 PujaNow Technologies Pvt. Ltd.</span>
        <span className="footer-links">
          <button onClick={() => go("privacy")}>Privacy</button> ·{" "}
          <button onClick={() => go("terms")}>Terms</button> ·{" "}
          <button onClick={() => go("refunds")}>Refund policy</button>
        </span>
      </div>
    </footer>
  )
}

function PartnerLanding({ go }: { go: (p: Page) => void }) {
  const { enterRole } = useStore()
  return (
    <main className="partner-page">
      <header>
        <Brand inverse />
        <button
          className="button light small"
          onClick={() => enterRole("pandit")}
        >
          Partner login
        </button>
      </header>
      <div className="partner-hero">
        <span className="overline light">GROW WITH PUJANOW</span>
        <h1>
          Focus on your seva.
          <br />
          We’ll help grow your reach.
        </h1>
        <p>
          Join India’s trusted network of verified pandits. Receive quality
          bookings, manage your schedule and get secure, timely payouts.
        </p>
        <button className="button light" onClick={() => go("onboarding")}>
          Become a PujaNow partner <Icon name="arrow" size={18} />
        </button>
        <div className="partner-stats">
          <span>
            <b>2,500+</b>verified partners
          </span>
          <span>
            <b>₹42k</b>average monthly earnings
          </span>
          <span>
            <b>50+</b>cities across India
          </span>
        </div>
      </div>
      <section className="partner-benefits">
        <PageTitle
          overline="BUILT FOR YOUR PRACTICE"
          title="Everything you need, in one place"
        />
        <div className="benefit-grid">
          {[
            [
              "calendar",
              "Bookings that fit your schedule",
              "Set your availability and accept the requests that work for you.",
            ],
            [
              "money",
              "Reliable, timely payouts",
              "Transparent earnings with secure weekly bank payouts.",
            ],
            [
              "shield",
              "A profile families trust",
              "Build credibility through verification, reviews and your experience.",
            ],
          ].map((x) => (
            <div key={x[0]}>
              <span>
                <Icon name={x[0]} />
              </span>
              <h3>{x[1]}</h3>
              <p>{x[2]}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

const headerlessPages: Page[] = ["assistant", "recommendation", "login", "register", "partner", "onboarding", "checkout", "confirmation", "payment"]
const customerPages: Page[] = ["home", "explore", "puja", "assistant", "recommendation", "plan", "pandits", "pandit-profile", "booking", "checkout", "payment", "confirmation", "samagri", "emergency", "login", "register", "partner", "onboarding", ...DASHBOARD_PAGES]

function NotFound() {
  const { goHome } = useStore()
  return (
    <main className="simple-page">
      <div className="simple-card">
        <Brand />
        <span className="overline">PAGE NOT FOUND</span>
        <h1>We couldn’t find that page</h1>
        <p>The link may be out of date, or the page may have moved.</p>
        <button type="button" className="button full" onClick={goHome}>
          Go back
        </button>
      </div>
    </main>
  )
}

function Routes() {
  const { role, page: saved, go, signedIn, activePanditId } = useStore()
  if (saved === "not-found") return <NotFound />
  if (role === "pandit") {
    return <PanditDashboard key={activePanditId} page={panditNav.some((x) => x.page === saved) ? saved : "dashboard"} />
  }
  if (role === "admin") {
    return <AdminDashboard page={adminNav.some((x) => x.page === saved) ? saved : "admin-overview"} />
  }
  const isInfo = Boolean(infoPages[saved])
  const known = customerPages.includes(saved) || isInfo ? saved : "home"
  // A saved or back-button page can point at an account page after signing out.
  const page = DASHBOARD_PAGES.includes(known) && !signedIn ? "login" : known
  return (
    <>
      {!DASHBOARD_PAGES.includes(page) && !headerlessPages.includes(page) && <Header go={go} />}
      {page === "home" && <Home go={go} />}
      {page === "explore" && <Explore />}
      {page === "puja" && <PujaDetails />}
      {page === "assistant" && <Assistant />}
      {page === "recommendation" && <Recommendation />}
      {page === "plan" && <PujaPlan />}
      {page === "pandits" && <FindPandit />}
      {page === "pandit-profile" && <PanditProfile />}
      {page === "booking" && <Booking />}
      {page === "checkout" && <Checkout />}
      {page === "payment" && <Payment />}
      {page === "confirmation" && <Confirmation />}
      {page === "samagri" && <Samagri />}
      {page === "emergency" && <Emergency />}
      {page === "login" && <Login />}
      {page === "register" && <GenericAuth />}
      {page === "partner" && <PartnerLanding go={go} />}
      {page === "onboarding" && <Onboarding />}
      {DASHBOARD_PAGES.includes(page) && <CustomerDashboard key={page} page={page} />}
      {isInfo && (
        <>
          <InfoPage page={page} />
          <Footer go={go} />
        </>
      )}
    </>
  )
}

/** Shows a way back instead of a blank page if something unexpected breaks. */
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="simple-page">
        <div className="simple-card">
          <span className="overline">SOMETHING WENT WRONG</span>
          <h1>We couldn’t open this page</h1>
          <p>Your saved demo data may be out of date. Resetting it restores the original sample data.</p>
          <button
            className="button full"
            onClick={() => {
              clearSavedData()
              location.reload()
            }}
          >
            Reset demo data and reload
          </button>
        </div>
      </main>
    )
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <Routes />
        <Toasts />
      </StoreProvider>
    </ErrorBoundary>
  )
}
