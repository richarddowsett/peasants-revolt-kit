# Peasants Running Kit - Store, Holding Page & Backend API

Full-stack application for **Peasants Running Kit** (Peasants Revolt Running Club), featuring a **Next.js Frontend**, a **Node.js Express Backend API** designed with **Hexagonal Architecture**, **Firebase Cloud Firestore Database**, and hosted on **Google Cloud Run** & **Firebase Hosting**.

## Architecture & Structure

```text
peasants-running-kit/
├── app/                              # Frontend (Next.js 14)
│   ├── public/                       # Assets (logo.png)
│   ├── src/                          # Page Routes (Holding page, /store, /store/orders, /admin)
│   └── firebase.json                 # Serves frontend & proxies /api/** to Cloud Run API
├── backend/                          # Dedicated Backend API (Express TypeScript)
│   ├── src/
│   │   ├── domain/                   # Hexagonal Core (Entities, Ports, Use Cases)
│   │   ├── adapters/                 # Inbound (HTTP Routers) & Outbound Adapters (Firestore, Monzo, Storage)
│   │   └── server.ts                 # Express API server listening on port 8080
│   ├── Dockerfile                    # Container definition for Cloud Run (linux/amd64)
│   └── package.json
├── infrastructure/                   # Terraform Infrastructure as Code
│   ├── main.tf                       # Cloud Run Backend API service, Artifact Registry & Firebase Hosting
│   ├── variables.tf                  # Project variables
│   └── outputs.tf                    # Outputs
└── README.md                         # Documentation
```

---

## Deployment Workflow

### 1. Provision Infrastructure via Terraform
```bash
cd infrastructure
terraform plan
terraform apply
```

### 2. Build & Push Backend API (x86_64 / linux/amd64 for Cloud Run)
Build the container using `--platform linux/amd64` so it matches GCP Cloud Run architecture:
```bash
docker build --platform linux/amd64 -t europe-west2-docker.pkg.dev/peasants-running-kit/peasants-running-kit/backend-api:latest backend
docker push europe-west2-docker.pkg.dev/peasants-running-kit/peasants-running-kit/backend-api:latest
```

### 3. Re-run Terraform Apply & Deploy Frontend
```bash
cd infrastructure
terraform apply

cd ../app
npm run build
npx -y firebase-tools@latest deploy --only hosting --project peasants-running-kit
```
