/**
 * @fileoverview The local development server entry point for Genkit.
 * This file imports the configured 'ai' instance AND all defined flows
 * to register them with the server.
 */

// This MUST be the first import to register the 'ai' instance.
import './genkit'; 

// This MUST be the second import to register all the flows.
import './flows';
