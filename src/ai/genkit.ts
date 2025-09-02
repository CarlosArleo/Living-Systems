import 'dotenv/config';
import { genkit, type GenkitOptions} from 'genkit';
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';
import { googleAI } from '@genkit-ai/googleai';

enableFirebaseTelemetry();

const genkitConfig: GenkitOptions = {
  plugins: [
    googleAI({
    })
  ],
};

export const ai = genkit(genkitConfig);
