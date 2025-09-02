/**
 * @fileoverview Genkit configuration entry point.
 * This file re-exports the centrally configured 'ai' instance from `src/ai/genkit.ts`,
 * ensuring a single source of truth for the Genkit setup.
 * This modern approach aligns with Genkit v1.x best practices.
 */

export { ai } from './src/ai/genkit';
