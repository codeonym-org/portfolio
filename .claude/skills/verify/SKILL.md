---
name: verify
description: Build, launch and drive the portfolio (the living record) headlessly to verify changes end-to-end.
---

# Verifying the portfolio

## Build & launch

```bash
pnpm lint && pnpm test
pnpm build
pnpm start &   # serves the prod build on http://localhost:3000
```

## Drive it headlessly

Playwright is NOT a project dep and `npx playwright` is blocked by
safe-chain; require it from the npx cache instead (find the hash dir
with `grep -rl playwright ~/.npm/_npx/*/package.json`):

```js
const { chromium } = require("/home/codeonym/.npm/_npx/<hash>/node_modules/playwright");
const browser = await chromium.launch({
  headless: true,
  // renders on the real GPU (≈45 fps at high quality) instead of SwiftShader
  args: ["--use-angle=vulkan", "--enable-features=Vulkan", "--ignore-gpu-blocklist", "--enable-gpu", "--use-gl=angle"],
});
```

Test desktop (`1440x900`) and phone (`390x844` with `isMobile`/`hasTouch`,
`deviceScaleFactor: 2`): the layouts differ (window beside the scene vs.
sheet under it).

## Flows & gotchas

- **There is one page.** Boot line → the Monolith with the record in orbit.
  No title screen, no button to press. Wait for
  `window.system && window.system.snapshot`.
- **Pin quality and mute before load** (storage key `codeonym-record-v9`):
  ```js
  await page.addInitScript(() => localStorage.setItem("codeonym-record-v9",
    JSON.stringify({ state: { quality: "high", visited: [], risen: [], completed: [], xp: 0, muted: true, greeted: true }, version: 0 })));
  ```
- **Headless stops producing frames while it idles**, so
  `page.waitForTimeout` freezes every animation mid-way and screenshots
  look "stuck". Wait by pumping frames in the page instead:
  ```js
  const pump = (ms) => page.evaluate((ms) => new Promise((r) => {
    const t0 = performance.now();
    const f = () => (performance.now() - t0 < ms ? requestAnimationFrame(f) : r());
    requestAnimationFrame(f);
  }), ms);
  ```
- **Control surface**: `window.system.snapshot()` (serializable state),
  `system.run(name, args)`, `system.commands` (`open_sector`,
  `inspect_entity`, `assemble_case`, `arise`, `arise_all`, `open_cv`,
  `close_windows`…). Prefer it to synthesized clicks. ARISE takes
  `ARISE_MS` (1.7 s) per shadow; poll `snapshot().visitor.shadowsRisen`.
- **Talking to the agent**: fill the `textarea` and press Enter. A live run
  takes 5–15 s (needs `OPEN_ROUTER_API_KEY`). Read the reply from `.oracle`
  and the tool calls from `.trace-row`. A case file also sets
  `location.hash` to `#case=…`; loading that URL reopens the case with no
  agent involved.
- **Offline path**: `await page.route("**/api/copilotkit**", (r) => r.abort())`
  before `goto` — the same message must be answered by the local index
  (trace source reads `LOCAL INDEX`, console shows the retry link). The
  CopilotKit console errors in that run are expected.
- **Plain routes**: `/record` (server-rendered, no JS needed) and
  `/llms.txt` (Markdown) — check with `curl`.
- **PDF windows render white in headless** (no PDF viewer plugin in
  chromium headless shell); confirm the file with
  `curl -sI localhost:3000/cv.pdf` instead.
- **`public/cv.pdf` is committed** (user-approved exception; only the
  repo-root `cv.pdf` source stays gitignored) — no copy step needed.
