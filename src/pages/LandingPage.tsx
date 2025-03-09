import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, FileJson, Activity } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full backdrop-blur-lg bg-background/60 border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6" />
            <span className="font-bold text-lg">IoT Evidence Extractor</span>
          </div>
          <Button onClick={() => navigate('/login')} variant="default">
            Get Started
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <section className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">
            Smart Watch Data Analysis for Law Enforcement
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A specialized tool for extracting and analyzing evidence from IoT devices,
            developed for Karnataka State Police CID's cybersecurity initiatives.
          </p>
        </section>

        <section className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="p-6 rounded-lg border bg-card">
            <FileJson className="h-12 w-12 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Data Extraction</h3>
            <p className="text-muted-foreground">
              Securely extract and process data from Google Fit exports while maintaining data integrity.
            </p>
          </div>
          <div className="p-6 rounded-lg border bg-card">
            <Activity className="h-12 w-12 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Advanced Analysis</h3>
            <p className="text-muted-foreground">
              Analyze vital signs, location data, and activity patterns to identify anomalies.
            </p>
          </div>
          <div className="p-6 rounded-lg border bg-card">
            <Shield className="h-12 w-12 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Evidence Security</h3>
            <p className="text-muted-foreground">
              Generate secure hashes for each data file to ensure evidence integrity for court proceedings.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}