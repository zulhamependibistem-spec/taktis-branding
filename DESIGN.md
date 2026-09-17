# DESIGN.md - TAKTIS Branding Attendance

Design intent for the SPG attendance app (mobile-first) and its admin portal
(desktop-first). Written so the next change stays inside the system instead of
inventing a second one.

## Who uses it

- **SPG (mobile, outdoors, one hand, bright sunlight).** Checks in, checks out,
  sees today's status and history. Most sessions are under a minute.
- **Admin (desktop, office).** Reviews daily attendance, verifies photos,
  imports/syncs users, exports Excel.

Nothing else. There is no PIC or Team Leader surface: roles in the DB are `spg`
and `admin` only, and `/tl/*` was removed so the UI cannot imply a feature the
product does not have.

## Color

| Token | Use |
| --- | --- |
| `indigo-600` / `indigo-700` | Primary action, active nav, brand accent |
| `slate-900` / `slate-800` | Primary text, dark buttons (`bg-slate-900`) |
| `slate-500` | Secondary text, icons, placeholders (AA on white) |
| `slate-100` / `slate-50` | Surfaces, empty states, dividers |
| `emerald-600` | Present / success state |
| `amber-600` | Admin role badge, caution |
| `rose-600` | Danger, absent, destructive confirm |

Rules:

- Text on white is `slate-500` or darker. `slate-400` fails AA at 2.56:1 and is
  not allowed for text; the only exception is a purely decorative separator dot.
- Control boundaries (inputs, selects, secondary buttons) use `border-slate-500`
  so the shape reads even when empty. `slate-200`/`slate-300` sit under 3:1 and
  are reserved for card edges that a shadow already defines.
- Focus is a 2px solid indigo ring (`:focus-visible` outline globally, or
  `focus:ring-2 focus:ring-indigo-600` on inputs). No translucent `ring-*/20`
  on white, it disappears.
- Five hues total, each with a job. Do not add a sixth for decoration.

## Typography

- **Plus Jakarta Sans** (`--font-jakarta`) for all UI text.
- **JetBrains Mono** (`--font-mono`) for anything tabular or machine-like: NIP,
  times, dates, filenames. Times render as `07:42 WIB`, never bare.
- Sizes are pixel-locked for the phone: `text-[11px]` labels, `text-[13px]` body,
  `text-[15px]`/`text-[16px]` headings, `text-sm`/`text-2xl` on admin.
- No `uppercase + tracking-wide` as a default label treatment. Labels are
  sentence case; mono handles the technical feel. Uppercase survives only where
  it is a real column header in the admin tables.

## Space, shape, elevation

- Radius: `rounded-xl` for inputs/buttons/cards, `rounded-2xl` for the login
  card and modals, `rounded-full` for pills and avatars.
- Tap targets are at least 40px; primary buttons are 48-52px tall.
- Two shadow levels: `shadow-sm` for cards, `shadow-md`/`shadow-2xl` for the
  floating elements (avatar ring, modal).
- SPG pages are `max-w-md`, centered, with `pb-24` so the fixed bottom nav
  (`h-16` + `pb-safe`) never covers the footer.

## Motion

Micro-animations are tactile, not ambient: `scale(0.96)` on press, 0.2s
ease-out on color/border, spring easing for entrances. Nothing loops.

- No spinning logo, no `animate-ping`, no `animate-pulse` on a live CTA.
  If it never stops, it is decoration, and it competes with the status badge.
- `animate-spin` is allowed only as a transient busy indicator inside a control.

## Copy

- Indonesian, plain, specific. Buttons are verbs: "Check In Sekarang",
  "Check Out", "Ulangi", "Masuk".
- Never claim state the system cannot back. The check-in card states
  "Lokasi GPS diambil otomatis saat tombol check-in ditekan" because GPS is
  read once at submit, not continuously. There is no "High Accuracy Active"
  pill.
- Em dashes are not used in UI strings; use `-` or split the sentence.
- Empty states say what to do next, not just that the list is empty.
- No emoji, no fake testimonials, no invented numbers. Every figure is a real
  row from Supabase for the signed-in user or the selected period.

## Theme

Light only. The app is used in daylight and printed/exported to Excel; a dark
theme would double the surface count for no operational gain. Large surfaces
stay white or `slate-50` so photos and status colors are the only high-chroma
elements on screen.

## Rationale for the login gradient

`from-slate-50 via-white to-indigo-50/60` is a 60% tint, not a colored hero. It
gives the brand mark a soft floor at the top of a screen that is otherwise a
single card, without lowering contrast for the input or the button above it.

## Loading and error states

- `src/app/spg/loading.tsx` and `src/app/admin/loading.tsx` render a centered
  spinner plus one line of Indonesian text. Route transitions never show a
  blank screen.
- Errors are inline (`role="alert"`, rose surface) and keep the form usable.
