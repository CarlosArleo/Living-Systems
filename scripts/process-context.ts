/**
 * @fileOverview A script to process the project's knowledge base files into a structured,
 * embeddable JSON format for the Retrieval-Augmented Generation (RAG) system.
 * This script reads all markdown files from the /docs/AI Brain/ directory, chunks them,
 * generates embeddings using a Genkit flow, and saves the output.
 * To run: `npm run build:context`
 */
import { promises as fs } from 'fs';
import path from 'path';
import { embedText } from '../src/ai/flows/embed';
import { configureGenkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Initialize Genkit for standalone script usage
configureGenkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY,
    }),
  ],
  logLevel: 'silent', // Keep the console output clean
  enableTracingAndMetrics: false,
});

type KnowledgeChunk = {
  text: string;
  embedding: number[];
};

async function processContext() {
  console.log('Starting context processing for RAG knowledge base...');

  const docsDir = path.join(process.cwd(), 'docs', 'AI Brain');
  const outputPath = path.join(process.cwd(), 'rag-memory.json'); // CORRECTED: Output to root rag-memory.json
  const knowledgeBase: KnowledgeChunk[] = [];
  let totalProcessedChunks = 0;

  try {
    const files = await fs.readdir(docsDir);
    const markdownFiles = files.filter(file => file.endsWith('.md'));

    console.log(`Found ${markdownFiles.length} markdown files to process.`);

    for (const file of markdownFiles) {
      const filePath = path.join(docsDir, file);
      console.log(`\nProcessing file: ${file}`);
      const content = await fs.readFile(filePath, 'utf-8');

      // Chunking Strategy: Split by major Markdown headers (## and ###)
      const chunks = content.split(/\n(?=##?#? )/);
      console.log(`- Split into ${chunks.length} chunks.`);

      for (const chunk of chunks) {
        const trimmedChunk = chunk.trim();
        if (trimmedChunk) {
          try {
            const embedding = await embedText(trimmedChunk);
            knowledgeBase.push({
              text: trimmedChunk,
              embedding: embedding,
            });
            totalProcessedChunks++;
          } catch (error) {
            console.error(`- Failed to generate embedding for chunk: "${trimmedChunk.substring(0, 50)}..."`, error);
          }
        }
      }
    }

    await fs.writeFile(outputPath, JSON.stringify(knowledgeBase, null, 2));
    console.log(`\n✅ Successfully created knowledge base at ${outputPath}`);
    console.log(`Total chunks processed: ${totalProcessedChunks}`);

  } catch (error) {
    console.error(`Error during context processing:`, error);
    process.exit(1);
  }
}

processContext();
