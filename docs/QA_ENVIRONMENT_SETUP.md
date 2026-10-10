# QA Environment Setup & Multi-Environment Configuration Guide

This guide details the dedicated QA environment (`peasants-running-kit-qa`) configured alongside Production (`peasants-running-kit`), the credential segregation, GitHub Actions CI/CD pipeline triggers, and the post-deployment Playwright smoke test suite.

---

## 1. Multi-Environment Overview

| Component | QA Environment | Production Environment |
| :--- | :--- | :--- |
| **GCP Project ID** | `peasants-running-kit-qa` | `peasants-running-kit` |
| **GCP Project Number** | `994022371480` | `98587359280` |
| **Terraform State Bucket** | `peasants-running-kit-qa-tfstate` | `peasants-running-kit-tfstate` |
| **Terraform State Prefix** | `qa` | `holding-page` |
| **Cloud Run Service** | `peasants-running-kit-api` | `peasants-running-kit-api` |
| **Artifact Registry** | `peasants-running-kit` (in QA project) | `peasants-running-kit` (in Prod project) |
| **Frontend Live URL** | `https://peasants-running-kit-qa.web.app` | `https://peasants-running-kit.store` |
| **Custom Domains** | Disabled (`null`) | `peasants-running-kit.store`, `www.peasants-running-kit.store` |
| **Deployment Trigger** | **Automatic** on push/merge to `main` | **Manual only** via `workflow_dispatch` (`DEPLOY_PROD`) |

---

## 2. Infrastructure as Code (Terraform)

Terraform infrastructure is structured using a shared reusable module (`modules/core`) with dedicated environment root directories (`environments/qa` and `environments/prod`). Each environment has its own static GCS backend definition, separate state, and distinct outputs. Production includes custom domain mappings for `peasants-running-kit.store` and `www.peasants-running-kit.store`, whereas QA remains clean and lightweight without custom domain mappings.

> **Cloud Run Initial Bootstrap**: On first apply in a brand new environment (before CI/CD has built the backend container), Cloud Run is bootstrapped with Google's public hello container (`us-docker.pkg.dev/cloudrun/container/hello`). Terraform sets `lifecycle { ignore_changes = [template[0].containers[0].image] }` so subsequent backend image deployments by GitHub Actions are preserved and never overwritten by Terraform.

### Directory Structure
```text
infrastructure/
├── environments/
│   ├── qa/
│   │   ├── backend.tf          # State bucket: peasants-running-kit-qa-tfstate, prefix: qa
│   │   ├── main.tf             # Calls module "../../modules/core" with environment = "qa"
│   │   ├── variables.tf        # project_id default: "peasants-running-kit-qa"
│   │   └── outputs.tf          # QA outputs (Cloud Run URL, Firebase URL, Web App config)
│   └── prod/
│       ├── backend.tf          # State bucket: peasants-running-kit-tfstate, prefix: holding-page
│       ├── main.tf             # Calls module "../../modules/core" + configures apex and www domains
│       ├── variables.tf        # project_id default: "peasants-running-kit"
│       └── outputs.tf          # Production outputs (including apex_domain & www_domain)
└── modules/
    └── core/
        ├── main.tf             # APIs, Firestore, Identity Platform, Artifact Registry, Cloud Run, Firebase Hosting
        ├── variables.tf        # Module input variables
        └── outputs.tf          # Core module resource outputs
```

### Local Terraform Commands

#### QA Environment
```bash
cd infrastructure/environments/qa
terraform init
terraform plan
terraform apply
```

#### Production Environment
```bash
cd infrastructure/environments/prod
terraform init
terraform plan
terraform apply
```

---

## 3. GCP IAM Permissions & Service Account Setup for QA

To enable automated CI/CD deployments targeting `peasants-running-kit-qa`, create a dedicated service account in the QA project:

```bash
# 1. Create service account in QA project
gcloud iam service-accounts create github-actions-qa \
    --project=peasants-running-kit-qa \
    --display-name="GitHub Actions QA CI/CD"

# 2. Assign required IAM roles in QA project
for ROLE in \
    roles/run.admin \
    roles/artifactregistry.admin \
    roles/firebasehosting.admin \
    roles/firebase.admin \
    roles/datastore.user \
    roles/identityplatform.admin \
    roles/resourcemanager.projectIamAdmin \
    roles/iam.serviceAccountUser \
    roles/storage.admin \
    roles/serviceusage.serviceUsageAdmin; do
  gcloud projects add-iam-policy-binding peasants-running-kit-qa \
      --member="serviceAccount:github-actions-qa@peasants-running-kit-qa.iam.gserviceaccount.com" \
      --role="$ROLE"
done

# 3. Generate Service Account Key JSON
gcloud iam service-accounts keys create /tmp/gcp-sa-key-qa.json \
    --iam-account=github-actions-qa@peasants-running-kit-qa.iam.gserviceaccount.com \
    --project=peasants-running-kit-qa
```

The contents of `/tmp/gcp-sa-key-qa.json` should be added as the GitHub Secret `GCP_SA_KEY_QA`. Note: QA workflows enforce strict credential segregation and will never fall back to production credentials.

---

## 4. GitHub Repository Secrets Checklist

Configure the following secrets in GitHub (**Settings $\rightarrow$ Secrets and variables $\rightarrow$ Actions**):

### Dedicated QA Secrets
| Secret Name | Description | Example / Default |
| :--- | :--- | :--- |
| `GCP_SA_KEY_QA` | Service account JSON key for `github-actions-qa` | `{ "type": "service_account", ... }` |
| `QA_FIREBASE_API_KEY` | Firebase Web API key for `peasants-running-kit-qa` | Generated by Firebase console / Terraform |
| `QA_FIREBASE_APP_ID` | Firebase Web App ID for QA web app | `1:994022371480:web:...` |
| `QA_ADMIN_PASSWORD` | Password for Organiser Admin CMS on QA | `peasants2026!` or custom QA password |
| `QA_TEST_USER_EMAIL` | *(Optional)* Pre-created runner email for smoke tests | If empty, smoke tests register dynamic accounts |
| `QA_TEST_USER_PASSWORD`| *(Optional)* Pre-created runner password | Required only if `QA_TEST_USER_EMAIL` is set |

### Production Secrets
| Secret Name | Description | Example / Default |
| :--- | :--- | :--- |
| `GCP_SA_KEY_PROD` *(or `GCP_SA_KEY`)* | Service account JSON key for production | `{ "type": "service_account", ... }` |
| `PROD_FIREBASE_API_KEY` *(or `NEXT_PUBLIC_FIREBASE_API_KEY`)* | Firebase Web API key for `peasants-running-kit` | Production API Key |
| `PROD_FIREBASE_APP_ID` *(or `NEXT_PUBLIC_FIREBASE_APP_ID`)* | Firebase Web App ID for production | `1:98587359280:web:8e3063a02fc4408c2f15f5` |
| `ADMIN_PASSWORD` | Password for Organiser Admin CMS on Production | Production admin password |

---

## 5. CI/CD Deployment Flow & Gating

### Continuous QA Deployment (`main` Branch)
- Pushing to `main` with changes in `backend/**` triggers `.github/workflows/backend.yml`, deploying the backend container to Cloud Run in `peasants-running-kit-qa`.
- Pushing to `main` with changes in `app/**` triggers `.github/workflows/frontend.yml`, deploying static assets to Firebase Hosting on `peasants-running-kit-qa` and automatically running the Playwright smoke tests against `https://peasants-running-kit-qa.web.app`.
- Pushing to `main` with changes in `infrastructure/**` triggers `.github/workflows/terraform.yml`, planning and applying infrastructure to `peasants-running-kit-qa`.

### Controlled Production Deployment
Production deployments can **never** be triggered by `push` events. They require manual invocation via **Run workflow** (`workflow_dispatch`):
1. Navigate to **Actions** $\rightarrow$ select workflow (`Deploy Backend`, `Deploy Frontend`, or `Terraform Infrastructure Management`).
2. Click **Run workflow**.
3. Select **Target Environment**: `production`.
4. Enter **Safety Check**: `DEPLOY_PROD`.

Workflows validate this input: any dispatch targeting `production` without `confirm_production: "DEPLOY_PROD"` immediately fails to prevent accidental deployments.

---

## 6. Automated Post-Deployment QA Smoke Tests

The QA smoke test suite (`e2e/qa-smoke.spec.ts`) runs directly against the live QA URL without local emulators.

### Tests Included:
1. **Unauthenticated Health Check**: `GET /api/health` returns HTTP 200 with `{ status: "ok" }`.
2. **Unauthenticated Products API**: `GET /api/products` returns HTTP 200 with an array of products.
3. **Storefront UI Verification**: Verifies that the live landing page loads with brand elements.
4. **Admin CMS Authentication**: Logs into `/admin` using `QA_ADMIN_PASSWORD` (or fallback) and verifies access to Products Catalog and Customer Orders tabs.
5. **Storefront Runner Journey**: Authenticates using predefined `QA_TEST_USER` credentials or registers a dynamic ephemeral account (`qa_smoke_<timestamp>@peasants.store`) to verify storefront access.
6. **Order Tracking UI**: Verifies that `/store/orders` loads and renders order status UI (either sign-in prompt, empty state, or orders list with Order Ref).

### Running Smoke Tests Locally Against QA:
```bash
# Run against default QA URL (https://peasants-running-kit-qa.web.app)
npm run test:smoke:qa

# Or run with explicit URL and credentials
PLAYWRIGHT_BASE_URL="https://peasants-running-kit-qa.web.app" \
QA_ADMIN_PASSWORD="peasants2026!" \
npm run test:smoke
```
