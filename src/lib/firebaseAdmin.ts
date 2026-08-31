import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

function getFirebaseAdminApp() {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID || "shree-krishna-telecom";
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "shree-krishna-telecom.firebasestorage.app";

    if (clientEmail && privateKey) {
      return initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKey.trim().replace(/^["']|["']$/g, "").replace(/\\n/g, "\n"),
        }),
        storageBucket,
      });
    } else {
      return initializeApp({
        projectId,
        storageBucket,
      });
    }
  }
  return getApp();
}

export function getAdminAuth() {
  const app = getFirebaseAdminApp();
  return getAuth(app);
}

export function getAdminStorage() {
  const app = getFirebaseAdminApp();
  return getStorage(app);
}
