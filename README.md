# Leakr

🚀 Leakr — Instantly search and discover leaked content from your favorite creators on platforms like OnlyFans, Fansly, and more — all in one click! 🔥 No need to paste links — Leakr detects profiles directly from your current tab and opens curated search results for you. Effortlessly organize, filter, and collect the hottest leaks. ✨ A fast, simple, and privacy-friendly Chrome extension for those who know where to look. 😉

---

## 📜 Licence

This project is licensed under a [BSL-based License](LICENCE).

## 🏛️ Project Architecture — Monorepo

This repository contains all the necessary components around the main extension.
The extension works autonomously, but this monorepo allows adding associated services:

- Community website
- Cloud storage for backups
- Subscriptions
- Sharing system for content selected by the community
- Authentication gateway for secure access to services

> 📌 The extension is located in the `extension/` folder (not documented here)

---

### 📆 Repository Structure

```b
.
├── extension/               # Standalone client-side extension
├── services/                # All Go microservices
│   ├── auth-service/        # Authentication and token validation
│   ├── storage-service/     # Upload, save, retrieve .sqlite files (Cloudflare R2)
│   ├── community-service/   # Community system: shares, votes, rankings
│   ├── payment-service/     # Subscription management and Stripe integration
│   ├── mailing-list-service/# Mailing list management (Optional, Using MaiLiter)
│   └── db-service/          # Database service (Neon DB) with gRPC and REST APIs
│
├── web/                     # Website in Next.js
│   └── leakr-webapp/        # Frontend application code (dashboard, community, subscriptions)
│
├── infra/                   # Configuration and deployment
│   ├── cloudflare/          # Config files for Cloudflare R2 (storage)
│   └── github-actions/      # CI/CD for services and site
│
├── README.md                # This file
└── .gitignore               # Files to exclude from the repository
```

---

### 🧠 Architectural Philosophy

- All services are **independent** and **written in Go**
- Each service handles a specific concern (auth, storage, community, payment)
- **`auth-service`** is the central validation point for all others
- Services communicate via secure HTTP APIs
- The PlanetScale database is only used by services for:
  - Authentication
  - Community data
  - Subscription tracking
- Cloudflare R2 storage is **managed only** by `storage-service`
- The extension communicates directly with the services and does not rely on the website
- The website (in Next.js) is a GUI shell that interfaces with services for:
  - Community access
  - Backup/restore management
  - Account management and payments
- The infrastructure is entirely **serverless** and **container/VPS-free**
- Services will be deployed on platforms like Railway, Fly.io or Cloud Run
- R2 is used for storing SQLite files per user, which are frequently updated but not processed server-side
- File uploads are performed from the client to `storage-service`, which writes to R2
- File names include metadata (user ID, date, etc.) and are organized into two buckets: `main/` and `backup/`
- Backups are manually archived ("Glacier-like") using folder separation or periodic scripts

---

### ✨ This repository is designed for

- Being a **monorepo** for all services
- Being readable and modular
- Facilitating deployment and maintenance
- Remaining clear, even if you develop each brick at your own pace
- Allowing independent scaling and development of each microservice
- Supporting a clean separation of logic: frontend, extension, backend services, storage
- Providing a clear gateway via `auth-service` for all secure interactions

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
                        └──────────▶ │   API Gateway / Auth    │◀──[ auth-service w/ Clerk]
                                     └─────────────────────────┘
                                      ▲     │     ▲           ▲
                                      │     │     │           │
                                      ▼     │     ▼           ▼
                              [ storage ]   │   [ community ] [ payment ] ...
                                service     │     service       service
                                   │        │       ▲             ▲
                                   │        │       │             │
        [ Cloudflare R2 ] ◀────────┘        │       └────┬────────┘
                                            │            │
                                            ▼            ▼
                                  ┌────────────────────────┐
                                  │      db-service        │
                                  │  (ent / REST / gRPC)   │
                                  └────────────────────────┘
                                            │
                                            ▼
                                        [ Neon DB ]

