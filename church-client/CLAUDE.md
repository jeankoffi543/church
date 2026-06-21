# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from `church-client/`:

- `pnpm dev` — start dev server (http://localhost:3000)
- `pnpm build` — production build
- `pnpm lint` — run ESLint (flat config, Core Web Vitals + TypeScript rules)
- `pnpm start` — serve production build

## Tech Stack

- **Next.js 16** (App Router) with **React 19** and **TypeScript**
- **Tailwind CSS v4** via `@tailwindcss/postcss` — uses `@import "tailwindcss"` and `@theme inline` in `app/globals.css`, not a `tailwind.config` file
- **pnpm** as package manager (lockfile and workspace config present)
- Path alias: `@/*` maps to project root

## Next.js 16 — Read Before Writing

This project uses Next.js 16, which has breaking changes from earlier versions. Before writing any Next.js code, read the relevant guide in `node_modules/next/dist/docs/`. Do not rely on training data for Next.js APIs or conventions — check the bundled docs and heed deprecation notices.

## Architecture

App Router project (no `src/` dir — `app/`, `components/`, `lib/` live at the root). It hosts two strictly separated zones:

- **Public church site** — `/`, `/live`, `/mediatheque`, `/eglise`, `/agenda`, `/dons`. Chrome (Navbar + Footer) is applied by `components/layout/site-frame.tsx`, a client wrapper in `app/layout.tsx` that suppresses itself on `/admins/*`.
- **Admin backoffice** — everything under `/admins/`. `app/admins/layout.tsx` is the neutral shell; the `(panel)` route group adds the sidebar to authenticated pages (`/admins/dashboard`, `/admins/settings`) while `/admins/login` stays chrome-less.

Design system: fonts are **Cormorant Garamond** (serif display, `.font-display`) + **Plus Jakarta Sans** (sans). Brand colors/animations are Tailwind v4 tokens in `app/globals.css` under a plain `@theme` block (literal values → utilities like `bg-gold`, `text-indigo`, `bg-ink`); shadcn semantic tokens are mapped in a separate `@theme inline` block. Do **not** nest `@keyframes` inside `@theme inline` — it silently breaks the whole CSS build (Turbopack falls back to the last good CSS). Shared content lives in `lib/data.ts`.

## Auth & routing (proxy)

- **`proxy.ts`** (project root) is the access-control gate. In Next.js 16 the `middleware` convention is renamed to **`proxy`** (file `proxy.ts`, exported `proxy` function) — `middleware.ts` still works but warns as deprecated. Adding/renaming this file requires a **dev server restart** to take effect.
- Logic + cookie names + route lists live in `lib/auth/config.ts` (edge-safe, no `next/headers`). The proxy only checks cookie **presence**: `mfm_admin_session` for `/admins/*` (→ `/admins/login`), `mfm_user_session` for `PROTECTED_USER_PREFIXES` (→ `/login`).
- `lib/auth/session.ts` holds server-side session helpers (`getAdminSession`/`getUserSession` via `next/headers`) — the place to add real token verification. Admin sign-in/out are server actions in `app/admins/login/actions.ts` (currently a skeleton issuing a placeholder cookie).

Static assets go in `public/`.
