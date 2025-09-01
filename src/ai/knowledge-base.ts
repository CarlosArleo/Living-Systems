/**
 * @fileOverview Retrieves relevant context from the project's knowledge base.
 * Fallback implementation uses TF-IDF + cosine similarity (no external API).
 */
'use server';

import { promises as fs } from 'fs';
import path from 'path';

type KnowledgeChunk = {
  text: string;
  // embedding?: number[];  // Ignored by this fallback; OK if present in file
};

let knowledgeBase: KnowledgeChunk[] | null = null;

async function loadKnowledgeBase(): Promise<KnowledgeChunk[]> {
  if (knowledgeBase) return knowledgeBase;

  const filePath = path.join(process.cwd(), 'rag-memory.json');
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(fileContent);
    if (!Array.isArray(parsed)) {
      console.warn('[KnowledgeBase] rag-memory.json is not an array; using empty base.');
      knowledgeBase = [];
      return knowledgeBase;
    }
    // Normalize to { text }
    knowledgeBase = parsed
      .map((item: any) => ({ text: String(item?.text ?? '') }))
      .filter((x: KnowledgeChunk) => x.text.trim().length > 0);
    return knowledgeBase;
  } catch (err) {
    console.error('[KnowledgeBase] Failed to load rag-memory.json:', err);
    knowledgeBase = [];
    return knowledgeBase;
  }
}

// --- Minimal TF-IDF implementation (no deps) ---

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

type Vocab = Map<string, number>; // term -> column index

function buildVocab(docs: string[]): Vocab {
  const vocab = new Map<string, number>();
  for (const doc of docs) {
    for (const term of new Set(tokenize(doc))) {
      if (!vocab.has(term)) vocab.set(term, vocab.size);
    }
  }
  return vocab;
}

function tfVector(doc: string, vocab: Vocab): Float64Array {
  const vec = new Float64Array(vocab.size);
  const terms = tokenize(doc);
  for (const t of terms) {
    const idx = vocab.get(t);
    if (idx !== undefined) vec[idx] += 1;
  }
  // normalize term frequency by doc length
  if (terms.length > 0) {
    for (let i = 0; i < vec.length; i++) vec[i] /= terms.length;
  }
  return vec;
}

function idfVector(docs: string[], vocab: Vocab): Float64Array {
  const N = docs.length;
  const df = new Float64Array(vocab.size);
  docs.forEach((doc) => {
    const terms = new Set(tokenize(doc));
    for (const t of terms) {
      const idx = vocab.get(t);
      if (idx !== undefined) df[idx] += 1;
    }
  });
  const idf = new Float64Array(vocab.size);
  for (let i = 0; i < idf.length; i++) {
    // +1 smoothing to avoid div-by-zero
    idf[i] = Math.log((N + 1) / (df[i] + 1)) + 1;
  }
  return idf;
}

function hadamard(a: Float64Array, b: Float64Array): Float64Array {
  const out = new Float64Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] * b[i];
  return out;
}

function cosine(a: Float64Array, b: Float64Array): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Returns the top-K relevant text chunks for a query.
 */
export async function getRelevantContext(query: string, topK = 5): Promise<string[]> {
  const base = await loadKnowledgeBase();
  if (base.length === 0) return [];

  const docs = base.map((c) => c.text);
  const vocab = buildVocab([...docs, query]);
  const idf = idfVector(docs, vocab);

  const docVecs = docs.map((d) => hadamard(tfVector(d, vocab), idf));
  const qVec = hadamard(tfVector(query, vocab), idf);

  const scored = docVecs.map((v, i) => ({
    text: docs[i],
    score: cosine(qVec, v),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, Math.max(1, topK)).map((s) => s.text);
}
