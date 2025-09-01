import { MetricServiceClient } from '@google-cloud/monitoring';
import { google } from '@google-cloud/monitoring/build/protos/protos';

// Define the shape of the return object
interface KpiViolation {
  metric: string;
  threshold: number;
  measuredValue: number;
  resourceName: string;
}

export async function checkFunctionLatency(
  functionNames: string[],
  projectId: string,
  thresholdMs: number = 5000
): Promise<KpiViolation[]> {
  // Initialize the violations array
  const violations: KpiViolation[] = [];

  try {
    // 1. Client initialization code
    const client = new MetricServiceClient();

    // 2. Filter-building code
    const functionNameFilters = functionNames
      .map(name => `resource.labels.function_name="${name}"`)
      .join(' OR ');

    const filter = `metric.type="cloudfunctions.googleapis.com/function/execution_times" AND (${functionNameFilters})`;

    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - 3600; // 1 hour ago

    const request = {
      name: `projects/${projectId}`,
      filter: filter,
      interval: {
        startTime: {
          seconds: startTime,
        },
        endTime: {
          seconds: endTime,
        },
      },
      aggregation: {
        alignmentPeriod: {
          seconds: 300,
        },
        perSeriesAligner: google.monitoring.v3.Aggregation.Aligner.ALIGN_DELTA,
        crossSeriesReducer: google.monitoring.v3.Aggregation.Reducer.REDUCE_NONE,
        groupByFields: ['resource.labels.function_name'],
      },
    };

    const response = await client.listTimeSeries(request);
    const timeSeries = response[0];

    if (timeSeries && timeSeries.length > 0) {
      // Loop that iterates over the API results
      for (const series of timeSeries) {
        const functionName = series.resource?.labels?.['function_name'] || 'unknown';
        
        // 3. Response-parsing code (safely get P95 percentile)
        const p95Value = safelyGetP95Percentile(series);
        
        if (p95Value !== null) {
          const measuredValue = Math.round(p95Value * 1000); // Convert to milliseconds and round
          
          // Add the if (measuredValue > threshold) check
          if (measuredValue > thresholdMs) {
            // Create and push the KpiViolation objects to the array
            violations.push({
              metric: 'cloudfunctions.googleapis.com/function/execution_times_p95',
              threshold: thresholdMs,
              measuredValue: measuredValue,
              resourceName: functionName,
            });
          }
        }
      }
    }

  } catch (error) {
    // Wrap everything in a try...catch block
    console.error('Error checking function latency:', error);
    throw error;
  }

  // Return the final array
  return violations;
}

/**
 * Safely extracts the P95 percentile value from a time series point
 * Returns null if the value cannot be accessed safely
 */
function safelyGetP95Percentile(series: any): number | null {
  try {
    // Check if series exists and has points
    if (!series || !Array.isArray(series.points) || series.points.length === 0) {
      return null;
    }

    const latestPoint = series.points[0];
    
    // Check if point has a value
    if (!latestPoint || !latestPoint.value) {
      return null;
    }

    // Check if distributionValue exists
    if (!latestPoint.value.distributionValue) {
      return null;
    }

    const distributionValue = latestPoint.value.distributionValue;

    // Check if percentileValues array exists
    if (!Array.isArray(distributionValue.percentileValues) || 
        distributionValue.percentileValues.length === 0) {
      return null;
    }

    // Find the P95 percentile (percentile 95)
    const p95Percentile = distributionValue.percentileValues.find(
      (pv: any) => pv && pv.percentile === 95
    );

    if (!p95Percentile) {
      return null;
    }

    // Check if the P95 value exists and is a number
    if (typeof p95Percentile.value !== 'number') {
      return null;
    }

    return p95Percentile.value;

  } catch (error) {
    console.error('Error accessing P95 percentile value:', error);
    return null;
  }
}