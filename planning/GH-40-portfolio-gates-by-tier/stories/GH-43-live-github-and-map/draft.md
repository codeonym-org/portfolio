# Live data for the System: GitHub read access and a map

## Problem

The agent only knows what is written in the record. It cannot show what the owner is doing now (releases,
recent activity), and it cannot show where the owner is.

## Change

Give the agent read access to the owner's public GitHub data, and a map it can show on the page. The GitHub token
stays on the server, is read-only, covers public data only, and calls are rate-limited (epic decision 007: no
writing to GitHub).

## Done when

- Asked about a project, the agent can show its latest release and recent activity from GitHub.
- The agent can show a map on the page.
- No token reaches the browser; a failed or rate-limited call falls back to the record.

Its own grilling settles tools or an MCP server, what is shown, the map's content and caching.
