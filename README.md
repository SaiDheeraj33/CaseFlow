# CaseFlow

> **Import → Validate → Fix → Submit → Track**

A production-ready web app for operations teams to upload CSV files, validate/clean data in a rich grid, and bulk-create cases through an API.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL (or use Supabase)

### One-Command Start (Docker)

```bash
# Clone and start all services
docker compose up
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000/api
- **Swagger Docs**: http://localhost:3000/api/docs

### Manual Setup

**Backend:**
```bash
cd app/backend
npm install
cp .env.example .env
# Edit .env with your Supabase/PostgreSQL credentials
npx prisma generate
npx prisma db push
npm run start:dev
```

**Frontend:**
```bash
cd app/frontend
npm install
npm run dev
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      AWS CloudFront                          │
│                           ↓                                  │
│  ┌─────────────────┐    ┌────────────────────┐              │
│  │   S3 (Static)   │    │   ECS Fargate      │              │
│  │   React SPA     │    │   NestJS API       │              │
│  └────────┬────────┘    └─────────┬──────────┘              │
│           │                       │                          │
│           └───────────┬───────────┘                          │
│                       ↓                                      │
│              ┌────────────────┐                              │
│              │   Supabase     │                              │
│              │   PostgreSQL   │                              │
│              └────────────────┘                              │
└─────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Zustand, TanStack Table |
| Backend | NestJS, TypeScript, Prisma, Passport-JWT |
| Database | PostgreSQL (Supabase) |
| Auth | JWT + Refresh + Magic Link |
| Infra | AWS CDK, S3, CloudFront, ECS Fargate |

## ✨ Features

### Core Features
- **CSV Upload** - Drag & drop with file parsing
- **Smart Column Mapping** - Fuzzy matching with confidence scores
- **Virtualized Grid** - Handle 50k+ rows smoothly
- **Validation Engine** - Zod-based with inline errors
- **Fix Helpers** - Trim, title-case, phone normalize
- **Batch Submit** - Chunked with progress & retry
- **Cases List** - Cursor-based pagination & filters
- **Case Details** - Timeline, notes, audit history

### Polish Features
- 🌙 **Dark Mode** - System sync + manual toggle
- 🔔 **Smart Notifications** - Toast + browser notifications
- 🦴 **Skeleton Loaders** - Loading states everywhere
- ⌨️ **Keyboard Shortcuts** - Power user mode
- 📊 **Analytics Dashboard** - Import trends & charts

### Auth
- Email/password login
- Magic link authentication
- JWT with refresh tokens
- Role-based access (Admin/Operator)

## 📁 Project Structure

```
/app
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route pages
│   │   ├── store/          # Zustand stores
│   │   ├── utils/          # Helpers, validation
│   │   └── i18n/           # Translations
│   └── e2e/                # Playwright tests
├── backend/
│   ├── src/
│   │   ├── auth/           # JWT + Magic Link
│   │   ├── cases/          # Cases CRUD
│   │   ├── import/         # Batch import
│   │   └── prisma/         # Database
│   └── prisma/
│       └── schema.prisma
├── infra/                   # AWS CDK
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## 🔧 Design Decisions

### Grid Choice: TanStack Table + react-virtual
- **Why**: Free, highly customizable, great TypeScript support
- **Performance**: Virtualization renders only visible rows
- **Tradeoff**: More manual work than AG Grid, but full control

### 50k Row Performance Strategy
1. **CSV Parsing**: PapaParse (could add Web Worker for blocking)
2. **Grid**: Virtualized with react-virtual (only ~50 rows in DOM)
3. **Validation**: Chunked processing with progress
4. **Submit**: Batches of 100 rows per API call

### Cursor-based Pagination
- Better performance for large datasets
- No "jump to page" but consistent results
- Efficient with database indexes

## 🔒 Security

- JWT with short-lived access tokens (15m)
- Refresh tokens in localStorage (httpOnly cookie recommended for production)
- Magic link tokens expire in 10 minutes
- Input validation with class-validator (BE) and Zod (FE)
- SQL injection prevented by Prisma
- Rate limiting on auth endpoints
- Helmet security headers

## 🧪 Testing

### Run Tests
```bash
# Backend unit tests
cd app/backend && npm run test

# Frontend component tests
cd app/frontend && npm run test

# E2E tests
cd app/frontend && npm run test:e2e
```

### Test Coverage
- Auth service (login, register, magic link)
- Cases service (CRUD, pagination)
- Import service (batch validation)
- Frontend components (grid, validation)
- E2E: Full import flow

## 🚢 Deployment

### Frontend (S3 + CloudFront)
```bash
cd app/frontend
npm run build
# Deploy dist/ to S3
```

### Backend (ECS Fargate)
```bash
cd infra
npm run cdk deploy
```

### Environment Variables

**Backend (.env)**
```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret
JWT_REFRESH_SECRET=your-refresh-secret
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email
SMTP_PASS=your-app-password
```

**Frontend (.env)**
```
VITE_API_URL=https://api.your-domain.com/api
```

## 📄 API Documentation

Swagger UI available at `/api/docs` when running the backend.

### Key Endpoints
- `POST /api/auth/login` - Email/password login
- `POST /api/auth/magic-link` - Send magic link
- `GET /api/cases` - List cases (cursor pagination)
- `POST /api/import/start` - Start import job
- `POST /api/import/:jobId/batch` - Submit batch

## 📋 Sample Data

Two CSV files included:
- `sample-cases-clean.csv` - 10 valid records
- `sample-cases-errors.csv` - Records with validation errors

## 📝 License

MIT
