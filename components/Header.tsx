"use client";

import React from "react";
import { DECISION_TEMPLATES } from "../lib/templates";

type HeaderProps = {
  activeTemplate: string;
  onSelectTemplate: (key: string) => void;
  onReset: () => void;
  onOpenExport: () => void;
  onExportJson: () => void;
  onImportJson: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export function Header({
  activeTemplate,
  onSelectTemplate,
  onReset,
  onOpenExport,
  onExportJson,
  onImportJson,
}: HeaderProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <header>
      <a href="#" className="logo">
        <span className="logo-glyph">R</span>
        ReasonGraph <i>LOCAL-FIRST</i>
      </a>

      <div className="header-note">
        Structured decision intelligence · Zero cloud dependency
      </div>

      <div className="header-actions">
        <select
          aria-label="Select decision template"
          className="template-select"
          value={activeTemplate}
          onChange={(e) => onSelectTemplate(e.target.value)}
        >
          <option value="career">Template: Career Strategy</option>
          <option value="database">Template: Database Selection</option>
          <option value="infrastructure">Template: Cloud Architecture</option>
          <option value="custom">Blank Workspace</option>
        </select>

        <button className="action-btn" onClick={onReset} title="Reset to template defaults">
          Reset
        </button>

        <button
          className="action-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Import decision from JSON"
        >
          Import JSON
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={onImportJson}
          accept=".json"
          style={{ display: "none" }}
        />

        <button className="action-btn" onClick={onExportJson} title="Export decision state as JSON">
          Save JSON
        </button>

        <button
          className="action-btn primary"
          onClick={onOpenExport}
          title="Generate executive markdown memo"
        >
          Export Brief ↗
        </button>
      </div>
    </header>
  );
}
