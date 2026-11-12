# Implementation record (written after the build, 2026-11-12, by the agent alone)

**Added:** the font Rajdhani (`next/font`, weights 500–700, `--font-system`); the `.sys-window`, `.sys-head`,
`.sys-button` and `.sys-scan` styles in `globals.css`; `src/components/interface/system-dialog.tsx` (the prompt
and the first-visit offer); in the store: `SystemPrompt`, `prompt`, `ask()`, `answer()`, `greeted`,
`setGreeted()`; the copy `world.prompts`.
**Changed:** `toasts.tsx` (each notice is a small System window in the notice's colour); `shell.tsx` (the
dialog is mounted; Escape closes a prompt first; Y / N answer it; a sound when one opens).

**Decisions taken while building (by the agent):**

- **Colour:** the System window is the System's blue; a notice keeps its own tone (gold for quests, violet for
  ARISE) as the window's colour.
- **A prompt's action is data:** `command: { name, args }`, run through `executeSystemCommand`. A prompt can
  therefore only do what the command list allows.
- **One prompt at a time:** a new one replaces the waiting one, which counts as declined (`onAnswer(false)`).
- **Keys:** Y accepts, N and Escape decline; the keyboard focus lands on "Accept" unless the visitor has text
  in the input.
- **The first-visit offer** waits 2.6 s after the scene is up and is skipped for a returning visitor, a shared
  case link, or a visitor who already opened something. `greeted` is saved in the browser and is **not**
  cleared by "reset progress".
- **Not a modal:** the page behind stays usable; the dialog has `role="dialog"` with a label and description.

**Checked (headless Chromium, desktop and phone):** first visit shows the offer with the focus on "Accept";
Y (desktop) and a tap (phone) open the brief and the "QUEST COMPLETE" notice appears as a System window;
a second visit shows no offer. Lint, `tsc --noEmit`, 51 tests, build.

**Not checked:** a screen reader; Arabic or French text in the System font (Rajdhani has Latin only: other
scripts fall back to the page's sans-serif).
**Note for testers:** scripts that pin the saved state should add `greeted: true` (the verify skill is updated).
