import React, { useState } from 'react';
import { Shield, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataVisualization } from '@/components/DataVisualization';
import { processGoogleFitData, detectAnomalies } from '@/lib/processGoogleFitData';

export default function Dashboard() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedData, setProcessedData] = useState<any>(null);
  const [anomalies, setAnomalies] = useState<any>(null);
  const [timeRange, setTimeRange] = useState('7d');
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      setError(null);
      
      const data = await processGoogleFitData(file);
      if (!data.heartRate.length && !data.steps.length && !data.distance.length) {
        throw new Error('No valid data found in the uploaded file. Please ensure this is a Google Takeout export containing Fit data.');
      }
      
      const detectedAnomalies = detectAnomalies(data);
      
      setProcessedData(data);
      setAnomalies(detectedAnomalies);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error processing file. Please ensure this is a valid Google Takeout export.');
      console.error('Processing error:', err);
      setProcessedData(null);
      setAnomalies(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const timeRangeOptions = [
    { value: '1d', label: '1 Day' },
    { value: '7d', label: '7 Days' },
    { value: '15d', label: '15 Days' },
    { value: '1m', label: '1 Month' },
    { value: '3m', label: '3 Months' },
    { value: '6m', label: '6 Months' },
    { value: '1y', label: '1 Year' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full backdrop-blur-lg bg-background/60 border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6" />
            <span className="font-bold text-lg">IoT Evidence Extractor</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!processedData ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-card p-8 rounded-lg shadow-lg border">
              <h2 className="text-2xl font-semibold mb-6">Upload Google Fit Data</h2>
              
              {error && (
                <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-md">
                  {error}
                </div>
              )}
              
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg mb-4">Drop your Google Takeout ZIP file here</p>
                <p className="text-sm text-muted-foreground mb-4">
                  or click the button below to select a file
                </p>
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".zip"
                  onChange={handleFileUpload}
                  disabled={isProcessing}
                />
                <Button
                  onClick={() => document.getElementById('file-upload')?.click()}
                  variant="outline"
                  size="lg"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Select File'}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Data Analysis</h2>
              <div className="flex items-center space-x-4">
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="bg-background border rounded-md px-3 py-1"
                >
                  {timeRangeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  onClick={() => {
                    setProcessedData(null);
                    setAnomalies(null);
                  }}
                >
                  Upload New File
                </Button>
              </div>
            </div>

            <DataVisualization
              data={processedData}
              anomalies={anomalies}
              timeRange={timeRange}
            />

            {processedData.fileHashes.length > 0 && (
              <div className="bg-card p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">File Integrity Hashes</h3>
                <div className="space-y-2">
                  {processedData.fileHashes.map((hash: any, index: number) => (
                    <div key={index} className="text-sm">
                      <span className="font-medium">{hash.filename}:</span>
                      <span className="ml-2 font-mono text-xs">{hash.hash}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}