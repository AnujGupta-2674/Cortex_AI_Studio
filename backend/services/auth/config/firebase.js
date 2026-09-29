import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import serviceAccount from "../serviceAccountKey.json" with { type: "json" };

const firebaseApp = getApps().length === 0
  ? initializeApp({
      credential: cert(serviceAccount),
    })
  : getApps()[0];

export const auth = getAuth(firebaseApp);
export default firebaseApp;

