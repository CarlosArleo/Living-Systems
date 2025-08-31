// scripts/process-context.ts

import { configure } from '@genkit-ai/core';
import { ai, googleAI } from '../src/ai/genkit'; // Correct import for the ai object
import * as fs from 'fs/promises';
import * as path from 'path';

// 1. Configure Genkit with the necessary plugins.
// This is redundant if the imported 'ai' object is already configured,
// but safe to have for a standalone script.
configure({
  plugins: [
    googleAI(), // This plugin provides access to Gemini models.
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

/**
 * Main function to process the CONTEXT.md file.
 */
async function processContextFile() {
  console.log('Starting context processing...');

  try {
    // 2. Define file paths
    const contextFilePath = path.join(process.cwd(), 'CONTEXT.md');
    // CORRECTED: Output to the root of the project.
    const outputFilePath = path.join(process.cwd(), 'rag-memory.json');

    // 3. Read the CONTEXT.md file
    console.log(`Reading CONTEXT.md from: ${contextFilePath}`);
    const contextContent = await fs.readFile(contextFilePath, 'utf-8');

    // 4. Chunk the document by Markdown headers (##)
    console.log('Chunking document...');
    // This regex splits the string by '## ' but keeps the delimiter in the resulting array.
    const chunks = contextContent.split(/\n(?=##\s)/).filter(chunk => chunk.trim() !== '');
    console.log(`Found ${chunks.length} chunks to process.`);

    // 5. Generate embeddings for each chunk
    const knowledgeBase = [];
    for (const chunk of chunks) {
      console.log(`Embedding chunk starting with: "${chunk.substring(0, 40).replace(/\n/g, ' ')}..."`);
      
      // CORRECTED: Use the imported 'ai' object and its methods.
      const embeddingResponse = await ai.embed({
        embedder: googleAI.embedder('text-embedding-004'),
        content: chunk,
      });

      knowledgeBase.push({
        text: chunk,
        embedding: embeddingResponse.embedding,
      });
    }

    // 6. Write the output to the JSON file
    console.log(`Writing knowledge base to: ${outputFilePath}`);
    await fs.writeFile(outputFilePath, JSON.stringify(knowledgeBase, null, 2));

    console.log('✅ Context processing complete. Knowledge base created successfully!');

  } catch (error) {
    console.error('❌ An error occurred during context processing:', error);
    process.exit(1); // Exit with an error code
  }
}

// 7. Execute the main function
processContextFile();
