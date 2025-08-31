
import dotenv from 'dotenv';
dotenv.config();

// Flows will be imported for their side effects in this file.
import './flows/simple';
// import './flows/harmonize'; // Deprecated
import './flows/knowledge';
import './flows/rag-flow';
import './flows/story-flow';
import './flows/embed';
import './flows/generateCode'; // Added Generator Agent
import './flows/critiqueCode'; // Added Critique Agent
import './flows/meta-prompter'; // Added Meta-Prompter Agent
// import './flows/integralAssessment'; // DELETED: This flow is now part of processing.ts
import './flows/processing'; // The new, unified flow
