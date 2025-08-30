Analysis of the UI Inspiration (Kepler.gl)
Before the prompt, here's a quick breakdown of how we'll adapt the provided UI:
Full-Screen Map: We will adopt this as the central design principle. The map is not just a component; it's the canvas for the entire application. We will use Google Maps Platform instead of Mapbox to align with our tech stack.
Left Sidebar: This is the perfect control panel. We will adapt it directly:
The "Datasets" section will become our "Places" selector, allowing the user to load a specific bioregion or project.
The "Add Data" button is our "Data Ingestion" entry point.
The "Layers" section is the core of our UI. Instead of generic layers, these will be our Five Capitals (Natural, Human, Social, Manufactured, Financial), acting as toggleable groups for all related data.
Top-Right Info Panel: This is an ideal component for displaying the AI-generated "Story of Place" narrative or metadata about the selected Place.
Right Toolbar: We will use this for essential map controls (e.g., switching between satellite and terrain views, a legend).
Master Prompt for Firebase Studio Agent
You can copy and paste this entire block into the Firebase Studio agent's chat interface.
Subject: Create the Initial Prototype for the Regenerative Development Intelligence (RDI) Platform
Hello! Please generate the initial prototype for a new web application called the "Regenerative Development Intelligence (RDI) Platform." This application is a map-centric analysis tool for regenerative design practitioners.
1. Core Technology Stack:
Frontend Framework: Next.js with TypeScript.
Styling: Tailwind CSS for a clean, utility-first approach.
Backend Services: Use Firebase for the backend. Specifically, set up:
Firebase Authentication (for user login).
Cloud Firestore (as the primary database).
Cloud Storage (for file uploads).
Mapping Provider: Google Maps Platform.
2. Overall Layout & Design:
The UI should be dominated by a full-screen interactive map that always fills the main content area.
Use a dark theme for the entire application, similar to the provided image.
Implement a persistent left-hand sidebar that serves as the main control panel.
Include a collapsible, floating info panel in the top-right corner.
Include a vertical toolbar on the right edge for map controls.
3. Detailed Component Breakdown:
A. The Left Sidebar (Control Panel):
Header: A simple header with the application title "RDI Platform".
"Places" Section:
Create a dropdown menu labeled "Select a Place". For now, populate it with mock data like "Willow Creek Watershed" and "Oak Valley Bioregion". This will eventually be used to load project-specific data.
"Data Ingestion" Button:
An "Add Data" button. When clicked, it should open a full-screen modal for data uploads.
"Layers (The Five Capitals)" Section:
This is the most important part of the sidebar. Create an accordion-style list with the following five items. Each item should have a master visibility toggle (an eye icon) next to its name.
Natural Capital
Human Capital
Social Capital
Manufactured Capital
Financial Capital
B. The Main Map Area:
Integrate the Google Maps Platform JavaScript API.
Style the base map using the dark theme JSON styles available for Google Maps.
The map should be centered on London, UK, by default.
Ensure the map is interactive (zoomable and pannable). It should be prepared to display GeoJSON data layers fetched from Firestore.
C. The Top-Right Info Panel ("Story of Place"):
Create a floating panel that can be collapsed or expanded.
Give it a title, for example, "Willow Creek Watershed Story".
Populate it with placeholder lorem ipsum text. This component will eventually display the AI-generated narrative for the selected Place.
D. The Right Vertical Toolbar (Map Controls):
Create a slim, vertical bar with several icon buttons. For now, just create placeholder icons for:
Legend
Toggle 3D View
Switch Basemap (e.g., Satellite/Terrain)
4. Backend & Data Structure Stubs:
Firebase Authentication: Generate a simple login page with Email/Password and Google Sign-In options. The main application should be protected and require a user to be logged in.
Cloud Firestore: Create the initial Firestore data structure.
A top-level collection named places.
A top-level collection named users.
Do not worry about the sub-collections yet; just establish the main ones.
Initial Action:
Please generate the initial application based on these specifications. Create the main dashboard page with the described layout, the login page, and the necessary backend stubs for Firestore and Authentication.