import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DataPoint {
  timestamp: number;
  value: number;
}

interface DataVisualizationProps {
  data: {
    heartRate: DataPoint[];
    steps: DataPoint[];
    distance: DataPoint[];
    sleep: { timestamp: number; value: string }[];
  };
  anomalies: {
    heartRateAnomalies: DataPoint[];
  };
  timeRange: string;
}

export function DataVisualization({ data, anomalies, timeRange }: DataVisualizationProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const filterDataByTimeRange = (data: DataPoint[]) => {
    const now = Date.now();
    const ranges: { [key: string]: number } = {
      '1d': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '15d': 15 * 24 * 60 * 60 * 1000,
      '1m': 30 * 24 * 60 * 60 * 1000,
      '3m': 90 * 24 * 60 * 60 * 1000,
      '6m': 180 * 24 * 60 * 60 * 1000,
      '1y': 365 * 24 * 60 * 60 * 1000,
    };

    return data.filter(point => 
      point.timestamp >= now - (ranges[timeRange] || ranges['7d'])
    );
  };

  return (
    <div className="space-y-8">
      <div className="bg-card p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Heart Rate</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={filterDataByTimeRange(data.heartRate)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatDate}
              interval="preserveStartEnd"
            />
            <YAxis />
            <Tooltip
              labelFormatter={formatDate}
              formatter={(value: number) => [`${value} BPM`, 'Heart Rate']}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#2563eb"
              dot={false}
              name="Heart Rate"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Steps</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={filterDataByTimeRange(data.steps)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatDate}
              interval="preserveStartEnd"
            />
            <YAxis />
            <Tooltip
              labelFormatter={formatDate}
              formatter={(value: number) => [`${value} steps`, 'Steps']}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#16a34a"
              dot={false}
              name="Steps"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Distance</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={filterDataByTimeRange(data.distance)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatDate}
              interval="preserveStartEnd"
            />
            <YAxis />
            <Tooltip
              labelFormatter={formatDate}
              formatter={(value: number) => [`${value.toFixed(2)} meters`, 'Distance']}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#9333ea"
              dot={false}
              name="Distance"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}