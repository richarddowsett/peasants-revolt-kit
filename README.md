# Peasants Running Kit - Store, Holding Page & Backend API

Full-stack application for **Peasants Running Kit** (Peasants Revolt Running Club), featuring a **Next.js Frontend**, a **Node.js Express Backend API** designed with **Hexagonal Architecture**, **Firebase Cloud Firestore Database**, and hosted on **Google Cloud Run** & **Firebase Hosting**.

## Architecture & Structure

```text
peasants-running-kit/
├── app/                              # Frontend (Next.js 14)
│   ├── public/                       # Assets (logo.png)
│   ├── src/
│   │   ├── app/                      # Page Routes (Holding page, /store, /store/orders, /admin)
│   │   └── lib/                      # Unified API client & Firebase Auth
│   └── firebase.json                 # Serves frontend & proxies /api/** to Cloud Run API
├── backend/                          # Dedicated Backend API (Express TypeScript)
│   ├── src/
│   │   ├── domain/                   # Hexagonal Core (Models, Ports, Use Cases)
│   │   │   ├── models/               # Product, Order, Cart
│   │   │   ├── ports/                # ProductRepositoryPort, OrderRepositoryPort, PaymentGatewayPort, StoragePort
│   │   │   └── usecases/             # CreateOrder, GetProducts, ManageProduct, GetUserOrders
│   │   ├── adapters/                 # Adapters Layer
│   │   │   ├── db/                   # FirestoreAdminProductRepository, FirestoreAdminOrderRepository
│   │   │   ├── payment/              # MonzoPaymentGatewayAdapter
│   │   │   ├── auth/                 # PasswordAdminAuthAdapter
│   │   │   └── storage/              # FirebaseAdminStorageAdapter
│   │   └── server.ts                 # Express API server listening on port 8080
│   ├── Dockerfile                    # Container definition for Cloud Run
│   └── package.json
├── infrastructure/                   # Terraform Infrastructure as Code
│   ├── main.tf                       # Cloud Run Backend API service, Artifact Registry & Firebase Hosting
│   ├── variables.tf                  # Project variables
│   └── outputs.tf                    # Outputs
└── README.md                         # Documentation
```

---

## Deployment Workflow

### 1. Provision Infrastructure via Terraform (One-Time)
```bash
cd infrastructure
terraform apply
```

### 2. Build & Deploy Backend API to Cloud Run
Build the container image and push to GCP Artifact Registry:
```bash
docker build -t europe-west2-docker.pkg.dev/peasants-running-kit/peasants-running-kit/backend-api:latest backend
docker push europe-west2-docker.pkg.dev/peasants-running-kit/peasants-running-kit/backend-api:latest
```

### 3. Build & Deploy Frontend to Firebase Hosting
```bash
cd app
npm run build
npx -y firebase-tools@latest deploy --only hosting --project peasants-running-kit
```

Firebase Hosting will automatically serve your frontend and route all `/api/**` calls directly to your **Cloud Run Backend API**!
