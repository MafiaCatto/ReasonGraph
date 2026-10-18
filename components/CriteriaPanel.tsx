"use client";

import React from "react";
import { Criterion } from "../lib/types";

type CriteriaPanelProps = {
  criteria: Criterion[];
  weightTotal: number;
  onUpdateCriterion: (id: string, name: string) => void;
  onSetWeight: (id: string, weight: number) => void;
  onAddCriterion: () => void;
  onRemoveCriterion: (id: string) => void;
  onNormalize: () => void;
};

export function CriteriaPanel({
  criteria,
  weightTotal,
  onUpdateCriterion,
  onSetWeight,
  onAddCriterion,
  onRemoveCriterion,
  onNormalize,
}: CriteriaPanelProps) {
  return (
    <aside className="criteria-panel">
      <div className="section-kicker">Core values & priorities</div>
      <div className="section-heading">
        <h2>Decision criteria</h2>
        <button onClick={onNormalize} title="Proportionally scale weights to sum to 100%">
          Normalize
        </button>
      </div>

      <p>Weights reflect what matters to you—not merely what is easy to measure.</p>

      <div className={`weight-total ${weightTotal === 100 ? "valid" : ""}`}>
        <span>Total weight</span>
        <strong>{weightTotal}%</strong>
        <i style={{ width: `${Math.min(weightTotal, 100)}%` }} />
      </div>

      <div className="criteria-list">
        {criteria.map((c, idx) => (
          <div className="criterion" key={c.id}>
            <div className="criterion-top">
              <span>0{idx + 1}</span>
              <input
                aria-label={`Criterion ${idx + 1} name`}
                value={c.name}
                onChange={(e) => onUpdateCriterion(c.id, e.target.value)}
              />
              <b>{c.weight}%</b>
              <button
                className="del-btn"
                onClick={() => onRemoveCriterion(c.id)}
                title="Remove criterion"
                disabled={criteria.length <= 2}
                style={{ visibility: criteria.length <= 2 ? "hidden" : "visible" }}
              >
                ×
              </button>
            </div>
            <input
              aria-label={`${c.name} weight`}
              type="range"
              min="0"
              max="60"
              value={c.weight}
              onChange={(e) => onSetWeight(c.id, Number(e.target.value))}
            />
          </div>
        ))}
      </div>

      <button
        className="add-btn"
        onClick={onAddCriterion}
        disabled={criteria.length >= 8}
        title={criteria.length >= 8 ? "Maximum 8 criteria reached" : "Add new criterion"}
      >
        ＋ Add criterion {criteria.length >= 8 ? "(Max 8)" : ""}
      </button>
    </aside>
  );
}
