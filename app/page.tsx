"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Decision, Criterion, Option } from "../lib/types";
import { DECISION_TEMPLATES } from "../lib/templates";
import { analyzeDecision, normalizeWeights } from "../lib/engine";
import { generateMarkdownBrief } from "../lib/export";
import { Header } from "../components/Header";
import { CriteriaPanel } from "../components/CriteriaPanel";
import { MatrixPanel } from "../components/MatrixPanel";
import { RedTeamPanel } from "../components/RedTeamPanel";
import { MonteCarloView } from "../components/MonteCarloView";
import { ExportModal } from "../components/ExportModal";

const STORAGE_KEY = "reasongraph_active_decision";

export default function Home() {
  const [activeTemplate, setActiveTemplate] = useState<string>("career");
  const [decision, setDecision] = useState<Decision>(() => DECISION_TEMPLATES.career);
  const [view, setView] = useState<"matrix" | "insights" | "monte-carlo">("matrix");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Restore decision from URL hash or localStorage on client mount
  useEffect(() => {
    setIsMounted(true);
    try {
      const hash = window.location.hash;
      if (hash.startsWith("#d=")) {
        const jsonStr = decodeURIComponent(atob(hash.slice(3)));
        const parsed = JSON.parse(jsonStr);
        if (parsed && parsed.criteria && parsed.options) {
          setDecision(parsed);
          setActiveTemplate("custom");
          return;
        }
      }

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.criteria && parsed.options) {
          setDecision(parsed);
          setActiveTemplate("custom");
        }
      }
    } catch {
      // Ignore parse errors on corrupted local storage or hash
    }
  }, []);

  // Autosave to localStorage on decision changes
  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(decision));
    } catch {
      // Ignore quota errors
    }
  }, [decision, isMounted]);

  // Compute live analysis via pure engine
  const analysis = useMemo(
    () => analyzeDecision(decision.criteria, decision.options, decision.confidence),
    [decision.criteria, decision.options, decision.confidence]
  );

  const markdownBrief = useMemo(
    () => generateMarkdownBrief(decision, analysis),
    [decision, analysis]
  );

  function handleSelectTemplate(key: string) {
    setActiveTemplate(key);
    if (key === "custom") {
      setDecision({
        id: `custom-${Date.now()}`,
        title: "Untitled Strategic Decision",
        confidence: 70,
        updatedAt: new Date().toISOString(),
        criteria: [
          { id: "c1", name: "Impact & upside", weight: 50 },
          { id: "c2", name: "Execution risk", weight: 50 },
        ],
        options: [
          { id: "o1", name: "Option Alpha", scores: { c1: 8, c2: 6 } },
          { id: "o2", name: "Option Beta", scores: { c1: 6, c2: 8 } },
        ],
      });
    } else if (DECISION_TEMPLATES[key]) {
      setDecision(DECISION_TEMPLATES[key]);
    }
  }

  function handleReset() {
    if (DECISION_TEMPLATES[activeTemplate]) {
      setDecision(DECISION_TEMPLATES[activeTemplate]);
    } else {
      handleSelectTemplate("career");
    }
  }

  function handleExportJson() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(decision, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `reasongraph-${decision.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  function handleImportJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.criteria && parsed.options) {
          setDecision(parsed);
          setActiveTemplate("custom");
        } else {
          alert("Invalid ReasonGraph decision JSON format.");
        }
      } catch {
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // Criteria Mutators
  function handleUpdateCriterion(id: string, name: string) {
    setDecision((prev) => ({
      ...prev,
      criteria: prev.criteria.map((c) => (c.id === id ? { ...c, name } : c)),
    }));
  }

  function handleSetWeight(id: string, weight: number) {
    setDecision((prev) => ({
      ...prev,
      criteria: prev.criteria.map((c) => (c.id === id ? { ...c, weight } : c)),
    }));
  }

  function handleAddCriterion() {
    if (decision.criteria.length >= 8) return;
    const newId = `c_${Date.now()}`;
    const newCriterion: Criterion = {
      id: newId,
      name: `New criterion`,
      weight: 10,
    };
    setDecision((prev) => ({
      ...prev,
      criteria: [...prev.criteria, newCriterion],
      options: prev.options.map((o) => ({
        ...o,
        scores: { ...o.scores, [newId]: 5 },
      })),
    }));
  }

  function handleRemoveCriterion(id: string) {
    if (decision.criteria.length <= 2) return;
    setDecision((prev) => ({
      ...prev,
      criteria: prev.criteria.filter((c) => c.id !== id),
      options: prev.options.map((o) => {
        const nextScores = { ...o.scores };
        delete nextScores[id];
        return { ...o, scores: nextScores };
      }),
    }));
  }

  function handleNormalize() {
    setDecision((prev) => ({
      ...prev,
      criteria: normalizeWeights(prev.criteria),
    }));
  }

  // Options Mutators
  function handleUpdateOptionName(id: string, name: string) {
    setDecision((prev) => ({
      ...prev,
      options: prev.options.map((o) => (o.id === id ? { ...o, name } : o)),
    }));
  }

  function handleSetScore(optionId: string, criterionId: string, score: number) {
    setDecision((prev) => ({
      ...prev,
      options: prev.options.map((o) =>
        o.id === optionId
          ? { ...o, scores: { ...o.scores, [criterionId]: Math.max(1, Math.min(10, score)) } }
          : o
      ),
    }));
  }

  function handleAddOption() {
    if (decision.options.length >= 6) return;
    const newId = `opt_${Date.now()}`;
    const defaultScores: Record<string, number> = {};
    for (const c of decision.criteria) {
      defaultScores[c.id] = 5;
    }
    const newOption: Option = {
      id: newId,
      name: `Alternative Option ${decision.options.length + 1}`,
      scores: defaultScores,
    };
    setDecision((prev) => ({
      ...prev,
      options: [...prev.options, newOption],
    }));
  }

  function handleRemoveOption(id: string) {
    if (decision.options.length <= 2) return;
    setDecision((prev) => ({
      ...prev,
      options: prev.options.filter((o) => o.id !== id),
    }));
  }

  async function handleShareLink(): Promise<boolean> {
    try {
      const jsonStr = JSON.stringify(decision);
      const encoded = btoa(encodeURIComponent(jsonStr));
      const url = `${window.location.origin}${window.location.pathname}#d=${encoded}`;
      window.history.replaceState(null, "", `#d=${encoded}`);
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      return false;
    }
  }

  return (
    <main>
      <Header
        activeTemplate={activeTemplate}
        onSelectTemplate={handleSelectTemplate}
        onReset={handleReset}
        onOpenExport={() => setIsExportModalOpen(true)}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onShareLink={handleShareLink}
      />

      <section className="hero">
        <div className="hero-index">DECISION / 001</div>
        <textarea
          aria-label="Decision question or prompt"
          value={decision.title}
          onChange={(e) => setDecision((prev) => ({ ...prev, title: e.target.value }))}
          rows={2}
        />
        <div className="thesis">
          Make your reasoning visible. Challenge the hidden assumptions, not the person.
        </div>
      </section>

      <nav className="tabs" aria-label="Analysis navigation">
        <button
          className={view === "matrix" ? "active" : ""}
          onClick={() => setView("matrix")}
        >
          01 · Decision matrix
        </button>
        <button
          className={view === "insights" ? "active" : ""}
          onClick={() => setView("insights")}
        >
          02 · Stress test & Red team <span>{analysis.insights.length}</span>
        </button>
        <button
          className={view === "monte-carlo" ? "active" : ""}
          onClick={() => setView("monte-carlo")}
        >
          03 · Monte Carlo simulation 🎲 <span>{analysis.monteCarlo?.leaderProbability ?? 0}%</span>
        </button>
      </nav>

      {view === "matrix" && (
        <section className="canvas">
          <CriteriaPanel
            criteria={decision.criteria}
            weightTotal={analysis.weightTotal}
            onUpdateCriterion={handleUpdateCriterion}
            onSetWeight={handleSetWeight}
            onAddCriterion={handleAddCriterion}
            onRemoveCriterion={handleRemoveCriterion}
            onNormalize={handleNormalize}
          />

          <MatrixPanel
            criteria={decision.criteria}
            options={decision.options}
            rankings={analysis.rankings}
            confidence={decision.confidence}
            leader={analysis.leader}
            runnerUp={analysis.runnerUp}
            margin={analysis.margin}
            onUpdateOptionName={handleUpdateOptionName}
            onSetScore={handleSetScore}
            onAddOption={handleAddOption}
            onRemoveOption={handleRemoveOption}
            onSetConfidence={(val) => setDecision((prev) => ({ ...prev, confidence: val }))}
          />
        </section>
      )}

      {view === "insights" && (
        <RedTeamPanel
          leader={analysis.leader}
          runnerUp={analysis.runnerUp}
          margin={analysis.margin}
          breakEvens={analysis.breakEvens}
          insights={analysis.insights}
        />
      )}

      {view === "monte-carlo" && (
        <MonteCarloView
          criteria={decision.criteria}
          options={decision.options}
          confidence={decision.confidence}
          initialResult={analysis.monteCarlo}
        />
      )}

      <footer>
        <span>ReasonGraph does not choose for you.</span>
        <span>It reveals what your choice depends on.</span>
      </footer>

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        markdown={markdownBrief}
        title={decision.title}
      />
    </main>
  );
}
