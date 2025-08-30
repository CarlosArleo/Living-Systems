import dotenv from 'dotenv';
dotenv.config();

// Flows will be imported for their side effects in this file.
import './flows/simple';
import './flows/harmonize';
import './flows/knowledge';
import './flows/rag-flow';
import './flows/story-flow';
import './flows/distill'; // Import the new distill flow
