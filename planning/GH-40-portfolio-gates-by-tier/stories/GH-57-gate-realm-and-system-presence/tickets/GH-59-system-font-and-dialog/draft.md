# The System's font and the System window for notices and prompts

## Problem

System messages are small toasts in the same type as everything else. They do not read as the System speaking.

## Change

A dedicated System font, hosted with the site, and one System window style (story decision 001, points 5–6):

- **Notices**: the existing toasts, restyled as System windows.
- **Prompts**: a new centred System dialog with a message and up to two actions (for example "Accept" and
  "Later"). It never blocks the page: Escape or "Later" closes it, and only one shows at a time.

The first prompt in use: on a first visit, the System offers the one-minute brief.

## Done when

- Notices and prompts use the System font and the System window frame.
- A prompt can be accepted or dismissed with the mouse, a touch and the keyboard, and is announced to screen
  readers.
- A first-time visitor is offered the brief once; a returning visitor is not asked again.
- Lint, type check, tests and build pass.
