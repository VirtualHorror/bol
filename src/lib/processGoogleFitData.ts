import JSZip from 'jszip';
import CryptoJS from 'crypto-js';

interface DataPoint {
  startTimeNanos: string;
  endTimeNanos: string;
  value: number[] | Array<{ intVal?: number; stringVal?: string }>;
  dataTypeName: string;
}

interface ProcessedData {
  heartRate: { timestamp: number; value: number }[];
  steps: { timestamp: number; value: number }[];
  distance: { timestamp: number; value: number }[];
  sleep: { timestamp: number; value: string }[];
  location?: { timestamp: number; lat: number; lng: number }[];
  fileHashes: { filename: string; hash: string }[];
}

export async function processGoogleFitData(file: File): Promise<ProcessedData> {
  if (!file.name.endsWith('.zip')) {
    throw new Error('Please upload a ZIP file');
  }

  const zip = new JSZip();
  const contents = await zip.loadAsync(file);
  const processedData: ProcessedData = {
    heartRate: [],
    steps: [],
    distance: [],
    sleep: [],
    location: [],
    fileHashes: [],
  };

  let foundFitData = false;

  // Process each file in the zip
  for (const [filename, zipEntry] of Object.entries(contents.files)) {
    if (!filename.includes('Takeout/Fit/All Data')) continue;
    if (zipEntry.dir) continue;

    foundFitData = true;
    const content = await zipEntry.async('string');
    const hash = CryptoJS.SHA256(content).toString();
    processedData.fileHashes.push({ filename, hash });

    try {
      const data = JSON.parse(content);
      if (!Array.isArray(data)) continue;

      data.forEach((point: DataPoint) => {
        if (!point.startTimeNanos || !point.value) return;
        
        const timestamp = Math.floor(parseInt(point.startTimeNanos) / 1000000);

        if (filename.includes('heart_rate')) {
          const value = Array.isArray(point.value) ? point.value[0] : 0;
          if (typeof value === 'number') {
            processedData.heartRate.push({ timestamp, value });
          }
        } else if (filename.includes('step_count')) {
          const value = Array.isArray(point.value) ? point.value[0] : 0;
          if (typeof value === 'number') {
            processedData.steps.push({ timestamp, value });
          }
        } else if (filename.includes('distance')) {
          const value = Array.isArray(point.value) ? point.value[0] : 0;
          if (typeof value === 'number') {
            processedData.distance.push({ timestamp, value });
          }
        } else if (filename.includes('sleep')) {
          const value = Array.isArray(point.value) && point.value[0] 
            ? (point.value[0].stringVal || point.value[0].intVal?.toString() || 'unknown')
            : 'unknown';
          processedData.sleep.push({ timestamp, value });
        }
      });
    } catch (error) {
      console.error(`Error processing file ${filename}:`, error);
    }
  }

  if (!foundFitData) {
    throw new Error('No Google Fit data found in the ZIP file. Please ensure this is a valid Google Takeout export containing Fit data.');
  }

  // Sort data by timestamp
  processedData.heartRate.sort((a, b) => a.timestamp - b.timestamp);
  processedData.steps.sort((a, b) => a.timestamp - b.timestamp);
  processedData.distance.sort((a, b) => a.timestamp - b.timestamp);
  processedData.sleep.sort((a, b) => a.timestamp - b.timestamp);

  return processedData;
}

export function detectAnomalies(data: ProcessedData) {
  // Simple anomaly detection based on statistical analysis
  const detectOutliers = (values: number[]): number[] => {
    if (values.length < 2) return [];
    
    const mean = values.reduce((a, b) => a + b) / values.length;
    const std = Math.sqrt(
      values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length
    );
    const threshold = 2; // Number of standard deviations

    return values.map((value, index) => 
      Math.abs(value - mean) > threshold * std ? index : -1
    ).filter(i => i !== -1);
  };

  // Detect heart rate anomalies
  const heartRateValues = data.heartRate.map(d => d.value);
  const heartRateAnomalies = detectOutliers(heartRateValues);

  return {
    heartRateAnomalies: heartRateAnomalies.map(i => data.heartRate[i]),
  };
}