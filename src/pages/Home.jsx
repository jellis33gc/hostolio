import React from 'react';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-5xl font-heading font-semibold tracking-tight text-foreground">
          Hostolio
        </h1>
        <p className="mt-4 text-muted-foreground">Your journey starts here.</p>
      </div>
    </div>
  );
}