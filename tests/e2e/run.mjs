// Serves the production build and runs the browser suites against it.
//   node tests/e2e/run.mjs         the journey, workflow, review and phone suites
//   node tests/e2e/run.mjs audit   clicks every control on every page, at desktop and phone sizes
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import path from "node:path"

const root = fileURLToPath(new URL("../..", import.meta.url))
const here = fileURLToPath(new URL(".", import.meta.url))
const PORT = "8444"
const BASE = `http://localhost:${PORT}`

// Started directly, not through a shell, so stopping it really does stop the server.
const server = spawn(process.execPath, [path.join(root, "node_modules/vite/bin/vite.js"), "preview", "--strictPort"], {
  cwd: root,
  env: { ...process.env, PORT },
  stdio: "ignore",
})

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(BASE + "/")).ok) return
    } catch {
      // Not listening yet.
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`The preview server did not start on port ${PORT}. Is something else using it?`)
}

const runSuite = (args) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd: here, env: { ...process.env, E2E_BASE_URL: BASE }, stdio: "inherit" })
    child.on("close", (code) => resolve({ name: args.join(" "), code }))
  })

const suites = process.argv[2] === "audit"
  ? [["audit.mjs"], ["audit.mjs", "mobile"]]
  : [["journeys.mjs"], ["workflow.mjs"], ["review.mjs"], ["mobile.mjs"]]

let results = []
try {
  await waitForServer()
  for (const suite of suites) results.push(await runSuite(suite))
} finally {
  server.kill()
}

console.log("\n==== Summary ====")
for (const r of results) console.log(`${r.code === 0 ? "PASS" : "FAIL"}  ${r.name}`)
process.exit(results.every((r) => r.code === 0) ? 0 : 1)
