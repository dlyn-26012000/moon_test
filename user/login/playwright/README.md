# Login E2E Automation (Playwright)

Standalone UI/UX automation for the User Login modal on `https://moon.dlyn.site`.
The project has **raw `playwright`** installed (no `@playwright/test` runner), so the
suite is driven by a plain Node runner.

## Layout

```
playwright/
├── playwright.config.js     # central config (baseURL, viewport, video/trace dirs, throttle guard)
├── fixtures/test-data.js     # credentials, viewports, i18n expected text
├── pages/LoginPage.js         # Page Object Model for the login modal
├── helpers/evidence.js        # screenshot + console/network recorders
├── tests/login.spec.js        # human-readable scenario catalogue
└── run.js                     # entry point — runs vi + en + mobile, writes evidence
```

## Run

```bash
# from this folder (repo root has playwright in node_modules)
PW=../../../../node_modules/playwright node run.js
# or, if playwright resolves globally:
node run.js

# target another environment
LOGIN_BASE_URL=https://staging.example node run.js
```

## Outputs (written to ../evidence/)

- `screenshots/` — `vi-*`, `en-*`, `mobile-*` PNGs per step
- `videos/` — `login-vi.webm`, `login-en.webm`, `login-mobile.webm`
- `traces/` — `trace-vi.zip`, `trace-en.zip` (open with `npx playwright show-trace <file>`)
- `network/` — `network-<lang>.log` (auth/API calls)
- `logs/` — `console-<lang>.log`, `ui-results.json` (assertion outcomes)

## Notes

- The login API is throttled **5 req/min per IP**; the runner makes at most **one real
  login attempt per language** and spaces them (`throttleGuardMs`).
- `vi` performs a **valid** login (success evidence); `en` performs an **invalid** login
  (error evidence). Mobile pass is UI-only (no login call).
