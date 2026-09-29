"use client";

import { useMemo, useState } from "react";

type Criterion = { id: number; name: string; weight: number };
type Option = { id: number; name: string; scores: Record<number, number> };

const initialCriteria: Criterion[] = [
  { id: 1, name: "Learning velocity", weight: 30 },
  { id: 2, name: "Financial runway", weight: 25 },
  { id: 3, name: "Career optionality", weight: 25 },
  { id: 4, name: "Energy sustainability", weight: 20 },
];
const initialOptions: Option[] = [
  { id: 1, name: "Stay & specialize", scores: { 1: 6, 2: 9, 3: 6, 4: 8 } },
  { id: 2, name: "Join early startup", scores: { 1: 9, 2: 5, 3: 8, 4: 4 } },
  { id: 3, name: "Build independently", scores: { 1: 8, 2: 3, 3: 9, 4: 6 } },
];

export default function Home() {
  const [question, setQuestion] = useState("What should I optimize for in the next two years of my career?");
  const [criteria, setCriteria] = useState(initialCriteria);
  const [options, setOptions] = useState(initialOptions);
  const [confidence, setConfidence] = useState(68);
  const [view, setView] = useState<"matrix" | "insights">("matrix");

  const results = useMemo(() => options.map(option => ({
    ...option,
    total: criteria.reduce((sum, c) => sum + (option.scores[c.id] || 0) * c.weight / 100, 0),
  })).sort((a, b) => b.total - a.total), [criteria, options]);
  const max = results[0];
  const runner = results[1];
  const margin = max && runner ? max.total - runner.total : 0;
  const weightTotal = criteria.reduce((s, c) => s + c.weight, 0);

  function setWeight(id: number, value: number) {
    setCriteria(criteria.map(c => c.id === id ? { ...c, weight: value } : c));
  }
  function setScore(optionId: number, criterionId: number, value: number) {
    setOptions(options.map(o => o.id === optionId ? { ...o, scores: { ...o.scores, [criterionId]: value } } : o));
  }
  function addCriterion() {
    if (criteria.length >= 6) return;
    const id = Math.max(...criteria.map(c => c.id), 0) + 1;
    setCriteria([...criteria, { id, name: "New criterion", weight: 10 }]);
    setOptions(options.map(o => ({ ...o, scores: { ...o.scores, [id]: 5 } })));
  }
  function normalize() {
    const total = criteria.reduce((s, c) => s + c.weight, 0) || 1;
    let used = 0;
    setCriteria(criteria.map((c, i) => {
      const weight = i === criteria.length - 1 ? 100 - used : Math.round(c.weight / total * 100);
      used += weight;
      return { ...c, weight };
    }));
  }
  function resetWorkspace() {
    setQuestion("What should I optimize for in the next two years of my career?");
    setCriteria(initialCriteria);
    setOptions(initialOptions);
    setConfidence(68);
    setView("matrix");
  }

  return (
    <main>
      <header>
        <a href="#" className="logo"><span className="logo-glyph">R</span> ReasonGraph <i>LAB</i></a>
        <div className="header-note">Decision intelligence for consequential choices</div>
        <div className="header-actions"><button className="reset-workspace" onClick={resetWorkspace}>Reset example</button><button className="export" onClick={() => window.print()}>Export brief ↗</button></div>
      </header>

      <section className="hero">
        <div className="hero-index">DECISION / 001</div>
        <textarea aria-label="Decision question" value={question} onChange={e => setQuestion(e.target.value)} />
        <div className="thesis">Make your reasoning visible. Challenge the assumptions, not the person.</div>
      </section>

      <nav className="tabs" aria-label="Analysis views">
        <button className={view === "matrix" ? "active" : ""} onClick={() => setView("matrix")}>01 · Decision matrix</button>
        <button className={view === "insights" ? "active" : ""} onClick={() => setView("insights")}>02 · AI critique <span>3</span></button>
      </nav>

      {view === "matrix" ? (
        <section className="canvas">
          <aside className="criteria-panel">
            <div className="section-kicker">Your values, made explicit</div>
            <div className="section-heading"><h2>Decision criteria</h2><button onClick={normalize}>Normalize</button></div>
            <p>Weights express what matters—not what is easiest to measure.</p>
            <div className={`weight-total ${weightTotal === 100 ? "valid" : ""}`}>
              <span>Total weight</span><strong>{weightTotal}%</strong>
              <i style={{ width: `${Math.min(weightTotal, 100)}%` }} />
            </div>
            <div className="criteria-list">
              {criteria.map((c, i) => (
                <div className="criterion" key={c.id}>
                  <div className="criterion-top"><span>0{i + 1}</span><input aria-label={`Criterion ${i + 1} name`} value={c.name} onChange={e => setCriteria(criteria.map(x => x.id === c.id ? { ...x, name: e.target.value } : x))} /><b>{c.weight}%</b></div>
                  <input aria-label={`${c.name} weight`} type="range" min="0" max="60" value={c.weight} onChange={e => setWeight(c.id, Number(e.target.value))} />
                </div>
              ))}
            </div>
            <button className="add" onClick={addCriterion} disabled={criteria.length >= 6}>＋ Add criterion</button>
          </aside>

          <section className="matrix-panel">
            <div className="section-kicker">Score evidence, not intuition</div>
            <div className="section-heading"><h2>Options & evidence</h2><div className="legend"><i /> WEAK <i /> STRONG</div></div>
            <div className="matrix-wrap">
              <table>
                <thead><tr><th>OPTION</th>{criteria.map(c => <th key={c.id}>{c.name}<small>{c.weight}%</small></th>)}<th>WEIGHTED</th></tr></thead>
                <tbody>
                  {options.map(option => {
                    const rank = results.findIndex(r => r.id === option.id);
                    const total = results.find(r => r.id === option.id)?.total || 0;
                    return <tr key={option.id} className={rank === 0 ? "winner" : ""}>
                      <td><input aria-label="Option name" value={option.name} onChange={e => setOptions(options.map(o => o.id === option.id ? { ...o, name: e.target.value } : o))} />{rank === 0 && <span className="lead">CURRENT LEAD</span>}</td>
                      {criteria.map(c => <td key={c.id}><button className={`score s${option.scores[c.id]}`} onClick={() => setScore(option.id, c.id, option.scores[c.id] === 10 ? 1 : option.scores[c.id] + 1)} aria-label={`${option.name}, ${c.name}: ${option.scores[c.id]} out of 10`}>{option.scores[c.id]}</button></td>)}
                      <td><strong>{total.toFixed(1)}</strong><small>/ 10</small></td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
            <div className="sensitivity">
              <div><span>SENSITIVITY TEST</span><h3>How reliable is your evidence?</h3><p>Lower confidence widens uncertainty and makes close results less decisive.</p></div>
              <div className="confidence"><strong>{confidence}%</strong><input aria-label="Evidence confidence" type="range" min="20" max="95" value={confidence} onChange={e => setConfidence(Number(e.target.value))} /><span>SPECULATIVE <i>OBSERVED</i></span></div>
            </div>
            <div className="verdict">
              <div className="verdict-rank">01</div>
              <div><span>ROBUSTNESS-ADJUSTED LEAD</span><h2>{max?.name}</h2><p>{margin < 1 ? "This is a fragile lead. Small changes in your assumptions could reverse the result." : "This option holds a meaningful lead under your current priorities."}</p></div>
              <div className="verdict-score">{(max?.total * confidence / 100).toFixed(1)}<small>CONFIDENCE<br />ADJUSTED</small></div>
            </div>
          </section>
        </section>
      ) : (
        <Insights winner={max?.name} margin={margin} weakest={criteria.slice().sort((a,b) => a.weight-b.weight)[0]?.name} />
      )}
      <footer><span>ReasonGraph does not choose for you.</span><span>It reveals what your choice depends on.</span></footer>
    </main>
  );
}

function Insights({ winner, margin, weakest }: { winner?: string; margin: number; weakest?: string }) {
  const cards = [
    { n: "01", tag: "HIDDEN ASSUMPTION", title: "Your scores imply knowledge you may not have", text: `The case for “${winner}” depends on forecasts about future learning and optionality. Those are predictions, not observations. Replace one score with a measurable proxy before deciding.`, action: "Ask: what evidence would make this score move by 2 points?" },
    { n: "02", tag: "REVERSAL TEST", title: margin < 1 ? "The leader is not robust" : "The lead survives modest uncertainty", text: margin < 1 ? "A one-point change in a highly weighted criterion can flip the ranking. Treat this as a tie and seek information, not more deliberation." : "The current lead is meaningful, but test whether it survives a 20% reduction in your top criterion.", action: "Run a cheap, reversible experiment for two weeks." },
    { n: "03", tag: "BLIND SPOT", title: `${weakest} may be underweighted`, text: "People systematically discount slow, cumulative costs when comparing exciting options. Check whether this weight reflects your values or merely the framing of the decision.", action: "Ask someone affected by the choice to set this weight independently." },
  ];
  return <section className="insights">
    <div className="insight-intro"><span>RED TEAM REVIEW</span><h1>Your model is useful.<br />Now try to break it.</h1><p>ReasonGraph looks for fragile conclusions, unsupported certainty, and criteria that hide value judgments.</p></div>
    <div className="insight-list">{cards.map(c => <article key={c.n}><div className="insight-num">{c.n}</div><div><span>{c.tag}</span><h2>{c.title}</h2><p>{c.text}</p><blockquote>↳ {c.action}</blockquote></div></article>)}</div>
  </section>;
}
