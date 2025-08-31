/**
 * @fileoverview The local development server entry point for Genkit.
 * This file imports the configured 'ai' instance and starts the server.
 */
import './genkit'; // This MUST be the first import to register all flows.
import { startFlowsServer } from 'genkit/flows';

// Start the Genkit server for local development.
startFlowsServer();
