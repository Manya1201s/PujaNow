// Phone-width checks for the menus and controls that desktop testing cannot reach.
import { launch, open, reporter } from "./helpers.mjs"
const { browser, page, errors } = await launch({ width: 390, height: 844 })
const { check, finish } = reporter(errors, "Phone")
const menu = page.locator(".app-topbar > .menu-button")
const sidebar = page.locator(".sidebar")
const inView = () => sidebar.evaluate((e) => e.getBoundingClientRect().left >= 0)

try {
  // Every sidebar item for each role
  for (const [role, start, signedIn] of [["customer", "dashboard", true], ["pandit", "dashboard", true], ["admin", "admin-overview", true]]) {
    await open(page, { role, page: start, signedIn })
    const labels = await page.locator(".sidebar nav button").allTextContents()
    let ok = 0
    for (let i = 0; i < labels.length; i++) {
      await menu.click()
      await page.waitForTimeout(260)
      await page.locator(".sidebar nav button").nth(i).click()
      await page.waitForTimeout(260)
      const active = await page.locator(".sidebar nav button").nth(i).getAttribute("class")
      if (active.includes("active") && !(await inView())) ok++
    }
    check(`${role}: all ${labels.length} sidebar items open their page and close the menu`, ok === labels.length, `${ok}/${labels.length}`)
    await menu.click()
    await page.waitForTimeout(260)
    check(`${role}: menu opens`, await inView())
    await page.mouse.click(370, 500)
    await page.waitForTimeout(260)
    check(`${role}: tapping outside closes the menu`, !(await inView()))
    await menu.click()
    await page.waitForTimeout(260)
    await page.getByRole("button", { name: "Sign out" }).click()
    await page.waitForTimeout(200)
    check(`${role}: sign out works`, (await page.getByText("Every sacred moment").count()) === 1)
  }

  // Header menu
  await open(page)
  for (const [label, marker] of [["Explore pujas", ".category-tabs"], ["Find a pandit", ".filter-bar"], ["Samagri", ".samagri-bar"], ["Sign in", ".auth-form"]]) {
    await open(page)
    await page.getByLabel("Open menu").click()
    await page.locator(".site-header nav").getByRole("button", { name: label }).click()
    await page.waitForTimeout(150)
    check(`header menu: ${label}`, (await page.locator(marker).count()) === 1)
  }

  // Controls that the original CSS hid on phones
  await open(page, { role: "pandit", page: "requests", signedIn: true })
  const decline = page.locator(".request-rows > div").first().getByRole("button", { name: "Decline" })
  check("Decline visible on phones", await decline.isVisible())
  await decline.click()
  check("Decline works on phones", (await page.getByText("2 requests awaiting").count()) === 1)
  await open(page, { role: "admin", page: "admin-verification", signedIn: true })
  check("Review visible on phones", await page.getByRole("button", { name: "Review" }).first().isVisible())

  // Conversation switching and sending on a phone
  await open(page, { signedIn: true, page: "messages" })
  await page.locator(".conversation-list button", { hasText: "PujaNow Support" }).click()
  check("conversation switch on phones", (await page.locator(".chat-person b").textContent()) === "PujaNow Support")
  await page.getByLabel("Write a message").fill("Testing on a phone")
  await page.getByLabel("Send message").click()
  check("send on phones", (await page.locator(".chat-bubble.me").last().textContent()).includes("Testing on a phone"))

  // Filter panel fits a phone screen
  await open(page, { page: "explore" })
  await page.getByRole("button", { name: /^Filters/ }).click()
  const box = await page.getByRole("dialog", { name: "Filters" }).boundingBox()
  check("filter panel fits the screen", box.x >= 0 && box.x + box.width <= 390, JSON.stringify(box))
  await page.getByRole("button", { name: "Up to 2 hours" }).click()
  await page.getByRole("button", { name: "Apply filters" }).click()
  check("filters work on phones", (await page.locator(".puja-card").count()) === 5, `${await page.locator(".puja-card").count()}`)

  // Pandit dropdowns stay reachable on a phone
  await open(page, { page: "pandits" })
  await page.getByRole("button", { name: "Choose date" }).click()
  await page.getByRole("menuitem", { name: "Tomorrow" }).click()
  check("date dropdown works on phones", !(await page.locator(".result-header .overline").textContent()).includes("ANY DATE"))

  // Tablet width: the menu button must not appear where the sidebar is already visible
  await page.setViewportSize({ width: 900, height: 800 })
  await open(page, { role: "admin", page: "customers", signedIn: true })
  check("no dead menu button at tablet width", !(await menu.isVisible()))
} catch (e) {
  check("script completed without a crash", false, e.message.split("\n").slice(0, 3).join(" "))
}
finish()
await browser.close()
