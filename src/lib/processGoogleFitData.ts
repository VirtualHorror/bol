import JSZip from 'jszip';
import CryptoJS from 'crypto-js';

interface DataPoint {
  startTimeNanos: string;
  endTimeNanos: string;
  value: number[] | Array<{ intVal?: number; fpVal?: number; stringVal?: string }>;
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

  const processedData: ProcessedData = {
    heartRate: [],
    steps: [],
    distance: [],
    sleep: [],
    location: [],
    fileHashes: [],
  };

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch (error) {
    console.error('Failed to load ZIP file:', error);
    throw new Error('Failed to read the ZIP file. Please ensure the file is not corrupted.');
  }

  // First, extract all files to memory
  const extractedFiles = new Map<string, string>();
  const validPaths = new Set<string>();

  // Check if we have the root Takeout/Fit directory
  const hasFitFolder = Object.keys(zip.files).some(path => 
    path.replace(/\\/g, '/').toLowerCase().startsWith('takeout/fit/')
  );

  if (!hasFitFolder) {
    throw new Error(
      'Invalid Google Takeout structure. Missing "Fit" directory.\n' +
      'Please ensure you:\n' +
      '1. Selected ONLY "Fit" data in Google Takeout\n' +
      '2. Downloaded the complete export from Google'
    );
  }

  // Extract and validate the structure
  for (const [filename, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;

    try {
      const normalizedPath = filename.replace(/\\/g, '/');
      
      // Check if this is a Fit data file
      if (normalizedPath.toLowerCase().includes('takeout/fit/')) {
        // Skip non-JSON files and unwanted directories
        if (!normalizedPath.endsWith('.json')) continue;
        if (normalizedPath.toLowerCase().includes('daily activity metrics')) continue;
        if (normalizedPath.toLowerCase().includes('all sessions')) continue;
        if (normalizedPath.toLowerCase().includes('activities')) continue;

        // CORRECTED LINE: Match case-sensitive "All data" folder
        if (normalizedPath.includes('Takeout/Fit/All data')) {
          const content = await zipEntry.async('string');
          extractedFiles.set(normalizedPath, content);
          validPaths.add(normalizedPath);
          console.log('Processing file:', normalizedPath);
        }
      }
    } catch (error) {
      console.error(`Error extracting file ${filename}:`, error);
    }
  }

  if (validPaths.size === 0) {
    throw new Error(
      'No valid Google Fit data found!\n' +
      'Please ensure:\n' +
      '1. You selected "Fit" data in Google Takeout\n' +
      '2. The export contains activity data\n' +
      '3. You waited for Google to prepare the export (may take hours)\n' +
      '4. You downloaded the COMPLETE export from Google'
    );
  }

  // Process the extracted files
  let foundFitData = false;

  for (const [filepath, content] of extractedFiles) {
    try {
      // Calculate hash for data integrity
      const hash = CryptoJS.SHA256(content).toString();
      processedData.fileHashes.push({ filename: filepath, hash });

      // Parse JSON content
      let data: any[];
      try {
        data = JSON.parse(content);
        if (!Array.isArray(data)) {
          console.warn(`File ${filepath} does not contain an array of data points`);
          continue;
        }
      } catch (e) {
        console.warn(`Failed to parse JSON from ${filepath}:`, e);
        continue;
      }

      // Determine data type from filename
      const filename = filepath.toLowerCase();
      const isHeartRate = filename.includes('heart_rate.bpm');
      const isStepCount = filename.includes('step_count.delta');
      const isDistance = filename.includes('distance.delta');
      const isSleep = filename.includes('sleep.segment');

      if (isHeartRate || isStepCount || isDistance || isSleep) {
        foundFitData = true;
      }

      // Process data points
      let validPointsCount = 0;
      data.forEach((point: DataPoint) => {
        if (!point.startTimeNanos || !point.value || !Array.isArray(point.value)) {
          return;
        }

        const timestamp = Math.floor(parseInt(point.startTimeNanos) / 1000000);
        const firstValue = point.value[0];

        // Handle different value formats
        let processedValue: number | string | undefined;

        if (typeof firstValue === 'number') {
          processedValue = firstValue;
        } else if (typeof firstValue === 'object' && firstValue !== null) {
          processedValue = firstValue.intVal ?? firstValue.fpVal ?? firstValue.stringVal;
        }

        if (processedValue !== undefined) {
          validPointsCount++;
          if (isHeartRate) {
            processedData.heartRate.push({ 
              timestamp, 
              value: Number(processedValue)
            });
          } else if (isStepCount) {
            processedData.steps.push({ 
              timestamp, 
              value: Number(processedValue)
            });
          } else if (isDistance) {
            processedData.distance.push({ 
              timestamp, 
              value: Number(processedValue)
            });
          } else if (isSleep) {
            processedData.sleep.push({ 
              timestamp, 
              value: String(processedValue)
            });
          }
        }
      });

      console.log(`Processed ${validPointsCount} valid points from ${filepath}`);

    } catch (error) {
      console.error(`Error processing file ${filepath}:`, error);
    }
  }

  if (!foundFitData) {
    throw new Error(
      'No fitness data found!\n' +
      'Found files but no valid heart rate, steps, distance or sleep data.\n' +
      'Ensure the smartwatch was properly synced with Google Fit.'
    );
  }

  // Sort all data by timestamp
  processedData.heartRate.sort((a, b) => a.timestamp - b.timestamp);
  processedData.steps.sort((a, b) => a.timestamp - b.timestamp);
  processedData.distance.sort((a, b) => a.timestamp - b.timestamp);
  processedData.sleep.sort((a, b) => a.timestamp - b.timestamp);

  return processedData;
}

export function detectAnomalies(data: ProcessedData) {
  const detectOutliers = (values: number[]): number[] => {
    if (values.length < 4) return []; // Need enough data points for meaningful analysis
    
    // Calculate quartiles and IQR
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length / 4)];
    const q3 = sorted[Math.floor((3 * sorted.length) / 4)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    // Find indices of outliers
    return values.map((value, index) => 
      (value < lowerBound || value > upperBound) ? index : -1
    ).filter(i => i !== -1);
  };

  // Detect heart rate anomalies
  const heartRateValues = data.heartRate.map(d => d.value);
  const heartRateAnomalies = detectOutliers(heartRateValues);

  return {
    heartRateAnomalies: heartRateAnomalies.map(i => data.heartRate[i]),
  };
}
