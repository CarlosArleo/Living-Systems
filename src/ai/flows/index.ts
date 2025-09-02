/**
 * @fileOverview A central index file to export all Genkit flows.
 */

// Core orchestrator flows for the "Mechanical System" (Plan A)
export * from './generate';
export * from './critique';
export * from './correct';

// Other utility and application flows
export * from './embed';
export * from './processing';
// ... remove any other non-existent flows