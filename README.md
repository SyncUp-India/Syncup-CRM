# SyncUp CRM

Full-stack B2B SaaS Sales CRM — monorepo with a Node.js/Prisma API, Next.js web app, and Expo mobile app.

## Project Structure

```
syncup-crm/
├── packages/
│   ├── api/        Node.js + Express + PostgreSQL + Prisma
│   ├── web/        Next.js 15 web app
│   ├── mobile/     Expo React Native (iOS + Android)
│   └── shared/     Shared TypeScript types, constants, utils
├── package.json    Workspace root (npm workspaces)
└── turbo.json      Turborepo pipeline
```

## Quick Start

### 1. Prerequisites
- Node.js 20+
- PostgreSQL running locally
- (Optional) Expo CLI + EAS CLI for mobile

### 2. Install dependencies
```bash
npm install
```

### 3. Environment setup
```bash
cp .env.example packages/api/.env
# Edit packages/api/.env with your DATABASE_URL and SMTP credentials
```

Add to `packages/web/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

### 4. Database setup
```bash
cd packages/api
npx prisma migrate dev --name init
npx prisma generate
npm run db:seed    # Creates sample users + leads + email templates
```

### 5. Run everything
```bash
# From repo root:
npm run dev        # Runs API + Web concurrently via Turborepo
```

Or run individually:
```bash
# API (port 4000)
cd packages/api && npm run dev

# Web (port 3000)
cd packages/web && npm run dev

# Mobile
cd packages/mobile && npx expo start
```

## Default Credentials (after seed)
| Role        | Email                  | Password  |
|-------------|------------------------|-----------|
| Super Admin | admin@syncup.com       | admin123  |
| Lead        | lead@syncup.com        | lead123   |
| Associate   | associate@syncup.com   | assoc123  |

## Features

### User Roles
- **Super Admin**: Full access — users, all leads, reports, settings, audit log
- **Lead**: Team leads + reports (filtered)
- **Associate**: Own assigned leads only

### Leads
- Full CRUD with stage management (DNP → Callback → Followup → Meeting → Onboarded)
- Stage quick-change from list view (dropdown)
- Lead type: Inbound / Outbound / Cold
- Search by name, company, phone, email
- Filter by stage, type, assigned user, date range
- Pagination (25/page on web, infinite scroll on mobile)

### Email Automation
- Automated email sent on every stage change
- Templates editable by Super Admin
- Variables: `{{name}}`

### Followup System
- Up to 3 scheduled followups per lead
- Push notification + in-app alert at scheduled time (via node-cron + Expo)
- Leads with pending followups marked clearly

### Calling
- Mobile: Native dialer via `tel:` deep link
- Call attempt logged to activity timeline automatically

### CSV / XLSX Import
- Upload CSV or XLSX files
- Preview with error highlighting before confirming
- Bulk assign to a user (Super Admin)
- Import summary with per-row error reasons

### Dashboard & Reports
- Stats: total leads, by type, by stage, calls made, followups, conversion rate
- Charts: stage bar chart, daily activity line chart, type pie chart, user performance (Admin)
- Period filters: Today / Week / Month

### Notifications
- In-app bell with unread count (auto-refreshes every 30s on web)
- Push notifications via Expo Notifications
- Notification history page

### Settings (Super Admin)
- User management (create, deactivate)
- Email template editor (per-stage, HTML)
- SMTP configuration

### Audit Log
- Every lead stage change, field update, creation, deletion logged
- Filterable by user and entity type

## Tech Stack

| Layer       | Technology                              |
|-------------|-----------------------------------------|
| API         | Node.js, Express, TypeScript            |
| ORM         | Prisma + PostgreSQL                     |
| Auth        | JWT (jsonwebtoken + bcryptjs)           |
| Email       | Nodemailer (SMTP configurable)          |
| Push        | Expo Server SDK                         |
| Scheduler   | node-cron (followup reminders)          |
| File upload | multer + xlsx + papaparse               |
| Web         | Next.js 15, React 19, Tailwind CSS      |
| Charts      | Recharts (web), react-native-chart-kit  |
| State       | Zustand                                 |
| Mobile      | Expo SDK 52, React Navigation           |
| Monorepo    | npm workspaces + Turborepo              |

## API Routes

```
POST   /api/auth/login
GET    /api/auth/me
PUT    /api/auth/me/push-token
PUT    /api/auth/me/password

GET    /api/leads                   search, filter, paginate
GET    /api/leads/export            CSV download (admin)
GET    /api/leads/:id               full detail + activities + followups
POST   /api/leads
PUT    /api/leads/:id
PATCH  /api/leads/:id/stage
POST   /api/leads/:id/notes
POST   /api/leads/:id/call
POST   /api/leads/:id/followups
PATCH  /api/leads/:id/followups/:fid/complete
DELETE /api/leads/:id               (admin only)

GET    /api/users
POST   /api/users                   (admin only)
PUT    /api/users/:id               (admin only)
DELETE /api/users/:id               (admin only)

GET    /api/dashboard/stats
GET    /api/dashboard/daily-activity
GET    /api/dashboard/user-performance

GET    /api/notifications
PATCH  /api/notifications/:id/read
PATCH  /api/notifications/read-all
GET    /api/notifications/unread-count

GET    /api/settings/email-templates
PUT    /api/settings/email-templates/:stage
GET    /api/settings/smtp           (admin only)
PUT    /api/settings/smtp           (admin only)
POST   /api/settings/email-templates/seed

POST   /api/upload/preview
POST   /api/upload/confirm

GET    /api/audit

GET    /api/health
```

## Mobile Setup Notes

For testing on a physical device, update the API URL in `packages/mobile/src/api/index.ts`:
```ts
const API_URL = 'http://YOUR_MACHINE_IP:4000/api';
```

For push notifications, you need an Expo account and EAS project ID in `app.json`.

## Production Deployment

- **API**: Deploy to Railway, Render, or any Node.js host. Set all env vars.
- **Web**: Deploy to Vercel (set `NEXT_PUBLIC_API_URL` env var).
- **Mobile**: Build with EAS Build (`eas build --platform all`).
- **Database**: Use managed PostgreSQL (Supabase, Neon, Railway, etc.).
