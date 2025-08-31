/**
 * @fileoverview A simple, AI-generated React component.
 * This component displays a "Hello, World!" message.
 * It serves as a basic test case for the autonomous development system.
 */
import React from 'react';

/**
 * A simple "Hello, World!" component.
 * @returns {JSX.Element} The rendered component.
 */
const HelloWorld = (): JSX.Element => {
  return (
    <div className="flex h-screen items-center justify-center bg-background text-foreground">
      <div className="rounded-lg border bg-card p-8 text-center shadow-lg">
        <h1 className="text-4xl font-bold">Hello, World!</h1>
        <p className="mt-2 text-muted-foreground">This component was generated and audited by the RDI AI Agent.</p>
      </div>
    </div>
  );
};

export default HelloWorld;
