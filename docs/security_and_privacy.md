# Security and Privacy Plan

We design for privacy first: everything works locally and offline by default.

## 1) Local‑First, Offline by Default

- No account needed. No data leaves the device unless exported by the user.
- Data stored in the browser’s local database (IndexedDB).
- Users can export/import JSON backups.

## 2) If Optional Cloud Features Are Added Later

- Transport Security
  - HTTPS only; HSTS enabled.
- Authentication & Abuse Protection
  - CAPTCHA on all auth routes and signup pages.
  - Rate‑limit all API endpoints to prevent abuse.
  - Enable attack challenge on hosting WAF (e.g., Vercel) if applicable.
- Data Security
  - Row‑Level Security (RLS) on the database so users only access their own rows.
  - Never store secrets in code; use environment variables and a secure secrets manager.
- Privacy
  - Clear consent for any sync/telemetry; opt‑in only.
  - Minimize data collection to what’s strictly needed.

## 3) Frontend Protections

- Content Security Policy (CSP) to restrict sources.
- Input validation and safe serialization for exports/imports.
- Avoid eval/Function constructors; avoid inline scripts; use strict mode.
- Sanitize any rendered user text.

## 4) PWA and Service Worker Safety

- Scope service worker narrowly; version caches; purge old caches.
- Avoid caching sensitive content from any future backend.
- Graceful offline fallbacks.

## 5) User Education

- Explain local‑first design and how to back up/export.
- Warn about using exact zeros and how that affects results.
