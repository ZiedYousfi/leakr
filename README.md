# 🏛️ Project Architecture — Monorepo

This repository contains all the necessary components around the main extension.
The extension works autonomously, but this monorepo allows adding associated services:

- Community website
- Cloud storage for backups
- Subscriptions
- Sharing system for content selected by the community

> 📌 The extension is located in the `extension/` folder (not documented here)

---

## 📦 Repository Structure

```b
.
├── services/                 # All Go microservices
│   ├── auth-service/        # Authentication and token validation
│   ├── storage-service/     # Upload, save, retrieve .sqlite files (Cloudflare R2)
│   ├── community-service/   # Community system: shares, votes, rankings
│   └── payment-service/     # Subscription management and Stripe integration
│
├── web/                     # Website in Next.js
│   └── app/                 # Frontend application code (dashboard, community, subscriptions)
│
├── infra/                   # Configuration and deployment
│   ├── cloudflare/          # Config files for Cloudflare R2 (storage)
│   └── github-actions/      # CI/CD for services and site
│
├── README.md                # This file
└── .gitignore               # Files to exclude from the repository
```

---

## 🧠 Architectural Philosophy

- All services are **independent** and **written in Go**
- **`auth-service`** is the central validation point for all others
- The PlanetScale database is only used by services for:
  - Authentication
  - Community data
  - Subscription tracking
- Cloudflare R2 storage is **managed only** by `storage-service`

---

## ✨ This repository is designed for

- Being a **monorepo** for all services
- Being readable and modular
- Facilitating deployment and maintenance
- Remaining clear, even if you develop each brick at your own pace

---

schema:

```b

                             [ User (Client) ]
                               ▲            ▲
                               │            │
                               ▼            ▼
                   ┌────────────────────┐  ┌─────────────────────────┐
                   │ Next.js Site       │  │       Extension         │
                   │   (Vercel)         │  └─────────────────────────┘
                   └─────────┬──────────┘              │
                             │                         ▼
                             │            ┌─────────────────────────┐
                             └──────────▶ │   API Gateway / Auth    │◀──[ auth-service ]
                                          └─────────────────────────┘
                                               ▲     ▲       ▲      ▲
                                               │     │       │      │
                                               ▼     ▼       ▼      ▼
                                    [ storage ] [ community ] [ payment ] ...
                                      service     service       service
                                         ▲           ▲             ▲
                                         │           │             │
                                         ▼           ▼             ▼
                                  [ Cloudflare ] [ PlanetScale ] [ Stripe ]
                                     R2            (web DB)       (subs)
