# AGENT.md — kroo-mensa-app

## Purpose
A Google Apps Script WebApp providing an interactive menu ordering system for KROO Mensa. Features email-based authentication, a real-time cart, category navigation, and Instapay payment integration.

## Structure
```
kroo-mensa-app/
├── README.md
├── AGENT.md
├── .gitignore
└── src/
    ├── env.js                        ← Sheet IDs / config / secrets
    ├── Backend.js                    ← data access layer (Sheets read/write)
    ├── Helpers.js                    ← pure utility functions
    ├── Middleware.js                 ← server-side routing / auth
    ├── Server.js                     ← doGet() / doPost() entry points
    ├── Email Login Confirmation.js   ← OTP email generation
    ├── Instapay.js                   ← payment integration helpers
    └── index.html                    ← SPA shell (menu, cart, auth)
```

## Key Facts
- **Platform:** Google Apps Script WebApp
- **Data store:** Google Sheets (IDs in `env.js`)
- **Auth:** Email-based OTP (one-time verification code)
- **Payment:** Instapay integration
- **Entry point:** `Server.js` → `doGet()` / `doPost()`

## Development Notes
- All source files live under `src/` — push with clasp from that directory
- No Node/npm at runtime; ES5-compatible GAS code only
- Sheet IDs and secrets live in `env.js` (not committed with real values)
