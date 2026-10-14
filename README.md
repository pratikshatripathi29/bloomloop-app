

# BloomLoop CRM
  Backend URL : https://bloomloop-app.onrender.com
  
  FRONTEND URL: https://bloomloop-app.vercel.app
  
# An enterprise-grade, full-stack Customer Relationship Management (CRM) platform powered by **FastAPI**, **React 19**, **PostgreSQL**, **Clerk Authentication**, and **Groq Cloud AI**.

BloomLoop empowers businesses to manage customer lifecycles, build dynamic audience segments, dispatch simulated multichannel marketing broadcasts, and query business intelligence using natural language—with bank-grade SQL isolation and PII protection.

---

## Architecture Overview

```
bloomloop/
├── backend/
│   ├── clients/           # External client integrations (Groq AI)
│   ├── core/              # Config, connection pooling, auth dependencies & rate limiting
│   ├── routers/           # API routes (customers, segments, campaigns, dashboard, ai, analytics)
│   ├── services/          # Business logic, query builders, and background workers
│   ├── tests/             # Comprehensive safety, injection defense & validation test suite
│   ├── main.py            # FastAPI entry point & global error handlers
│   └── seed.py            # Database seeding script (customers & orders)
└── frontend/
    ├── src/
    │   ├── components/    # Reusable UI widgets & modal drawers
    │   ├── hooks/         # Custom hooks (useCustomers, useDashboard, useDebouncedValue)
    │   ├── layout/        # AppLayout with responsive sidebar & Clerk UserButton
    │   ├── pages/         # DashboardPage, CustomersPage, SegmentsPage, Campaigns
    │   └── services/      # Axios API client layer with automatic Bearer token injection
    └── package.json
```

---

## Core Features

- **Executive Analytics Dashboard**
  - High-impact KPI cards: Total Customers, Gross Revenue, Average Order Value, and New Customer Acquisitions.
  - Interactive Recharts visualizations: Customer distribution by city and stacked campaign delivery telemetry.
  - **Ask AI Analytics**: Natural language BI assistant translating business questions into safe, backend-built queries.

- **Customer Directory & Lifecycle Management**
  - Paginated customer table with debounced live search and city filtering.
  - Complete CRUD operations with sliding Add/Edit Customer drawer.
  - Churn score risk monitoring and lifetime spend tracking.

- **Dynamic Audience Segments**
  - Parameterized criteria builder (City, Min/Max Spend, Order Frequency, Inactivity Days, Churn Risk).
  - Real-time customer matching count preview.
  - **AI Segment Suggester**: Converts plain English descriptions into validated filter criteria.

- **Multichannel Campaigns & Simulation**
  - Email, SMS, and WhatsApp broadcast creation.
  - Asynchronous background task simulating real-world carrier delivery rates (~85% delivered, ~15% failed).
  - **AI Campaign Copywriter**: Generates 3 high-converting message drafts customized by marketing goal and tone.

- **Security & Privacy by Design**
  - Cryptographic Clerk JWT authentication verified against live JWKS public keys.
  - **Zero SQL Execution by AI**: The AI never generates or runs raw SQL; queries are strictly constructed and parameterized by the backend.
  - **Zero Customer PII Exposure**: Customer emails and phone numbers are never transmitted to LLM providers.
  - In-memory sliding-window rate limiting on all AI endpoints.
  - Standardized error envelopes with zero stack-trace leakage.

---

## Environment Variables

### Backend (`bloomloop/backend/.env`)

Copy the template from `.env.example`:
```bash
cp bloomloop/backend/.env.example bloomloop/backend/.env
```

| Variable | Required | Description | Example |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | **Yes** | PostgreSQL connection string | `postgresql://user:pass@host:5432/dbname?sslmode=require` |
| `CLERK_JWKS_URL` | **Yes** | Clerk instance JWKS URL for JWT signature validation | `https://your-instance.clerk.accounts.dev/.well-known/jwks.json` |
| `GROQ_API_KEY` | **Yes** | Groq Cloud API Key for AI features | `gsk_...` |
| `FRONTEND_ORIGIN`| No | Allowed origin for CORS | `http://localhost:5173` |

### Frontend (`bloomloop/frontend/.env`)

| Variable | Required | Description | Example |
| :--- | :--- | :--- | :--- |
| `VITE_CLERK_PUBLISHABLE_KEY` | **Yes** | Clerk Frontend Publishable API Key | `pk_test_...` |
| `VITE_API_URL` | No | Base URL of the FastAPI backend | `http://localhost:8000` |

---

## Quickstart Guide

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** & npm
- PostgreSQL Database (e.g. Neon, Supabase, or local PostgreSQL)

---

### 1. Backend Setup

```bash
# Navigate to the backend directory
cd bloomloop/backend

# Create and activate a Python virtual environment
# Windows (PowerShell):
python -m venv venv
.\venv\Scripts\Activate.ps1

# macOS / Linux:
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure your environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL, CLERK_JWKS_URL, and GROQ_API_KEY
```

#### Run Database Seeding (Optional)
Populate realistic sample customers, orders, and aggregates:
```bash
python seed.py
```

#### Run Backend Safety & Validation Tests
```bash
python tests/run_tests.py
```

#### Start the FastAPI Server
```bash
uvicorn main:app --reload --port 8000
```
- Interactive Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health Check: [http://localhost:8000/health](http://localhost:8000/health)

---

### 2. Frontend Setup

In a new terminal window:
```bash
# Navigate to the frontend directory
cd bloomloop/frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

Open your browser at [http://localhost:5173](http://localhost:5173).

---

## API Reference Overview

All endpoints except `/health` and `/` require an `Authorization: Bearer <token>` header issued by Clerk.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/customers` | Paginated customer list with debounced search and city filter |
| `POST` | `/customers` | Create a new customer record |
| `PUT` | `/customers/{id}` | Update an existing customer (field whitelisted) |
| `DELETE`| `/customers/{id}` | Delete customer and cascading records |
| `GET` | `/segments` | List all segments with live customer count previews |
| `POST` | `/segments` | Create segment with validated filter parameters |
| `POST` | `/segments/preview` | Preview customer count for arbitrary filters |
| `GET` | `/campaigns` | List all campaigns with delivery statistics |
| `POST` | `/campaigns` | Dispatch campaign with background delivery worker |
| `GET` | `/dashboard` | Aggregated KPI metrics, city distributions, and recent sends |
| `POST` | `/ai/campaign-message` | **AI**: Generate 3 message drafts by goal & tone *(Rate Limited)* |
| `POST` | `/ai/segment-suggestion` | **AI**: Generate validated segment filters from natural language *(Rate Limited)* |
| `POST` | `/analytics/ask` | **AI**: Safe natural language business query engine *(Rate Limited)* |

---

## Senior Engineering Security Audit

During comprehensive review, the following safeguards were implemented:

1. **SQL Injection Neutralization**:
   - `services/segment_filters.py` enforces a strict whitelist of queryable dimensions.
   - All filter criteria are converted to `psycopg.sql.Composable` elements with explicit `%s` parameter binding.
   - Values containing SQL injection vectors (`'; DROP TABLE...`) are safely treated as literal parameter values.
2. **NaN / Infinity & Numeric Bounds Defense**:
   - Numeric inputs are verified with `math.isnan` and `math.isinf`.
   - Cross-field validation ensures `min_total_spent <= max_total_spent`.
   - Range validation bounds churn scores (`0.0 - 100.0`) and order counts.
3. **Mass Assignment Prevention**:
   - `routers/customers.py` applies a strict column update whitelist (`ALLOWED_UPDATE_FIELDS`) preventing modification of internal fields (`id`, `created_at`).
4. **AI SQL Isolation**:
   - The Groq AI output is restricted to a structured JSON specification.
   - The backend strictly enforces allowable metrics (`ALLOWED_METRICS`) and dimensions (`ALLOWED_GROUP_BY`).
   - The backend constructs and executes the SQL; SQL generated by an LLM is **never** executed.
5. **PII Protection**:
   - Customer emails, names, and phone numbers are never included in prompts sent to Groq Cloud.
6. **Rate Limiting & Denial of Service Protection**:
   - Sliding-window rate limiting (`core/rate_limiter.py`) throttles `/ai` endpoints to 15 requests/minute per client with standard HTTP 429 and `Retry-After` response headers.
7. **Consistent Error Envelope**:
   - Global exception handlers normalize all errors to `{ "detail": "...", "error": { "code": "...", "message": "...", "status": ... } }` preventing internal stack trace disclosure.

---

## License
MIT License. Created for the BloomLoop CRM project.
