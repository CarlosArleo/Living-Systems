# **CONTEXT.md: The Project Constitution for the RDI Platform**

### **Preamble**

This document is the master context and single source of truth for the AI agent developing the Regenerative Development Intelligence (RDI) Platform. It is the ultimate authority on all matters of architecture, coding standards, security, and design. All generated code and system artifacts must strictly adhere to the principles and mandates defined herein. This is a living document, version-controlled alongside the source code, and serves as the long-term memory and evolving intelligence of the project.

---

## **1. Project-Level Context**

### **1.1. Mission & Purpose**

The RDI Platform's core purpose is to augment the practice of regenerative development. It is a "great translator" that helps practitioners analyze complex, place-based data through the lens of the **Five Capitals framework** to reveal a place's unique character and evolutionary potential. The goal is to move beyond sustainability (doing less harm) to active regeneration (making systems healthier and more capable).

### **1.2. Core User Personas**

*   **Regenerative Design Practitioner:** The power user, focused on deep, data-driven analysis and synthesis.
*   **Community Stakeholder:** A local expert providing qualitative feedback, contextual knowledge, and validation.
*   **Senior Strategist:** A decision-maker focused on synthesizing insights into actionable, data-grounded strategies.

### **1.3. Technology Stack**

*   **Framework:** Next.js with TypeScript, utilizing the App Router.
*   **Styling:** Tailwind CSS.
*   **Component Library:** `shadcn/ui`. All UI elements must be constructed using these components to ensure consistency.
*   **Backend:** Firebase Platform (Authentication, Firestore, Cloud Storage, Cloud Functions).
*   **AI Core:** Google's Gemini models, orchestrated via the **Genkit framework**.
*   **Mapping:** Mapbox GL JS for all frontend map components.

### **1.4. Regenerative Principles as Technical Directives**

High-level principles are translated into concrete, non-negotiable technical rules here.

*   **Directive: Enforce Wholeness:** All new API endpoints and Server Components that return data for display **MUST** aggregate data from at least two different Firestore collections representing different Capitals. Code that queries only a single Capital is not permitted without explicit override. Furthermore, the creation of a new 'place' entity MUST be handled by a dedicated backend flow that uses a Firestore transaction to create the main place document AND initial documents in at least two 'capitals' subcollections simultaneously. This directive cannot be enforced by security rules alone.
*   **Directive: Mandate Potential-Based Framing:** All AI-generated text summaries (e.g., in a "Story of Place" flow) **MUST** conclude with a section titled "Latent Potential" that identifies opportunities and underutilized assets based on the input data. Summaries that only describe problems or deficits are incomplete.
*   **Directive: Engineer for Collaboration:** Any new feature that displays community-facing data (e.g., a "Story of Place" narrative) **MUST** be accompanied by a corresponding commenting/feedback feature, including the necessary UI components and Firestore subcollection for storing feedback. Stand-alone, non-interactive displays are not permitted.

---

## **2. Architectural Patterns**

### **2.1. Overall Architecture**

The system is a **Decoupled Full-Stack Application**. The frontend (Next.js) is responsible for the user experience, while the backend (Firebase Cloud Functions and Genkit) handles all business logic, data mutation, and AI processing.

### **2.2. API & AI Flow Design**

*   **API Routes:** All backend logic is exposed via specific, single-purpose API routes in `src/app/api/`.
*   **Genkit Flows:** The core AI logic is encapsulated in Genkit flows located in `src/ai/flows/`. This isolates AI logic for maintainability and testing.
*   **Master Prompts:** Every AI call within a flow or API route **MUST** use the exact corresponding prompt from the `docs/AI_Prompt_Engineering_Framework.md` document. No inline or ad-hoc prompting is permitted.

### **2.3. Firestore Data Modeling**

*   **Core Strategy:** Prioritize flattened, scalable data structures to ensure long-term performance and resilience.
*   **Golden Rule:** Use **root-level collections** for primary entities (e.g., `users`, `places`). Use **subcollections** for unbounded one-to-many relationships (e.g., `documents` under a `place`).
*   **CRITICAL Mandate:** **Avoid deeply nested data** in maps or arrays within a single document. This is an anti-pattern that violates our principles of scalability and resource efficiency. Refer to the table below for guidance.
*   **System Health Collection:**
- **Path:** `system_health/{issueId}` (Root-level collection)
- **Purpose:** To store records of KPI violations detected by the Monitor Agent.
- **Schema:** `{ metric: string, threshold: number, measuredValue: number, resourceName: string, timestamp: Timestamp }`
*   **User Collection Schema:**
- **Path:** `users/{userId}`
- **Purpose:** To store public profile information and application-specific metadata for each user.
- **Schema:**
  - `email`: (string) The user's email address (for reference).
  - `displayName`: (string) The user's public display name.
  - `role`: (string) The user's role in the system (e.g., 'practitioner', 'community_member', 'admin').
  - `createdAt`: (Timestamp) The timestamp of the user's creation.

#### **Table 1: Firestore Data Modeling Strategies (Decision Matrix)**

| Strategy | Description | Regenerative Impact | Agentic Prompt Cue |
| :--- | :--- | :--- | :--- |
| **Nested Data (Maps/Arrays)** | Storing data directly within a parent document. | **Low (Anti-Regenerative at Scale):** Inefficient data fetching, high costs, poor adaptability. **Usage is restricted to small, fixed-size, self-contained objects ONLY (e.g., an address).** | "Use a nested map for the user's address, as it is a small, self-contained object." |
| **Subcollections** | Creating a new collection under a specific document. | **High (Regenerative):** Promotes efficient, on-demand data loading. Highly scalable and adaptable. Reduces unnecessary data transfer, lowering costs and energy consumption. **This is the default choice for one-to-many relationships.** | "Use a `documents` subcollection under each `place` document, as the number of documents is unbounded." |
| **Root-Level Collections** | Separate, top-level collections linked by IDs. | **High (Regenerative):** Provides the most scalable and flexible foundation. Decoupled data allows for independent evolution of system parts. **This is the required choice for many-to-many relationships.** | "Create separate root-level collections for `users` and `organizations`. Model the many-to-many 'membership' relationship using a dedicated `memberships` linking collection." |

---

## **3. Coding Standards & Idioms**

*   **Language:** TypeScript. `strict` mode in `tsconfig.json` is enabled and must be adhered to.
*   **Naming Conventions:**
    *   `camelCase` for variables and functions.
    *   `PascalCase` for React components, types, and interfaces.
*   **Error Handling:** All asynchronous operations, API calls, and database interactions **MUST** be wrapped in `try...catch` blocks to handle errors gracefully and prevent crashes.
*   **Comments:** Comment the "why," not the "what." Explain the purpose and intent behind complex logic, especially in relation to a regenerative principle.

---

## **4. Security & Governance Mandates (Non-Negotiable)**

*   **CRITICAL: Secrets Management:** No hardcoded secrets. All API keys and sensitive credentials must be managed via environment variables and a secret manager (e.g., Google Cloud Secret Manager) for production.
*   **CRITICAL: Secure by Default:** All Firestore security rules **MUST** be written to `allow read, write: if false;` at the root level. Access must then be explicitly and narrowly granted on a per-collection basis. Permissive rules are forbidden.
*   **CRITICAL: Forced Backend Logic:** Client-side write access to core business data (e.g., the `capitals` subcollection) **MUST** be disabled. All mutations must be forced through secure, authenticated, and validated backend Cloud Functions or Genkit flows using the Admin SDK.
*   **CRITICAL: Authentication Mandate:** All API routes and server actions that create or modify data **MUST** be protected and require a valid, authenticated Firebase user session. Public, unauthenticated write operations are forbidden.

### 4.1. Security Rule Examples

**Example: Complete Ruleset for Users and Places**
This is a robust, production-ready ruleset that correctly handles validation and aligns with our architecture where complex logic is handled by the backend.

rules_version = '2';
service cloud.firestore {
match /databases/{database}/documents {

    // Default deny: No access unless explicitly allowed.
    match /{document=**} {
    allow read, write: if false;
    }

    // Users can only manage their own profile, and only change their displayName.
    match /users/{userId} {
    allow read, create: if request.auth.uid == userId;
    allow update: if request.auth.uid == userId
                    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['displayName']);
    }

    // Places can be read by anyone authenticated. Creation is handled by the backend.
    match /places/{placeId} {
    allow read: if request.auth != null;
    // Client-side create/update/delete is forbidden to enforce transactional wholeness via the backend.
    allow write: if false;
    }

    // Documents can be read, but all writes are forced through the backend.
    match /places/{placeId}/documents/{docId} {
    allow read: if request.auth != null;
    allow write: if false;
    }

    // Feedback can be read by anyone, but only created by the correct user.
    match /places/{placeId}/feedback/{feedbackId} {
        allow read: if request.auth != null;
        allow create: if request.auth.uid == request.resource.data.userId;
    }
  }
}
---

## **5. Testing Philosophy**

*   **Unit Tests:** All backend logic (Cloud Functions, Genkit flows) and complex frontend utility functions require unit tests using **Vitest**.
*   **Integration Tests:** Critical user flows (e.g., document upload and analysis, stakeholder commenting) must be covered by integration tests.
*   **Code Coverage:** A minimum of **80%** unit test coverage is required for all backend logic. This will be enforced by the CI pipeline.
*   **End-to-End (E2E) Tests:** Key user journeys (e.g., the full authentication flow) will be tested using **Playwright**.

---

## **6. AI Agent Interaction Protocols (Meta-Rules)**

*   **Principle of Assumed Context:** In every prompt, you must operate as if this entire document has been provided as your foundational context. Your primary directive is to adhere to these rules above all else.
*   **Principle of Justification:** For significant architectural choices (e.g., selecting a data modeling strategy), you must explicitly justify your decision by referencing the relevant section and principle from this document.
*   **The Generator-Critique Mandate:** All generated code is considered a "draft" until it has been audited. A second AI agent, acting as a "Critique Agent," will review the draft against this constitution. Code is only considered "complete" after it has passed this audit.

---

## 7. Performance & Health KPIs (Bio-Awareness)

This section defines the key performance indicators for the RDI Platform. The "Bio-Aware Monitor Agent" will periodically check the live application against these thresholds. A violation of these KPIs is considered a systemic illness that must be addressed.

- **Max P95 Latency (API Routes & Genkit Flows):** 800ms
- **Max Error Rate (Cloud Functions & Genkit Flows):** 0.1%
- **Max Firestore Reads per User Action:** 50 documents
- **Monthly Budget Threshold (Alert):** 80%