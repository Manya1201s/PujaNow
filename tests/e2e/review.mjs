// Final stabilisation review: end-to-end flows, every route, persistence, and awkward paths.
import { BASE, hashOf as hash, isoDate as iso, KEY, launch, open, urlFor, writeState } from "./helpers.mjs"

const { browser, page, errors, ctx } = await launch()
page.setDefaultTimeout(9000)
const results = []
const check = (name, ok, extra = "") => {
  results.push({ name, ok: Boolean(ok) })
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra !== "" ? "  -> " + extra : ""}`)
}
const guard = async (name, fn) => {
  try {
    await fn()
  } catch (e) {
    check(`${name} (no crash)`, false, e.message.split("\n").slice(0, 2).join(" ").slice(0, 200))
  }
}
const section = (s) => console.log(`\n== ${s}`)
const btn = (name) => page.getByRole("button", { name, exact: true })
const has = async (s) => (await page.getByText(s, { exact: false }).count()) > 0
const state = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY)
// Saves state. When it names a page, the next reload opens that page's URL.
let nextUrl = null
const setState = async (p) => {
  const { page: target, ...saved } = p
  const back = page.url()
  await writeState(page, saved)
  nextUrl = target ? urlFor({ page: target, role: (await state()).role }) : back
}
const reload = async () => {
  await page.goto(nextUrl ?? page.url())
  nextUrl = null
  await page.waitForSelector("#root > *")
}
const field = (label) => page.getByLabel(new RegExp("^\\s*" + label.replace(/[()]/g, (c) => "\\" + c)))
const nav = (name) => page.locator(".sidebar nav button", { hasText: name }).click()
/** On the booking page: pick the first future date next month that has times. */
async function pickSlot() {
  await page.getByLabel("Next month").click()
  const days = page.locator(".calendar-grid button:not(:disabled):not(:empty)")
  const n = await days.count()
  for (let i = 8; i < n; i++) {
    await days.nth(i).click()
    if ((await page.locator(".time-slots button").count()) > 0) {
      await page.locator(".time-slots button").first().click()
      return
    }
  }
  throw new Error("no date with slots")
}
async function sendRequest() {
  await btn("Continue to details").click()
  await btn("Send booking request").click()
  await page.getByText("REQUEST SENT").waitFor()
}

section("A. Customer: puja selection to confirmation, every puja")
await open(page)
const pujaNames = (await state()).pujas.map((p) => p.name)
for (const name of pujaNames) {
  await guard(`booking ${name}`, async () => {
    await open(page, { page: "explore" })
    await page.locator(".puja-card", { hasText: name }).click()
    const detail = await page.locator(".detail-hero h1").textContent()
    await btn("Find an available pandit").click()
    const card = page.locator(".pandit-card").last()
    const panditName = await card.locator("h3").textContent()
    await card.getByRole("button", { name: "View profile" }).click()
    const shown = await page.locator(".profile-main h1").textContent()
    await btn("Check availability").click()
    await pickSlot()
    await sendRequest()
    // The pandit who was chosen accepts, then the customer pays.
    const s = await state()
    const id = s.bookings[0].id
    await setState({ role: "pandit", activePanditId: s.bookings[0].panditId, page: "requests" })
    await reload()
    await page.locator(".request-rows > div", { hasText: s.bookings[0].customer }).first().getByRole("button", { name: "Accept" }).click()
    await setState({ role: "customer" })
    nextUrl = urlFor({ page: "payment", bookingId: id })
    await reload()
    await field("UPI ID").fill("demo@upi")
    await page.getByRole("button", { name: /demo payment/ }).click()
    await page.getByText("DEMO BOOKING CONFIRMED").waitFor()
    const conf = await page.locator(".confirmation-card h2").textContent()
    const confPandit = await page.locator(".confirmation-grid span", { hasText: "Your pandit" }).locator("b").textContent()
    check(`${name}: details, profile and confirmation all match`, detail === name && shown === panditName && conf === name && confPandit === panditName, `${conf} with ${confPandit}`)
  })
}

section("B. Pandit: accept and reject")
await guard("pandit flow", async () => {
  await open(page, { role: "pandit", page: "requests", signedIn: true })
  check("sees 3 pending requests", await has("3 requests awaiting"))
  await page.locator(".request-rows > div", { hasText: "Meera" }).getByRole("button", { name: "Accept" }).click()
  await page.locator(".request-rows > div", { hasText: "Nikhil" }).getByRole("button", { name: "Decline" }).click()
  check("request count drops", await has("1 request awaiting"))
  await reload()
  check("decisions persist after refresh", await has("1 request awaiting"))
  const s = await state()
  const st = (who) => s.bookings.find((b) => b.customer === who && b.panditId === "raghav" && ["Griha Pravesh Puja", "Navgraha Shanti"].includes(b.pujaName) && b.id.startsWith("PN-2501")).status
  check("accepted awaits payment, rejected is Declined", st("Meera Kapoor") === "Awaiting payment" && st("Nikhil Gupta") === "Declined")
  await nav("Upcoming bookings")
  check("accepted is in Upcoming", (await page.locator("tbody tr", { hasText: "Meera Kapoor" }).count()) === 1)
  check("rejected is not in Upcoming", (await page.locator("tbody tr", { hasText: "Nikhil Gupta" }).count()) === 0)
  await setState({ role: "admin", page: "booking-management" })
  await reload()
  check("admin sees the rejection", (await page.locator("tbody tr", { hasText: "PN-2501-0103" }).textContent()).includes("Declined"))
  check("admin sees the acceptance", (await page.locator("tbody tr", { hasText: "PN-2501-0101" }).textContent()).includes("Awaiting payment"))
})

section("C. Admin: customers, pandits, bookings")
await guard("admin flow", async () => {
  await open(page, { role: "admin", page: "booking-management", signedIn: true })
  const row = page.locator("tbody tr", { hasText: "PN-2112-0618" })
  await row.getByRole("button", { name: "Cancel" }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Cancel booking" }).click()
  const cancelled = (await state()).bookings.find((b) => b.id === "PN-2112-0618")
  check("cancelling an unpaid booking records no refund", cancelled.status === "Cancelled" && cancelled.paymentStatus === "Not charged", cancelled.paymentStatus)
  await page.locator("tbody tr", { hasText: "PN-2412-0836" }).getByRole("button", { name: "Cancel" }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Cancel booking" }).click()
  await setState({ role: "customer", page: "bookings", signedIn: true })
  await reload()
  await btn("Closed").click()
  check("admin cancellation reaches the customer", await has("Griha Pravesh Puja"))

  await open(page, { role: "admin", page: "customers", signedIn: true })
  await page.locator("tbody tr", { hasText: "Ananya Sharma" }).getByRole("button", { name: "Suspend" }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Suspend" }).click()
  await setState({ role: "customer", page: "login", signedIn: false })
  await reload()
  await field("Email or phone number").fill("ananya.sharma@example.com")
  await field("Password").fill("password123")
  await btn("Sign in").click()
  check("suspended customer cannot sign in", await has("This account has been suspended"))
  await setState({ role: "admin", page: "customers" })
  await reload()
  await page.locator("tbody tr", { hasText: "Ananya Sharma" }).getByRole("button", { name: "Reactivate" }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Reactivate" }).click()
  check("customer can be reactivated", (await page.locator("tbody tr", { hasText: "Ananya Sharma" }).textContent()).includes("Active"))

  await open(page, { page: "register" })
  await field("Full name").fill("Sana Khan")
  await field("Phone number").fill("9812345678")
  await field("Email address").fill("sana@example.com")
  await field("Password").fill("longenough1")
  await btn("Create account").click()
  await page.getByText("Good morning, Sana").waitFor()
  check("new account does not show another customer's bookings", (await has("No upcoming pujas")) && !(await has("Griha Pravesh Puja")))
  await page.getByRole("button", { name: "Messages" }).click()
  check("new account does not see another customer's messages", !(await page.locator(".conversation-list").textContent()).includes("Acharya Raghav"))
  await setState({ role: "admin", page: "customers" })
  await reload()
  check("new account appears for admin", (await page.locator("tbody tr", { hasText: "Sana Khan" }).count()) === 1, `${page.url().replace(BASE, "")} role=${(await state()).role}`)

  await open(page, { role: "admin", page: "catalogue", signedIn: true })
  await btn("Add puja").click()
  await field("Puja name").fill("Vishwakarma Puja")
  await field("Short description").fill("For tools and craftsmanship")
  await field("Starting price (₹)").fill("2900")
  await field("Duration label").fill("2 hrs")
  await field("Duration in hours").fill("2")
  await page.getByRole("dialog").getByRole("button", { name: "Save puja" }).click()
  await setState({ role: "customer", page: "explore", signedIn: false })
  await reload()
  await page.locator(".puja-card", { hasText: "Vishwakarma" }).click()
  await btn("Find an available pandit").click()
  check("a newly added puja can be booked with a pandit", (await page.locator(".pandit-card").count()) > 0, `${await page.locator(".pandit-card").count()} pandits`)
})

section("D. Every role and page combination: blank or wrong pages")
await open(page)
const pages = ["home", "explore", "puja", "assistant", "recommendation", "plan", "pandits", "pandit-profile", "booking", "checkout", "confirmation", "dashboard", "bookings", "messages", "profile", "emergency", "samagri", "login", "register", "partner", "onboarding", "verification", "requests", "upcoming", "completed", "earnings", "reviews", "admin-overview", "customers", "pandit-management", "admin-verification", "catalogue", "booking-management", "payments", "commission", "complaints", "reports", "settings", "about", "trust", "help", "privacy", "terms", "refunds", "does-not-exist"]
const seedRaw = await page.evaluate((k) => localStorage.getItem(k), KEY)
let blank = [], wrongShell = [], combos = 0
const crashesBefore = errors.length
for (const role of ["customer", "pandit", "admin"]) {
  for (const signedIn of role === "customer" ? [false, true] : [true]) {
    await writeState(page, JSON.stringify({ ...JSON.parse(seedRaw), role, signedIn }))
    for (const p of pages) {
      const url = p === "does-not-exist" ? BASE + "/does-not-exist" : urlFor({ page: p, role })
      await page.goto(url)
      await page.waitForTimeout(40)
      combos++
      const r = await page.evaluate(() => ({
        text: document.querySelector("#root")?.innerText.trim().length ?? 0,
        h: !!document.querySelector("h1,h2"),
        shell: !!document.querySelector(".app-shell"),
        cls: document.querySelector(".app-shell")?.className ?? "",
        active: document.querySelectorAll(".sidebar nav button.active").length,
      }))
      if (r.text < 20 || !r.h) blank.push(`${role}/${signedIn}/${p}`)
      if (role !== "customer" && p !== "does-not-exist" && (!r.cls.includes(role) || r.active !== 1)) wrongShell.push(`${role}/${p}`)
    }
  }
}
check(`no blank page in ${combos} role and page combinations`, blank.length === 0, blank.join(", "))
check("pandit and admin always land on a page in their own dashboard", wrongShell.length === 0, wrongShell.join(", "))
check("no crash on any combination", errors.length === crashesBefore, errors.slice(crashesBefore, crashesBefore + 2).join(" | ").slice(0, 200))

section("E. Persistence after refresh")
await guard("persistence", async () => {
  await open(page, { signedIn: true, page: "messages" })
  await page.getByLabel("Write a message").fill("Persist this message")
  await page.getByLabel("Send message").click()
  await page.waitForTimeout(1800)
  await reload()
  check("page and sign-in restored", await has("Conversations"))
  check("message and its reply restored", (await page.locator(".message-space").textContent()).includes("Persist this message") && (await state()).threads[0].messages.length === 6)
  check("unread stays cleared", (await state()).threads[0].unread === 0)
  await page.getByRole("button", { name: "My profile" }).click()
  await field("Home address").fill("New Address, Gurugram 122001")
  await btn("Save changes").click()
  await reload()
  check("profile restored", (await field("Home address").inputValue()) === "New Address, Gurugram 122001")

  await open(page, { page: "booking" })
  await pickSlot()
  const when = await page.getByTestId("summary-when").textContent()
  await reload()
  check("selected date and time restored", (await page.getByTestId("summary-when").textContent()) === when, when)
  await btn("Continue to details").click()
  await reload()
  check("refresh on the details page keeps the booking", await has("Complete your booking"))

  await open(page, { page: "samagri" })
  await page.locator(".product-card", { hasText: "Brass" }).getByRole("button").click()
  await reload()
  check("samagri plan restored", await has("2 items in your plan"))

  await open(page, { role: "pandit", page: "earnings", signedIn: true })
  await btn("Withdraw balance").click()
  await page.getByRole("dialog").getByRole("button", { name: "Withdraw" }).click()
  await page.getByRole("switch").click()
  await reload()
  check("payout and availability restored", (await has("Nothing to withdraw")) && (await has("Not taking bookings")))
  await page.getByRole("button", { name: /Notifications/ }).click()
  await page.getByRole("menuitem").first().click()
  await reload()
  check("read notification restored", (await page.getByRole("button", { name: /Notifications, 1 unread/ }).count()) === 1)

  await open(page, { role: "admin", page: "catalogue", signedIn: true })
  await page.locator("tbody tr", { hasText: "Lakshmi" }).getByRole("button", { name: "Hide" }).click()
  await nav("Reviews & complaints")
  await page.locator("tbody tr", { hasText: "CM-1042" }).getByRole("button", { name: "Resolve" }).click()
  await page.getByLabel("Resolution note").fill("Sorted")
  await page.getByRole("dialog").getByRole("button", { name: "Mark resolved" }).click()
  await reload()
  check("complaint restored", (await page.locator("tbody tr", { hasText: "CM-1042" }).textContent()).includes("Resolved"))
  check("catalogue change restored", (await state()).pujas.find((p) => p.id === "lakshmi").active === false)

  const tab = await ctx.newPage()
  await tab.goto(page.url())
  await tab.waitForSelector("#root > *")
  check("data is there in a new tab", (await tab.locator("tbody tr", { hasText: "CM-1042" }).textContent()).includes("Resolved"))
  await tab.close()
})

section("F. Awkward paths")
await guard("pandit and puja mismatch", async () => {
  await open(page, { page: "pandits" })
  await page.locator(".pandit-card", { hasText: "Pandit Mohit" }).getByRole("button", { name: "View profile" }).click()
  await page.locator(".site-header").getByRole("button", { name: "Explore pujas" }).click()
  await page.locator(".puja-card", { hasText: "Narayan Bali" }).click()
  await page.evaluate(() => 0)
  await setState({ page: "plan" })
  await reload()
  check("plan never pairs a puja with a pandit who does not offer it", !(await has("Pandit Mohit Trivedi is selected")))
  await open(page)
  await setState({ draft: { ...(await state()).draft, pujaId: "narayan-bali" } })
  await reload()
  await page.locator(".pandit-card", { hasText: "Acharya Vivek" }).first().waitFor()
  const homeCard = page.locator(".pandit-card", { hasText: "Pandit Mohit" })
  await homeCard.getByRole("button", { name: "View profile" }).click()
  check("View profile always opens the pandit clicked", (await page.locator(".profile-main h1").textContent()) === "Pandit Mohit Trivedi")
})
await guard("suspended pandit in saved plan", async () => {
  await open(page, { page: "plan" })
  const s = await state()
  await setState({ pandits: s.pandits.map((p) => (p.id === "raghav" ? { ...p, status: "Suspended" } : p)) })
  await reload()
  check("a suspended pandit cannot stay selected", !(await has("Acharya Raghav Sharma is selected")))
  await page.getByRole("button", { name: /date & time/ }).click()
  await pickSlot()
  await sendRequest()
  check("booking does not go to the suspended pandit", (await state()).bookings[0].panditId !== "raghav", (await state()).bookings[0].panditName)
})
await guard("time stays valid", async () => {
  await open(page, {})
  const before = await state()
  const all = ["8:20 AM", "9:40 AM", "11:45 AM", "2:15 PM", "4:30 PM", "6:00 PM"]
  const offered = (date, id) => { if (hash(id + date) % 6 === 0) return []; const skip = hash(date + id) % 6; return all.filter((_, i) => i !== skip && i !== (skip + 3) % 6) }
  let found = null
  for (let i = 5; i < 60 && !found; i++) {
    const date = iso(new Date(Date.now() + 864e5 * i))
    const mine = offered(date, "raghav")
    if (!mine.length) continue
    for (const p of before.pandits.filter((p) => p.id !== "raghav" && p.pujaIds.includes("griha-pravesh"))) {
      const theirs = offered(date, p.id)
      const time = mine.find((t) => theirs.length && !theirs.includes(t))
      if (time) found = { date, time, other: p }
    }
  }
  await setState({ page: "pandits", draft: { ...before.draft, date: found.date, time: found.time } })
  await reload()
  await page.locator(".pandit-card", { hasText: found.other.name }).getByRole("button", { name: "View profile" }).click()
  await btn("Check availability").click()
  check("switching pandit drops a time they do not offer", !(await page.getByTestId("summary-when").textContent()).includes(found.time), await page.getByTestId("summary-when").textContent())
})
await guard("stale time at checkout", async () => {
  await open(page, {})
  let d = new Date(Date.now() + 864e5 * 3)
  while (hash("raghav" + iso(d)) % 6 !== 0) d.setDate(d.getDate() + 1)
  await setState({ page: "checkout", draft: { ...(await state()).draft, date: iso(d), time: "9:40 AM" } })
  await reload()
  await page.waitForTimeout(200)
  check("a saved slot that is no longer bookable cannot reach the request form", !(await has("Send booking request")))
})
await guard("busy date", async () => {
  let d = new Date()
  d.setDate(d.getDate() + 3)
  while (hash("raghav" + iso(d)) % 6 !== 0) d.setDate(d.getDate() + 1)
  await open(page, {})
  await setState({ page: "booking", draft: { ...(await state()).draft, date: iso(d), time: null } })
  await reload()
  check("a date the pandit is busy shows no times", (await page.locator(".time-slots button").count()) === 0, iso(d))
})
await guard("double request by refresh", async () => {
  await open(page, { page: "booking" })
  await pickSlot()
  await sendRequest()
  const count = (await state()).bookings.length
  await reload()
  await page.waitForTimeout(150)
  check("refresh after sending cannot send it again", !(await has("Send booking request")), (await page.locator("h1").first().textContent()))
  check("refresh keeps a single request", (await state()).bookings.length === count)
})
await guard("back after booking", async () => {
  await open(page, { page: "booking" })
  await pickSlot()
  await sendRequest()
  const after = page.url()
  await page.goBack()
  await page.waitForTimeout(200)
  check("Back after sending does not reopen the request form", !(await has("Send booking request")), page.url().replace(BASE, ""))
  await page.goBack()
  await page.waitForTimeout(200)
  check("Back keeps moving instead of being trapped", page.url() !== after, page.url().replace(BASE, ""))
})
await guard("back after paying", async () => {
  await open(page, { signedIn: true, page: "bookings" })
  await page.locator(".request-rows > div", { hasText: "Navgraha" }).getByRole("button", { name: "Pay now" }).click()
  await field("UPI ID").fill("demo@upi")
  await page.getByRole("button", { name: /demo payment/ }).click()
  await page.getByText("DEMO BOOKING CONFIRMED").waitFor()
  await page.goBack()
  await page.waitForTimeout(200)
  check("Back after paying shows the booking, not the payment form", !(await has("Complete demo payment")), page.url().replace(BASE, ""))
  await page.goBack()
  await page.waitForTimeout(200)
  check("a second Back reaches My bookings", page.url().endsWith("/account/bookings"), page.url().replace(BASE, ""))
})
await guard("profile to checkout", async () => {
  await open(page, { signedIn: true, page: "profile" })
  await field("Full name").fill("Ananya Kapoor")
  await btn("Save changes").click()
  const s = await state()
  check("profile edit reaches checkout details", s.draft.contact.name === "Ananya Kapoor")
  check("profile edit reaches admin customers", s.customers[0].name === "Ananya Kapoor")
})
await guard("duplicate email", async () => {
  await open(page, { page: "register" })
  await field("Full name").fill("Copy Cat")
  await field("Phone number").fill("9812345678")
  await field("Email address").fill("ananya.sharma@example.com")
  await field("Password").fill("longenough1")
  await btn("Create account").click()
  check("an email already in use cannot register again", await has("already exists"))
})
await guard("settings reach customers", async () => {
  await open(page, { page: "booking" })
  await setState({ settings: { ...(await state()).settings, phone: "+91 80471 99000", cancelWindow: "72 hours" } })
  await reload()
  await pickSlot()
  await btn("Continue to details").click()
  check("cancellation window from settings shown at checkout", await has("until 72 hours before"))
  await btn("Send booking request").click()
  await page.getByText("REQUEST SENT").waitFor()
  check("support phone from settings shown on the booking page", await has("+91 80471 99000"))
  await open(page, { signedIn: true, page: "payment", bookingId: "PN-2501-0104" })
  await field("UPI ID").fill("demo@upi")
  await field("UPI ID").press("Enter")
  await page.getByText("DEMO BOOKING CONFIRMED").waitFor()
  check("Enter submits the payment form", true)
})

section("F2. Photos")
await guard("photos", async () => {
  await open(page)
  const pages = ["/", "/pujas", "/samagri", "/pujas/vivah", "/pujas/rudrabhishek", "/plan", "/book"]
  const seen = []
  for (const path of pages) {
    await page.goto(BASE + path)
    await page.waitForSelector("#root > *")
    for (const img of await page.locator("main img").all()) await img.scrollIntoViewIfNeeded()
    await page.waitForFunction(() => [...document.querySelectorAll("main img")].every((i) => i.complete))
    const imgs = await page.locator("main img").evaluateAll((list) => list.map((i) => ({ src: i.getAttribute("src"), ok: i.naturalWidth > 0 })))
    const local = imgs.filter((i) => i.src.startsWith("/assets/"))
    check(`${path}: no broken local photos`, local.every((i) => i.ok), local.filter((i) => !i.ok).map((i) => i.src).join(", "))
    seen.push(...local.map((i) => i.src))
  }
  const samagri = await (async () => {
    await page.goto(BASE + "/samagri")
    await page.waitForSelector(".product-card")
    return page.locator(".product-card img").evaluateAll((l) => l.map((i) => i.getAttribute("src")))
  })()
  const cards = await (async () => {
    await page.goto(BASE + "/pujas")
    await page.waitForSelector(".puja-card")
    return page.locator(".puja-card img").evaluateAll((l) => l.map((i) => i.getAttribute("src")))
  })()
  check("samagri photos are not reused on puja cards", samagri.every((s) => !cards.includes(s)), samagri.join(", "))
  await page.goto(BASE + "/")
  await page.locator("footer").getByRole("button", { name: "Photo credits" }).click()
  check("the footer links to photo credits", page.url() === BASE + "/photo-credits")
  const items = page.locator(".credit-list li")
  check("every photo is credited", (await items.count()) === 14, String(await items.count()))
  check("credits name the author and licence", (await items.filter({ hasText: "Vivah Puja" }).textContent()).includes("CC BY-SA 4.0") && (await items.filter({ hasText: "Vivah Puja" }).textContent()).includes("Abhya2022"))
  check("credit links open in a new tab safely", (await page.locator(".credit-list a").evaluateAll((l) => l.every((a) => a.target === "_blank" && a.rel.includes("noopener")))))
  await open(page, { signedIn: true, page: "dashboard" })
  check("the dashboard banner shows the booked puja's own photo", (await page.locator(".upcoming-banner img").getAttribute("src")) === "/assets/pujas/griha-pravesh.jpg")
})
await guard("old saved data", async () => {
  await open(page)
  const s = await state()
  const old = s.pujas.filter((p) => !["rudrabhishek", "vivah"].includes(p.id)).map((p) => ({ ...p, image: "https://images.unsplash.com/old.jpg", price: p.id === "ganesh" ? 2700 : p.price }))
  await writeState(page, { pujas: old, pandits: s.pandits.map((p) => ({ ...p, pujaIds: p.pujaIds.filter((id) => !["rudrabhishek", "vivah"].includes(id)) })) })
  await page.goto(BASE + "/pujas")
  await page.waitForSelector(".puja-card")
  const after = await state()
  check("saved data from before gets the new photos", after.pujas.every((p) => p.image.startsWith("/assets/pujas/")))
  check("saved data from before gets the new pujas", after.pujas.some((p) => p.id === "vivah") && after.pujas.some((p) => p.id === "rudrabhishek"))
  check("admin changes in saved data are kept", after.pujas.find((p) => p.id === "ganesh").price === 2700)
  await page.goto(BASE + "/pujas/rudrabhishek")
  await btn("Find an available pandit").click()
  check("the new pujas have pandits to book", (await page.locator(".pandit-card").count()) > 0)
})

section("G. Time passing")
await guard("time travel", async () => {
  await open(page, { signedIn: true, page: "dashboard" })
  const future = new Date(Date.now() + 864e5 * 40)
  await ctx.clock.setFixedTime(future)
  await setState({ draft: { ...(await state()).draft, date: iso(new Date(Date.now() + 864e5)), time: "9:40 AM" } })
  await reload()
  const body = await page.locator("#root").innerText()
  check("no negative countdown 40 days later", !/IN -\d+ DAYS/.test(body))
  check("past booking is not shown as your next puja", !body.includes("YOUR NEXT PUJA"))
  const draft = (await state()).draft
  check("expired saved date is cleared", draft.date === null && draft.time === null, String(draft.date))
  await ctx.clock.setFixedTime(new Date())
  await open(page, { role: "pandit", page: "earnings", signedIn: true })
  await ctx.clock.setFixedTime(new Date("2027-03-10T01:00:00+05:30"))
  await reload()
  await btn("Withdraw balance").click()
  await page.getByRole("dialog").getByRole("button", { name: "Withdraw" }).click()
  check("payout date uses the local day", (await state()).payouts[0].date === "2027-03-10", (await state()).payouts[0].date)
  await ctx.clock.setFixedTime(new Date(new Date().setHours(23, 30, 0, 0)))
  await open(page, { page: "emergency" })
  await field("Puja or occasion").selectOption({ label: "Ganesh Puja" })
  await field("Locality").fill("DLF")
  await field("Phone number").fill("9812345678")
  await btn("Find available pandits now").click()
  await page.locator(".pandit-card").first().getByRole("button", { name: "View profile" }).click()
  await btn("Check availability").click()
  check("late at night the emergency flow explains there are no times today", await has("No more times are available"))
  await btn("Continue to details").click()
  check("and cannot continue without a time", await has("Please select a time slot"))
})
await ctx.close()

section("H. Damaged or unavailable storage")
const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
await ctx2.route(/images\.unsplash\.com|fonts\.g|openstreetmap\.org|leafletjs\.com/, (r) => r.abort())
const p2 = await ctx2.newPage()
p2.setDefaultTimeout(6000)
const load2 = async (raw, path = "/") => {
  await writeState(p2, raw)
  await p2.goto(BASE + path)
  await p2.waitForTimeout(250)
  return p2.evaluate(() => document.querySelector("#root").innerText.trim())
}
check("invalid JSON falls back to the demo", (await load2("{not json")).includes("Every sacred moment"))
check("wrong version falls back to the demo", (await load2('{"version":99}')).includes("Every sacred moment"))
const bad = await load2('{"version":2,"signedIn":true,"bookings":"oops"}', "/account/bookings")
check("wrong-shaped data never leaves a blank page", bad.length > 20, bad.slice(0, 40).replace(/\n/g, " ") || "(blank)")
const bad3 = await load2('{"version":2,"signedIn":true,"threads":[{}]}', "/account/messages")
check("deeply damaged data shows a recovery screen", bad3.includes("We couldn"), bad3.slice(0, 40).replace(/\n/g, " ") || "(blank)")
await p2.getByRole("button", { name: "Reset demo data and reload" }).click()
await p2.waitForTimeout(400)
check("recovery screen restores the demo", (await p2.locator("#root").innerText()).length > 20)
const bad2 = await load2('{"version":2,"signedIn":true,"threads":[]}', "/account/messages")
check("empty conversations never leave a blank page", bad2.length > 20, bad2.slice(0, 40).replace(/\n/g, " ") || "(blank)")
await ctx2.close()
const ctx3 = await browser.newContext()
await ctx3.addInitScript(() => {
  Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked") } })
})
await ctx3.route(/images\.unsplash\.com|fonts\.g|openstreetmap\.org|leafletjs\.com/, (r) => r.abort())
const p3 = await ctx3.newPage()
await p3.goto(BASE)
await p3.waitForTimeout(300)
check("blocked browser storage still runs the demo", (await p3.locator("#root").innerText()).includes("Every sacred moment"))
await ctx3.close()

const failed = results.filter((r) => !r.ok)
console.log(`\nReview: ${results.length - failed.length}/${results.length} checks passed`)
if (failed.length) console.log("FAILED:\n" + failed.map((f) => "  " + f.name).join("\n"))
console.log(`Console errors: ${errors.length}`)
for (const e of [...new Set(errors)].slice(0, 10)) console.log("  " + e.slice(0, 260))
process.exitCode = failed.length || errors.length ? 1 : 0
await browser.close()
