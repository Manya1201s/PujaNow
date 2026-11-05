// Dead-control audit against the production build: on every page, click each visible control once
// and flag any that changes nothing. Results are written as it goes.
import fs from "node:fs"
import { BASE, CHANNEL, KEY, urlFor } from "./helpers.mjs"
import { chromium } from "playwright-core"

const mobile = process.argv[2] === "mobile"
const viewport = mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }
fs.mkdirSync(new URL("./artifacts/", import.meta.url), { recursive: true })
const out = new URL(`./artifacts/audit-${mobile ? "mobile" : "desktop"}.log`, import.meta.url)
fs.writeFileSync(out, "")
const log = (s) => {
  fs.appendFileSync(out, s + "\n")
  console.log(s)
}

const customerPublic = ["home", "explore", "puja", "assistant", "recommendation", "plan", "pandits", "pandit-profile", "booking", "emergency", "samagri", "login", "register", "partner", "onboarding", "about", "trust", "help", "privacy", "terms", "refunds"]
const targets = [
  ...customerPublic.map((p) => ["customer", p, false]),
  ...["checkout", "payment", "confirmation", "dashboard", "bookings", "messages", "profile"].map((p) => ["customer", p, true]),
  ...["dashboard", "requests", "upcoming", "completed", "earnings", "reviews", "profile"].map((p) => ["pandit", p, true]),
  ...["admin-overview", "customers", "pandit-management", "admin-verification", "catalogue", "booking-management", "payments", "commission", "complaints", "reports", "settings"].map((p) => ["admin", p, true]),
]
const soon = { date: new Date(Date.now() + 864e5 * 20).toISOString().slice(0, 10), time: "9:40 AM" }
const SEL = 'button:not([disabled]), [role="button"], a[href], input[type="radio"], input[type="checkbox"], summary'

const browser = await chromium.launch({ channel: CHANNEL, headless: true })
const ctx = await browser.newContext({ viewport, acceptDownloads: true })
await ctx.route(/images\.unsplash\.com|fonts\.g/, (r) => r.abort())
const errors = []
let page

async function newPage() {
  if (page) await page.close().catch(() => {})
  page = await ctx.newPage()
  page.setDefaultTimeout(8000)
  page.on("console", (m) => {
    if (m.type() === "error" && !/ERR_FAILED|Failed to load resource/.test(m.text())) errors.push(m.text())
  })
  page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message))
}
await newPage()
await page.goto(BASE + "/")
await page.waitForSelector("#root > *")
await page.waitForTimeout(200)
const seed = await page.evaluate((k) => localStorage.getItem(k), KEY)

async function prepare(role, name, signedIn) {
  const s = JSON.parse(seed)
  Object.assign(s, { role, signedIn })
  if (name === "checkout") Object.assign(s.draft, soon)
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, JSON.stringify(s)])
  await page.goto(urlFor({ page: name, role, bookingId: name === "payment" ? "PN-2501-0104" : "PN-2412-0836" }))
  await page.waitForSelector("#root > *")
}

// Clicks that rightly change nothing: a link to the page you are on, or Send with an empty box.
const EXPECTED = new Set([
  "customer/home|PujaNow home", "customer/explore|Explore pujas", "customer/pandits|Find a pandit", "customer/samagri|Samagri",
  "customer/about|About PujaNow", "customer/trust|Trust & safety", "customer/help|Help centre", "customer/privacy|Privacy", "customer/terms|Terms", "customer/refunds|Refund policy",
  "customer/messages|Send message", "pandit/dashboard|PujaNow home", "admin/admin-overview|PujaNow home",
])

const snapshot = () =>
  page.evaluate((k) => JSON.stringify([document.body.innerHTML, localStorage.getItem(k), location.href, scrollY]), KEY)

const visibleControls = () =>
  page.locator(SEL).evaluateAll((els) =>
    els
      .map((e, i) => {
        const r = e.getBoundingClientRect()
        const st = getComputedStyle(e)
        return {
          i,
          visible: r.width > 0 && r.height > 0 && st.visibility !== "hidden" && st.display !== "none",
          checked: e.checked === true,
          current: e.classList.contains("active") || e.classList.contains("selected") || e.getAttribute("aria-pressed") === "true" || e.getAttribute("aria-selected") === "true",
          inSidebar: Boolean(e.closest(".sidebar")),
          label: (e.getAttribute("aria-label") || e.textContent || e.type || "").trim().slice(0, 40),
        }
      })
      .filter((x) => x.visible),
  )

let clicks = 0
let expected = 0
const dead = []
for (const [role, name, signedIn] of targets) {
  await prepare(role, name, signedIn)
  const controls = await visibleControls()
  let pageDead = 0
  for (const c of controls) {
    try {
      await prepare(role, name, signedIn)
      // On phones the sidebar slides in, so open it the way a person would.
      if (mobile && c.inSidebar) {
        await page.locator(".app-topbar > .menu-button").click()
        await page.waitForTimeout(260)
      }
      const el = page.locator(SEL).nth(c.i)
      await el.scrollIntoViewIfNeeded()
      const before = await snapshot()
      // Clicking a radio that is already selected is correctly a no-op.
      if (c.checked && (await el.getAttribute("type")) === "radio") continue
      await el.click({ timeout: 2500 })
      clicks++
      await page.waitForTimeout(80)
      if ((await snapshot()) === before) {
        if (c.current || EXPECTED.has(`${role}/${name}|${c.label}`)) expected++
        else {
          dead.push(`${role}/${name}: "${c.label}" did nothing`)
          pageDead++
        }
      }
    } catch (e) {
      dead.push(`${role}/${name}: "${c.label}" could not be clicked (${e.message.split("\n")[0].slice(0, 90)})`)
      pageDead++
      await newPage()
      await page.goto(BASE + "/")
    }
  }
  log(`${role}/${name}: ${controls.length} controls, ${pageDead} dead`)
}
log(`\nAudit (${viewport.width}px): ${targets.length} pages, ${clicks} clicks, ${expected} expected no-ops, ${dead.length} dead controls`)
for (const d of dead) log("  DEAD " + d)
log(`Console errors: ${errors.length}`)
for (const e of [...new Set(errors)].slice(0, 15)) log("  " + e.slice(0, 300))
await browser.close()
process.exitCode = dead.length || errors.length ? 1 : 0
