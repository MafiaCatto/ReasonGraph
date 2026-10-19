# ReasonGraph

A local-first decision modeling and risk analysis engine built for high-stakes trade-offs.

Most important technical and career decisions—picking an infrastructure stack, evaluating job offers, choosing database architectures, or committing to multi-quarter engineering roadmaps—are made either through arbitrary pros/cons lists or intuition disguised as analysis. 

ReasonGraph is an interactive workbench designed to make decision criteria explicit, quantify uncertainty using probability distributions instead of single-point guesses, and automatically red-team assumptions before you commit.

It runs **100% in the browser**. No backend servers, no third-party APIs, no user tracking, and no external telemetry.

---

## Why I Built This

When teams or individuals face hard choices, three cognitive failure modes happen repeatedly:

1. **Proxy Bias:** People overweight criteria that are easy to quantify (salary, GitHub stars, latency benchmarks) while underweighting harder-to-measure factors that matter more (organizational debt, learning velocity, maintenance drag).
2. **Narrow Margin Illusion:** A candidate option wins by 0.2 points on a spreadsheet, and everyone treats it as a mandate—even though a 5% error in a single estimated score would completely flip the outcome.
3. **Point-Estimate Blindness:** Teams evaluate options using single numbers (e.g., "Operational cost: 7/10") rather than recognizing that every estimate is a probability distribution with upside and catastrophic downside tails.

ReasonGraph treats decision making as a formal modeling problem:
- **Priorities** (criteria weights) are separated cleanly from **Evidence** (option scores).
- **Deterministic evaluations** (Multi-Attribute Utility Theory) are paired with **stochastic stress-testing** (Beta-PERT Monte Carlo simulations).
- An automated **Red-Team engine** calculates exactly how fragile your top choice is to estimation error.

---

## Key Capabilities

### 1. Multi-Attribute Utility Engine (MAUT) with Proportional Auto-Balancing
- Models complex multi-variable decisions across custom weighted criteria.
- **Proportional Auto-Balancing:** Moving any weight slider dynamically redistributes the delta across all other criteria, strictly preserving the $\sum W_i = 100\%$ budget invariant without awkward manual readjustments.
- Single-click global normalization handles irregular weight distributions.

### 2. Full Dynamic Sensitivity Matrix
- Rather than inspecting a single metric in isolation, ReasonGraph evaluates a live break-even grid across **every criterion** against the top contenders simultaneously (#1 vs #2 and #1 vs #3).
- Immediately flags **Single Points of Failure (SPOF)**, metrics where the leader is already trailing, and criteria where small shifts reverse the winner.

### 3. Multi-Metric Hyperplane Distance ($\|\vec{\Delta}^*\|_2$)
- Real-world decisions rarely fail on one metric alone; they fail when multiple estimates drift slightly in the same negative direction.
- Models the decision boundary as an $(n-1)$-dimensional difference hyperplane and computes the shortest Euclidean perturbation vector $\vec{\Delta}^*$ required to reverse the outcome.
- Outputs a concrete **Systemic Drift Budget**: e.g., *"A collective drift of only -0.45 points across 3 criteria overturns the leader."*

### 4. 10,000-Trial Beta-PERT Monte Carlo Engine
- Replaces naive point estimates with bounded three-point Beta-PERT probability distributions ($a$: pessimistic, $m$: most likely, $b$: optimistic).
- Uses Marsaglia & Tsang's Gamma variate transformation for fast, continuous distribution sampling.
- Measures:
  - **Empirical Win Probability:** Percentage of simulated futures where each option wins.
  - **Percentile Distributions:** P10 (bear case), P50 (median), P90 (bull case).
  - **Value-at-Risk (VaR 95%):** The 5th-percentile downside outcome, isolating asymmetric failure risk.
  - **Overlapping SVG Density Curves:** Visualizes outcome overlap and variance spreads.

### 5. Automated Red-Team Analysis
- **Probabilistic Inversion Alert:** Highlights when Option A has the highest static score, but Option B wins the majority of simulated futures due to lower volatility.
- **Pareto Dominance Detector:** Identifies strictly dominated options ($O_B \le O_A$ across all dimensions and $< O_A$ on at least one) that can be safely eliminated.
- **Underweighted Blindspot Finder:** Warns when options diverge sharply on a criterion that was assigned a negligible weight.

### 6. Zero-Cloud Sharing & Executive ADR Export
- **Zero-Cloud URL Sharing:** Encodes complete decision models into URL hashes (`#d=...`), allowing colleagues to inspect and fork models without database accounts.
- **One-Click Markdown Brief:** Compiles decisions into formatted Architecture Decision Records (ADRs) with executive summaries, weighted tables, sensitivity matrices, and simulation statistics ready for Notion, PRs, or RFCs.

---

## Performance & Concurrency Engineering

Running 5,000 to 10,000 Monte Carlo simulation trials involves generating hundreds of thousands of random variables through continuous rejection sampling (Box-Muller transforms and Gamma variates). On a single-threaded JavaScript runtime, executing this synchronously on every mouse move would freeze the UI and drop frames during slider interactions.

### 60 FPS Decoupled Rendering Pipeline
To guarantee a smooth 60 FPS user experience:
1. **Synchronous Deterministic Pass ($<0.05\text{ ms}$):** The core linear algebra (MAUT score calculations, weight balancing, Pareto dominance, break-evens, and hyperplane distance vectors) executes instantly inside a synchronous `useMemo`. As you drag any slider, numbers and rankings update with zero perceptible lag.
2. **Debounced Stochastic Pass ($150\text{ ms}$):** The heavy Monte Carlo simulation runs in a debounced asynchronous effect. Once slider movement settles, the simulation computes in the background, updates probability distributions, and checks for probabilistic inversions without ever blocking the main UI thread.

```
[Slider Input Drag]
       │
       ├─► (Synchronous: <0.05ms) ──► MAUT Scores + Sensitivity Matrix (60 FPS UI)
       │
       └─► (Debounced: 150ms)     ──► 5,000-Trial Beta-PERT Monte Carlo ──► Probability Distributions
```

### Deterministic PRNG for Unit Testing (Mulberry32)
Stochastic simulations in test suites often suffer from test flakiness due to `Math.random()` drift. ReasonGraph incorporates a seeded 32-bit **Mulberry32** pseudo-random number generator:
- Tests pass an explicit seed (e.g. `seed = 42`) to guarantee 100% bit-for-bit reproducible distributions, percentiles, and win rates across CI environments.
- The UI defaults to high-entropy sampling while supporting seeded runs for verifiable ADR audit trails.

---

## Mathematical Formulations

### 1. Multi-Attribute Utility Score (MAUT)
$$\text{Score}(O_j) = \frac{\sum_{i=1}^{n} s_{ij} \cdot w_i}{\sum_{i=1}^{n} w_i}$$
where $s_{ij} \in [1, 10]$ is the score of option $j$ on criterion $i$, and $w_i \ge 0$ is the criterion weight.

### 2. Single-Metric Break-Even Delta
$$\Delta_{i} = \frac{\text{Margin} \times 100}{w_i}$$
The score delta the runner-up must gain on criterion $i$ alone to close the gap and tie the leader.

### 3. Beta-PERT Probability Density
For 3-point estimates with pessimistic bound $a$, mode $m$, and optimistic bound $b$:
- **Expected Value:** $\mu = \frac{a + 4m + b}{6}$
- **Variance:** $\sigma^2 = \frac{(b - a)^2}{36}$
- **Shape Parameters:**
  $$\alpha = 1 + 4 \cdot \frac{m - a}{b - a}, \quad \beta = 1 + 4 \cdot \frac{b - m}{b - a}$$
- **Simulated Win Probability:**
  $$P(\text{Win}_j) = \frac{1}{N} \sum_{k=1}^{N} \mathbb{I}\left(T_j^{(k)} = \max_{r} T_r^{(k)}\right)$$
  where $N$ is the number of trials and $T_j^{(k)}$ is the composite score of option $j$ in trial $k$.

### 4. Value-at-Risk (VaR at 95%)
$$\text{VaR}_{0.95}(O_j) = \inf \{ t \in \mathbb{R} : P(T_j \le t) \ge 0.05 \}$$
The 5th-percentile downside floor below which only 5% of simulated outcomes fall.

### 5. Multi-Metric Hyperplane Distance Vector
Let $\vec{D} = [S_{L,1} - S_{R,1}, \dots, S_{L,n} - S_{R,n}]$ represent the score difference vector between Leader ($L$) and Runner-Up ($R$). The decision reversal boundary forms an $(n-1)$-dimensional hyperplane:
$$\text{Margin} + \sum_{i=1}^n \Delta_i \cdot D_i = 0$$

The shortest Euclidean perturbation vector $\vec{\Delta}^*$ to reach the boundary is:
$$\vec{\Delta}^* = -\text{Margin} \cdot \frac{\vec{D}}{\|\vec{D}\|_2^2}$$

The Euclidean distance to reversal is:
$$d^* = \|\vec{\Delta}^*\|_2 = \frac{\text{Margin}}{\sqrt{\sum_{k=1}^n (S_{L,k} - S_{R,k})^2}}$$

When $d^* < 0.25$, the decision possesses **High Systemic Fragility**: slight simultaneous estimation errors across multiple favorable metrics will overturn the leader even if no single metric reaches its 1D pivot threshold.

---

## Architectural Trade-offs & Future Roadmap

Engineering is about trade-offs. Here is why the system is built the way it is today, and what is planned next.

### 1. Criteria Independence in v1
Standard MAUT models criteria as mutually preference-independent:
$$\text{Cov}(S_i, S_j) = 0 \quad \forall \; i \ne j$$

**Why this was chosen for v1:**
- **Zero Configuration Friction:** The biggest reason decision software gets abandoned is user fatigue. Requiring people to build Bayesian belief networks or configure joint covariance matrices before getting an answer causes immediate drop-off.
- **Fast Execution:** Independent sampling over typed `Float32Array` buffers executes in under 15ms directly in the browser.

### 2. The Real-World Limitation
In real engineering systems, variables correlate. For instance:
- High **Architectural Complexity** reliably inflates **Operational Overhead**.
- Increased **Operational Overhead** reduces **Financial Runway** and **Time to Market**.

Evaluating them as purely independent can underestimate downside risk if multiple negatively correlated variables slip simultaneously.

### 3. Planned v2: Causal DAG Layer with Kahn's Algorithm
To model cascading variance without overwhelming the user, the planned v2 introduces an optional causal graph layer:

```mermaid
graph LR
    Complexity["Architectural Complexity (Root)"] -->|"+0.60"| Overhead["Operational Overhead"]
    Complexity -->|"+0.40"| Cost["Infrastructure Cost"]
    Overhead -->|"+0.50"| Cost
    Cost --> Utility["Composite Score (Sink)"]
```

#### Topological Sorting & Cycle Prevention
Causal dependencies must form a Directed Acyclic Graph (DAG). We apply **Kahn's Algorithm** to compute topological evaluation order and detect circular dependencies ($O(V + E)$):

```typescript
function getTopologicalOrder(criteria: Criterion[], edges: CausalEdge[]): string[] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const c of criteria) {
    inDegree.set(c.id, 0);
    adj.set(c.id, []);
  }

  for (const { from, to } of edges) {
    adj.get(from)?.push(to);
    inDegree.set(to, (inDegree.get(to) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(id);
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    order.push(node);

    for (const neighbor of adj.get(node) ?? []) {
      const nextDeg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, nextDeg);
      if (nextDeg === 0) queue.push(neighbor);
    }
  }

  if (order.length !== criteria.length) {
    throw new Error("CycleDetectedError: Circular dependency found in causal graph.");
  }

  return order;
}
```

#### Distribution Preservation: Why Naive Propagation Fails
A common mistake in causal simulations is applying linear shifts ($S_v \leftarrow S_v + \beta \Delta$). This violates $[1, 10]$ boundaries and destroys the underlying Beta-PERT distribution.

**The Solution (v2): The Iman-Conover Method (1982)**
To induce rank correlation between arbitrary distributions while strictly preserving their marginal shapes:
1. Generate independent Beta-PERT sample vectors for all criteria.
2. Construct the target correlation matrix $\mathbf{C}$ from DAG causal edges and compute its Cholesky decomposition: $\mathbf{C} = \mathbf{L}\mathbf{L}^T$.
3. Induce the correlation onto standard normal reference scores.
4. Rearrange the original Beta-PERT samples to match the rank order of the correlated normal scores. This preserves exact marginal Beta-PERT distributions while honoring the causal dependency structure.

---

## Tech Stack

- **Framework:** Next.js 16 (Turbopack) & React 19
- **Language:** TypeScript 5 (Strict Mode)
- **Numerical Algorithms:** Pure TypeScript (MAUT, Beta-PERT, Marsaglia-Tsang Gamma, Mulberry32 PRNG, Linear Hyperplane Geometry)
- **Test Runner:** Node.js native test runner (`node:test`, `node:assert/strict`) via `tsx`
- **Styling:** Vanilla CSS with custom design tokens (light/dark adaptive, tabular numbers, typography-focused)
- **Deployment:** Static-exportable, local-first browser application

---

## Getting Started

### Prerequisites
- Node.js 20+
- npm or pnpm

### Setup & Run
```bash
# Clone the repository
git clone https://github.com/MafiaCatto/ReasonGraph.git
cd ReasonGraph

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running Unit Tests
```bash
npm test
```

### Production Build
```bash
npm run build
npm start
```

---

## License

MIT License. Free to use, modify, and build upon.
