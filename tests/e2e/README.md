# Browser tests

These tests drive the real app in a browser against the production build.

```bash
npm test             # type check, build, then the six suites below
npm run test:audit   # build, then click every visible control on every page (slower)
```

| Suite | What it covers |
|---|---|
| `journeys.mjs` | Customer, pandit and admin journeys, and every form with sample input |
| `workflow.mjs` | Approval before payment, expiry, payment release after commission, and URLs |
| `notifications.mjs` | The notification bell, badge, list, links and mark as read |
| `map.mjs` | The nearby pandits map: markers, cards, zoom, radius, list view and location |
| `review.mjs` | Every puja end to end, every role and page combination, refresh persistence, awkward paths, damaged storage |
| `mobile.mjs` | Phone-width menus and controls |
| `audit.mjs` | Flags any control that does nothing (writes to `artifacts/`) |

The runner starts `vite preview` on port 8444 and stops it afterwards.

The tests use Microsoft Edge, which is already installed on Windows, so no browser download is needed. To use Chrome instead, set `E2E_BROWSER=chrome`.

They need Node.js 22.18 or later, because they import `src/routes.ts` directly.
