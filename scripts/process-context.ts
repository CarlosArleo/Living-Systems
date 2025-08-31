/**
 * @fileOverview A script to process the CONTEXT.md file and create a
 *               JSON-based vector store for the RAG system.
 */
'use server';

// CORRECT: Import the configured ai object and googleAI for the embedder
import { ai, googleAI } from '../src/ai/genkit';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Main function to process the CONTEXT.md file.
 */
async function processContextFile() {
  console.log('[Context Processor] Starting context processing...');

  try {
    const contextFilePath = path.join(process.cwd(), 'CONTEXT.md');
    // CORRECT: The output file path is now correctly pointing to the root.
    const outputFilePath = path.join(process.cwd(), 'rag-memory.json');

    console.log(`[Context Processor] Reading CONTEXT.md from: ${contextFilePath}`);
    const contextContent = await fs.readFile(contextFilePath, 'utf-8');

    console.log('[Context Processor] Chunking document by Markdown headers...');
    // This regex splits the text by ## or ### headers, keeping the header with the content.
    const chunks = contextContent.split(/(?=^##\s|?=^###\s)/m).filter(chunk => chunk.trim() !== '');
    console.log(`[Context Processor] Found ${chunks.length} chunks to process.`);

    const knowledgeBase = [];
    for (const chunk of chunks) {
      if (chunk.trim().length < 10) continue; // Skip very small chunks

      console.log(`[Context Processor] Embedding chunk starting with: "${chunk.substring(0, 50).replace(/\n/g, ' ')}..."`);
      
      // CORRECT: The call now uses the configured `ai` object.
      const embeddingResponse = await ai.embed({
        embedder: googleAI.embedder('text-embedding-004'),
        content: chunk,
      });

      knowledgeBase.push({
        text: chunk,
        embedding: embeddingResponse.embedding,
      });
    }

    console.log(`[Context Processor] Writing knowledge base to: ${outputFilePath}`);
    await fs.writeFile(outputFilePath, JSON.stringify(knowledgeBase, null, 2));

    console.log('[Context Processor] ✅ Context processing complete. Knowledge base created successfully!');

  } catch (error) {
    console.error('[Context Processor] ❌ An error occurred during context processing:', error);
    process.exit(1);
  }
}

processContextFile();
