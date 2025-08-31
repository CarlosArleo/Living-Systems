/**
 * @fileOverview The Regenerative Roadmap Agent.
 * This script reads the project roadmap, analyzes the current codebase,
 * and generates a dynamic status report on our progress.
 * To run: `npx tsx scripts/roadmap.ts`
 */

import * as fs from 'fs/promises';
import * as path from 'path';

// --- Type Definitions ---
interface RoadmapItem {
  text: string;
  status: '✅ DONE' | '[ ] PENDING';
}

interface RoadmapTier {
  title: string;
  items: RoadmapItem[];
  completion: number;
}

// --- Evidence Mapping ---
// This is the core logic connecting the roadmap to the codebase.
// Each key is a substring of a roadmap item. Each value is an array of
// keywords or file paths that serve as "proof" of completion.
const evidenceMap: Record<string, string[]> = {
  "User Authentication & Profile Management": ["src/app/login/page.tsx", "src/components/user-profile.tsx", "signInWithRedirect"],
  "Core Data Ingestion Flow": ["src/components/upload-dialog.tsx", "onObjectFinalized"],
  "\"Integral Assessment\" AI Engine": ["src/ai/flows/processing.ts", "processUploadedDocument"],
  "Data Visualization Dashboard": ["src/components/place-detail-view.tsx", "src/components/map.tsx"],
  "Foundational Governance": ["firestore.rules", "allow write: if false;"],
  "\"Story of Place\" AI Synthesis": ["src/ai/flows/story-flow.ts", "generateStoryOfPlace"],
  "Collaboration & Feedback Features": ["src/components/feedback-panel.tsx", "/api/feedback/route.ts"],
  "User Roles & Permissions": ["request.auth.token.admin", "hasOnly(['displayName'])"], // Keywords indicating role logic
  "\"Nodal Intervention Mapper\"": ["<simulation-placeholder>"], // Placeholder for future feature
  "Constrained Generative Design Module": ["<generative-design-placeholder>"], // Placeholder for future feature
};


/**
 * Recursively scans directories to build a searchable string of all code.
 * @param dir The directory to scan.
 * @returns A promise that resolves to the combined content of all files.
 */
async function scanCodebase(dir: string): Promise<string> {
  let content = '';
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next') {
        content += await scanCodebase(fullPath);
      }
    } else if (/\.(ts|tsx|sh|md|json)$/.test(entry.name)) {
        try {
            content += await fs.readFile(fullPath, 'utf-8');
        } catch (e) {
            console.warn(`Could not read file: ${fullPath}`);
        }
    }
  }
  return content;
}

/**
 * The main agent function to generate the roadmap report.
 */
async function generateRoadmapReport() {
  console.log('\n=================================================');
  console.log('    RDI PLATFORM - REGENERATIVE ROADMAP STATUS   ');
  console.log('=================================================\n');

  const roadmapPath = path.join(process.cwd(), 'docs', 'DEVELOPMENT_ROADMAP.md');
  const roadmapContent = await fs.readFile(roadmapPath, 'utf-8');

  console.log('[Agent] Scanning codebase... this may take a moment.');
  const codebaseText = await scanCodebase(process.cwd());
  console.log('[Agent] Codebase scan complete.\n');

  const tiers = roadmapContent.split('---');

  for (const tierText of tiers) {
    if (!tierText.trim()) continue;

    const tierTitleMatch = tierText.match(/### \*\*(.*)\*\*/);
    const tierTitle = tierTitleMatch ? tierTitleMatch[1] : 'Unknown Tier';

    const items: RoadmapItem[] = [];
    const itemRegex = /- \[ \] (.*)/g;
    let match;
    while ((match = itemRegex.exec(tierText)) !== null) {
      const itemText = match[1].trim();
      let isDone = false;

      // Find the corresponding evidence key
      const evidenceKey = Object.keys(evidenceMap).find(key => itemText.includes(key));

      if (evidenceKey) {
        const evidenceItems = evidenceMap[evidenceKey];
        // Check if all evidence items for this key are present
        const allEvidenceFound = evidenceItems.every(evidence => codebaseText.includes(evidence));
        if (allEvidenceFound) {
          isDone = true;
        }
      }

      items.push({
        text: itemText,
        status: isDone ? '✅ DONE' : '[ ] PENDING',
      });
    }
    
    if (items.length > 0) {
      const doneCount = items.filter(item => item.status === '✅ DONE').length;
      const completion = Math.round((doneCount / items.length) * 100);

      console.log(`--- ${tierTitle} ---`);
      console.log(`[ COMPLETION: ${completion}% ]`);
      items.forEach(item => {
        console.log(`${item.status}: ${item.text}`);
      });
      console.log('');
    }
  }

  console.log('--- END OF REPORT ---');
}

generateRoadmapReport().catch(console.error);
