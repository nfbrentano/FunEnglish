import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectDatabaseEmulator, getDatabase, type Database } from "firebase/database";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";
import {
  connectFirestoreEmulator as connectLiteEmulator,
  getFirestore as getLiteFirestore,
  type Firestore as LiteFirestore,
} from "firebase/firestore/lite";
import { connectFunctionsEmulator, getFunctions, type Functions } from "firebase/functions";
import { connectStorageEmulator, getStorage, type FirebaseStorage } from "firebase/storage";
import { firebaseEmulatorHost, getFirebaseConfig, useFirebaseEmulators } from "./env";

let db: Firestore | undefined;
let liteDb: LiteFirestore | undefined;
let storage: FirebaseStorage | undefined;
let database: Database | undefined;
let functions: Functions | undefined;

/** Returns the single Firebase client app, initializing it on first use. */
export function getFirebaseApp(): FirebaseApp {
  return getApps().length > 0 ? getApp() : initializeApp(getFirebaseConfig());
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

export function getStorageInstance(): FirebaseStorage {
  if (!storage) {
    storage = getStorage(getFirebaseApp());
    if (useFirebaseEmulators) connectStorageEmulator(storage, firebaseEmulatorHost, 9199);
  }
  return storage;
}

export function getDatabaseInstance(): Database {
  if (!database) {
    database = getDatabase(getFirebaseApp());
    if (useFirebaseEmulators) connectDatabaseEmulator(database, firebaseEmulatorHost, 9000);
  }
  return database;
}

export function getFunctionsInstance(): Functions {
  if (!functions) {
    functions = getFunctions(getFirebaseApp(), "southamerica-east1");
    if (useFirebaseEmulators) connectFunctionsEmulator(functions, firebaseEmulatorHost, 5001);
  }
  return functions;
}

