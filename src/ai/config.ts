/**
 * @fileoverview Centralized and validated project configuration.
 * This file loads environment variables, validates them, and exports them
 * as a single configuration object. This prevents the application from
 * starting with missing or invalid environment settings.
 */
import 'dotenv/config';

/**
 * Validates and retrieves a required environment variable.
 * @param varName The name of the environment variable.
 * @returns The value of the variable.
 * @throws An error if the variable is not set.
 */
function getRequiredEnv(varName: string): string {
  const value = process.env[varName];
  if (!value) {
    throw new Error(
      `FATAL: Required environment variable "${varName}" is not set.`
    );
  }
  return value;
}

/**
 * A frozen object containing all required, validated configuration
 * for the project's backend services.
 */
export const projectConfig = Object.freeze({
  projectId: getRequiredEnv('GCLOUD_PROJECT'),
  storageBucket: getRequiredEnv('FIREBASE_STORAGE_BUCKET'),
  location: process.env.GCLOUD_LOCATION || 'us-central1', // Default location
});

console.log('[Config] Project configuration loaded successfully.');
console.log(`[Config] Project ID: ${projectConfig.projectId}`);
console.log(`[Config] Storage Bucket: ${projectConfig.storageBucket}`);
