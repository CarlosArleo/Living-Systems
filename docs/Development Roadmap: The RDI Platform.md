Based on the tiered development model outlined in your `Architecting Regenerative Intelligence.md` and the rules in your `CONTEXT.md`, here is your comprehensive, step-by-step checklist. This is your development roadmap.

Your core instruction for every single item on this list is to use the **Generate -> Critique -> Correct** workflow.

---

## **Development Roadmap: The RDI Platform**

### **Tier 1: The Assessment & Visualization Platform (MVP)**

**Objective:** To build the core functionality for ingesting, analyzing, and visualizing place-based data. This tier provides immediate value to the Regenerative Design Practitioner.

**[ ] 1. User Authentication & Profile Management**
    *   **[ ] a. Implement UI Components:**
        *   Create the `LoginPage`, `SignUpPage`, and `UserProfilePage` components.
        *   **Prompt:** Use the "Regenerative UI Component Generation" prompt template, specifying the use of `shadcn/ui` for forms, inputs, and buttons.
    *   **[ ] b. Implement Backend Logic:**
        *   Set up Firebase Authentication for Email/Password and Google Sign-In.
        *   Create a `users` root collection in Firestore to store user profile information (e.g., `displayName`, `role`).
    *   **[ ] c. Implement Protected Routes:**
        *   Create a mechanism in your Next.js application to protect routes like `/dashboard` from unauthenticated users.
    *   ✅ **Process:** Every component and function must pass the **Generate -> Critique -> Correct** loop.

**[ ] 2. Core Data Ingestion Flow**
    *   **[ ] a. Create Document Upload UI:**
        *   Develop a `DocumentUploadForm` component that allows users to select a file (e.g., PDF) and associate it with a specific "Place."
        *   **Prompt:** Use the "Regenerative UI Component Generation" prompt template.
    *   **[ ] b. Develop Backend Upload Handler:**
        *   Create a Cloud Function or API Route that securely receives the uploaded file, uploads it to a designated folder in Cloud Storage (e.g., `/places/{placeId}/{documentId}`), and creates a corresponding metadata document in the `/places/{placeId}/documents` subcollection in Firestore.
        *   **Prompt:** Use the "Backend API Route Generation" prompt template.
    *   ✅ **Process:** Run both the UI component and the backend function through the full **Critique-Correct** loop.

**[ ] 3. The "Integral Assessment" AI Engine**
    *   **[ ] a. Develop the Genkit Analysis Flow:**
        *   Create the `integralAssessmentFlow` in Genkit as previously specified. This flow takes a document URL, calls the Gemini model with the "Document Analysis & Harmonization Prompt," and saves the structured Five Capitals data back to the appropriate subcollections in Firestore (e.g., `/places/{placeId}/natural/{analysisId}`).
        *   **Prompt:** Use the "Genkit AI Analysis Flow" prompt.
    *   **[ ] b. Create the Cloud Function Trigger:**
        *   Implement the `onObjectFinalized` Cloud Function that automatically triggers the `integralAssessmentFlow` whenever a new document is successfully uploaded to Cloud Storage.
        *   **Prompt:** Use the "Cloud Function Trigger for AI Flow" prompt.
    *   ✅ **Process:** This is the core of your application. Be extra rigorous with the **Critique-Correct** loop for both the flow and the trigger.

**[ ] 4. Data Visualization Dashboard**
    *   **[ ] a. Create the "Place" Detail Page:**
        *   Develop a dynamic Next.js page at `/places/[placeId]`.
    *   **[ ] b. Implement the "Holistic" Data Fetcher:**
        *   Create the backend API route (`/api/places/[placeId]`) that fulfills the **"Directive: Enforce Wholeness"** by fetching data from the main `place` document and at least two of its `capitals` subcollections.
        *   **Prompt:** Use the "Backend API Route Generation (Enforcing Wholeness)" prompt.
    *   **[ ] c. Develop Visualization Components:**
        *   Create individual React components to display the analyzed data for each of the Five Capitals (e.g., `NaturalCapitalCard`, `SocialCapitalCard`).
        *   These components will be used on the Place Detail Page.
    *   **[ ] d. Implement the Map View:**
        *   Create a `MapView` component using Mapbox GL JS. It should be able to display GeoJSON data extracted during the Integral Assessment and stored in the `natural` capital documents.
    *   ✅ **Process:** Every component and API route must pass the **Critique-Correct** loop.

**[ ] 5. Foundational Governance**
    *   **[ ] a. Implement Firestore Security Rules:**
        *   Generate the `firestore.rules` file. The rules must enforce the mandates from your `CONTEXT.md`: secure by default, protect user data, and **critically, disable all client-side writes** to the `capitals` and `documents` subcollections.
        *   **Prompt:** Use the "Firebase Security Rules Generation" prompt.
    *   ✅ **Process:** Run the generated rules file through the **Critique-Correct** loop.

---

### **Tier 2: The Co-Creative & Dialogic Tool**

**Objective:** To build upon the MVP by adding features that enable the "Story of Place" methodology and facilitate stakeholder collaboration.

**[ ] 1. "Story of Place" AI Synthesis**
    *   **[ ] a. Develop the Genkit Synthesis Flow:**
        *   Create a new Genkit flow, `storyOfPlaceFlow`. This flow will query all the analyzed data from the Five Capitals subcollections for a given place, then use the **"Story of Place" Synthesis Prompt** to generate a coherent narrative.
    *   **[ ] b. Mandate Potential-Based Framing:**
        *   Ensure the flow's logic and the prompt strictly enforce the **"Directive: Mandate Potential-Based Framing,"** requiring a "Latent Potential" section in the output.
    *   **[ ] c. Save the Story:**
        *   The flow should save the generated narrative back to the main `/places/{placeId}` document.
    *   ✅ **Process:** Rigorously audit this flow with the **Critique-Correct** loop.

**[ ] 2. Collaboration & Feedback Features**
    *   **[ ] a. Implement the Story Display UI:**
        *   Create a `StoryOfPlaceDisplay` component that renders the narrative.
    *   **[ ] b. Engineer for Collaboration:**
        *   As mandated by the **"Directive: Engineer for Collaboration,"** this component **MUST** include a `FeedbackForm` and a `FeedbackThread` component to allow stakeholders to comment.
    *   **[ ] c. Create Feedback Backend:**
        *   Develop a secure API route or Cloud Function that allows authenticated users to submit comments, which are then saved to the `/places/{placeId}/feedback` subcollection.
    *   ✅ **Process:** The entire UI/backend feature slice must pass the **Critique-Correct** loop.

**[ ] 3. User Roles & Permissions**
    *   **[ ] a. Update User Model:**
        *   Add a `role` field (e.g., 'practitioner', 'stakeholder') to the `users` collection in Firestore.
    *   **[ ] b. Refine Security Rules:**
        *   Update your `firestore.rules` to create role-based permissions. For example, only a 'practitioner' can initiate a new analysis, but a 'stakeholder' can add feedback.
    *   ✅ **Process:** Audit the new security rules with the **Critique-Correct** loop.

---

### **Tier 3: The Predictive & Generative Engine**

**Objective:** To implement advanced, forward-looking features that enable simulation and generative design, representing the full vision of the platform.

**[ ] 1. "Nodal Intervention Mapper" (Simulation)**
    *   **[ ] a. Develop Simulation Input UI:**
        *   Create a new interface where practitioners can define parameters for a system simulation.
    *   **[ ] b. Implement Simulation Backend:**
        *   Architect a backend service (this may require a more robust Cloud Run instance instead of a simple Cloud Function) that takes the simulation parameters and uses an AI model to forecast potential impacts across the Five Capitals.
    *   **[ ] c. Create Results Visualization UI:**
        *   Develop a new set of components to visualize the simulation outputs, highlighting potential "nodal interventions."
    *   ✅ **Process:** Each component of this complex feature must be built and audited with the **Critique-Correct** loop.

**[ ] 2. Constrained Generative Design Module**
    *   **[ ] a. Develop Constraint Definition UI:**
        *   Create an interface for users to input place-based design constraints (e.g., "Use local materials," "Maximize green space").
    *   **[ ] b. Create Generative Design AI Flow:**
        *   Develop a new, advanced Genkit flow that takes a design task (e.g., "Propose a layout for a community park") and the user-defined constraints, and generates conceptual outputs (can be text, SVG, or GeoJSON).
    *   ✅ **Process:** This is a highly advanced feature. The prompt engineering and the **Critique-Correct** loop will be essential for success.