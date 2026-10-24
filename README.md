# Peasants Running Kit 🏃‍♂️📦

Full-stack holding page, e-commerce store, and administrative CMS for **Peasants Running Kit** (Peasants Revolt Running Club), hosted at [`peasants-running-kit.store`](https://peasants-running-kit.store).

Built with a **Next.js 14 Frontend** statically exported to Firebase Hosting, a **Node.js Express TypeScript Backend API** adhering strictly to **Hexagonal Architecture** deployed on GCP Cloud Run, **Cloud Firestore** document database, and **Terraform Infrastructure as Code**.

---

## 🌟 Key Features

- **Storefront Catalogue (`/`)**: Main kit catalogue supporting item browsing, multi-image display, drag-and-drop file uploads in admin, size selection (XS–XXL), sticky shopping basket drawer, and instant order creation.
- **Monzo Payment Deep-Linking**: Orders generate a unique reference (`PRRC-XXXX`) and direct deep links to Monzo transfers (`https://monzo.me/terenceanthonysumpter/[amount]?d=PRRC-XXXX`).
- **User Order Tracking (`/store/orders`)**: Dedicated page allowing club members to look up order status, item breakdowns, and payment state.
- **Organiser Admin CMS (`/admin`)**: Organiser portal protected by authentication with drag-and-drop multi-file upload for product images, product management, and updating customer order payment/fulfillment statuses.
- **Hexagonal Architecture**: Strict separation of concern between Domain Entities, Inbound/Outbound Ports, Use Cases, Driving HTTP Controllers, and Driven Database/Storage Adapters.
- **Zero Hardcoded Backend URLs**: Firebase Hosting proxy rewrite (`/api/**` $\rightarrow$ Cloud Run API) enables zero hardcoded backend URLs in git and zero CORS issues.

---

## 🧪 Testing Suite

The repository features comprehensive testing across unit, integration, and end-to-end (E2E) UI user journeys:

- **Backend Unit Tests** (Vitest): Covers all Domain Use Cases (`GetProducts`, `CreateOrder`, `ManageProduct`) and HTTP Controllers (`ProductsController`, `OrdersController`, `UploadController`).
- **Frontend Unit Tests** (Vitest + React Testing Library): Covers API client methods, mock handlers, and UI component rendering (`StoreHeader`).
- **Playwright E2E User Journey Tests**: Full automated browser test running against local Firestore emulator. Simulates Admin login $\rightarrow$ Product creation $\rightarrow$ Storefront catalogue browsing $\rightarrow$ Monzo checkout order placement $\rightarrow$ Admin payment & fulfillment status updates.

### Test Commands

```bash
# Run all unit tests (Backend + Frontend)
npm run test:unit

# Run Playwright E2E Journey Tests (against local Firestore emulator)
npm run test:e2e

# Run Playwright QA Smoke Tests (against live QA deployment)
npm run test:smoke:qa

# Or run smoke tests with custom QA base URL
PLAYWRIGHT_BASE_URL="https://peasants-running-kit-qa.web.app" npm run test:smoke
```

---

### ⚡ One-Command Local Development (With Firestore Emulator)

Run the Firestore Emulator, Express Backend API, and Next.js Frontend concurrently in a single command:

```bash
npm run dev:emulator
```

This starts:
- **Firestore Emulator**: Listening on `http://127.0.0.1:8085`
- **Firebase Emulator UI**: Accessible at `http://127.0.0.1:4000/firestore`
- **Backend API**: Listening on `http://localhost:8080` (automatically connected to the local Firestore emulator)
- **Frontend App**: Listening on `http://localhost:3000`

---

### Running Individual Services

- **Firestore Emulator**: `npm run emulator`
- **Backend API**: `npm run backend:dev`
- **Frontend App**: `npm run frontend:dev`

---

---

## 🚀 Deployment Guide & Environments

For complete IAM bindings, service account setup, and GitHub repository secrets configuration, refer to the [QA Environment Setup Guide](docs/QA_ENVIRONMENT_SETUP.md).

### 1. Multi-Environment Infrastructure via Terraform

```bash
# Provision QA Environment
cd infrastructure/environments/qa
terraform init
terraform plan
terraform apply

# Provision Production Environment
cd infrastructure/environments/prod
terraform init
terraform plan
terraform apply
```

### 2. Build & Push Backend Container Image

```bash
# For QA (peasants-running-kit-qa)
docker build --pull --no-cache --platform linux/amd64 -t europe-west2-docker.pkg.dev/peasants-running-kit-qa/peasants-running-kit/backend-api:latest backend
docker push europe-west2-docker.pkg.dev/peasants-running-kit-qa/peasants-running-kit/backend-api:latest

# For Production (peasants-running-kit)
docker build --pull --no-cache --platform linux/amd64 -t europe-west2-docker.pkg.dev/peasants-running-kit/peasants-running-kit/backend-api:latest backend
docker push europe-west2-docker.pkg.dev/peasants-running-kit/peasants-running-kit/backend-api:latest
```

### 3. Build & Deploy Frontend to Firebase Hosting

```bash
cd app
npm run build

# Deploy to QA
npx -y firebase-tools@latest deploy --only hosting --project peasants-running-kit-qa

# Deploy to Production
npx -y firebase-tools@latest deploy --only hosting --project peasants-running-kit
```

### 4. CI/CD Pipeline Automation
- **Continuous QA Deployment**: Pushes to `main` automatically deploy to `peasants-running-kit-qa` and run automated Playwright smoke tests against the live URL.
- **Gated Production Deployment**: Production deployments can **only** be triggered via GitHub Actions `workflow_dispatch` requiring manual selection of `production` and safety confirmation `DEPLOY_PROD`.


---

## 🔒 Security & Environment Configuration

- **No Hardcoded Keys in Git**: Environment files (`.env`, `.env.local`) are strictly excluded via `.gitignore`.
- **Zero CORS Issues**: Frontend sends relative `/api/*` requests to Firebase Hosting, which proxies requests server-side to Cloud Run.
- **Firebase Authentication & Identity Platform**: Provisioned via Terraform (`google_identity_platform_config`).

---

## 📄 License

Internal project for **Peasants Revolt Running Club**. All rights reserved.
