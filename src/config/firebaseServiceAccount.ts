/**
 * Firebase Service Account configuration.
 *
 * For security reasons in commercial applications, this file should never be checked into version control.
 * For this student/FYP project under Spark Plan, we are configuring it client-side
 * to enable direct client-to-client background push notifications.
 *
 * Instructions:
 * 1. Go to Firebase Console -> Project Settings -> Service Accounts.
 * 2. Click "Generate new private key".
 * 3. Copy client_email and private_key from the downloaded JSON file and paste them below.
 */
import { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } from '@env';

export const FIREBASE_SERVICE_ACCOUNT = {
  project_id: FIREBASE_PROJECT_ID,
  client_email: FIREBASE_CLIENT_EMAIL,
  private_key: FIREBASE_PRIVATE_KEY,
};
