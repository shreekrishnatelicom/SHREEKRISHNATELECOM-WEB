# Shree Krishna Telecom Portal

A modern, Bauhaus-inspired web application for **Shree Krishna Telecom** (a local cyber cafe). Customers can submit print requests online, upload documents, track print jobs in real-time, view cafe services, and check shop open/closed status. Admins can manage settings, toggle shop status, update services, post announcements, and handle print requests.

---

## 🎨 Design System & Theme
The application features a **Bauhaus-inspired** visual aesthetic:
*   **Vibrant, blocky color palette**: Deep dark mode backgrounds (`#1a1a1a`), solid whites, bold primary reds (`#e6162b`), blues (`#0f52ba`), and yellows (`#f4c430`).
*   **Structured Geometry**: Heavy black borders (`border-4 border-bauhaus-black`), solid drop-shadow offset boxes (`shadow-[8px_8px_0px_0px_...]`), and crisp, uppercase sans-serif typography.

---

## 🚀 Key Features

*   **Online Print Requests**: Customers can upload files (PDFs, images), configure copies, color mode, and sheet layout, and obtain a unique **Tracking ID**.
*   **Order Tracking**: Customers can check the real-time status of their print requests (`Pending`, `Printing`, `Completed`, or `Failed`).
*   **Admin Dashboard**: Authenticated admins can view, update, and manage incoming print requests, modify available shop services, change shop details (phone, map link, email), and publish global announcements.
*   **Automatic File Cleanup**: Completed or failed print request files are automatically deleted after 24 hours to conserve database storage and secure user privacy.
*   **Dual-Login Support**: Authenticated using Firebase. Supports Google Sign-In and password-based login.

---

## 📂 Project Structure

```text
├── .agents/                    # Custom agent instructions and workspaces
├── prisma/                     # Database ORM setup
│   ├── schema.prisma           # MongoDB schema models (User, PrintRequest, Service, etc.)
│   └── seed.ts                 # Database seeding script for default services/settings
├── public/                     # Static assets (images, icons)
├── src/
│   ├── app/                    # Next.js App Router Pages and API Handlers
│   │   ├── about/              # About us page
│   │   ├── admin/              # Protected administrative dashboard
│   │   ├── api/                # API Endpoints
│   │   │   ├── admin/          # Admin access check API
│   │   │   ├── announcement/   # Announcement bar GET/POST endpoint
│   │   │   ├── auth/           # Login/Logout and session creation APIs
│   │   │   ├── diagnose/       # Server configuration diagnostics endpoint
│   │   │   ├── files/          # Base64-stored print file serving endpoint
│   │   │   ├── requests/       # Print request tracking & status PATCH API
│   │   │   ├── services/       # Services listing GET/POST API
│   │   │   ├── settings/       # Global shop settings GET/PUT API
│   │   │   ├── track/          # Tracking query GET API
│   │   │   └── upload/         # File uploading and print request creation API
│   │   ├── contact/            # Contact info page
│   │   ├── dashboard/          # Customer dashboard (password updates, history)
│   │   ├── login/              # Auth page (Google popup & Email/Password forms)
│   │   ├── print/              # Document upload and print configuration page
│   │   ├── services/           # Services showcase page
│   │   ├── track/              # Order status query search page
│   │   ├── globals.css         # Styling system configuration (Bauhaus color tokens)
│   │   └── layout.tsx          # Root Layout (Announcement bar, Header, Footer)
│   ├── components/             # Reusable UI Components (Header, PasswordManager, etc.)
│   ├── lib/                    # Shared client/server utility functions
│   │   ├── firebase.ts         # Client Firebase initialization
│   │   ├── firebaseAdmin.ts    # Firebase Admin SDK initialization
│   │   └── prisma.ts           # Prisma database client singleton proxy
│   └── proxy.ts                # Route protection helper (cookies check)
├── next.config.ts              # Next.js configuration settings
├── package.json                # Project dependencies, scripts, and overrides
├── tsconfig.json               # TypeScript configuration
```

---

## ⚙️ Configuration & Environment Variables

Create a `.env` file in the root directory:

```env
# Database URI (MongoDB Atlas connection string)
DATABASE_URL="mongodb+srv://<username>:<password>@cluster.mongodb.net/dbname?retryWrites=true&w=majority"

# Firebase Client configuration
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSy..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-app.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-app"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-app.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="xxxxxxxx"
NEXT_PUBLIC_FIREBASE_APP_ID="1:xxxx:web:xxxx"
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="G-xxxxxx"

# Firebase Admin configuration (Node.js backend only)
FIREBASE_PROJECT_ID="your-app"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-app.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBA...\n-----END PRIVATE KEY-----\n"
```

> [!NOTE]
> On platforms like Vercel and Render, copy these variables exactly. The Firebase Admin private key requires special care; it must be pasted with quotes or raw newlines. The application contains custom sanitizers to handle common formatting errors.

---

## 🛠️ Local Development Setup

### 1. Install Dependencies
```bash
npm install
```
*(Running `npm install` automatically triggers `prisma generate` via the `postinstall` hook).*

### 2. Configure Database & Models
Ensure your MongoDB instance is running, then synchronize the Prisma models:
```bash
npx prisma db push
```

### 3. Seed Default Data
Seed the default shop settings and core services (Print, Lamination, Scanning, etc.):
```bash
npx prisma db seed
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🚀 Production Deployment & Serverless Gotchas

### 1. MongoDB Atlas Network Access (IP Whitelist)
Serverless hosts (like Vercel) use dynamic IP addresses. If you do not whitelist all IPs, your Prisma database connections will time out, resulting in 500 errors.
*   **Required Fix**: In MongoDB Atlas, go to **Network Access** and add IP address `0.0.0.0/0` (Allow Access from Anywhere).

### 2. Firebase Admin CommonJS / ESM Conflict
Next.js on serverless platforms bundles ES Modules strictly. `firebase-admin` depends on `jwks-rsa`, which uses `require()` to import `jose`. Because `jose` version `6.x` is pure ESM, this raises an `ERR_REQUIRE_ESM` crash.
*   **Resolution**: We have added an `overrides` section in `package.json` to lock the `jose` dependency to `v5.x` (which is CommonJS compatible):
    ```json
    "overrides": {
      "jose": "^5.9.6"
    }
    ```

### 3. Verification & Server Diagnostics
A public route `/api/diagnose` is compiled into the app. Open `https://your-domain.com/api/diagnose` to check environment variable compliance, database connection status, and Firebase SDK validation.
