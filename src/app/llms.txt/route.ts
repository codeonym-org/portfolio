import { plainMarkdown } from "@/record/plain";

/** the record for agents that came to read: plain Markdown, built from the same configs as everything else */
export const dynamic = "force-static";

export function GET() {
  const site = (process.env.SITE_URL ?? "https://portfolio.codeonym.work").replace(/\/$/, "");
  return new Response(plainMarkdown(site), { headers: { "content-type": "text/markdown; charset=utf-8" } });
}
