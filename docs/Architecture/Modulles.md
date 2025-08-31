# RDI Platform: Master Implementation Plan

This document is the central technical guide for building the Regenerative Development Intelligence (RDI) Platform. It connects the high-level vision from `Architecting Regenerative Intelligence.md` with the specific AI instructions from the `AI_Prompt_Engineering_Framework.md` to provide a clear, phased implementation roadmap for developers.

## Section 1: The Phased Development Roadmap

The platform will be built in three distinct tiers, allowing for a scalable approach from a Minimum Viable Product (MVP) to a fully-featured generative engine.

*   **Tier 1: The Assessment & Visualization Platform (MVP):** The core functionality for data ingestion and holistic visualization. This is our current focus.
    *   **Features:** Five Capitals data ingestion, interactive map-based dashboards, document analysis.
    *   **Goal:** Allow a practitioner to upload all their data and see it layered together on a map.

*   **Tier 2: The Co-Creative & Dialogic Tool:** Enables the full "Story of Place" methodology by integrating stakeholder collaboration features.
    *   **Features:** User authentication with roles, commenting/annotation tools, participatory mapping modules.
    *   **Goal:** Transform the platform into a collaborative workspace for community co-creation.

*   **Tier 3: The Predictive & Generative Engine:** Integrates advanced AI modules for simulation and generative design.
    *   **Features:** Agent-Based Modeling, constrained generative design for site layouts.
    *   **Goal:** Allow users to simulate future possibilities and co-create design solutions harmonized with the place's essence.

## Section 2: The "Agentic Triad" Workflow

Our development process is a synergistic cycle between three core technologies:

1.  **Prototype in Firebase Studio:** We use the App Prototyping agent to rapidly build the UI, UX, and basic backend structure. This process reveals the specific AI logic needed.
2.  **Customize in Google AI Studio:** We move to AI Studio to prototype, test, and fine-tune Gemini models for the specific tasks identified in the previous step. This creates specialized AI "experts."
3.  **Integrate with the Gemini API:** The customized model endpoint is integrated into the application's backend code (usually within a Firebase Cloud Function or API Route), making its intelligence available to the app. This enhanced capability then allows for further prototyping, restarting the cycle.

## Section 2.1: CRITICAL INFRASTRUCTURE PREREQUISITE

### Firestore Vector Index for RAG Flow

To enable the Retrieval-Augmented Generation (RAG) functionality in the `ragQueryFlow`, a specific composite index **MUST** be created in your Firestore database. Without this index, the flow will fail with a `FAILED_PRECONDITION: Missing vector index configuration` error.

This is because the flow performs a complex query that filters documents by `placeId` and simultaneously performs a vector search on the `embedding` field. Firestore requires this index to execute such queries efficiently.

**Solution:**
You must run the following `gcloud` command in your terminal. Ensure you are authenticated to the correct Google Cloud project associated with your Firebase project.

```bash
gcloud firestore indexes composite create --project=rdd-applicationback --collection-group=knowledge --query-scope=COLLECTION --field-config=order=ASCENDING,field-path=placeId --field-config=vector-config='{"dimension":"768","flat": "{}"}',field-path=embedding
```

**Important Notes:**
*   This command only needs to be run **once** for the entire project.
*   Index creation can take a few minutes. You can monitor its status in the Google Cloud Console under Firestore > Indexes.
*   The `ragQueryFlow` will not work until this index is successfully built and enabled.

---

## Section 3: Core API Routes and Their AI Instructions

This is the practical guide for connecting our "Recipe Book" (the Prompt Framework) to our "Kitchen Stations" (the API routes).

### 1. `/api/harmonize` (The Mail Sorter)
-   **Purpose:** This API is the entry point for all file uploads. Its ONLY job is to take an uploaded file, save it to Cloud Storage, and create a reference document in Firestore with a status of `"uploaded"`. It is simple, fast, and reliable.
-   **AI Prompt Used:** **None.** This route does not call an AI model directly. It is a pure data-intake utility.

### 2. `/api/analyze` (The Master Analyst)
-   **Purpose:** This is the core analysis engine. It is triggered on-demand by the user from the frontend. It fetches a file from Cloud Storage and performs the deep Five Capitals analysis.
-   **AI Prompt Used:** It **MUST** use the **"Master Prompt for Document Analysis & Five Capitals Harmonization"** from `AI_Prompt_Engineering_Framework.md`. This ensures every document is processed with the highest fidelity.

### 3. `/api/story` (The Storyteller)
-   **Purpose:** This API is triggered by the user to synthesize all the analyzed data for a specific Place into a coherent "Story of Place" narrative.
-   **AI Prompt Used:** It **MUST** use the **"Master Prompt for 'Story of Place' Narrative Synthesis"** from `AI_Prompt_Engineering_Framework.md`. It will take the `overallSummary` and `analysis` fields from all documents linked to a `placeId` as its context.

### 4. `/api/index` & `/api/rag` (The Knowledge Engine)
-   **`/api/index` Purpose:** This is a utility route triggered by the user to build or rebuild the knowledge base for a specific Place. It gathers all the textual data (`overallSummary` and `extractedText` from the `analysis` object) for a `placeId` and indexes it into our vector database.
-   **`/api/rag` Purpose:** This is the Holistic Inquiry chat interface. It answers user questions.
-   **AI Prompt Used:** It **MUST** use the **"Master Prompt for Holistic Inquiry & Contextual Synthesis (RAG)"** from `AI_Prompt_Engineering_Framework.md`. It uses the vector database to find relevant context *only for the specified `placeId`* and uses that context to answer the user's question.

## Section 4: Data Lifecycle

This outlines the end-to-end flow of information through the system:

1.  **Upload:** A user uploads a file (`report.pdf`) via the frontend UI.
2.  **Harmonize:** The file is sent to the `/api/harmonize` route. It's saved to Cloud Storage, and a new document is created in Firestore under `places/{placeId}/documents/{docId}` with `status: "uploaded"`.
3.  **Analyze (On-Demand):** The user clicks "Run Analysis" in the UI. A request is sent to the `/api/analyze` route with the `placeId` and `docId`.
4.  **AI Processing:** The `/api/analyze` route fetches the file, uses the **Master Analysis Prompt** to call Gemini, and receives a rich JSON object with the full Five Capitals breakdown.
5.  **Store Insights:** The results are saved back to the same Firestore document, updating its `status` to `"analyzed"` and populating the `analysis`, `overallSummary`, and `geoJSON` fields.
6.  **Visualize:** The frontend, which is listening for real-time updates, automatically displays the new GeoJSON on the map and makes the full analysis available to the user.
7.  **Synthesize (On-Demand):** The user clicks "Generate Story." The `/api/story` route is called, which gathers all `analysis` data for the place and uses the **Master Story Prompt** to generate and save the narrative.
8.  **Index (On-Demand):** The user clicks "Build Knowledge Base." The `/api/index` route gathers all text, creates embeddings, and populates the vector database, tagging each entry with the `placeId`.
9.  **Inquire (On-Demand):** The user asks a question in the chat. The `/api/rag` route uses the **Master RAG Prompt** and the place-specific knowledge to provide a data-grounded answer.
