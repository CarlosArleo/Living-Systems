# 06 Systems Modeling and Simulation: A Framework for Predictive Insight

## 1. Introduction to Systems Dynamics in RDD
*   (This section should be populated with research explaining why systems dynamics is essential for understanding living systems.)

---

## 2. Core Concepts of Agent-Based Modeling (ABM)
*   **Agents:** (Populate with a definition of agents in a community context.)
*   **Rules:** (Populate with an explanation of agent behavioral rules.)
*   **Emergence:** (Populate with a description of how system-wide patterns emerge from agent interactions.)

---

## 3. A Multi-Capital Simulation Framework
*   **Natural Capital:** (Suggest key metrics and agent behaviors.)
*   **Human Capital:** (Suggest key metrics and agent behaviors.)
*   **Social Capital:** (Suggest key metrics and agent behaviors.)
*   **Manufactured Capital:** (Suggest key metrics and agent behaviors.)
*   **Financial Capital:** (Suggest key metrics and agent behaviors.)

---

## 4. Translating Nodal Interventions into Simulation Inputs
*   (Populate with examples of how interventions can be modeled as changes to simulation parameters.)

---

## 5. Ethical Considerations for Simulation
*   (Populate with research on the ethical risks of predictive modeling in community planning.)


# 06 Systems Modeling and Simulation: A Framework for Predictive Insight

## 1\. Introduction to Systems Dynamics in RDD

In Regenerative Development and Design (RDD), communities and ecosystems are understood as living systems—complex, dynamic, and deeply interconnected webs of relationships.<sup>1</sup> Simple, linear cause-and-effect thinking is insufficient for analyzing such systems because it treats components in isolation, leading to fragmented solutions and a cascade of unintended consequences.<sup>1</sup> A piecemeal approach fails to grasp the emergent properties that arise from the interaction of the parts, which is where the "aliveness" of the system resides.<sup>1</sup>

Systems dynamics offers a more appropriate model for understanding the behavior of these complex urban and ecological systems over time.<sup>2</sup> It moves beyond static snapshots to focus on the underlying structures that drive change. The core concepts of systems dynamics are:

- **Stocks:** These are accumulations or quantities of something at a specific point in time, such as the amount of water in a reservoir, the number of trees in a forest, or the level of trust within a community.<sup>4</sup> Stocks provide a system with memory and stability, acting as buffers against change.
- **Flows:** These are the rates at which stocks change. Inflows increase a stock, while outflows decrease it. For example, the birth rate is an inflow to a population stock, while the death rate is an outflow.<sup>4</sup>
- **Feedback Loops:** This is the most critical concept. A feedback loop occurs when the output of a system is fed back into it as an input, influencing its subsequent behavior.<sup>2</sup> For instance, as a city's population grows (stock), it may invest in more transportation infrastructure, which in turn makes the city more attractive, encouraging further population growth (a reinforcing feedback loop).<sup>2</sup> By modeling these loops, we can understand how policies and interventions might ripple through a system, creating both intended and unintended effects.

By applying a systems dynamics lens, regenerative practitioners can better comprehend the non-linear relationships within a place and identify high-leverage points where interventions can catalyze positive, system-wide change.<sup>2</sup>

## 2\. Core Concepts of Agent-Based Modeling (ABM)

While systems dynamics provides a macro-level view of a system's structure, Agent-Based Modeling (ABM) offers a complementary, bottom-up approach. ABM is a computational method that simulates the actions and interactions of autonomous "agents" to see how system-wide patterns emerge from their individual behaviors.<sup>9</sup>

- **Agents:** Agents are the individual, decision-making entities within the system. In the context of a community, agents can represent households, individuals, businesses, community organizations, or municipal institutions.<sup>9</sup> Each agent is given a set of attributes based on real-world data, such as income level, skills, values, location, and social connections.
- **Rules:** Each agent operates according to a set of simple behavioral rules that govern its decisions and interactions.<sup>9</sup> These rules can be directly informed by the data gathered for the Five Capitals. For example:
  - A **'household' agent's** rule for where to shop might be influenced by **Financial Capital** (price), **Manufactured Capital** (proximity of stores), and **Social Capital** (desire to support local businesses recommended by neighbors).
  - A **'business' agent's** rule for hiring might be based on the available **Human Capital** (local skill levels).
  - A **'farmer' agent's** decision to adopt regenerative practices could be influenced by **Natural Capital** (observed soil degradation) and **Social Capital** (the influence of a local farming cooperative).
- **Emergence:** The most powerful aspect of ABM is its ability to reveal emergent properties. These are complex, large-scale patterns and behaviors that are not explicitly programmed into the agents' rules but "emerge" from their countless interactions over time.<sup>9</sup> Phenomena like traffic congestion, neighborhood gentrification, or the spread of social norms are emergent properties.<sup>14</sup> This aligns directly with the core RDD tenet that a living system is always greater than the sum of its parts.<sup>1</sup> ABM allows us to see how simple, local actions can collectively produce complex, and often surprising, systemic outcomes.

## 3\. A Multi-Capital Simulation Framework

An ABM for regenerative development can be structured around the Five Capitals, allowing the AI to simulate how interventions impact the holistic health of a place. In this framework, the key metrics of each capital are treated as **stocks**, and the behaviors of agents create the **flows** that alter these stocks over time.

- **Natural Capital:**
  - **Key Metrics (Stocks):** Acres of regenerated habitat, biodiversity index, water quality level (e.g., pollutant concentration), tons of sequestered carbon, percentage of permeable surfaces.<sup>1</sup>
  - **Agent Behaviors (Flows):** 'Household' agents deciding to plant native gardens (inflow to biodiversity), 'business' agents reducing industrial runoff (reducing outflow of water quality), 'municipal' agents investing in park creation (inflow to habitat).
- **Human Capital:**
  - **Key Metrics (Stocks):** Aggregate community skill level in stewardship or green trades, public health indicators (e.g., rates of physical activity), percentage of residents with higher education.<sup>1</sup>
  - **Agent Behaviors (Flows):** 'Individual' agents participating in training programs (inflow to skills), 'community group' agents organizing walking clubs (inflow to health), youth out-migration (outflow of human capital).
- **Social Capital:**
  - **Key Metrics (Stocks):** A trust index score (based on survey data), number of active community organizations, density of social networks (number of connections between agents), a "sense of belonging" metric.<sup>1</sup>
  - **Agent Behaviors (Flows):** 'Neighbor' agents interacting at a community event (inflow to network density), 'resident' agents volunteering for a local project (inflow to trust), stakeholder groups moving from opposition to collaboration (inflow to social capital).<sup>1</sup>
- **Manufactured Capital:**
  - **Key Metrics (Stocks):** Number of buildings with green certifications, miles of protected bike lanes, number of community-owned assets (e.g., tool libraries, co-working spaces).<sup>1</sup>
  - **Agent Behaviors (Flows):** 'Developer' agents choosing to build to Passive House standards (inflow to green buildings), 'municipal' agents converting parking spaces into parklets (inflow to public space).
- **Financial Capital:**
  - **Key Metrics (Stocks):** Total revenue of locally-owned businesses, aggregate household savings, amount of capital in a community investment fund.<sup>1</sup>
  - **Agent Behaviors (Flows):** 'Household' agents choosing to shop locally (inflow to local business revenue), 'impact investor' agents funding a community solar project (inflow to community investment), capital leakage as residents shop outside the community (outflow).

## 4\. Translating Nodal Interventions into Simulation Inputs

A Nodal Intervention, or "urban acupuncture," is a small, precise, and highly leveraged action designed to catalyze cascading positive effects throughout a system.<sup>1</sup> In a simulation, a nodal intervention is modeled as a targeted change to the system's environment, agent attributes, or behavioral rules.<sup>18</sup>

- Example 1 (Physical Intervention): The Esholt Footpath  
    In the Esholt case study, connecting a single footpath allowed villagers to walk to the train station instead of driving.1
  - **Simulation Input:** A new "path" object is added to the digital environment, reducing the travel time/distance variable between the 'village' and 'station' locations for the 'walking' mode of transport.
  - **Change in Agent Rules:** The transportation choice rule for 'household' agents is modified. The probability of choosing 'walking' increases significantly due to the reduced "cost" (time/effort) of that option.
  - **Simulated Cross-Capital Impact:** The AI could then forecast emergent patterns, such as a decrease in the 'carbon emissions' stock (Natural Capital), a decrease in household transportation costs (Financial Capital), and an increase in physical activity levels (Human Capital).
- Example 2 (Social Intervention): The Curitiba Farmers' Market  
    In Curitiba, residents could exchange collected trash for bus tokens or fresh produce from local farmers.1
  - **Simulation Input:** A new "market" location is added, and a new exchange rule is introduced into the system's logic.
  - **Change in Agent Rules:**
    - For **'resident' agents**, a new rule is added: "IF you deliver a bag of trash, THEN receive a 'produce token'." This creates a new incentive for a pro-environmental behavior.
    - For **'farmer' agents**, a new rule is added: "IF you sell at the market, THEN you can accept 'produce tokens' as payment," opening a new, stable market.
  - **Simulated Cross-Capital Impact:** The simulation could project a decrease in the 'landfill waste' stock (Natural Capital), an improvement in the 'household nutrition' stock (Human Capital), an increase in the 'local farmer income' stock (Financial Capital), and an increase in interactions between urban and rural agents at the market (Social Capital).

## 5\. Ethical Considerations for Simulation

While powerful, systems modeling and simulation must be governed by strict ethical principles to ensure they serve the community's best interests. The goal of simulation in RDD is to augment collective wisdom, not replace it.<sup>1</sup>

- **Danger of False Precision:** Simulations are not crystal balls. They are simplified models of a complex reality and their outputs are potential trajectories, not definitive predictions. Results should always be presented with ranges of uncertainty and clear explanations of the model's assumptions.
- **Avoiding Self-Fulfilling Prophecies:** A simulation predicting negative outcomes for a neighborhood could inadvertently create a self-fulfilling prophecy by discouraging investment or community effort. It is crucial to frame all outputs, both positive and negative, as possibilities that can be influenced by collective action.
- **AI as a Tool for Dialogue, Not a Verdict:** The primary role of the simulation module is to generate "what if" scenarios that serve as a starting point for rich, informed community dialogue. It is a tool to help stakeholders explore the potential long-term, cross-capital consequences of different choices, thereby building their collective capacity for systemic thinking.<sup>1</sup>
- **Transparency and Co-Evolution:** In line with the principle of "Co-Evolution with Human Wisdom," the model's assumptions, data sources, and agent rules must be transparent and explainable.<sup>1</sup> The community should be empowered to question, critique, and even help refine the model, ensuring the AI remains a servant to a human-led process of co-creation, never its master.

#### Works cited

1. \_Case Study_Regenerative_Design_and_Development - Article.pdf
2. System Dynamics for Sustainable Urban Development - Number Analytics, accessed on August 27, 2025, <https://www.numberanalytics.com/blog/system-dynamics-sustainable-urban-development>
3. (PDF) System Dynamics for Sustainable Urban Planning - ResearchGate, accessed on August 27, 2025, <https://www.researchgate.net/publication/340889333_System_Dynamics_for_Sustainable_Urban_Planning>
4. Chapter 6 – Stock and Flow Systems, accessed on August 27, 2025, <https://web.pdx.edu/~rueterj/CCC/v7-Rueter-chap6.pdf>
5. Stocks and Flows → Term - Lifestyle → Sustainability Directory, accessed on August 27, 2025, <https://lifestyle.sustainability-directory.com/term/stocks-and-flows/>
6. S.4 Stocks and flows - Regenerative Economics, accessed on August 27, 2025, <https://www.regenerativeeconomics.earth/regenerative-economics-textbook/s-systems-thinking-and-models/s-4-stocks-and-flows>
7. What are Feedback Loops? — updated 2025 | IxDF - The Interaction Design Foundation, accessed on August 27, 2025, <https://www.interaction-design.org/literature/topics/feedback-loops>
8. Feedback Loop Mechanisms → Term - ESG → Sustainability Directory, accessed on August 27, 2025, <https://esg.sustainability-directory.com/term/feedback-loop-mechanisms/>
9. Optimizing Modern Urban Planning Using Agent-Based Modeling Techniques - Number Analytics, accessed on August 27, 2025, <https://www.numberanalytics.com/blog/urban-planning-agent-based-modeling>
10. Agent-Based Modeling | Columbia University Mailman School of Public Health, accessed on August 27, 2025, <https://www.publichealth.columbia.edu/research/population-health-methods/agent-based-modeling>
11. Agent-based model - Wikipedia, accessed on August 27, 2025, <https://en.wikipedia.org/wiki/Agent-based_model>
12. ACE: A Completely Agent-Based Modeling Approach (Tesfatsion), accessed on August 27, 2025, <https://faculty.sites.iastate.edu/tesfatsi/archive/tesfatsi/ace.htm>
13. Agent-Based Modeling in Public Health: Current Applications and Future Directions - PMC, accessed on August 27, 2025, <https://pmc.ncbi.nlm.nih.gov/articles/PMC5937544/>
14. The Ultimate Guide to Emergent Property - Number Analytics, accessed on August 27, 2025, <https://www.numberanalytics.com/blog/ultimate-guide-to-emergent-property>
15. Emergence - Wikipedia, accessed on August 27, 2025, <https://en.wikipedia.org/wiki/Emergence>
16. Agent Based Modeling Lab | NYU School of Global Public Health, accessed on August 27, 2025, <https://publichealth.nyu.edu/research/centers-labs-initiatives/agent-based-modeling-lab>
17. Urban Acupuncture Fund, accessed on August 27, 2025, <https://www.urbanacupuncturefund.com/>
18. Tutorials and simulation examples — Typhoid Model documentation, accessed on August 27, 2025, <https://docs.idmod.org/projects/emod-typhoid/en/2.20_a/tutorials.html>