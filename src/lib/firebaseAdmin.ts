import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export function getAdminAuth() {
  let app;

  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID || "shree-krishna-telecom";
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (clientEmail && privateKey) {
      app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKey.trim().replace(/^["']|["']$/g, "").replace(/\\n/g, "\n"),
        }),
      });
    } else {
      app = initializeApp({
        projectId,
      });
    }
  } else {
    app = getApp();
  }

  return getAuth(app);
}
