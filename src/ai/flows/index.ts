/**
 * @fileOverview A central index file to export all Genkit flows.
 */

// The new, elegant "Living System" flows
export * from './generate';
export * from './critique';
export * from './correct';
export * from './orchestrator';

// Other utility and application flows
export * from './embed';
export * from './processing';
// ... add other flows as they are built