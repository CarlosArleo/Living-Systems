/**
 * @fileOverview A central index file to export all Genkit flows.
 * This ensures that all flows are registered with the Genkit server
 * when this file is imported.
 */

export * from './critiqueCode';
export * from './embed';
export * from './generateCode';
export * from './knowledge';
export * from './rag-flow';
export * from './simple';
export * from './story-flow';
export * from './meta-prompter';
export * from './processing'; // Correct: Export the new unified flow
// The old, separate flows are no longer needed.
// export * from './harmonize';
// export * from './integralAssessment';
