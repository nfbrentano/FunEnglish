import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getDatabase } from "firebase-admin/database";

export function getAdminApp() {
  if (getApps().length === 0) {
    return initializeApp();
  }
  return getApps()[0]!;
}

export function getAdminFirestore() {
  getAdminApp();
  return getFirestore();
}

export function getAdminDatabase() {
  getAdminApp();
  return getDatabase();
}
