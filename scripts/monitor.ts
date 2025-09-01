/**
 * @fileOverview The Bio-Aware Monitor Agent.
 * This script runs periodically to check the health of the RDI Platform.
 */
import * as admin from 'firebase-admin';
import * as fs from 'fs/promises';
import * as path from 'path';
import { projectConfig } from '@/ai/config';
import { checkFunctionLatency } from '@/ai/monitoring/latency';

// Initialize Firebase Admin SDK ONLY ONCE.
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: projectConfig.projectId,
    });
}
const db = admin.firestore();


/**
 * Dynamically discovers the names of all exported Cloud Functions.
 * This makes the monitoring script resilient to function renames or additions.
 * @returns A promise that resolves to an array of function names.
 */
async function discoverFunctionNames(): Promise<string[]> {
    console.log('[Monitor] Discovering Cloud Functions to monitor...');
    const functionsIndexPath = path.join(process.cwd(), 'functions', 'src', 'index.ts');
    try {
        const content = await fs.readFile(functionsIndexPath, 'utf-8');
        // Regex to find all exported constants (our functions)
        const exportRegex = /export const (\w+)/g;
        const names = [];
        let match;
        while ((match = exportRegex.exec(content)) !== null) {
            names.push(match[1]);
        }
        console.log(`[Monitor] Found functions: ${names.join(', ')}`);
        return names;
    } catch (error) {
        console.error(`[Monitor] Failed to read or parse ${functionsIndexPath}. Please ensure the file exists.`);
        return [];
    }
}


/**
 * The main function for the Monitor Agent.
 */
async function runHealthChecks() {
  console.log('[Monitor] Starting system health checks...');

  try {
    const functionsToMonitor = await discoverFunctionNames();

    if (functionsToMonitor.length === 0) {
        console.warn('[Monitor] No Cloud Functions found to monitor. Exiting.');
        return;
    }

    const latencyViolations = await checkFunctionLatency(
      functionsToMonitor,
      projectConfig.projectId,
      800 // Using the 800ms threshold from our CONSTITUTION
    );

    const allViolations = [...latencyViolations];

    if (allViolations.length > 0) {
      console.log(`[Monitor] Detected ${allViolations.length} KPI violations. Writing to Firestore...`);
      
      const issuesCollection = db.collection('system_health');
      const promises = allViolations.map(violation => 
        issuesCollection.add({
          ...violation,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        })
      );
      await Promise.all(promises);
      console.log('[Monitor] Successfully wrote all violations to Firestore.');

    } else {
      console.log('[Monitor] ✅ All systems are healthy. No KPI violations detected.');
    }

  } catch (error) {
    console.error('❌ [Monitor] A critical error occurred during the health check:', error);
    process.exit(1);
  }
}

runHealthChecks();
