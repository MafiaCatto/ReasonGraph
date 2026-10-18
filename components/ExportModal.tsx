"use client";

import React, { useState } from "react";

type ExportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  markdown: string;
  title: string;
};

export function ExportModal({ isOpen, onClose, markdown, title }: ExportModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }

  function handleDownload() {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-decision-brief.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Executive Decision Brief (Markdown)</h3>
          <button className="del-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <p style={{ margin: "0 0 12px", fontSize: "11px", color: "var(--muted)" }}>
            Ready to paste into Notion, GitHub Discussions, Linear, or team Slack channels.
          </p>
          <pre className="modal-pre">{markdown}</pre>
        </div>

        <div className="modal-footer">
          <button className="action-btn" onClick={() => window.print()}>
            Print / PDF ↗
          </button>
          <button className="action-btn" onClick={handleDownload}>
            Download .md
          </button>
          <button className="action-btn primary" onClick={handleCopy}>
            {copied ? "✓ Copied to Clipboard" : "Copy Markdown"}
          </button>
        </div>
      </div>
    </div>
  );
}
