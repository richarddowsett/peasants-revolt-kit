# Peasants Running Kit - Store & Holding Page

Holding page and e-commerce store for **Peasants Running Kit** (Peasants Revolt Running Club), built with **Next.js 14**, **Firebase Auth & Cloud Firestore**, using **Hexagonal Architecture** (Ports & Adapters) and hosted on **Firebase Hosting**.

## Project Architecture & Structure

```text
peasants-running-kit/
├── app/                              # Next.js Application & Storefront
│   ├── public/                       # Static assets (logo.png)
│   ├── src/
│   │   ├── domain/                   # Pure Hexagonal Core (Models, Use Cases, Ports)
│   │   │   ├── models/               # Product, Order, Cart
│   │   │   ├── ports/                # ProductRepositoryPort, OrderRepositoryPort, PaymentGatewayPort
│   │   │   └── usecases/             # CreateOrder, GetProducts, ManageProduct, GetUserOrders
│   │   ├── adapters/                 # Hexagonal Infrastructure Adapters
│   │   │   ├── db/                   # FirestoreProductRepository, FirestoreOrderRepository
│   │   │   ├── payment/              # MonzoPaymentGatewayAdapter
│   │   │   └── auth/                 # PasswordAdminAuthAdapter
│   │   ├── components/               # React UI Components (StoreHeader, etc.)
│   │   └── app/                      # Next.js App Router Pages
│   │       ├── page.tsx              # Holding Page with Logo Long-Press Ring (1.5s)
│   │       ├── store/                # Beta Storefront & Checkout
│   │       │   ├── page.tsx          # Catalog & Basket Modal
│   │       │   └── orders/page.tsx   # User Order Tracking
│   │       └── admin/page.tsx        # Organiser CMS (Password Protected)
│   └── firebase.json                 # Firebase Hosting configuration
├── infrastructure/                   # Terraform Infrastructure as Code
│   ├── main.tf                       # Firebase Hosting site & custom domain mappings
│   ├── variables.tf                  # Project variables
│   └── outputs.tf                    # Outputs
└── README.md                         # Documentation
```

---

## Features

- **Holding Page & Secret Entrance**: The landing page (`/`) serves the holding page. Holding down the circular logo for 1.5 seconds triggers an animated orange progress ring circling the logo, unlocking `/store`.
- **Storefront & Basket**: Add running kit items to basket with size choices (XS, S, M, L, XL, XXL).
- **Monzo Payment Link**: Orders generate a unique Order Reference (e.g. `PRRC-8492`) and auto-populate a Monzo payment link (`https://monzo.me/peasantsrevolt/[amount]?d=PRRC-8492`).
- **User Accounts**: Passwordless Sign-In (Email Magic Link) or Google Sign-In to view past orders.
- **Organiser Admin CMS (`/admin`)**: Password protected (`peasants2026!`). Allows adding/editing kit items, setting prices/sizes, viewing orders, and marking payments as received.

---

## Deployment Steps

### 1. Provision Infrastructure via Terraform (One-Time)
```bash
cd infrastructure
terraform apply
```

### 2. Build & Deploy Web Application
```bash
cd app
npm run build
npx -y firebase-tools@latest deploy --only hosting --project peasants-running-kit
```
