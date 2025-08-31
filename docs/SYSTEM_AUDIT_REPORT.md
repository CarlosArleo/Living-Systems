# RDI Platform: State of Development Audit

## Executive Summary
- **Overall Progress:** Tier 1 is approximately 75% complete. The core data pipelines and user authentication are in place, but the system for analyzing data and visualizing it is not yet fully implemented.
- **Architectural Health:** The codebase demonstrates a strong adherence to the Project Constitution. The decoupled frontend/backend architecture is clear, Genkit flows are well-isolated, and the data model correctly uses subcollections. However, there is a significant architectural misalignment in the data harmonization and analysis flow that needs immediate correction.
- **Immediate Next Steps:**
    1.  **Refactor the Data Analysis Flow:** The current implementation is flawed. The on-demand analysis flow (`/api/analyze`) must be fully implemented to fulfill the core purpose of the MVP.
    2.  **Implement Map Visualization:** The `MapComponent` needs to be updated to fetch and display the `geoJSON` data produced by the analysis flow.
    3.  **Create the Place Detail Page:** A dynamic page is needed to display the results of the analysis for a selected Place, which is a key part of the practitioner's workflow.

---

## Tier 1: Assessment & Visualization Platform (MVP)

### 1. User Authentication & Profile Management
- **Status:** PARTIALLY DONE
- **Evidence & Analysis:**
    - `src/app/login/page.tsx`: **DONE**. A functional Google Sign-In page exists.
    - `src/app/page.tsx`: **DONE**. Correctly implements a protected route by redirecting unauthenticated users.
    - `firestore.rules`: **DONE**. Contains security rules for a `/users/{userId}` collection.
    - **GAP:** A `UserProfilePage` component is **MISSING**. There is currently no UI for a user to view or manage their profile information.

### 2. Core Data Ingestion Flow
- **Status:** DONE
- **Evidence & Analysis:**
    - `src/components/analysis-panel.tsx`: **DONE**. The UI contains a dialog with a file input to upload documents.
    - `src/api/harmonize/route.ts`: **DONE**. This API route correctly receives the upload information (after the file is sent to Cloud Storage by the client) and triggers the `harmonizeDataOnUpload` flow.
    - `src/ai/flows/harmonize.ts`: **DONE**. This Genkit flow correctly creates a metadata document in the `/places/{placeId}/documents` subcollection with a status of `uploaded`. The system correctly follows the pattern of creating a metadata placeholder before analysis.

### 3. "Integral Assessment" AI Engine
- **Status:** MISALIGNED
- **Evidence & Analysis:**
    - **MAJOR MISALIGNMENT:** The roadmap specifies that the `integralAssessmentFlow` should be triggered automatically by a Cloud Function (`onObjectFinalized`) when a file is uploaded. The current implementation deviates from this significantly. The analysis is instead triggered *on-demand* by the user from the frontend via the `/api/analyze` route.
    - `src/api/analyze/route.ts`: **PARTIALLY DONE**. This API route exists and correctly constructs a prompt using the "Master Prompt" principles. It successfully updates the document status to `analyzed` and saves the results.
    - **GAP:** The concept of an *automatic*, event-triggered `onObjectFinalized` Cloud Function is **MISSING** entirely from the current implementation. This is a significant deviation from the plan. **Correction is required.**

### 4. Data Visualization Dashboard
- **Status:** PARTIALLY DONE
- **Evidence & Analysis:**
    - `src/components/map.tsx`: **PARTIALLY DONE**. A `MapComponent` exists and is capable of displaying layers. However, its data fetching logic is currently looking for `geoJSON` data in capital-specific collections (`natural`, `human`, etc.) which do not exist in the current Firestore model. It needs to be updated to fetch the `geoJSON` string from the single `/documents/{docId}` document after analysis.
    - **GAP:** The dynamic `places/[placeId]` page is **MISSING**. The API route `/api/places/[placeId]/route.ts` also does not exist, which is a violation of the **"Enforce Wholeness"** directive as there is no central endpoint for fetching aggregated place data. Individual visualization components (`NaturalCapitalCard`, `etc.) are also **MISSING**.

### 5. Foundational Governance
- **Status:** PARTIALLY DONE
- **Evidence & Analysis:**
    - `firestore.rules`: **DONE**. The rules file correctly implements the "Secure by Default" and "Forced Backend Logic" mandates. Client-side writes to sensitive subcollections are disabled.
    - **GAP:** The rules provided in the prompt are more advanced than what is currently implemented, specifically regarding create/update validation on the `places` collection itself. While functional, the current rules are less secure than the specified ideal.

---

## Tier 2: Co-Creative & Dialogic Tool
- **Status:** PARTIALLY DONE
- **Evidence & Analysis:** The foundational features for collaboration have been implemented ahead of schedule, which is excellent. The `FeedbackPanel` and `FeedbackForm` components exist, and the `/api/feedback` route correctly handles submissions. This fulfills the **"Directive: Engineer for Collaboration."** However, the core `storyOfPlaceFlow` is still **MISSING**.

## Tier 3: Predictive & Generative Engine
- **Status:** MISSING
- **Evidence & Analysis:** No work has started on Tier 3 features, which is consistent with the development roadmap.
