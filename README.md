# Welona Admin Panel

Web application (Admin Panel) for the **Welona Health & Wellness** enterprise platform.

Built per the *Welona Developer Reference Architecture & Implementation Guide v2.0*.

## Tech Stack

| Concern    | Technology                          |
| ---------- | ----------------------------------- |
| Framework  | Next.js 14 (App Router, TypeScript) |
| UI Library | Ant Design 5                        |
| Styling    | Tailwind CSS 3 + Black & Gold theme |
| State      | React Query + Zustand               |
| Charts     | Apache ECharts                      |

## Getting Started

```bash
npm install        # install dependencies (also runs `prisma generate`)
npm run db:push    # create the local SQLite database from the Prisma schema
npm run db:seed    # seed org, branches, roles and staff accounts
npm run dev        # start dev server -> http://localhost:3001
```

Other scripts:

```bash
npm run build       # production build
npm run start       # serve production build
npm run lint        # ESLint
npm run type-check  # TypeScript check (strict mode)
npm run db:studio   # open Prisma Studio (database GUI)
npm run db:reset    # wipe + recreate + reseed the database
```

## Local Database

For local development the app runs its **own backend**: Next.js route handlers
under `src/app/api/v1/` backed by a **SQLite** database via Prisma
(`prisma/schema.prisma`, data in `prisma/dev.db`). This implements the API
contracts from section 6 of the reference architecture, so the panel uses real
persisted data with no separate server.

To switch to the production PostgreSQL backend later, change the Prisma
`datasource` provider and point `NEXT_PUBLIC_API_URL` at the NestJS service.

## Login

Authentication is **real** (JWT + 2FA, sections 7.1–7.3). Sign in with a seeded
account — password `Welona@123` for all of them:

| Email                     | Role           |
| ------------------------- | -------------- |
| `admin@welona.com`        | Super Admin    |
| `ho@welona.com`           | HO Manager     |
| `manager.cp@welona.com`   | Branch Manager |
| `reception.cp@welona.com` | Receptionist   |
| `finance@welona.com`      | Finance        |

Every account has 2FA enabled. Since there is no SMS provider locally, the
6-digit code is shown on the login screen and logged to the server console.

## Project Structure

```
src/
├── app/
│   ├── api/v1/              # Backend route handlers (auth, users, ...)
│   ├── (auth)/login/        # Login screen (centered, no sidebar)
│   ├── (dashboard)/         # Sidebar + Header shell (AuthGuard-wrapped)
│   │   ├── page.tsx         # Dashboard home (KPIs + charts)
│   │   └── <module>/        # 14 module routes (placeholder pages)
│   ├── layout.tsx           # Root layout + providers
│   ├── providers.tsx        # Antd / React Query providers
│   └── globals.css
├── components/
│   ├── auth/                # AuthGuard
│   ├── common/              # PlaceholderPage
│   ├── dashboard/           # RevenueChart
│   └── layout/              # Sidebar, Header
├── hooks/                   # useAuth (login, verify-otp, logout, me)
├── lib/
│   ├── api/                 # Response envelope, errors, route handler
│   ├── auth/                # JWT + session service
│   ├── api-client.ts        # Typed fetch client (envelope + token refresh)
│   ├── db.ts                # Prisma client singleton
│   └── rbac.ts              # Role + permission catalogue (section 7.3)
├── config/navigation.ts     # Module navigation registry
├── store/authStore.ts       # Zustand auth store
├── types/                   # Shared types (auth, ...)
├── theme/                   # colors.ts, antdTheme.ts (Black & Gold)
└── middleware.ts            # Route guard (auth cookie)

prisma/
├── schema.prisma            # Database schema (SQLite for local dev)
└── seed.ts                  # Seed script
```

## Modules

The sidebar exposes all Admin Panel routes from section 4.4 of the reference
architecture: Dashboard, Bookings, Services, Products, Inventory, Customers,
Staff, Branches, Finance, Promotions, Support, Reports, Analytics,
Notifications and Settings. Each is scaffolded as a placeholder page ready for
its list/detail/form screens.

## Environment

Copy `.env.example` to `.env` (Prisma + server) and `.env.local` (browser).
`.env` holds `DATABASE_URL` and the JWT secrets; `.env.local` holds the
`NEXT_PUBLIC_*` values. Both are git-ignored.
