# Implementation Plan: Razorpay Payment Integration & Admin Settings Toggle

This plan details the addition of the **Razorpay Payment Gateway** for customer print requests and the configuration of payment methods (Online Payment vs Offline/Pay-at-Shop) through a dedicated setting in the **Manage Services** section of the Admin Panel.

---

## User Review Required

> [!IMPORTANT]
> - **Razorpay Environment Variables**: The admin will need to configure `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in their `.env` file for live payments. Placeholder keys will be configured for local testing.
> - **Database Update**: Pushing schema changes to the live MongoDB instance is required to support the new settings and fields. We will run `npx prisma db push`.
> - **Checkout Script**: The checkout relies on the official Razorpay script `https://checkout.razorpay.com/v1/checkout.js`. We will load it asynchronously in the client.

---

## Proposed Changes

### 1. Database Schema Updates
We need to update the Prisma schema to store payment credentials and payment setting controls.

#### [MODIFY] [schema.prisma](file:///c:/Users/jitsi/OneDrive/Desktop/SK%20Telecom/prisma/schema.prisma)
- Add payment method configuration fields to `ShopSettings`:
  - `allowOnlinePayment   Boolean @default(true)`
  - `allowOfflinePayment  Boolean @default(true)`
- Add Razorpay transaction reference fields to `PrintRequest`:
  - `razorpayOrderId     String?`
  - `razorpayPaymentId   String?`
  - `razorpaySignature   String?`

---

### 2. Backend API Changes

#### [NEW] [verify/route.ts](file:///c:/Users/jitsi/OneDrive/Desktop/SK%20Telecom/src/app/api/payment/verify/route.ts)
- Create a POST handler that verifies the signature received from the Razorpay frontend using HMAC-SHA256.
- If verified:
  - Update request status to `pending` (or a status representing successful upload/payment queue).
  - Save `razorpayPaymentId` and `razorpaySignature` to the database.

#### [MODIFY] [route.ts](file:///c:/Users/jitsi/OneDrive/Desktop/SK%20Telecom/src/app/api/settings/route.ts)
- Update the GET and POST handlers to parse, save, and return `allowOnlinePayment` and `allowOfflinePayment`.

#### [MODIFY] [route.ts](file:///c:/Users/jitsi/OneDrive/Desktop/SK%20Telecom/src/app/api/upload/route.ts)
- Update upload route to check the requested payment method.
- If `online` is chosen:
  - Create the print request with status `pending-payment`.
  - Initialize the Razorpay API and create a Razorpay Order.
  - Return `razorpayOrderId`, `amount`, and public `keyId` to the frontend client.
- If `in-shop` (offline) is chosen, proceed as normal.

---

### 3. Frontend Client-side Changes

#### [MODIFY] [page.tsx](file:///c:/Users/jitsi/OneDrive/Desktop/SK%20Telecom/src/app/print/page.tsx)
- Dynamically load the Razorpay checkout script using `next/script`.
- Fetch the allowed payment methods from the settings API.
- If both payment methods are enabled:
  - Display a toggle/radio button layout for "Online Payment (Razorpay)" or "Offline Payment (Pay at Shop)".
- Otherwise, enforce the single enabled method or fallback to Pay at Shop.
- If the customer chooses "Online Payment" and clicks Submit:
  - Create the request on the server (status `pending-payment`) and retrieve the Razorpay Order ID.
  - Launch the Razorpay Checkout overlay.
  - Upon successful payment, send signature/IDs to `/api/payment/verify` to confirm and show the success tracking card.

#### [MODIFY] [page.tsx](file:///c:/Users/jitsi/OneDrive/Desktop/SK%20Telecom/src/app/admin/services/page.tsx)
- Create a dedicated section "Print Request Payment Settings" on the Manage Services dashboard.
- Display toggle switches for **Online Payment (Razorpay)** and **Offline/Pay-at-Shop (Cash)**.
- Trigger updates to `/api/settings` to save settings directly.

#### [MODIFY] [page.tsx](file:///c:/Users/jitsi/OneDrive/Desktop/SK%20Telecom/src/app/admin/requests/page.tsx)
- Display the payment method on each print request card:
  - For online payment requests, show a green **ONLINE PAID** badge with Razorpay Payment ID.
  - For offline requests, show a yellow **PAY AT SHOP** badge.

#### [MODIFY] [page.tsx](file:///c:/Users/jitsi/OneDrive/Desktop/SK%20Telecom/src/app/admin/other-requests/page.tsx)
- Similarly, display the payment method/status for other service requests.

---

## Verification Plan

### Automated Tests
- Build test to verify that the Next.js app compiles cleanly with no static page generation or linting errors:
  ```powershell
  npm run build
  ```

### Manual Verification
- Deploy modifications and configure mock Razorpay credentials in `.env` (using Razorpay test key).
- Navigate to Admin Dashboard -> **Manage Services** and verify you can toggle Online/Offline payment methods.
- Disable online payment, verify the `/print` page only shows "Pay at Shop" with no options.
- Enable online payment, verify the `/print` page displays both payment methods.
- Submit a print request using the **Online Payment** option:
  - Verify the Razorpay popup appears.
  - Complete a test payment (using Razorpay test mode card details).
  - Verify the success tracking card shows up and the invoice gets generated.
- Check the **Print Requests** section in the Admin Panel to verify the request shows up with the **ONLINE PAID** badge and Razorpay reference numbers.
