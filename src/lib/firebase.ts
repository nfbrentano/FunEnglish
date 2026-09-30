import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";
import { firebaseEmulatorHost, getFirebaseConfig, useFirebaseEmulators } from "./env";

let auth: Auth | undefined;
let db: Firestore | undefined;

/** Returns the single Firebase client app, initializing it on first use. */
export function getFirebaseApp(): FirebaseApp {
  return getApps().length > 0 ? getApp() : initializeApp(getFirebaseConfig());
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
    if (useFirebaseEmulators) {
      connectAuthEmulator(auth, `http://${firebaseEmulatorHost}:9099`, { disableWarnings: true });
    }
  }
  return auth;
}

export function getDb(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp());
    if (useFirebaseEmulators) connectFirestoreEmulator(db, firebaseEmulatorHost, 8080);
  }
  return db;
}
