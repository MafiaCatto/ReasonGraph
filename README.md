# ReasonGraph

A local-first decision-intelligence workbench for consequential trade-offs and robust choices.

Most important choices—career moves, tech stack architecture, vendor contracts, hiring offers—are decided either through simplistic pros/cons lists or emotional gut feeling. ReasonGraph provides a structured, mathematically sound environment to make priorities explicit, score evidence objectively, and stress-test assumptions before committing.

Operates **100% locally in the browser**. No external APIs, no paid subscriptions, no cloud tracking, zero telemetry.

---

## Why ReasonGraph?

Decision-making literature (specifically **Multi-Attribute Utility Theory / MAUT** and **Epistemic Decision Hygiene**) demonstrates that human decision-makers systematically fall into three traps:

1. **Proxy bias**: Overweighting criteria that are easy to measure (e.g. salary, GitHub stars) over criteria that actually matter (e.g. learning rate, operational overhead).
2. **Fragile conviction**: Mistaking a narrow lead for a decisive mandate without testing how sensitive the result is to minor estimation errors.
3. **Hidden single points of failure**: Failing to isolate the single pivot variable that could flip the entire outcome.

ReasonGraph tackles these directly by separating **values** (weights) from **evidence** (scores), and running an automated **Red Team Stress-Test** over the model.

---

## Key Features

- **Weighted Decision Matrix**: Score competing options against customizable criteria with single-click proportional weight normalization.
- **Break-Even Sensitivity Analysis**: Calculates the exact point delta ($\Delta$) required on each criterion for the runner-up to bridge the margin and overturn the leader.
- **Dynamic Red-Team Stress Test**:
  - **Lead Fragility Indicator**: Highlights when a leader holds a fragile victory margin (< 0.6 pts) versus a robust advantage.
  - **Single Point of Failure (SPOF)**: Identifies which criterion carries the highest decision leverage.
  - **Pareto Dominance Detector**: Flags strictly inferior options that can be safely eliminated.
  - **Underweighted Blindspot Finder**: Spots criteria where options diverge sharply in performance but have been assigned disproportionately low weights.
- **Epistemic Confidence Slider**: Adjust between speculative predictions (20%) and verified observations (95%) to discount lead scores under uncertainty.
- **Local Persistence & Export**:
  - Autosaves state in browser `localStorage`.
  - Export and Import decision states via structured JSON.
  - One-click **Executive Brief Export** (generates clean GitHub-flavored Markdown memos / ADRs ready to paste into Notion, GitHub Discussions, or Slack).
- **Pre-Built Decision Templates**:
  - 🎓 *Career Path Optimization* (Seed-stage startup vs. BigTech vs. Bootstrapping)
  - 🏗️ *Database Architecture* (PostgreSQL vs. Amazon DynamoDB vs. MongoDB)
  - ☁️ *Cloud Strategy* (Serverless vs. Containerized Kubernetes vs. Modular Monolith)

---

## Architecture

```mermaid
flowchart TD
    User([User Choices & Weights]) --> Engine[lib/engine.ts]

    subgraph Analytical Core
        Engine --> Weights[Weight Normalization]
        Engine --> Scores[Weighted Score Computation: MAUT]
        Engine --> BreakEven[Break-Even Pivot Analysis]
        Engine --> Dominance[Pareto Efficiency Engine]
        Engine --> RedTeam[Red-Team Stress-Test Rules]
    end

    subgraph User Interface
        Scores --> MatrixView[Decision Matrix UI]
        BreakEven --> RedTeamView[Stress Test & Red Team UI]
        Dominance --> RedTeamView
        RedTeam --> RedTeamView
    end

    subgraph Persistence & Portability
        User --> LocalStore[(Browser LocalStorage)]
        Engine --> Markdown[lib/export.ts: ADR / Executive Brief]
        Engine --> JSONExport[JSON Schema Backup]
    end
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- npm or pnpm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/MafiaCatto/ReasonGraph.git
cd ReasonGraph
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running Tests

ReasonGraph includes a comprehensive unit test suite covering weight normalization, score rankings, break-even math, Pareto dominance detection, and Markdown brief synthesis:

```bash
npm test
```

### Production Build

```bash
npm run build
npm start
```

---

## Decision Theory Foundation

- **Score Calculation**: 
  $$\text{Score}(O_j) = \frac{\sum_{i=1}^{n} s_{ij} \cdot w_i}{\sum_{i=1}^{n} w_i}$$
  where $s_{ij} \in [1, 10]$ is the score of option $j$ on criterion $i$, and $w_i \in [0, 100]$ is the criterion weight.

- **Break-Even Pivot Delta**:
  $$\Delta_{i} = \frac{\text{Margin} \times 100}{w_i}$$
  representing the single-variable score increase the runner-up requires on criterion $i$ to tie the leading option.

---

## License

MIT
