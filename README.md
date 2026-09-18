# HireFlow Frontend — Enterprise Recruitment & Academy Portal

A responsive React SPA for end-to-end hiring and academy admissions: job postings, candidate profiles, HR review, and scored academy applications.

`React` `TypeScript` `Vite` `Auth` `Tailwind`

Companion API: [hireflow-backend](https://github.com/aliefecakir/hireflow-backend)

## Table of Contents

- [Overview](#overview)
- [Key Views & Portals](#key-views--portals)
- [Auth & Identity System](#auth--identity-system)
- [Tech Stack](#tech-stack)
- [Project Directory Structure](#project-directory-structure)
- [Getting Started](#getting-started)
- [Key Features](#key-features)

## Overview

HireFlow is a corporate hiring portal with two product surfaces behind a single SPA.

**Career** is an authenticated track for professional openings. Candidates complete a profile, apply to active posts, and follow application status. HR publishes job openings and updates application statuses throughout the hiring process.

**Academy** is a public admissions track. Visitors browse open forms and apply without an account. Program staff then score answers, and advance application status from a role-gated manager console.

The landing page offers **Corporate Login** (Microsoft / Azure AD via Supabase) for employees. Candidates can also register with email and password. Career visibility is controlled by the backend `CAREER_PORTAL_ON_OFF` parameter; Academy remains available.

Version: `1.0.1`

## Key Views & Portals

### Portal Home

- **Portal selection:** Choose Career or Academy from the landing page.
- **Corporate sign-in:** Azure AD SSO from the header, returning through `/auth/callback`.
- **Feature flag:** Hide Career when `CAREER_PORTAL_ON_OFF` is off.

### Candidate Dashboard

- **Open positions:** Browse active posts, expand requirements, apply once the profile is complete.
- **My applications:** Track personal applications and status badges.
- **Profile settings:** Phone, education, experience, skills, languages, and photo — required before applying.

### HR Dashboard

- **Job board:** Create and edit postings, set department/tech requirements, switch post status.
- **Application inbox:** Filter by status, open candidate profiles, and accept / reject / mark in review.

### Academy Public

- **Open calls:** List live forms with remaining time until the application window closes.
- **Apply form:** No login. University/department catalog search, candidate questions, and file/date/numeric answers.

### Academy Manager Console

| Role | Access |
| --- | --- |
| `Academy Manager` | Full form, question, and catalog management plus evaluation |
| `Admin` | Manager access plus the user-role admin panel |
| `Evaluation Manager` | Read forms and score / update application status |
| `Academy Visitor` | Read-only forms and applications |

- **Forms:** Search all forms (active and inactive), jump to applications, edit when write-capable.
- **Form builder:** Title, organization, start and end date, questions from the pool (candidate or interview questions). Unsaved-change guards on navigate.
- **Question pool:** Typed questions (open, single, multi, date, numeric) with score bounds and choices.
- **Score catalog:** University and department rows with editable scores and active flags.
- **Application review:** Multi-filter list (name, school, department, status, score ranges). Evaluation modal for answers, manual scores, interview evaluation, and status history.
- **Admin panel:** Search users and assign roles.

## Auth & Identity System

Authentication is owned by **Supabase Auth**. The SPA never stores passwords against the HireFlow API.

- **Email/password:** Candidate register (`signUp`) and login (`signInWithPassword`).
- **Microsoft SSO:** `signInWithOAuth({ provider: 'azure' })` with `email profile openid User.Read`. Callback: `/auth/callback`.
- **Session:** Persisted in `localStorage`, auto-refreshed in `src/shared/supabaseClient.js`.
- **API calls:** `src/shared/api/client.ts` attaches `Authorization: Bearer <access_token>` and refreshes before expiry.
- **Profile resolution:** Roles do **not** come from JWT claims. After login the client calls `GET /api/v1/users/me`; `ProtectedRoute` / `RoleGuard` map those roles to React Router paths.
- **Microsoft Graph:** With the Azure provider token, `src/shared/api/microsoft.ts` loads job title (`/me`) and photo (`/me/photo/$value`) for the header.
- **Home routing:** Academy staff → `/academy/manager/forms`, HR → `/hr/jobs`, candidates → `/candidate/posts`.

Users with a valid session but no active `USER_ROLE` see a “role not found” state instead of a protected page.

## Tech Stack

| Component | Technology | Purpose |
| --- | --- | --- |
| Core framework | React 19 | UI and portal shells |
| Language | JavaScript + TypeScript | Views in JSX; API contracts in `.ts` |
| Build tool | Vite 8 | Dev server and production bundle |
| Router | React Router 7 | SPA routes, nested layouts, guards |
| Styling | Tailwind CSS 4 | Layout, badges, responsive shells |
| Auth | `@supabase/supabase-js` | Email auth and Azure AD OAuth |
| Directory data | Microsoft Graph | Job title and profile photo after SSO |
| HTTP | Fetch (`api/client.ts`) | HireFlow REST with bearer JWT |
| Icons | Lucide React | Navigation and status icons |
| Hosting | Vercel | SPA rewrites via `vercel.json` |

## Project Directory Structure

```
src/
├── academy/
│   ├── public/                 # Visitor form list and apply flow
│   │   ├── Academy.jsx
│   │   ├── AcademyApply.jsx
│   │   └── CatalogSearchSelect.jsx
│   ├── manager/                # Staff console (forms, pool, catalog, admin)
│   │   ├── AcademyManagerLayout.jsx
│   │   ├── FormListPage.jsx
│   │   ├── CreateFormView.jsx
│   │   ├── QuestionPoolView.jsx
│   │   ├── ApplicationListPage.jsx
│   │   ├── EvaluationModal.jsx
│   │   ├── CatalogScorePage.jsx
│   │   └── AdminPanelPage.jsx
│   └── api/                    # Academy HTTP clients and helpers
├── hire/
│   ├── CandidateLayout.jsx     # Candidate shell
│   ├── CandidateJobs.jsx
│   ├── CandidateProfile.jsx
│   ├── CandidateApplications.jsx
│   ├── HRLayout.jsx            # HR shell
│   ├── HRJobs.jsx
│   ├── HRApplications.jsx
│   └── api/                    # Posts, applications, profile clients
├── shared/
│   ├── AuthContext.jsx         # Session + /users/me profile
│   ├── ProtectedRoute.jsx      # Role-gated routes
│   ├── PortalSelection.jsx     # Landing page
│   ├── Login.jsx / Register.jsx / AuthCallback.jsx
│   ├── supabaseClient.js
│   └── api/
│       ├── client.ts           # Token refresh and fetch wrapper
│       ├── auth.ts             # Roles, homes, /users/me
│       ├── microsoft.ts        # Graph job title & photo
│       └── parameters.ts       # CAREER_PORTAL_ON_OFF
├── App.jsx                     # Route table
└── main.jsx
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- Running [hireflow-backend](https://github.com/aliefecakir/hireflow-backend) (default `http://localhost:8080`)
- A Supabase project with email auth and (optionally) Azure provider

### Configuration

Copy `.env.example` to `.env` in the project root:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:8080
```

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_API_URL` | Backend origin (no trailing slash) |

Do not commit `.env`. Vite inlines these values at **build** time.

### Installation & local run

```bash
git clone https://github.com/aliefecakir/hireflow-frontend.git
cd hireflow-frontend
npm install
cp .env.example .env
npm run dev
```

App: [http://localhost:5173](http://localhost:5173)

```bash
npm run build     # production bundle
npm run preview   # serve dist/
npm run lint      # ESLint
```

Backend CORS already allows `http://localhost:5173` and `*.vercel.app`.

## Key Features

- Dual-portal landing with a runtime Career on/off switch
- Role-aware sidebars and nested layouts (candidate, HR, academy manager)
- JWT attached to every API call, with silent refresh
- Microsoft SSO plus Graph-backed header identity
- Candidate profile completeness gate before job apply
- HR job lifecycle and application status workflow
- Public academy apply with scored catalogs (university / department)
- Question bank with candidate vs interview attachments
- Evaluation workspace: auto scores, manual open-ended points, interview criteria, status history
- Admin role assignment without leaving the SPA
- Toast feedback and unsaved-form navigation guards in the academy builder
- Vercel SPA rewrite so deep links (`/academy/manager/forms/...`) resolve on refresh
