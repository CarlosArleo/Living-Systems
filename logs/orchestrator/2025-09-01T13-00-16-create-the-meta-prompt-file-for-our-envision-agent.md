# Orchestrator Run Log: 9/1/2025, 1:00:16 PM

## Task Description

```
Create the meta-prompt file for our Envision Agent at 'src/ai/prompts/envision.prompt'. The prompt must instruct the AI to act as a world-class software architect specializing in regenerative design. It should guide the AI to analyze the provided codebase context and project constitution in light of the user's strategic question. The final output must be a detailed, structured Markdown proposal for a novel feature, including its purpose, data model, UI components, and a clear justification for how it aligns with our project's regenerative principles.
```

## Attempt #1

### Retrieved Context (RAG)

**Chunk 1:**
```
### **Preamble**

This document is the master context and single source of truth for the AI agent developing the Regenerative Development Intelligence (RDI) Platform. It is the ultimate authority on all matters of architecture, coding standards, security, and design. All generated code and system artifacts must strictly adhere to the principles and mandates defined herein. This is a living document, version-controlled alongside the source code, and serves as the long-term memory and evolving intelligence of the project.

---


```

**Chunk 2:**
```
## **6. AI Agent Interaction Protocols (Meta-Rules)**

*   **Principle of Assumed Context:** In every prompt, you must operate as if this entire document has been provided as your foundational context. Your primary directive is to adhere to these rules above all else.
*   **Principle of Justification:** For significant architectural choices (e.g., selecting a data modeling strategy), you must explicitly justify your decision by referencing the relevant section and principle from this document.
*   **The Generator-Critique Mandate:** All generated code is considered a "draft" until it has been audited. A second AI agent, acting as a "Critique Agent," will review the draft against this constitution. Code is only considered "complete" after it has passed this audit.
```

**Chunk 3:**
```
### **2.2. API & AI Flow Design**

*   **API Routes:** All backend logic is exposed via specific, single-purpose API routes in `src/app/api/`.
*   **Genkit Flows:** The core AI logic is encapsulated in Genkit flows located in `src/ai/flows/`. This isolates AI logic for maintainability and testing.
*   **Master Prompts:** Every AI call within a flow or API route **MUST** use the exact corresponding prompt from the `docs/AI_Prompt_Engineering_Framework.md` document. No inline or ad-hoc prompting is permitted.


```

**Chunk 4:**
```
### **1.4. Regenerative Principles as Technical Directives**

High-level principles are translated into concrete, non-negotiable technical rules here.

*   **Directive: Enforce Wholeness:** All new API endpoints and Server Components that return data for display **MUST** aggregate data from at least two different Firestore collections representing different Capitals. Code that queries only a single Capital is not permitted without explicit override.
*   **Directive: Mandate Potential-Based Framing:** All AI-generated text summaries (e.g., in a "Story of Place" flow) **MUST** conclude with a section titled "Latent Potential" that identifies opportunities and underutilized assets based on the input data. Summaries that only describe problems or deficits are incomplete.
*   **Directive: Engineer for Collaboration:** Any new feature that displays community-facing data (e.g., a "Story of Place" narrative) **MUST** be accompanied by a corresponding commenting/feedback feature, including the necessary UI components and Firestore subcollection for storing feedback. Stand-alone, non-interactive displays are not permitted.

---


```

**Chunk 5:**
```
## **3. Coding Standards & Idioms**

*   **Language:** TypeScript. `strict` mode in `tsconfig.json` is enabled and must be adhered to.
*   **Naming Conventions:**
    *   `camelCase` for variables and functions.
    *   `PascalCase` for React components, types, and interfaces.
*   **Error Handling:** All asynchronous operations, API calls, and database interactions **MUST** be wrapped in `try...catch` blocks to handle errors gracefully and prevent crashes.
*   **Comments:** Comment the "why," not the "what." Explain the purpose and intent behind complex logic, especially in relation to a regenerative principle.

---


```

