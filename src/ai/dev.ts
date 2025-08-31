
import dotenv from 'dotenv';
dotenv.config();

// This is the entry point for the Genkit developer UI.
// It imports all flows to ensure they are registered with the framework.
import './flows/simple';
import './flows/harmonize'; // For client-side metadata creation
import './flows/knowledge';
import './flows/rag-flow';
import './flows/story-flow';
import './flows/embed';
import './flows/generateCode';
import './flows/critiqueCode';
import './flows/meta-prompter';
import './flows/integralAssessment'; // For background analysis
