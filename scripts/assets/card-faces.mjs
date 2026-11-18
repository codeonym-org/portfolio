// the business card's two faces as the transcript prints them (`public/transcript/card-{front,back}.jpg`):
// the live card, in the site's own CSS, captured with every word hidden. Only the metal, the rings
// and the carved mark are pictures; the PDF sets the words over them, so they stay text and links.
//
//   NEXT_DIST_DIR=.next-verify pnpm exec next dev -p 3111 &
//   URL=http://localhost:3111/interview node scripts/assets/card-faces.mjs public/transcript
//   for f in front back; do magick card-$f.png -crop 1732x1092+4+4 +repage -resize 1300x -strip -quality 88 card-$f.jpg; done
import { chromium } from "playwright";
(async () => {
  const out = process.argv[2] ?? ".";
  const browser = await chromium.launch({ headless: true, args: ["--use-angle=vulkan", "--enable-features=Vulkan", "--ignore-gpu-blocklist", "--enable-gpu", "--use-gl=angle"] });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 3 })).newPage();
  await page.addInitScript(() => localStorage.setItem("codeonym-record-v9", JSON.stringify({ state: { quality: "low", visited: [], muted: true }, version: 3 })));
  await page.goto(process.env.URL || "http://localhost:3000/interview", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.system && window.system.snapshot, null, { timeout: 90000 });
  await page.evaluate(() => window.system.run("show_business_card", {}));
  await page.waitForSelector(".bc-face", { timeout: 15000 });
  await page.waitForTimeout(2500);
  // flat, still and wordless: no lean, no idle sway, no glow pulse, no text
  await page.addStyleTag({
    content: `.bc-idle, .bc-orb { animation: none !important; }
      .bc-face p, .bc-face ul, .bc-face .bc-groove, .bc-back .min-w-0 { visibility: hidden !important; }
      .bc-face { box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.09), inset 0 1px 0 rgb(255 255 255 / 0.3), inset 0 -1px 0 rgb(0 0 0 / 0.6) !important; border-radius: 0 !important; }
      .bc, .bc * { transform: none !important; } .bc-face { backface-visibility: visible !important; }`,
  });
  const faces = await page.$$(".bc-face");
  // the front lies over the back once nothing is turned: hide each in turn
  await page.evaluate(() => (document.querySelectorAll(".bc-face")[1].style.visibility = "hidden"));
  await faces[0].screenshot({ path: `${out}/card-front.png` });
  await page.evaluate(() => {
    const [front, back] = document.querySelectorAll(".bc-face");
    front.style.visibility = "hidden";
    back.style.visibility = "visible";
  });
  await faces[1].screenshot({ path: `${out}/card-back.png` });
  await browser.close();
  console.log("wrote", `${out}/card-front.png`, `${out}/card-back.png`);
})().catch((e) => {
  console.error("FAILED", e.message);
  process.exit(1);
});
