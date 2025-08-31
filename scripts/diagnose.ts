
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

// --- Pre-flight Check ---

/**
 * Validates that the environment configuration is present and correct.
 * Exits the script if validation fails.
 */
async function runPreFlightChecks() {
    console.log('--- PRE-FLIGHT CHECKS ---');
    console.log('[i] Checking for required environment variables in .env file...');
    try {
        // This dynamic import will throw an error if config.ts fails,
        // which is what we want.
        const { projectConfig } = await import('../src/ai/config');
        if (projectConfig.projectId && projectConfig.storageBucket) {
             console.log('[✓] Environment Configuration: OK');
        } else {
            // This case should theoretically not be hit if config.ts is working.
            throw new Error('projectConfig was loaded but is missing required properties.');
        }
    } catch(e: any) {
        console.error(`[✗] FATAL ERROR: Environment Configuration is invalid. Please check your .env file. Reason: ${e.message}`);
        process.exit(1); // Exit immediately
    }
}


// --- Main Functions ---

/**
 * Parses the FLOW_SYSTEM_CONSTITUTION.md file to extract the flow manifest.
 */
async function parseConstitution(): Promise<Map<string, { filePath: string }>> {
  console.log('\n--- FLOW AUDIT ---');
  console.log('[i] Parsing Flow System Constitution...');
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
  
  console.log(`[✓] Found ${flows.size} flows declared in the constitution.`);
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
  console.log('\n=================================================');
  console.log('      RDI PLATFORM - SYSTEM DIAGNOSTIC AGENT     ');
  console.log('=================================================\n');
  console.log('Purpose: This script performs a static analysis of the AI flow system.');
  console.log('It audits the project structure against the rules defined in your documentation,');
  console.log('ensuring that all declared flows exist and are correctly wired into the application.');
  console.log('This is a check of the system\'s architecture, not a functional test of the AI models.\n');
  
  await runPreFlightChecks();

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
  console.log('\n--- DIAGNOSTIC AUDIT REPORT ---');
  console.log('Auditing flows listed in docs/FLOW_SYSTEM_CONSTITUTION.md...\n');

  const maxNameLength = Math.max(...report.map(f => f.name.length));
  
  // Table Header
  const headerName = 'Flow Name'.padEnd(maxNameLength + 2);
  const headerStatus = 'File Status'.padEnd(18);
  const headerRegistration = 'Registered in index.ts?'.padEnd(28);
  const headerWiring = 'Wired to AI Core?';
  console.log(`${headerName} | ${headerStatus} | ${headerRegistration} | ${headerWiring}`);
  console.log(`${'-'.repeat(maxNameLength + 2)}-+-${'-'.repeat(18)}-+-${'-'.repeat(28)}-+-${'-'.repeat(headerWiring.length)}`);


  report.forEach(flow => {
    const paddedName = `\`${flow.name}\``.padEnd(maxNameLength + 2);
    
    if(flow.isMissing) {
        const statusMissing = '❌ FILE NOT FOUND'.padEnd(18);
        console.log(`${paddedName} | ${statusMissing} | Path: ${flow.filePath}`);
    } else {
        const statusOk = '✅ OK'.padEnd(18);
        const statusRegistered = flow.isRegistered ? '✅ Yes'.padEnd(28) : '❌ No'.padEnd(28);
        const statusWired = flow.isWired ? '✅ Yes' : '❌ No';
        console.log(`${paddedName} | ${statusOk} | ${statusRegistered} | ${statusWired}`);
    }
  });
  
  console.log('\n--- END OF REPORT ---');
}

runDiagnostics().catch(error => {
  console.error("Diagnostic script failed unexpectedly:", error);
  process.exit(1);
});
