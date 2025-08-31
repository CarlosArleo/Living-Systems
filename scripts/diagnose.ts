
/**
 * @fileOverview A diagnostic script to audit the Genkit flow system against its constitution.
 * This script checks for file existence, registration, and proper dependencies.
 * To run: `npx tsx scripts/diagnose.ts`
 */
import * as fs from 'fs/promises';
import * as path from 'path';

// --- Type Definitions ---
interface FlowManifest {
  name: string;
  filePath: string;
  isMissing: boolean;
  isRegistered: boolean;
  isWired: boolean;
}

// --- Main Functions ---

/**
 * Parses the FLOW_SYSTEM_CONSTITUTION.md file to extract the flow manifest.
 */
async function parseConstitution(): Promise<Map<string, { filePath: string }>> {
  console.log('Parsing Flow System Constitution...');
  const constitutionPath = path.join(process.cwd(), 'docs', 'FLOW_SYSTEM_CONSTITUTION.md');
  const content = await fs.readFile(constitutionPath, 'utf-8');
  
  const flows = new Map<string, { filePath: string }>();
  // Use a regex to capture each flow's details
  const flowRegex = /### `([^`]+)`\s*- \*\*File Path:\*\* `([^`]+)`/g;
  
  let match;
  while ((match = flowRegex.exec(content)) !== null) {
    const [, name, filePath] = match;
    flows.set(name.trim(), { filePath: filePath.trim() });
  }
  
  console.log(`Found ${flows.size} flows in the constitution.`);
  return flows;
}

/**
 * Checks if a flow file is correctly exported from the main index file.
 */
async function checkIndexRegistration(fileName: string): Promise<boolean> {
    const indexPath = path.join(process.cwd(), 'src', 'ai', 'flows', 'index.ts');
    const indexContent = await fs.readFile(indexPath, 'utf-8');
    // Check if a line exports from the given file name, ignoring the extension.
    const baseName = fileName.replace('.ts', '');
    const exportPattern = new RegExp(`export .* from '.*\\/${baseName}'`);
    return exportPattern.test(indexContent);
}

/**
 * Checks if a flow file imports the central 'ai' object.
 */
async function checkWiring(filePath: string): Promise<boolean> {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const importPattern = /import { ai } from '..\/genkit'|import { ai } from '@\/ai\/genkit'/;
    return importPattern.test(fileContent);
  } catch {
    return false; // File doesn't exist, so it can't be wired
  }
}


/**
 * The main diagnostic agent function.
 */
async function runDiagnostics() {
  console.log('--- RDI System Diagnostic Agent ---');
  
  const constitutionFlows = await parseConstitution();
  const report: FlowManifest[] = [];

  for (const [name, { filePath }] of constitutionFlows.entries()) {
    const fullPath = path.join(process.cwd(), filePath);
    const manifest: FlowManifest = {
      name,
      filePath,
      isMissing: false,
      isRegistered: false,
      isWired: false,
    };

    // Check 1: File Existence
    try {
      await fs.access(fullPath);
    } catch {
      manifest.isMissing = true;
    }
    
    if (!manifest.isMissing) {
      const fileName = path.basename(filePath);
      // Check 2: Index Registration
      manifest.isRegistered = await checkIndexRegistration(fileName);
      // Check 3: Wiring Check
      manifest.isWired = await checkWiring(fullPath);
    }

    report.push(manifest);
  }

  // --- Print Report ---
  console.log('\n--- DIAGNOSTIC REPORT ---');
  console.log('Auditing system against docs/FLOW_SYSTEM_CONSTITUTION.md...\n');

  const maxNameLength = Math.max(...report.map(f => f.name.length));
  
  report.forEach(flow => {
    const statusMissing = flow.isMissing ? '❌ MISSING' : '✅ OK';
    const statusRegistered = flow.isRegistered ? '✅ Registered' : '❌ NOT REGISTERED';
    const statusWired = flow.isWired ? '✅ Wired' : '❌ WIRING CHECK FAILED';
    
    const paddedName = `\`${flow.name}\``.padEnd(maxNameLength + 2);
    
    if(flow.isMissing) {
         console.log(`${paddedName} | ${statusMissing.padEnd(18)} | File not found at ${flow.filePath}`);
    } else {
        console.log(`${paddedName} | ${statusRegistered.padEnd(18)} | ${statusWired}`);
    }
  });
  
  console.log('\n--- END OF REPORT ---');
}

runDiagnostics().catch(error => {
  console.error("Diagnostic script failed unexpectedly:", error);
  process.exit(1);
});
