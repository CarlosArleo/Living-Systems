/**
 * @fileOverview The Regenerative Roadmap Agent.
 * This script reads our strategic `DEVELOPMENT_ROADMAP.md`, analyzes the current codebase,
 * and generates a dynamic status report on our progress.
 * To run: `npx tsx scripts/roadmap.ts`
 */

import * as fs from 'fs/promises';
import * as path from 'path';

// --- Type Definitions ---
interface SubTask {
  text: string;
  status: '✅ DONE' | '[ ] PENDING';
}

interface MainTask {
  text: string;
  status: '✅ DONE' | '[ ] PENDING' | '📊 IN PROGRESS';
  subTasks: SubTask[];
  completion: number;
}

interface RoadmapTier {
  title: string;
  tasks: MainTask[];
  completion: number;
}

// --- Granular Evidence Mapping ---
// This map now links specific sub-tasks (or main tasks if they have no sub-tasks)
// to the evidence of their completion in the codebase.
const evidenceMap: Record<string, string[]> = {
    // Tier 1
    "Implement UI Components": ["src/app/login/page.tsx", "src/components/user-profile.tsx"],
    "Implement Backend Logic": ["firebase.auth()", "firebase-admin", "users"],
    "Implement Protected Routes": ["next/navigation", "useRouter"],
    "Create Document Upload UI": ["src/components/upload-dialog.tsx"],
    "Develop Backend Upload Handler": ["onObjectFinalized", "firebase-functions/v2/storage"],
    "Develop the Genkit Analysis Flow": ["src/ai/flows/processing.ts", "processUploadedDocument"],
    "Create the Cloud Function Trigger": ["onObjectFinalized", "firebase-functions/v2/storage"],
    "Create the \"Place\" Detail Page": ["/places/[placeId]"],
    "Implement the \"Holistic\" Data Fetcher": ["/api/places/[placeId]/route.ts", "Enforce Wholeness"],
    "Develop Visualization Components": ["src/components/place-detail-view.tsx"],
    "Implement the Map View": ["src/components/map.tsx", "mapbox-gl"],
    "Implement Firestore Security Rules": ["firestore.rules", "allow write: if false;"],
    // Tier 2
    "Develop the Genkit Synthesis Flow": ["src/ai/flows/story-flow.ts"],
    "Mandate Potential-Based Framing": ["Latent Potential"],
    "Save the Story": ["storyOfPlace"],
    "Implement the Story Display UI": ["src/components/story-panel.tsx"],
    "Engineer for Collaboration": ["src/components/feedback-panel.tsx"],
    "Create Feedback Backend": ["/api/feedback/route.ts"],
    "Update User Model": ["role"],
    "Refine Security Rules": ["request.auth.token.admin", "hasOnly(['displayName'])"],
    // Tier 3
    "Develop Simulation Input UI": ["<simulation-input-form-placeholder>"],
    "Implement Simulation Backend": ["<simulation-backend-placeholder>"],
    "Create Results Visualization UI": ["<simulation-results-chart-placeholder>"],
    "Develop Constraint Definition UI": ["<constraint-definition-ui-placeholder>"],
    "Create Generative Design AI Flow": ["<generative-design-flow-placeholder>"],
};


/**
 * Recursively scans specified directories and files to build a searchable string of all application code.
 * Excludes documentation and scripts to prevent self-auditing.
 * @param paths An array of directory or file paths to scan.
 * @returns A promise that resolves to the combined content of all files.
 */
async function scanCodebase(paths: string[]): Promise<string> {
  let content = '';
  for (const p of paths) {
    try {
        const stats = await fs.stat(p);
        if (stats.isDirectory()) {
            const entries = await fs.readdir(p, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(p, entry.name);
                if (entry.isDirectory()) {
                    // EXCLUSION LOGIC: Skip node_modules, docs, and scripts
                    if (entry.name !== 'node_modules' && entry.name !== '.next' && entry.name !== 'docs' && entry.name !== 'scripts') {
                        content += await scanCodebase([fullPath]);
                    }
                } else if (/\.(ts|tsx|sh|md|json)$/.test(entry.name)) {
                     // Ensure we are not reading from excluded parent directories
                    if (!fullPath.includes('node_modules') && !fullPath.includes('.next') && !fullPath.includes('docs') && !fullPath.includes('scripts')) {
                        content += await fs.readFile(fullPath, 'utf-8');
                    }
                }
            }
        } else if (stats.isFile()) {
            content += await fs.readFile(p, 'utf-8');
        }
    } catch(e) {
        console.warn(`[Code Scanner] Warning: Could not read path ${p}. It may not exist yet.`);
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

  const roadmapPath = path.join(process.cwd(), 'docs', 'Development Roadmap: The RDI Platform.md');
  const roadmapContent = await fs.readFile(roadmapPath, 'utf-8');

  console.log('[Agent] Scanning application source code (src/, functions/, firestore.rules)...');
  const appCodeDirs = [
      path.join(process.cwd(), 'src'), 
      path.join(process.cwd(), 'functions'),
      path.join(process.cwd(), 'firestore.rules')
  ];
  const codebaseText = await scanCodebase(appCodeDirs);
  console.log('[Agent] Codebase scan complete.\n');

  const tiers = roadmapContent.split('### **Tier');

  for (const tierText of tiers) {
    if (!tierText.trim()) continue;

    const tierTitleMatch = tierText.match(/(.*?)\*\*/);
    const tierTitle = tierTitleMatch ? `Tier${tierTitleMatch[1]}`.trim() : 'Unknown Tier';
    
    const tasks: MainTask[] = [];
    const taskRegex = /\*\*\[ \] \d+\. (.*?)\*\*/g;
    
    const mainTaskBlocks = tierText.split(/\*\*\[ \] \d+\./).slice(1);

    mainTaskBlocks.forEach(block => {
        const titleMatch = block.match(/(.*?)\*\*/);
        if (!titleMatch) return;
        const mainTaskTitle = titleMatch[1].trim();

        const subTasks: SubTask[] = [];
        const subTaskRegex = /\*   \*\*\[ \] ([a-z])\.(.*?):\*\*/g;
        let subMatch;
        while ((subMatch = subTaskRegex.exec(block)) !== null) {
            const subTaskTitle = subMatch[2].trim();
            const evidenceKey = Object.keys(evidenceMap).find(key => subTaskTitle.includes(key));
            let isDone = false;
            if (evidenceKey) {
                const evidenceItems = evidenceMap[evidenceKey];
                const someEvidenceFound = evidenceItems.some(evidence => codebaseText.includes(evidence));
                if (someEvidenceFound) {
                    isDone = true;
                }
            }
            subTasks.push({
                text: subTaskTitle,
                status: isDone ? '✅ DONE' : '[ ] PENDING',
            });
        }
        
        let mainTaskCompletion = 0;
        let mainTaskStatus: MainTask['status'] = '[ ] PENDING';

        if(subTasks.length > 0) {
            const doneCount = subTasks.filter(st => st.status === '✅ DONE').length;
            mainTaskCompletion = Math.round((doneCount / subTasks.length) * 100);
            if (mainTaskCompletion === 100) {
                mainTaskStatus = '✅ DONE';
            } else if (mainTaskCompletion > 0) {
                mainTaskStatus = '📊 IN PROGRESS';
            }
        } else {
            const evidenceKey = Object.keys(evidenceMap).find(key => mainTaskTitle.includes(key));
            if (evidenceKey) {
                 const evidenceItems = evidenceMap[evidenceKey];
                 const someEvidenceFound = evidenceItems.some(evidence => codebaseText.includes(evidence));
                 if(someEvidenceFound) {
                     mainTaskCompletion = 100;
                     mainTaskStatus = '✅ DONE';
                 }
            }
        }

        tasks.push({ text: mainTaskTitle, status: mainTaskStatus, subTasks, completion: mainTaskCompletion });
    });
    
    if (tasks.length > 0) {
      const totalCompletion = tasks.reduce((sum, task) => sum + task.completion, 0);
      const tierCompletion = Math.round(totalCompletion / tasks.length);

      console.log(`--- ${tierTitle} ---`);
      console.log(`[ COMPLETION: ${tierCompletion}% ]`);
      tasks.forEach((task, index) => {
          const statusIcon = task.status === '✅ DONE' ? '✅' : task.status === '📊 IN PROGRESS' ? '📊' : '[ ]';
          console.log(`${statusIcon} ${index + 1}. ${task.text} (${task.completion}%)`);
          task.subTasks.forEach(subTask => {
              console.log(`    ${subTask.status === '✅ DONE' ? '✅' : '[ ]'} ${subTask.text}`);
          });
      });
      console.log('');
    }
  }

  console.log('--- END OF REPORT ---');
}

generateRoadmapReport().catch(console.error);
