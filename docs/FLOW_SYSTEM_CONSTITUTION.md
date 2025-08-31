# The RDI Platform: AI Flow System Constitution

## 1.0 Core Architectural Principles

This document serves as the canonical reference for the Genkit flow architecture of the RDI Platform. Its purpose is to provide a clear, machine-readable guide that can be used for both human understanding and automated system auditing.

### 1.1 The "Engine Block" Analogy

The entire Genkit system is built around a single, central object: the `ai` instance. This object, created in `src/ai/genkit.ts`, is the "engine block" to which all other components connect. It holds the core configuration, plugin information, and telemetry settings. No flow can function without being registered to this central instance.

### 1.2 The System Boot Sequence

The AI system is initialized in a specific, critical order to ensure all dependencies are met before any flow is executed.

1.  **`src/ai/dev.ts` (The "On Switch"):** This is the entry point for the Genkit development server. It is responsible for starting the boot process.
2.  **`src/ai/genkit.ts` (The "Engine Block"):** `dev.ts` immediately imports this file to create and configure the global `ai` instance.
3.  **`src/ai/flows/index.ts` (The "Library"):** `dev.ts` then imports this index file, which acts as a master list, ensuring all individual flow files are loaded.
4.  **Individual Flows (The "Skills"):** Each flow file (e.g., `generateCode.ts`) imports the `ai` object from `genkit.ts` and uses it to define and register itself by calling `ai.defineFlow(...)`.

This sequence ensures that by the time a flow is called, the core `ai` object and all its configurations are already in place and available.

---

## 2.0 Flow Manifest

This section provides a detailed breakdown of every flow within the system.

### `critiqueCode`

-   **File Path:** `src/ai/flows/critiqueCode.ts`
-   **Purpose:** Acts as the "Critique Agent" to audit generated code against the project constitution for quality, security, and correctness.
-   **Input Schema:** `CritiqueInputSchema`
-   **Output Schema:** `z.string()`
-   **Internal Dependencies:** None
-   **External Dependencies:** `@genkit-ai/googleai`, `zod`
-   **Constitution Directives:** `Generator-Critique Mandate`

### `embedText`

-   **File Path:** `src/ai/flows/embed.ts`
-   **Purpose:** A utility flow that converts a string of text into a numerical vector embedding.
-   **Input Schema:** `z.string()`
-   **Output Schema:** `z.array(z.number())`
-   **Internal Dependencies:** None
-   **External Dependencies:** `@genkit-ai/googleai`, `zod`
-   **Constitution Directives:** (Foundational utility for RAG system)

### `generateCode`

-   **File Path:** `src/ai/flows/generateCode.ts`
-   **Purpose:** Acts as the "Generator Agent" to write or correct code based on a task description and contextual rules.
-   **Input Schema:** `FlowInputSchema` (a union of `GenerateCodeInputSchema` and `CorrectCodeInputSchema`)
-   **Output Schema:** `z.string()`
-   **Internal Dependencies:** None
-   **External Dependencies:** `@genkit-ai/googleai`, `zod`
-   **Constitution Directives:** `Generator-Critique Mandate`, `AI Agent Interaction Protocols`

### `generateMasterPrompt`

-   **File Path:** `src/ai/flows/meta-prompter.ts`
-   **Purpose:** Acts as a "Meta-Prompter" to generate high-quality, structured Master Prompts for other AI agents.
-   **Input Schema:** `MetaPrompterInputSchema` (z.string)
-   **Output Schema:** `MetaPrompterOutputSchema` (z.string)
-   **Internal Dependencies:** `retrieveRelevantContext` (from `src/ai/knowledge-base.ts`)
-   **External Dependencies:** `@genkit-ai/googleai`, `zod`
-   **Constitution Directives:** `AI Agent Interaction Protocols`

### `generateStoryOfPlaceFlow`

-   **File Path:** `src/ai/flows/story-flow.ts`
-   **Purpose:** Synthesizes all analyzed data for a place into a single, compelling "Story of Place" narrative.
-   **Input Schema:** `StoryInputSchema`
-   **Output Schema:** `StoryOutputSchema`
-   **Internal Dependencies:** None
-   **External Dependencies:** `firebase-admin`, `@genkit-ai/googleai`, `zod`
-   **Constitution Directives:** `Mandate Potential-Based Framing`, `Enforce Wholeness`

### `harmonizeDataFlow`

-   **File Path:** `src/ai/flows/harmonize.ts`
-   **Purpose:** Acts as the "Librarian" to create the initial metadata document in Firestore immediately after a file upload.
-   **Input Schema:** `HarmonizeDataInputSchema`
-   **Output Schema:** `HarmonizeDataOutputSchema`
-   **Internal Dependencies:** None
-   **External Dependencies:** `firebase-admin`, `zod`
-   **Constitution Directives:** (Part of the "Forced Backend Logic" pattern)

### `indexerFlow`

-   **File Path:** `src/ai/flows/knowledge.ts`
-   **Purpose:** An idempotent flow that creates and updates the vector knowledge base for a specific place.
-   **Input Schema:** `IndexerInputSchema`
-   **Output Schema:** `z.object({ indexedCharacters: z.number(), ... })`
-   **Internal Dependencies:** None
-   **External Dependencies:** `firebase-admin`, `@genkit-ai/googleai`, `zod`
-   **Constitution Directives:** (Supports `Work with Wholes` via RAG)

### `integralAssessmentFlow`

-   **File Path:** `src/ai/flows/integralAssessment.ts`
-   **Purpose:** Acts as the "Deep Analyst" to perform the comprehensive Five Capitals analysis on a document.
-   **Input Schema:** `FlowInputSchema`
-   **Output Schema:** `z.object({ documentId: z.string(), status: z.string() })`
-   **Internal Dependencies:** None
-   **External Dependencies:** `firebase-admin`, `@genkit-ai/googleai`, `zod`
-   **Constitution Directives:** `Enforce Wholeness`, `Forced Backend Logic`

### `myFirstFlow`

-   **File Path:** `src/ai/flows/simple.ts`
-   **Purpose:** A simple diagnostic flow used for initial system setup verification.
-   **Input Schema:** `z.string()`
-   **Output Schema:** `z.string()`
-   **Internal Dependencies:** None
-   **External Dependencies:** `zod`
-   **Constitution Directives:** None

### `ragQueryFlow`

-   **File Path:** `src/ai/flows/rag-flow.ts`
-   **Purpose:** Powers the "Holistic Inquiry" feature by answering user questions based on the knowledge base.
-   **Input Schema:** `RagQueryInputSchema`
-   **Output Schema:** `RagQueryOutputSchema`
-   **Internal Dependencies:** `knowledgeRetriever` (from `src/ai/flows/knowledge-schemas.ts`)
-   **External Dependencies:** `@genkit-ai/googleai`, `zod`
-   **Constitution Directives:** `Work with Wholes`, `Principle of Justification`

---

## 3.0 Common Failure Modes & Debugging

This checklist provides solutions to common issues encountered during development.

-   **Error:** `TypeError: ... is not a function` or `... is not a constructor`
    -   **Solution:** Check `genkit.ts`. The import syntax for a plugin (e.g., `googleAI()`) is likely wrong for the installed `@genkit-ai/*` version. Ensure you are calling a function if the plugin exports one.

-   **Error:** `Module ... has no default/named export`
    -   **Solution:** Check `genkit.ts` or the flow file. An `import` statement is using the wrong type. For example, `import genkit from 'genkit'` should be `import { genkit } from 'genkit'`.

-   **Error:** `Flow not appearing in Genkit UI`
    -   **Solution:** Check `src/ai/flows/index.ts`. The flow's file is likely missing from this central index. Add a new line: `export * from './your-flow-file-name';`.

-   **Error:** `NOT_FOUND: No document to update` in a flow that modifies Firestore.
    -   **Solution:** This is a race condition. The flow logic is trying to `update()` a document before it has been `create()`d or `set()`. Ensure the logic is strictly sequential and that the document creation step fully completes before any update operations are attempted.

-   **Error:** `Error reading tools config ENOENT: no such file or directory` in Genkit UI.
    -   **Solution:** This indicates the UI has lost its connection to the Genkit runtime process. The simplest fix is to restart the development server (`npm run genkit:dev`) and hard-refresh the browser tab.
