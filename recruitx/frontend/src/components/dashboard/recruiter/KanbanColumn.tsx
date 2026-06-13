"use client";

import React from "react";
import CandidateCard from "./CandidateCard";

interface KanbanColumnProps {
  colId: string;
  title: string;
  icon: string;
  cards: any[];
  colTheme: Record<string, { border: string; bg: string; text: string; accent: string; indicator: string }>;
  draggedOverCol: string | null;
  triggeringAgentId: string | null;
  isSubmitting: Record<string, boolean>;
  takeoverText: Record<string, string>;
  setTakeoverText: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onDragOver: (e: React.DragEvent, colId: string) => void;
  onDrop: (e: React.DragEvent, colId: string) => void;
  onDragStart: (e: React.DragEvent, cardId: string) => void;
  onCardClick: (card: any) => void;
  onStartAgent: (cardId: string) => void;
  onToggleTakeover: (cardId: string) => void;
  onSendCustomMessage: (cardId: string) => void;
}

const columnStatusDot: Record<string, string> = {
  sourcing: "bg-slate-400",
  active: "bg-blue-500",
  scheduled: "bg-purple-500",
  matched: "bg-emerald-500",
  rejected: "bg-slate-300",
};

export default function KanbanColumn({
  colId,
  title,
  icon,
  cards,
  colTheme,
  draggedOverCol,
  triggeringAgentId,
  isSubmitting,
  takeoverText,
  setTakeoverText,
  onDragOver,
  onDrop,
  onDragStart,
  onCardClick,
  onStartAgent,
  onToggleTakeover,
  onSendCustomMessage,
}: KanbanColumnProps) {
  const isOver = draggedOverCol === colId;

  return (
    <div
      onDragOver={(e) => onDragOver(e, colId)}
      onDrop={(e) => onDrop(e, colId)}
      className={`flex flex-col min-w-[270px] md:min-w-0 rounded-2xl p-4 bg-slate-50/60 border border-slate-200/60 transition-all duration-300 ${
        isOver ? "ring-2 ring-accent/30 ring-dashed bg-accent/[0.03] border-accent/40 scale-[1.01] shadow-sm" : ""
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-slate-200/80">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`h-2.5 w-2.5 rounded-full ${columnStatusDot[colId] || "bg-slate-300"}`} />
          <h2 className="font-bold text-xs uppercase tracking-wider text-slate-700 truncate" title={title}>
            {title.split(" ")[0]} <span className="font-medium text-slate-400">{title.split(" ").slice(1).join(" ")}</span>
          </h2>
        </div>
        <span className="rounded-full bg-white border border-slate-200 text-[10px] font-bold px-2 py-0.5 text-slate-500 shadow-sm shrink-0">
          {cards.length}
        </span>
      </div>

      {/* Cards Container */}
      <div className="flex-1 space-y-3.5 min-h-[420px]">
        {cards.map((card) => (
          <CandidateCard
            key={card.id}
            card={card}
            colId={colId}
            colTheme={colTheme}
            triggeringAgentId={triggeringAgentId}
            isSubmitting={isSubmitting}
            takeoverText={takeoverText}
            setTakeoverText={setTakeoverText}
            onDragStart={onDragStart}
            onClick={() => onCardClick(card)}
            onStartAgent={onStartAgent}
            onToggleTakeover={onToggleTakeover}
            onSendCustomMessage={onSendCustomMessage}
          />
        ))}

        {cards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 border border-dashed border-slate-200 rounded-xl bg-white/40">
            <span className="text-xl opacity-40 mb-1">{icon}</span>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Empty Stage</p>
          </div>
        )}
      </div>
    </div>
  );
}
