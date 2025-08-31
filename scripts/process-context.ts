/**
 * @fileOverview A script to process the CONTEXT.md file into a structured knowledge base.
 * This script reads the markdown file, chunks it by headers, generates embeddings for each
 * chunk using a Genkit flow, and saves the output to a JSON file.
 * To run: `npm run build:context`
 */
import { promises as fs } from 'fs';
import path from 'path';
import { embedText } from '../src/ai/flows/embed';
import { configureGenkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Initialize Genkit for script usage
configureGenkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY,
    }),
  ],
  logLevel: 'silent', // Keep the output clean
  enableTracingAndMetrics: false,
});


type KnowledgeChunk = {
  text: string;
  embedding: number[];
};

async function processContext() {
  console.log('Starting context processing...');

  // 1. Read CONTEXT.md
  const contextPath = path.join(process.cwd(), 'CONTEXT.md');
  const outputPath = path.join(process.cwd(), 'src', 'ai', 'knowledge-base.json');
  let content: string;
  try {
    content = await fs.readFile(contextPath, 'utf-8');
  } catch (error) {
    console.error(`Error reading CONTEXT.md at ${contextPath}`, error);
    process.exit(1);
  }

  // 2. Chunking Strategy: Split by Markdown headers (## and ###)
  const chunks = content.split(/\n(?=##?#? )/);
  console.log(`Document split into ${chunks.length} chunks.`);

  const knowledgeBase: KnowledgeChunk[] = [];
  let processedCount = 0;

  // 3. Generate Embeddings for each chunk
  for (const chunk of chunks) {
    const trimmedChunk = chunk.trim();
    if (trimmedChunk) {
      try {
        console.log(`Processing chunk ${processedCount + 1}/${chunks.length}...`);
        const embedding = await embedText(trimmedChunk);
        knowledgeBase.push({
          text: trimmedChunk,
          embedding: embedding,
        });
        processedCount++;
      } catch (error) {
        console.error(`Failed to generate embedding for chunk: "${trimmedChunk.substring(0, 50)}..."`, error);
      }
    }
  }

  // 4. Write output to JSON file
  try {
    await fs.writeFile(outputPath, JSON.stringify(knowledgeBase, null, 2));
    console.log(`✅ Successfully created knowledge base at ${outputPath}`);
    console.log(`Total chunks processed: ${processedCount}`);
  } catch (error) {
    console.error(`Error writing knowledge base file to ${outputPath}`, error);
    process.exit(1);
  }
}

processContext();
