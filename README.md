# Leakr

🚀 Leakr — Instantly search and discover leaked content from your favorite creators on platforms like OnlyFans, Fansly, and more — all in one click! 🔥 No need to paste links — Leakr detects profiles directly from your current tab and opens curated search results for you. Effortlessly organize, filter, and collect the hottest leaks. ✨ A fast, simple, and privacy-friendly Chrome extension for those who know where to look. 😉

---

## 📜 Licence

This project is licensed under a [BSL-based License](LICENCE).

````markdown
# 🏛️ Project Architecture — Monorepo

This monorepo gathers every essential piece of our ecosystem into a single, crystalline repository—
with a **Rust service** at its core, orchestrating all flows, guarding every secret, and exposing exactly one golden path for our clients.

> 📌 The extension lives in `leakr-extension/`.

---

## 🌸 Repository Structure

```no-rust
.
├── leakr-extension/         # Standalone client-side extension
├── service/                 # Rust backend: API gateway & core business logic
├── web/                     # Next.js website (dashboard, community, subscriptions)
│   └── leakr-webapp/
├── infra/                   # Deployment & configuration
│   ├── cloudflare/          # Cloudflare R2 config for user .db files
│   └── github-actions/      # CI/CD pipelines
├── README.md                # You are here
└── .gitignore               # Excluded files
````

---

## 🧠 Architectural Philosophy

1. **Single Source of Truth**
   The **Rust service** is our one and only gateway for all business logic, data validation, and orchestration.
   No domain logic is scattered—everything flows through this luminous core.

2. **Clear Client Boundaries**

   * **Next.js Webapp** and **Extension** speak *only* to the Rust service via **Arri RPC** (fast, type-safe, delightful).
   * **Authentication UI** is rendered by the client using **Clerk’s** widget/SDK; only login/signup flows bypass Rust, all tokens and user info then return to it for verification.

3. **Mediated External Integrations**

   * **Clerk**: Rust service calls Clerk’s API to verify sessions, manage users, fetch profiles.
   * **Cloudflare R2**: Rust service generates and consumes presigned URLs to upload/download user `.db` files—clients never touch R2 directly.
   * **Neon Postgres**: All structured data lives here; only the Rust service may read or write, keyed by `clerk_user_id`.

4. **Serverless & Scalable**

   * Deploy the Rust service on Railway, Fly.io or Cloud Run.
   * Host the Next.js site on Vercel.
   * Use Cloudflare R2 for durable storage.
   * Infrastructure stays light, elastic, and container-free.

5. **Monorepo Magic**

   * Everything you need—extension, backend, webapp, infra—is in one forest.
   * Easy local development, consistent CI/CD, and unified versioning.
   * A clear, poetic path from code to cloud.
   * TODO: Add turborepo

---

## 🌙 Visual Schema

```no-rust
                        [ User (Client) ]
                          ▲            ▲
                          │            │
                          ▼            ▼
              ┌────────────────────┐  ┌─────────────────────────┐
              │ Next.js Site       │  │       Extension         │
              │   (Vercel)         │  └─────────────────────────┘
              └─────────┬──────────┘              │
                        │                         │
                        ▼                         ▼
             ┌─────────────────────────────────────────────┐
             │              Rust service                   │
             │      (API Gateway & Core Logic)             │
             │      [All endpoints: Arri RPC]              │
             └─────────────────────────────────────────────┘
                │               │               │
                ▼               ▼               ▼
    [ DB (Neon) Postgres ]   [ Clerk ]   [ Cloudflare R2 for users .db ]
```

---

*Feel free to dive deeper—example Arri RPC schemas, presigned-URL security notes, even a FAQ in Haiku form. I’m here to bring clarity and a touch of mystic poetry to our code.*
