// Shared browser helpers for the end-to-end tests.
import { chromium } from "playwright-core"
import { pathFor } from "../../src/routes.ts"

export const BASE = process.env.E2E_BASE_URL ?? "http://localhost:8444"
export const KEY = "pujanow.demo.v1"
// Uses a browser already on the machine. Set E2E_BROWSER=chrome to use Chrome instead of Edge.
export const CHANNEL = process.env.E2E_BROWSER ?? "msedge"

export async function launch(viewport = { width: 1440, height: 1000 }) {
  const browser = await chromium.launch({ channel: CHANNEL, headless: true })
  const ctx = await browser.newContext({ viewport, acceptDownloads: true })
  // Remote images, fonts and map tiles are skipped so the tests are fast, work offline,
  // and send no automated traffic to OpenStreetMap's tile servers or to Wikimedia.
  await ctx.route(/images\.unsplash\.com|fonts\.g|openstreetmap\.org|leafletjs\.com|wikimedia\.org|creativecommons\.org/, (r) => r.abort())
  const page = await ctx.newPage()
  const errors = []
  page.on("console", (m) => {
    if (m.type() === "error" && !/ERR_FAILED|Failed to load resource/.test(m.text())) errors.push(m.text())
  })
  page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message))
  return { browser, ctx, page, errors }
}

export const urlFor = ({ page = "home", role = "customer", pujaId = "griha-pravesh", panditId = "raghav", bookingId = "PN-2412-0836" } = {}) =>
  BASE + pathFor(page, role, { pujaId, panditId, bookingId })

/**
 * Writes saved data while the app is not loaded. A running app saves its own state and could
 * overwrite a change made underneath it, so this uses a static file on the same site.
 * Accepts a whole saved string, or fields to merge into what is saved.
 */
export async function writeState(page, change) {
  await page.goto(BASE + "/favicon.png")
  await page.evaluate(([k, change]) => {
    if (typeof change === "string") localStorage.setItem(k, change)
    else localStorage.setItem(k, JSON.stringify({ ...JSON.parse(localStorage.getItem(k) ?? "{}"), ...change }))
  }, [KEY, change])
}

/** Starts from fresh sample data, optionally applying saved state and opening a page's URL. */
export async function open(page, patch = {}) {
  await page.goto(BASE + "/")
  await page.evaluate((k) => localStorage.removeItem(k), KEY)
  await page.reload()
  await page.waitForSelector("#root > *")
  const { page: target, bookingId, ...saved } = patch
  await page.waitForFunction((k) => localStorage.getItem(k), KEY)
  await writeState(page, saved)
  await page.goto(urlFor({ page: target ?? "home", role: saved.role ?? "customer", bookingId }))
  await page.waitForSelector("#root > *")
}

/** A small pass and fail reporter. Exits non-zero when anything fails. */
export function reporter(errors, name) {
  const results = []
  return {
    check(label, ok, extra = "") {
      results.push({ label, ok: Boolean(ok) })
      console.log(`${ok ? "PASS" : "FAIL"}  ${label}${extra !== "" ? "  -> " + extra : ""}`)
    },
    section: (s) => console.log(`\n== ${s}`),
    finish() {
      const failed = results.filter((r) => !r.ok)
      console.log(`\n${name}: ${results.length - failed.length}/${results.length} checks passed`)
      if (failed.length) console.log("FAILED:\n" + failed.map((f) => "  " + f.label).join("\n"))
      console.log(`Console errors: ${errors.length}`)
      for (const e of [...new Set(errors)].slice(0, 10)) console.log("  " + e.slice(0, 280))
      process.exitCode = failed.length || errors.length ? 1 : 0
    },
  }
}

const hash = (s) => {
  let h = 7
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h
}
export const hashOf = hash
export const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
export const isBusy = (panditId, date) => hash(panditId + date) % 6 === 0
