import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";
import {
  connectFirestoreEmulator as connectLiteEmulator,
  getFirestore as getLiteFirestore,
  type Firestore as LiteFirestore,
} from "firebase/firestore/lite";
import { firebaseEmulatorHost, getFirebaseConfig, useFirebaseEmulators } from "./env";

let auth: Auth | undefined;
let db: Firestore | undefined;
let liteDb: LiteFirestore | undefined;

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

/**
 * Firestore Lite: plain REST reads, no streaming connection and a much smaller bundle.
 * Used for one-off public reads such as the catalog.
 */
export function getLiteDb(): LiteFirestore {
  if (!liteDb) {
    liteDb = getLiteFirestore(getFirebaseApp());
    if (useFirebaseEmulators) connectLiteEmulator(liteDb, firebaseEmulatorHost, 8080);
  }
  return liteDb;
}
