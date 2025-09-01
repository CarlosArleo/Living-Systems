/**
 * @fileOverview The Bio-Aware Monitor Agent.
 * This script runs periodically to check the health of the RDI Platform.
 */
import * as admin from 'firebase-admin';
import { projectConfig } from '@/ai/config'; // Use path alias
import { checkFunctionLatency } from '@/ai/monitoring/latency'; // Use path alias

// Initialize Firebase Admin SDK ONLY ONCE.
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: projectConfig.projectId,
    });
}
const db = admin.firestore();

/**
 * The main function for the Monitor Agent.
 */
async function runHealthChecks() {
  console.log('[Monitor] Starting system health checks...');

  try {
    // --- Define the resources to monitor ---
    const functionsToMonitor = [
      'triggerDocumentAnalysisOnUpload', // The name of our trigger function
      // In the future, you would add the names of your Genkit flow HTTP endpoints here
    ];

    // 1. Check Function Latency (using our perfected engine)
    const latencyViolations = await checkFunctionLatency(
      functionsToMonitor,
      projectConfig.projectId,
      800 // Using the 800ms threshold from our CONSTITUTION
    );

    // 2. (Future) Check Error Rates...

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

// Execute the main function
runHealthChecks();
