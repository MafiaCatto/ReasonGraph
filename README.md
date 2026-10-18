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
- **Monte Carlo Probabilistic Simulation Engine**:
  - Simulates 10,000 alternate futures using continuous **Beta-PERT probability distributions** ($a$: pessimistic, $m$: most likely, $b$: optimistic).
  - Quantifies **True Win Probability** (e.g. Option A wins in 68.4% of simulated futures).
  - Computes **Percentile Spreads** (P10 bear case, P50 median, P90 bull case).
  - Evaluates **Value-at-Risk (VaR 95%)** to measure exposure to catastrophic downside tails.
  - Renders **Interactive Overlapping SVG Probability Density Curves**.
- **Break-Even Sensitivity Analysis**: Calculates the exact point delta ($\Delta$) required on each criterion for the runner-up to bridge the margin and overturn the leader.
- **Dynamic Red-Team Stress Test**:
  - **Probabilistic Inversion Alert**: Flags scenarios where the deterministic leader has a lower probability of winning due to extreme volatility.
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
        Engine --> MonteCarlo[lib/monte-carlo.ts: Beta-PERT 10,000 Trials]
        Engine --> RedTeam[Red-Team Stress-Test Rules]
    end

    subgraph User Interface
        Scores --> MatrixView[01 · Decision Matrix UI]
        RedTeam --> RedTeamView[02 · Stress Test & Red Team UI]
        MonteCarlo --> MonteCarloView[03 · Monte Carlo Simulation UI]
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

ReasonGraph includes a comprehensive unit test suite covering weight normalization, score rankings, break-even math, Pareto dominance detection, Beta-PERT random variates, and Monte Carlo probability distributions:

```bash
npm test
```

### Production Build

```bash
npm run build
npm start
```

---

## Decision Theory & Mathematical Foundation

### 1. Multi-Attribute Utility Score (MAUT)
$$\text{Score}(O_j) = \frac{\sum_{i=1}^{n} s_{ij} \cdot w_i}{\sum_{i=1}^{n} w_i}$$
where $s_{ij} \in [1, 10]$ is the score of option $j$ on criterion $i$, and $w_i \in [0, 100]$ is the criterion weight.

### 2. Break-Even Pivot Delta
$$\Delta_{i} = \frac{\text{Margin} \times 100}{w_i}$$
representing the single-variable score increase the runner-up requires on criterion $i$ to tie the leading option.

### 3. Beta-PERT Probability Density Sampling
For 3-point estimates with pessimistic bound $a$, mode $m$, and optimistic bound $b$:
- **Expected Value**: $\mu = \frac{a + 4m + b}{6}$
- **Variance**: $\sigma^2 = \frac{(b - a)^2}{36}$
- **Beta Shape Parameters**:
  $$\alpha = 1 + 4 \cdot \frac{m - a}{b - a}, \quad \beta = 1 + 4 \cdot \frac{b - m}{b - a}$$
- **Simulated Win Probability**:
  $$P(\text{Win}_j) = \frac{1}{N} \sum_{k=1}^{N} \mathbb{I}\left(T_j^{(k)} = \max_{r} T_r^{(k)}\right)$$
  where $N = 10{,}000$ independent trials and $T_j^{(k)}$ is the weighted composite utility in simulation trial $k$.

### 4. Value-at-Risk (VaR at 95%)
$$\text{VaR}_{0.95}(O_j) = \inf \{ t \in \mathbb{R} : P(T_j \le t) \ge 0.05 \}$$
representing the 5th-percentile downside outcome below which only 5% of simulated futures fall.

---

## License

MIT
