Of course. This is the perfect next step. After a complex debugging and refactoring phase, creating a clear guide is essential. It codifies our new, correct understanding of the system's architecture and serves as a foundational document for all future development.

This guide will be your "map of the brain," illustrating how each AI flow functions and interacts within the larger ecosystem.

---

## **The RDI Platform: A Guide to the AI Core & Genkit Flows**

### **Introduction**

This document provides a comprehensive overview of all Genkit flows that constitute the AI core of the RDI Platform. Each flow is a specialized "agent" with a distinct purpose, designed to work in concert with the others to fulfill the principles laid out in our `CONTEXT.md`.

The flows are categorized by their primary function:
1.  **The Core Data Pipeline:** The main, end-to-end process for ingesting and analyzing user-provided documents.
2.  **The Orchestration Engine:** The meta-system that automates the development process itself, ensuring all code is high-quality and constitution-aligned.
3.  **Utility Flows:** Specialized, reusable tools that support the primary flows.
4.  **Future (Tier 2/3) Flows:** Placeholders for the advanced capabilities we will build upon this stable foundation.

---

### **1. The Core Data Pipeline**

This is the central, user-facing workflow of the application. It describes the journey of a document from raw upload to a rich, structured analysis in the database.

#### **`processUploadedDocument`**
*   **Purpose:** To serve as the single, unified, and sequential pipeline for the entire "Integral Assessment." This flow combines the roles of the "Librarian" and the "Deep Analyst" to eliminate race conditions and ensure a robust process.
*   **Trigger:** Called via an authenticated HTTP request from the `onObjectFinalized` Cloud Function trigger whenever a new file is successfully uploaded to Cloud Storage.
*   **Input:** `{ placeId: string, documentId: string, storagePath: string, fileName: string, uploadedBy: string }`
*   **Core Process:**
    1.  **(Librarian Task):** Immediately **creates** a new metadata document in Firestore at `/places/{placeId}/documents/{documentId}`. It sets the initial data, including `fileName`, `uploadedBy`, and a `status` of `'processing'`. This provides instant feedback to the system.
    2.  **(Analyst Task):** Proceeds to perform the deep analysis. It generates a signed URL for the file, renders the `integralAssessment.prompt` with the document's context, and calls the Gemini model to get the structured JSON output.
    3.  **(Finalization):** **Updates** the document it just created with the full analysis results (`summary`, `geoJSON`, `keyDataPoints`, etc.) and sets the final `status` to `'analyzed'`.
    4.  **(Error Handling):** If any step fails, it updates the document's `status` to `'failed'` and logs the error.
*   **Output:** Updates a Firestore document. Returns a success or failure message to the calling Cloud Function.
*   **Relationship to `CONTEXT.md`:** This is the primary engine for the "Integral Assessment" and directly fulfills the platform's **Mission & Purpose**.

---

### **2. The Orchestration Engine**

This is the revolutionary "system that builds the system." These flows are not used by the end-user; they are used by you, the architect, via the `orchestrator.ts` script to automate development.

#### **`generateCode`**
*   **Purpose:** To act as the "Generator Agent." It takes a high-level task description and relevant context and produces a first draft of the code. It is also responsible for self-correction.
*   **Trigger:** Called by the `orchestrator.ts` script.
*   **Input:** `{ taskDescription: string, context: string, failedCode?: string, auditReport?: string }`
*   **Core Process:**
    1.  Constructs a Master Prompt based on the inputs.
    2.  If `failedCode` and `auditReport` are provided, it constructs a "Code Correction" prompt, instructing the AI to fix the specific issues found in the audit.
    3.  Calls the Gemini model to generate the TypeScript code.
*   **Output:** A string containing the generated code.
*   **Relationship to `CONTEXT.md`:** Enforces the **AI Agent Interaction Protocols** by being the primary tool for code generation.

#### **`critiqueCode`**
*   **Purpose:** To act as the "Critique Agent." It is the automated guardian of the constitution. It audits code for quality, security, and adherence to our project's laws.
*   **Trigger:** Called by the `orchestrator.ts` script after `generateCode` completes.
*   **Input:** `{ code: string, context: string }` (where `context` is the full `CONTEXT.md`).
*   **Core Process:**
    1.  Uses the **"Critique-Bot Playbook"** as a system prompt.
    2.  Provides the Gemini model with the `CONTEXT.md` and the code to be audited.
    3.  Receives the structured audit report from the model.
*   **Output:** A JSON object: `{ verdict: "PASS" | "FAIL", issuesFound: string }`.
*   **Relationship to `CONTEXT.md`:** This is the **primary enforcer** of every rule in the constitution.

#### **`generateMasterPrompt` (The Meta-Prompter)**
*   **Purpose:** To act as the "Master Prompt Engineer," giving the system the ability to create its own tools. It generates bespoke, high-quality prompts for the `generateCode` flow.
*   **Trigger:** Called by the `orchestrator.ts` script.
*   **Input:** A high-level `taskDescription` string.
*   **Core Process:**
    1.  Calls the `retrieveRelevantContext` utility to get the most relevant rules from the knowledge base.
    2.  Uses a "meta-prompt" to instruct the Gemini model to act as a prompt engineer and construct a new Master Prompt based on the task and the retrieved context.
*   **Output:** A string containing a fully-formed Master Prompt.
*   **Relationship to `CONTEXT.md`:** Represents the highest level of the system's self-awareness and adaptability, a core tenet of **Regenerative Intelligence**.

---

### **3. Utility Flows**

These are specialized, reusable tools that perform a single, well-defined task.

#### **`embedText`**
*   **Purpose:** To convert a piece of text into a vector embedding (an array of numbers).
*   **Trigger:** Called by other functions and flows, primarily the `retrieveRelevantContext` utility.
*   **Input:** A `string` of text.
*   **Core Process:** Calls the Google AI text embedding model (`text-embedding-004`).
*   **Output:** A `number[]` array representing the vector embedding.
*   **Relationship to `CONTEXT.md`:** A foundational tool that enables the RAG system, which is part of our advanced architectural patterns.

---

### **4. Future (Tier 2/3) Flows**

These flows are defined in our roadmap and will be built upon our stable foundation.

#### **`storyOfPlaceFlow` (Tier 2)**
*   **Purpose:** To synthesize all the analyzed data for a "Place" from the Five Capitals into a single, compelling narrative.
*   **Trigger:** Will be called by a user-initiated action from the Place Dashboard.
*   **Relationship to `CONTEXT.md`:** Directly fulfills the **"Mandate Potential-Based Framing"** directive.

#### **`ragFlow` (Tier 2/3)**
*   **Purpose:** To answer specific user questions by performing a Retrieval-Augmented Generation search across the entire knowledge base for a "Place."
*   **Trigger:** Will be called by a user-initiated query from a search or chat interface.
*   **Relationship to `CONTEXT.md`:** Directly fulfills the **"Work with Wholes"** directive by synthesizing information from across all data silos.