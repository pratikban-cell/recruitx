"use client";

import React, { useState } from "react";

interface SteeringDockProps {
  negotiationId: string;
  candidateName: string;
  onSteer: (instruction: string) => Promise<void>;
  isSteering?: boolean;
}

const suggestions = [
  {
    label: "🏠 Demand Remote Days",
    text: "Push harder on hybrid/remote days, requesting at least 3 remote days.",
  },
  {
    label: "📈 Flex Salary Budget",
    text: "We have additional budget space. Flex our salary cap limit by another $5,000 to close this deal.",
  },
  {
    label: "🤝 Stubborn on Offer",
    text: "Hold firm on our current salary figure, but express high commitment to their professional growth.",
  },
  {
    label: "🛡️ Strict Skill Fit Check",
    text: "Instruct the agent to verify their gRPC and Go microservices engineering background strictly before agreeing.",
  },
];

export default function SteeringDock({
  negotiationId: _negotiationId,
  candidateName,
  onSteer,
  isSteering = false,
}: SteeringDockProps) {
  const [instruction, setInstruction] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim()) return;

    try {
      setStatusMsg("Sending guidance to AI...");
      await onSteer(instruction);
      setStatusMsg(
        "⚡ Copilot steered successfully! AI is adapting parameters.",
      );
      setInstruction("");
      setTimeout(() => setStatusMsg(""), 3000);
    } catch (err) {
      console.error(err);
      setStatusMsg("❌ Failed to transmit steering command.");
    }
  };

  const handleSuggestionClick = (text: string) => {
    setInstruction(text);
  };

  return (
    <div className="rounded-2xl border border-indigo-200/60 bg-indigo-50/20 p-5 backdrop-blur-md shadow-lg space-y-4 relative overflow-hidden">
      {/* Visual top accent bar */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-accent via-indigo-500 to-purple-500" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🚨</span>
          <div>
            <h3 className="font-extrabold text-sm text-indigo-950 flex items-center gap-1.5">
              Agent Co-Pilot & Steering Dock
            </h3>
            <p className="text-[10px] text-indigo-800/80 font-medium">
              Steer your recruiter agent&apos;s behavior and bargaining logic in
              real time.
            </p>
          </div>
        </div>
        <span className="rounded-full bg-indigo-200/50 border border-indigo-300 text-[8px] font-bold px-2 py-0.5 text-indigo-900 uppercase tracking-widest animate-pulse-subtle">
          Human-in-the-Loop
        </span>
      </div>

      {/* Suggestion Chips */}
      <div className="space-y-1.5">
        <span className="block text-[9px] font-bold text-indigo-900 uppercase tracking-wider">
          💡 Tactical Steer Actions:
        </span>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSuggestionClick(s.text)}
              className="text-[10px] font-semibold text-indigo-700 bg-white hover:bg-indigo-100 hover:text-indigo-900 px-2.5 py-1 rounded-lg border border-indigo-200 transition-all duration-200 text-left shadow-sm"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Instruction Input */}
      <form onSubmit={handleSubmit} className="space-y-2.5 pt-1.5">
        <div className="flex gap-2">
          <input
            type="text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder={`e.g., offer ${candidateName} an extra $5k or demand more equity...`}
            className="flex-1 rounded-xl border border-indigo-200 bg-white px-3.5 py-2 text-xs text-indigo-950 placeholder:text-indigo-900/40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent shadow-inner transition-colors"
            disabled={isSteering}
          />
          <button
            type="submit"
            disabled={isSteering || !instruction.trim()}
            className="rounded-xl bg-accent hover:bg-accent-dark px-4 py-2 text-xs font-bold text-white transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSteering ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                Steering...
              </>
            ) : (
              <>🎯 Steer Agent</>
            )}
          </button>
        </div>

        {statusMsg && (
          <p
            className={`text-[10px] font-bold ${statusMsg.includes("❌") ? "text-red-600" : statusMsg.includes("⚡") ? "text-emerald-600" : "text-indigo-600"}`}
          >
            {statusMsg}
          </p>
        )}
      </form>
    </div>
  );
}
