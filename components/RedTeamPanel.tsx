"use client";

import React from "react";
import { OptionScore, BreakEvenInsight, RedTeamInsight } from "../lib/types";

type RedTeamPanelProps = {
  leader: OptionScore | null;
  runnerUp: OptionScore | null;
  margin: number;
  breakEvens: BreakEvenInsight[];
  insights: RedTeamInsight[];
};

export function RedTeamPanel({
  leader,
  runnerUp,
  margin,
  breakEvens,
  insights,
}: RedTeamPanelProps) {
  return (
    <section className="insights">
      <div className="insight-intro">
        <span>STRESS TEST & RED TEAM REVIEW</span>
        <h1>
          Your model is useful.
          <br />
          Now try to break it.
        </h1>
        <p>
          ReasonGraph evaluates how vulnerable your choice is to estimation error,
          identifies single-point pivot criteria, and checks whether close leaders survive
          uncertainty.
        </p>

        {runnerUp && leader && (
          <div className="break-even-card">
            <h3>Break-Even Sensitivity Analysis</h3>
            <p>
              To overturn <strong>{leader.name}</strong>, <strong>{runnerUp.name}</strong> (+{margin.toFixed(2)} pts behind) needs any <em>one</em> of these score swings:
            </p>
            <div>
              {breakEvens.map((b) => (
                <div className="break-even-item" key={b.criterionId}>
                  <span>
                    <strong>{b.criterionName}</strong> ({b.weight}% wt)
                  </span>
                  <span style={{ color: b.isFeasible ? "var(--orange)" : "var(--muted)" }}>
                    +{b.pointsNeeded.toFixed(1)} pts {b.isFeasible ? "needed" : "(not feasible alone)"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="insight-list">
        {insights.length === 0 ? (
          <article>
            <div className="insight-num">01</div>
            <div>
              <span className="insight-tag low">STABLE</span>
              <h2>No Critical Vulnerabilities Found</h2>
              <p>The model displays consistent margins and balanced weights across all evaluated options.</p>
            </div>
          </article>
        ) : (
          insights.map((ins, idx) => (
            <article key={ins.id}>
              <div className="insight-num">0{idx + 1}</div>
              <div>
                <span className={`insight-tag ${ins.severity}`}>
                  {ins.type} · {ins.severity.toUpperCase()}
                </span>
                <h2>{ins.title}</h2>
                <p>{ins.detail}</p>
                <blockquote>↳ {ins.recommendation}</blockquote>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
