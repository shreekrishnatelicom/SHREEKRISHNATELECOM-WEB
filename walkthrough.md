# Walkthrough - Razorpay Payment Integration & Settings Admin Toggle

I have successfully integrated the Razorpay Payment Gateway for customer print requests and added payment method toggles to the **Manage Services** section of the Admin Panel.

---

## Changes Implemented

### 1. Database Schema
- **[`prisma/schema.prisma`](file:///c:/Users/jitsi/OneDrive/Desktop/SK%20Telecom/prisma/schema.prisma)**:
  - Added payment configuration flags (`allowOnlinePayment`, `allowOfflinePayment`) to the `ShopSettings` model.
  - Added Razorpay transaction reference fields (`razorpayOrderId`, `razorpayPaymentId`, `razorpaySignature`) to the `PrintRequest` model to keep an audit trail of online payments.

### 2. Backend endpoints
- **[`src/app/api/payment/verify/route.ts`](file:///c:/Users/jitsi/OneDrive/Desktop/SK%20Telecom/src/app/api/payment/verify/route.ts)**:
  - Added new route to verify Razorpay checkout payment signatures using HMAC-SHA256 crypto validation, updating the matching print request to `pending` (queue) and `paymentMethod: "online"` upon validation success.
- **[`src/app/api/settings/route.ts`](file:///c:/Users/jitsi/OneDrive/Desktop/SK%20Telecom/src/app/api/settings/route.ts)**:
  - Updated settings endpoint (GET/POST) to read, store, and default the payment methods flags.
- **[`src/app/api/upload/route.ts`](file:///c:/Users/jitsi/OneDrive/Desktop/SK%20Telecom/src/app/api/upload/route.ts)**:
  - Updated upload handler to accept a chosen payment method from form inputs. If "online" payment is chosen, it creates a Razorpay transaction order on the gateway using the official `razorpay` SDK, returning IDs and amounts back to the user.

### 3. Frontend & Client Pages
- **[`src/app/print/page.tsx`](file:///c:/Users/jitsi/OneDrive/Desktop/SK%20Telecom/src/app/print/page.tsx)** & **[`src/components/ServicesClientPage.tsx`](file:///c:/Users/jitsi/OneDrive/Desktop/SK%20Telecom/src/components/ServicesClientPage.tsx)**:
  - Dynamically load the Razorpay checkout script using `next/script`.
  - Fetch global payment configurations from `/api/settings`.
  - Fetch service-level payment controls (`allowOnlinePayment`, `allowOfflinePayment`) directly from the selected service entity.
  - If both payment methods are enabled:
    - Display a toggle/radio button layout for "Online Payment (Razorpay)" or "Offline Payment (Pay at Shop)" inside the print request form and service request modals.
  - If only a single payment method is allowed for the service (e.g. standard print has online checkout, but passport photo or government form is set to Pay at Counter only), it automatically forces that single option.
  - If the customer chooses "Online Payment" and clicks Submit:
    - Create the request on the server (status `pending-payment`) and retrieve the Razorpay Order ID.
    - Launch the Razorpay Checkout overlay.
    - Upon successful payment, send signature/IDs to `/api/payment/verify` to confirm, show the success card, and auto-download the invoice.
  - Added an **Upload Progress Bar** using `XMLHttpRequest` to show live uploading percentages (`0%` to `100%`) when submitting documents, rendering a sleek Bauhaus blue bar with mixed-blend progress text.
- **[`src/app/admin/services/page.tsx`](file:///c:/Users/jitsi/OneDrive/Desktop/SK%20Telecom/src/app/admin/services/page.tsx)**:
  - Added a dedicated card/section at the top of the Manage Services dashboard where administrators can toggle **Online Payment (Razorpay)** and **Offline Payment (Pay at Shop)** dynamically.
  - Added service-specific checkboxes under **Request Button Options** in the Add/Edit Service form allowing administrators to customize allowed checkout options (Online and/or Offline) individually per service type.
- **[`src/app/admin/requests/page.tsx`](file:///c:/Users/jitsi/OneDrive/Desktop/SK%20Telecom/src/app/admin/requests/page.tsx)** & **[`src/app/admin/other-requests/page.tsx`](file:///c:/Users/jitsi/OneDrive/Desktop/SK%20Telecom/src/app/admin/other-requests/page.tsx)**:
  - Added transaction status indicator labels on lists so administrators can immediately differentiate paid print requests from offline/pay-at-shop requests.

---

## Verification & Build Status

The application build was successfully compiled (`npx next build` completed with code `0`). All dynamic types and imports resolve correctly.

### Live Mode Verification
The Razorpay checkout environment variables were correctly mapped to standard system names (`RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`) in `.env`. The system successfully processes live checkout orders.

### Payment Done & Payment ID in PDF Invoice
The PDF receipt rendering block in `downloadReceipt` was enhanced to dynamically scale and fit additional records. If online payment is successful, it draws:
- **Status**: `Payment Done`
- **Payment Method**: `Online (Razorpay)`
- **Payment ID**: Displays the unique Razorpay transaction ID (e.g. `pay_XXXXXXXXXX`).
The warning footer banner auto-adjusts its vertical position downward if a transaction payment ID is present, ensuring no overlap on A6 cards.

### Resolving Admin Panel Runtime Crash
- **Status Mapping**: Added `"pending-payment"` to the `Status` type declaration in both **[`requests/page.tsx`](file:///c:/Users/jitsi/OneDrive/Desktop/SK%20Telecom/src/app/admin/requests/page.tsx)** and **[`other-requests/page.tsx`](file:///c:/Users/jitsi/OneDrive/Desktop/SK%20Telecom/src/app/admin/other-requests/page.tsx)**.
- **Color & Style Mapping**: Configured a styles map for `"pending-payment"` inside `STATUS_CFG` to render it as a soft orange tag (*Pending Payment*), preventing React runtime exceptions due to unmapped properties.
- **Fail-safe fallback**: Standardized status reads in `renderRequestItem` with a fallback mapping config in case database entries present unrecognized status values.
- **Dashboard Filters**: Added a filter tab on the admin requests dashboards to filter specifically by "Pending Payment" requests.
