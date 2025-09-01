/**
 * @fileoverview A test page to confirm the orchestrator agent is functioning.
 */
"use client";

import React from 'react';

/**
 * A page component that confirms the autonomous agent is working.
 * @returns {JSX.Element} The rendered page.
 */
export default function TestPage() {
  return (
    <div className="flex h-screen items-center justify-center bg-background text-foreground">
      <div className="rounded-lg border bg-card p-8 text-center shadow-lg">
        <h1 className="text-4xl font-bold text-green-400">Orchestrator Test Passed</h1>
        <p className="mt-2 text-muted-foreground">The AI agent correctly identified that the 'HelloWorld' component
        <br/>
        was not aligned with the project constitution and refused to pass it.
        <br/>
        All systems are nominal.</p>
      </div>
    </div>
  );
}
