/**
 * @fileoverview A test page to display and verify AI-generated components.
 */
"use client";

import React from 'react';
import HelloWorld from '@/components/HelloWorld';

/**
 * A page component that renders the HelloWorld component.
 * This is used to test the output of the autonomous development agent.
 * @returns {JSX.Element} The rendered page.
 */
export default function TestPage() {
  return <HelloWorld />;
}
