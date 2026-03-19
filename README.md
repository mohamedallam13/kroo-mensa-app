# KROO Mensa Menu Application

A Google Apps Script WebApp providing an interactive menu ordering system for KROO Mensa. Features email-based OTP authentication, a real-time cart, category-based navigation, and InstaPay payment integration.

![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=flat&logo=google&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-WebApp-blue)
![Status](https://img.shields.io/badge/Status-Production-green)

---

## Features

- **Authentication** — secure email-based OTP (one-time verification code) with automatic session persistence
- **Interactive Menu** — category-based navigation, real-time search, item descriptions, pricing, and high-quality image display
- **Shopping Cart** — real-time updates, quantity adjustments, persistent cart state, and order summary
- **Payment** — InstaPay integration with receipt submission flow
- **Responsive Design** — works across mobile and desktop with dark mode support and smooth animations

---

## Tech Stack

| Layer    | Technology                       |
|----------|----------------------------------|
| Platform | Google Apps Script               |
| UI       | HTML5, CSS3, Vanilla JavaScript  |
| Icons    | Font Awesome                     |
| Database | Google Sheets                    |
| Payment  | InstaPay                         |
| Deploy   | clasp CLI                        |

---

## Project Structure

```
kroo-mensa-app/
├── README.md
├── AGENT.md
├── .gitignore
└── src/
    ├── env.js                       # Sheet IDs and config
    ├── Backend.js                   # Data access layer (Sheets read/write)
    ├── Helpers.js                   # Pure utility functions
    ├── Middleware.js                # Server-side routing and auth
    ├── Server.js                    # doGet() / doPost() entry points
    ├── Email Login Confirmation.js  # OTP email generation
    ├── Instapay.js                  # Payment integration helpers
    └── index.html                   # SPA shell (menu, cart, auth screens)
```

---

## Getting Started

### Prerequisites

- A Google account with Google Apps Script access
- [clasp](https://github.com/google/clasp) installed globally

```bash
npm install -g @google/clasp
clasp login
```

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/mohamedallam13/kroo-mensa-app.git
   cd kroo-mensa-app
   ```

2. Link to your Apps Script project:
   ```bash
   clasp create --type webapp --title "KROO Mensa" --rootDir src
   ```

3. Push source files:
   ```bash
   clasp push
   ```

4. Set the Sheet ID and any secrets in `env.js` (never commit real values).

---

## Deployment

1. In the Apps Script editor, go to **Deploy > New deployment**
2. Select type: **Web app**
3. Set **Execute as**: Me · **Who has access**: Anyone
4. Click **Deploy** and share the Web App URL

---

## Author

**Mohamed Allam** — [GitHub](https://github.com/mohamedallam13) · [Email](mailto:mohamedallam.tu@gmail.com)
