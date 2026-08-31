# Shree Krishna Telecom Portal

A modern, Bauhaus-inspired web application for **Shree Krishna Telecom** (a local cyber cafe & digital print shop). Customers can submit print requests online, upload documents, track print jobs in real-time, compute print estimates, apply discount coupons, pay online via Razorpay or in-shop, view cafe services, and manage their profile. Admins can manage shop settings, toggle open/closed status, configure print pricing matrices, create discount coupons, manage services, post announcements, and handle customer requests.

---

## 🎨 Design System & Theme

The application features a **Bauhaus-inspired** visual aesthetic:
* **Vibrant Color Palette**: Deep dark mode background (`#1a1a1a`), solid whites (`#ffffff`), and bold primary accents: Bauhaus Red (`#e6162b`), Blue (`#0f52ba`), and Yellow (`#f4c430`).
* **Structured Geometry & Shadows**: Heavy black borders (`border-4 border-black`), solid drop-shadow offset boxes (`shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]`), and crisp uppercase sans-serif typography.
* **Dynamic Micro-Interactions**: Hover lifts, custom route loaders, responsive navigation dropdowns, and interactive onboarding overlays.

---

## 🚀 Key Features

### 📄 Customer Features
* **Online Print Requests & File Upload**: Upload single or multiple files (PDFs, Images, Word/Excel documents) with real-time upload progress, automatic PDF page count calculation (`pdf-lib`), color mode selection (B&W / Full Color), print side configuration (Single / Double-sided), and layout settings (1, 2, or 4 pages per sheet).
* **Payment Flexibility (Razorpay & In-Shop)**: Pay instantly online using **Razorpay** (Cards, UPI, Net Banking) or select **Pay In-Shop** on pickup.
* **Coupon & Discount System**: Apply 6-character alphanumeric coupon codes with real-time validation and minimum order spend thresholds.
* **Real-time Order Tracking**: Query print request status (`Pending`, `Processing`, `Completed`, or `Failed`) using a unique Tracking ID (e.g. `SKTXXXXXX`), with instant PDF invoice/receipt download (`jspdf`) and online payment retry support.
* **Store Price Calculator**: Interactive cost estimator (`PublicCalculator`) for instant print quote calculations and downloadable PDF estimates.
* **Services Showcase**: Browse all shop services (Lamination, Scanning, Passport Photos, Online Forms, etc.) with custom request modals and payment flags.
* **User Dashboard & Profile**: Authenticated user panel to view order history, update personal profiles, and manage password credentials.
* **Legal & Policy Pages**: Dedicated pages for Privacy Policy (`/privacy`), Terms of Service (`/terms`), and Cancellation & Refund Policy (`/refund`).

### 🛠️ Admin Dashboard
* **Order Management**: Search, filter, view uploaded documents, update job statuses, perform bulk status updates, and view detailed request telemetry.
* **Pricing Matrix Configurator**: Customize print pricing rates based on service type, color mode, single/double-sided print, and pages-per-sheet layout.
* **Coupon Manager**: Create, edit, toggle, and delete promotional discount codes with custom percentage discounts and minimum order values.
* **Services Management**: Create, update, sort, or disable shop services, configure required image uploads, receipt generation, and enable/disable online or offline payment options per service.
* **Global Shop Settings**: Toggle shop Open/Closed status, update contact details (Phone, Email, Location, Map link, Social links), starting print prices, and global payment modes.
* **Announcement Bar**: Broadcast active store banners with customizable Bauhaus styling themes across the top header.

### 🔒 Security & Performance
* **Dual Authentication**: Firebase Auth supporting Google OAuth Popup sign-in and Email/Password credentials.
* **MongoDB Chunked Storage**: Custom chunked file storage system (`FileStorage` & `FileChunk`) capable of handling large document uploads directly in MongoDB.
* **Automatic File Cleanup**: Completed or failed print request files are automatically purged after 24 hours to secure customer privacy and optimize database storage.
* **Diagnostic Route**: Dedicated server inspection endpoint (`/api/diagnose`) to verify environment variables, database connections, and Firebase Admin SDK health.

---

## 📂 Project Structure

```text
├── .agents/                    # Agent instructions and customization files
├── prisma/                     # Database ORM schema and seeding
│   ├── schema.prisma           # MongoDB schema models (User, PrintRequest, Service, ShopSettings, Coupon, etc.)
│   └── seed.ts                 # Database seed script for initial services & shop settings
├── public/                     # Static assets, icons, and logos
├── src/
│   ├── app/                    # Next.js App Router Pages and API Handlers
│   │   ├── about/              # About Us page
│   │   ├── admin/              # Protected Administrative Control Panel
│   │   │   ├── coupons/        # Admin Coupon Management panel
│   │   │   ├── pages/          # Admin CMS page editor
│   │   │   ├── pricing/        # Admin Print Pricing Matrix configurator
│   │   │   ├── services/       # Admin Services manager
│   │   │   ├── settings/       # Admin Global Shop Settings manager
│   │   ├── api/                # Backend API Endpoints
│   │   │   ├── admin/          # Admin specific endpoints (coupons, pricing, pages)
│   │   │   ├── announcement/   # Announcement bar GET/POST API
│   │   │   ├── auth/           # Login/Logout and session creation APIs
│   │   │   ├── coupons/        # Public coupon verification APIs
│   │   │   ├── diagnose/       # System health & diagnostic endpoint
│   │   │   ├── files/          # Base64 file chunk serving API
│   │   │   ├── payment/        # Razorpay payment verification & cancellation APIs
│   │   │   ├── requests/       # Print request tracking & status updates API
│   │   │   ├── services/       # Services listing GET/POST API
│   │   │   ├── settings/       # Global shop settings GET/PUT API
│   │   │   ├── track/          # Tracking search & order details API
│   │   │   └── upload/         # Document upload, page count, pricing & request creation API
│   │   ├── contact/            # Contact information page
│   │   ├── dashboard/          # Customer dashboard (history & security settings)
│   │   ├── login/              # Authentication page (Google & Email/Password)
│   │   ├── print/              # Document upload & print configuration page
│   │   ├── privacy/            # Privacy Policy page
│   │   ├── profile/            # User Profile management page
│   │   ├── refund/             # Cancellation & Refund Policy page
│   │   ├── services/           # Shop services showcase page
│   │   ├── terms/              # Terms of Service page
│   │   ├── track/              # Order status query & tracking page
│   │   ├── globals.css         # Styling system & Bauhaus CSS tokens
│   │   ├── layout.tsx          # Root layout (Announcement bar, Header, Footer)
│   │   └── page.tsx            # Landing Home page
│   ├── components/             # Reusable UI Components
│   │   ├── AnnouncementBar.tsx # Dynamic top notification bar
│   │   ├── Header.tsx          # Main header navigation bar
│   │   ├── LogoutButton.tsx    # Session sign-out handler
│   │   ├── OnboardingOverlay.tsx# User onboarding modal
│   │   ├── PasswordManager.tsx # Password update & credentials manager
│   │   ├── PublicCalculator.tsx# Interactive print cost calculator component
│   │   ├── RouteLoader.tsx     # Custom page transition loader
│   │   └── ServicesClientPage.tsx # Services showcase client renderer
│   ├── lib/                    # Core client and server utilities
│   │   ├── announcement.ts     # Announcement fetching helpers
│   │   ├── firebase.ts         # Firebase Web Client SDK initialization
│   │   ├── firebaseAdmin.ts    # Firebase Admin Node.js SDK initialization
│   │   ├── generateInvoicePDF.ts# Client-side PDF receipt generator
│   │   └── prisma.ts           # Prisma database client singleton proxy
│   └── proxy.ts                # Middleware & session verification helper
├── next.config.ts              # Next.js framework configuration
├── package.json                # Project dependencies, scripts, and overrides
└── tsconfig.json               # TypeScript compiler configuration
```

---

## ⚙️ Configuration & Environment Variables

Create a `.env` file in the root directory:

```env
# Database URI (MongoDB Atlas connection string)
DATABASE_URL="mongodb+srv://<username>:<password>@cluster.mongodb.net/dbname?retryWrites=true&w=majority"

# Firebase Client Configuration (Public)
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSy..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-app.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-app"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-app.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="xxxxxxxx"
NEXT_PUBLIC_FIREBASE_APP_ID="1:xxxx:web:xxxx"
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="G-xxxxxx"

# Firebase Admin Configuration (Server-side)
FIREBASE_PROJECT_ID="your-app"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-app.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBA...\n-----END PRIVATE KEY-----\n"

# Razorpay Payment Gateway Configuration
RAZORPAY_KEY_ID="rzp_test_xxxxxxxxxxxx"
RAZORPAY_KEY_SECRET="xxxxxxxxxxxxxxxxxxxxxxxx"
```

> [!NOTE]
> On platforms like Vercel and Render, ensure all environment variables are added to Environment Settings. The `FIREBASE_PRIVATE_KEY` must preserve newlines (`\n` string escaping). The backend includes automatic key sanitizers to handle malformed newline strings.

---

## 🛠️ Local Development Setup

### 1. Install Dependencies
```bash
npm install
```
*(Running `npm install` automatically executes `prisma generate` via the `postinstall` script).*

### 2. Synchronize Database Models
Ensure your MongoDB instance is running, then sync the Prisma schema models:
```bash
npx prisma db push
```

### 3. Seed Default Data
Populate default shop settings, services (Print, Lamination, Scanning, Photo, etc.), and pricing rates:
```bash
npx prisma db seed
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the portal.

---

## 🚀 Production Deployment & Serverless Gotchas

### 1. MongoDB Atlas Network Access (IP Whitelist)
Serverless deployment platforms (such as Vercel or Netlify) route requests through dynamic IP ranges. If MongoDB Atlas network access is locked, requests will time out.
* **Resolution**: In MongoDB Atlas, navigate to **Network Access** and add IP entry `0.0.0.0/0` (Allow Access from Anywhere).

### 2. Firebase Admin ESM / CommonJS Compatibility
Next.js serverless bundles depend on strict ESM resolution. `firebase-admin` relies on `jwks-rsa` which uses CommonJS imports for `jose`. Standard `jose v6.x` is ESM-only and triggers an `ERR_REQUIRE_ESM` crash.
* **Resolution**: An `overrides` section is included in `package.json` to lock `jose` to `v5.x`:
  ```json
  "overrides": {
    "jose": "^5.9.6"
  }
  ```

### 3. Razorpay Integration Notes
Razorpay requires `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. In test mode, fallback order IDs are simulated if credentials are not configured, allowing local end-to-end flow testing without live keys.

### 4. Server Diagnostics
Access `https://your-domain.com/api/diagnose` to check server configuration, verify database connection status, and validate Firebase Admin SDK initialization.

