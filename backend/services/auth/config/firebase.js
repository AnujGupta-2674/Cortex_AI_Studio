import admin from "firebase-admin";
import serviceAccount from "../serviceAccountKey.json" with { type: "json" };

const firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

export const auth = firebaseApp.auth();
