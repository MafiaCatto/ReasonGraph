"use client";

import React from "react";
import { Criterion, Option, OptionScore } from "../lib/types";

type MatrixPanelProps = {
  criteria: Criterion[];
  options: Option[];
  rankings: OptionScore[];
  confidence: number;
  leader: OptionScore | null;
  runnerUp: OptionScore | null;
  margin: number;
  onUpdateOptionName: (id: string, name: string) => void;
  onSetScore: (optionId: string, criterionId: string, score: number) => void;
  onAddOption: () => void;
  onRemoveOption: (id: string) => void;
  onSetConfidence: (val: number) => void;
};

export function MatrixPanel({
  criteria,
  options,
  rankings,
  confidence,
  leader,
  runnerUp,
  margin,
  onUpdateOptionName,
  onSetScore,
  onAddOption,
  onRemoveOption,
  onSetConfidence,
}: MatrixPanelProps) {
  function getScoreClass(score: number): string {
    if (score <= 3) return "s2";
    if (score <= 6) return "s5";
    if (score <= 8) return "s7";
    return "s10";
  }

  return (
    <section className="matrix-panel">
      <div className="section-kicker">Score evidence, not intuition</div>

      <div className="matrix-controls-bar">
        <div className="section-heading">
          <h2>Options & evidence matrix</h2>
        </div>
        <div className="legend">
          Scale (1-10):
          <i className="low" /> 1-3 Speculative
          <i className="high" /> 9-10 Strong
        </div>
      </div>

      <div className="matrix-wrap">
        <table>
          <thead>
            <tr>
              <th>OPTION</th>
              {criteria.map((c) => (
                <th key={c.id}>
                  {c.name}
                  <small>{c.weight}%</small>
                </th>
              ))}
              <th>WEIGHTED</th>
            </tr>
          </thead>
          <tbody>
            {options.map((option) => {
              const scored = rankings.find((r) => r.id === option.id);
              const rank = scored?.rank ?? 0;
              const total = scored?.rawTotal ?? 0;
              const isWinner = rank === 1;

              return (
                <tr key={option.id} className={isWinner ? "winner" : ""}>
                  <td>
                    <div className="option-cell">
                      <div>
                        <input
                          aria-label="Option name"
                          value={option.name}
                          onChange={(e) => onUpdateOptionName(option.id, e.target.value)}
                        />
                        {isWinner && <span className="lead">CURRENT LEAD</span>}
                      </div>
                      {options.length > 2 && (
                        <button
                          className="del-btn"
                          onClick={() => onRemoveOption(option.id)}
                          title="Delete option"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </td>

                  {criteria.map((c) => {
                    const currentScore = option.scores[c.id] ?? 5;
                    return (
                      <td key={c.id}>
                        <button
                          className={`score ${getScoreClass(currentScore)}`}
                          onClick={() =>
                            onSetScore(option.id, c.id, currentScore >= 10 ? 1 : currentScore + 1)
                          }
                          title="Click to cycle score 1-10"
                          aria-label={`${option.name}, ${c.name}: ${currentScore} out of 10`}
                        >
                          {currentScore}
                        </button>
                      </td>
                    );
                  })}

                  <td>
                    <strong>{total.toFixed(1)}</strong>
                    <small>/ 10</small>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-start" }}>
        <button
          className="action-btn"
          onClick={onAddOption}
          disabled={options.length >= 6}
          title={options.length >= 6 ? "Maximum 6 options reached" : "Add an alternative option"}
        >
          ＋ Add Option {options.length >= 6 ? "(Max 6)" : ""}
        </button>
      </div>

      <div className="sensitivity">
        <div>
          <span>SENSITIVITY TEST</span>
          <h3>How reliable is your evidence?</h3>
          <p>
            Adjust the confidence rating to account for epistemic uncertainty. Lower certainty
            widens margins of error and reveals when leaders are fragile.
          </p>
        </div>

        <div className="confidence">
          <strong>{confidence}%</strong>
          <input
            aria-label="Evidence confidence slider"
            type="range"
            min="20"
            max="95"
            value={confidence}
            onChange={(e) => onSetConfidence(Number(e.target.value))}
          />
          <span>
            SPECULATIVE <i>OBSERVED DATA</i>
          </span>
        </div>
      </div>

      <div className="verdict">
        <div className="verdict-rank">01</div>
        <div>
          <span>ROBUSTNESS-ADJUSTED LEADER</span>
          <h2>{leader?.name ?? "No options defined"}</h2>
          <p>
            {margin < 0.6
              ? `Fragile lead: "${leader?.name}" leads by only ${margin.toFixed(
                  1
                )} pts. A small variance in any high-weight criterion reverses this outcome.`
              : margin < 1.4
              ? `Moderate lead (+${margin.toFixed(
                  1
                )} pts). Survives isolated uncertainty, but verify the top 2 weighted criteria.`
              : `Decisive lead (+${margin.toFixed(
                  1
                )} pts). The model strongly favors this option under your stated values.`}
          </p>
        </div>
        <div className="verdict-score">
          {leader?.confidenceAdjusted.toFixed(1) ?? "0.0"}
          <small>
            CONFIDENCE
            <br />
            ADJUSTED
          </small>
        </div>
      </div>
    </section>
  );
}
