# PWA and Offline Plan (iPhone + Mac)

Goal: The app works fully offline after first load/install, and can be added to the iPhone Home Screen.

## 1) App Shell Architecture

- Pre‑cache the core HTML, CSS, JS, fonts, icons, and default sample data.
- Load instantly from cache; update in the background when online.

## 2) Web App Manifest

- `manifest.json` includes name, icons (iOS sizes), theme/background colors, display: standalone, start_url.
- iOS PWA meta tags in HTML (apple‑touch‑icon, status bar style, etc.).

## 3) Service Worker

- Install/activate lifecycle with:
  - Pre‑cache (Cache First) for app shell assets.
  - Runtime caching (Network First with fallback to cache) for docs/help pages.
- Versioned cache names; purge old caches on activate.
- Offline fallback page with helpful instructions if a page is missing.

## 4) Offline Data Storage

- IndexedDB for projects, hypotheses, evidence, and history.
- Schema versioning and migrations for future changes.
- Autosave after edits; debounce to reduce writes.
- Export/Import JSON for backup.

## 5) iOS Specifics

- Add‑to‑Home‑Screen works via Safari; include instructions UI.
- Storage is limited and may be cleared by the system if device is low on space; provide export reminders.
- Background sync is limited on iOS PWAs; design does not rely on it.
- Push notifications not required for core use.

## 6) Updates

- Service worker checks for new versions; show a small banner “Update ready” with a reload button.
- Always safe to update: data stored in IndexedDB is separate from cached files.

## 7) Security

- HTTPS required for PWA install on the web; for local development use localhost.
- Content Security Policy (CSP) to restrict sources.
- No external analytics by default; entirely local.

## 8) Size and Performance Targets

- First load (app shell) under ~300KB gzipped if feasible.
- Interactive in under 1s on recent iPhones after initial install (cache hit).
