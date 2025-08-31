/**
 * @fileoverview The local development server entry point for Genkit.
 * This file imports the configured 'ai' instance to register all flows
 * and then starts the server via the Genkit CLI.
 */
import './genkit'; // This MUST be the first import to register all flows.
