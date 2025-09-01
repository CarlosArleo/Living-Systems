/**
 * @fileOverview The Bio-Aware Monitor Agent.
 * This script runs periodically to check the health of the RDI Platform.
 * It is now self-contained and does not depend on src/ files.
 */
import 'dotenv/config';
import * as admin from 'firebase-admin';
import { MetricServiceClient } from '@google-cloud/monitoring';
import { google } from '@google-cloud/monitoring/build/protos/protos';

// --- Inlined Configuration Logic ---
const projectId = process.env.GCLOUD_PROJECT;
if (!projectId) {
  throw new Error("FATAL: Required environment variable 'GCLOUD_PROJECT' is not set.");
}
console.log(`[Monitor-Config] Project ID: ${projectId}`);

// --- Inlined Latency Checking Logic ---

interface KpiViolation {
  metric: string;
  threshold: number;
  measuredValue: number;
  resourceName: string;
}

/**
 * Safely extracts the P95 percentile value from a time series point.
 * Returns null if the value cannot be accessed safely.
 */
function safelyGetP95Percentile(series: any): number | null {
  try {
    if (!series?.points?.[0]?.value?.distributionValue?.percentileValues) return null;
    const p95 = series.points[0].value.distributionValue.percentileValues.find((pv: any) => pv.percentile === 95);
    return typeof p95?.value === 'number' ? p95.value : null;
  } catch (error) {
    console.error('Error accessing P95 percentile value:', error);
    return null;
  }
}

/**
 * Checks the P95 execution latency for a list of Cloud Functions against a threshold.
 */
async function checkFunctionLatency(
  functionNames: string[],
  monitoringProjectId: string,
  thresholdMs: number
): Promise<KpiViolation[]> {
  const violations: KpiViolation[] = [];
  if (functionNames.length === 0) {
    console.warn('[LatencyCheck] No function names provided to monitor.');
    return violations;
  }

  try {
    const client = new MetricServiceClient();
    const functionNameFilters = functionNames.map(name => `resource.labels.function_name="${name}"`).join(' OR ');
    const filter = `metric.type="cloudfunctions.googleapis.com/function/execution_times" AND (${functionNameFilters})`;

    const now = Math.floor(Date.now() / 1000);
    const request = {
      name: `projects/${monitoringProjectId}`,
      filter: filter,
      interval: { startTime: { seconds: now - 3600 }, endTime: { seconds: now } },
      aggregation: {
        alignmentPeriod: { seconds: 600 },
        perSeriesAligner: google.monitoring.v3.Aggregation.Aligner.ALIGN_PERCENTILE_95,
      },
    };

    const [timeSeries] = await client.listTimeSeries(request);

    timeSeries.forEach(series => {
      const functionName = series.resource?.labels?.['function_name'] || 'unknown';
      const measuredValue = series.points?.[0]?.value?.doubleValue;

      if (typeof measuredValue === 'number') {
        if (measuredValue > thresholdMs) {
          violations.push({
            metric: 'p95_latency_ms',
            threshold: thresholdMs,
            measuredValue: Math.round(measuredValue),
            resourceName: functionName,
          });
        }
      }
    });
  } catch (error) {
    console.error('Error checking function latency:', error);
    // Re-throw to be caught by the main handler
    throw error;
  }
  return violations;
}


// --- Main Agent Logic ---

// Initialize Firebase Admin SDK ONLY ONCE.
if (!admin.apps.length) {
    admin.initializeApp({ projectId });
}
const db = admin.firestore();

/**
 * The main function for the Monitor Agent.
 */
async function runHealthChecks() {
  console.log('[Monitor] Starting system health checks...');

  try {
    const functionsToMonitor = ['triggerDocumentAnalysisOnUpload'];

    const latencyViolations = await checkFunctionLatency(functionsToMonitor, projectId, 800);

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
