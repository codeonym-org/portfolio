// the social card: the live scene, framed left, with the title set in the site's own fonts
import { chromium } from "playwright";
(async () => {
  const out = process.argv[2];
  const browser = await chromium.launch({ headless: true, args: ["--use-angle=vulkan", "--enable-features=Vulkan", "--ignore-gpu-blocklist", "--enable-gpu", "--use-gl=angle"] });
  const page = await (await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })).newPage();
  await page.addInitScript(() => localStorage.setItem("codeonym-record-v9", JSON.stringify({ state: { quality: "high", visited: [], risen: [], completed: [], xp: 0, muted: true }, version: 0 })));
  await page.goto(process.env.URL || "http://localhost:3000/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.system && window.system.snapshot, null, { timeout: 60000 });
  const pump = (ms) => page.evaluate((ms) => new Promise((r) => { const t0 = performance.now(); const f = () => (performance.now() - t0 < ms ? requestAnimationFrame(f) : r()); requestAnimationFrame(f); }), ms);
  await pump(4000);
  await page.evaluate(() => window.system.run("open_sector", { sector: "projects" }));
  await pump(1500);
  await page.evaluate(() => window.system.run("arise_all", {}));
  await pump(9000);
  await page.evaluate(() => {
    const style = document.createElement("style");
    style.textContent = `main > *:not(:first-child), .shard-label, .beacon, nextjs-portal { display: none !important; }
      #og { position: fixed; inset: 0; z-index: 999; display: flex; flex-direction: column; justify-content: center; padding: 0 64px 0 640px;
        background: linear-gradient(90deg, transparent 38%, rgba(5,4,11,.82) 62%); color: #fff; }
      #og .eyebrow { font: 500 13px var(--font-geist-mono); letter-spacing: .32em; color: #b79bff; }
      #og h1 { font: 400 46px var(--font-michroma); letter-spacing: .16em; margin: 18px 0 6px; }
      #og h2 { font: 400 58px/1.02 var(--font-instrument); margin: 14px 0 0; color: #e9e4f5; }
      #og h2 i { color: #b79bff; }
      #og p { font: 400 15px/1.5 var(--font-geist-mono); color: #9b93ad; margin-top: 26px; letter-spacing: .02em; }
      #og .line { width: 56px; height: 2px; background: #8b5cf6; box-shadow: 0 0 14px #8b5cf6; }`;
    document.head.append(style);
    const el = document.createElement("div");
    el.id = "og";
    el.innerHTML = `<div class="line"></div><h1>CODEONYM</h1><div class="eyebrow">AI AGENT ENGINEER</div><h2>A portfolio with no pages. <i>Ask it.</i></h2><p>Bouarour Ayoub — multi-agent systems, MCP, AG-UI.<br/>portfolio.codeonym.work</p>`;
    document.body.append(el);
  });
  await pump(600);
  await page.screenshot({ path: out });
  await browser.close();
  console.log("wrote", out);
})().catch((e) => { console.error("FAILED", e.message); process.exit(1); });
