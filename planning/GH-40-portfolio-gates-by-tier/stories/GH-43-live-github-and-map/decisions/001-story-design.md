# 001: The design of live data (taken by the agent, epic decision 009)

**Date:** 2026-11-12 (story pass, run by the agent alone; each point is the option the agent recommends)

1. **Tools or an MCP server for GitHub?** **A plain backend tool inside the agent** (`github_live`), plus a small
   API route for the page. *Not chosen:* GitHub's MCP server — it adds a second service, a write-capable surface
   and a token with wide scope, for three read-only requests.
2. **What may be read.** Only repositories the record already links to, under the owner's guild organizations.
   A caller names a **project id**, never a repository, so the route cannot be used to read anything else.
3. **Token.** Optional `GITHUB_TOKEN`, server-side only, read-only, public repositories. Without it the server
   reads anonymously (60 requests an hour). Every answer is cached ten minutes, so anonymous use is enough for
   eight projects. **The owner adds a token on Vercel only if rate limits appear.**
4. **What is shown.** Latest release and date, last push, three latest commits, open issues, licence, language.
   **No star counts** (all zero today; story GH-41 rule).
5. **Where.** The agent states it ("live from GitHub"); each personal project's inspect card shows a "Live from
   GitHub" strip. If GitHub does not answer, nothing is shown and the record still holds.
6. **The map.** A world map the agent can show under its reply (`show_map`): the owner's base (Oujda, Morocco),
   his local time, and the time difference with the visitor, computed in the browser from the visitor's clock —
   **no geolocation, no map service, no tiles, no key**. The land outline is drawn from Natural Earth data
   (public domain), turned once into an SVG path by a script.
7. **Tickets, in order:** (1) live GitHub data; (2) the map.
