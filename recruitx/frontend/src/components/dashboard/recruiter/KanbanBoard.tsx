"use client";

import React, { useState, useEffect } from "react";
import KanbanColumn from "./KanbanColumn";

interface KanbanBoardProps {
  kanbanCards: any[];
  setKanbanCards: React.Dispatch<React.SetStateAction<any[]>>;
  triggeringAgentId: string | null;
  setTriggeringAgentId: (id: string | null) => void;
  isSubmitting: Record<string, boolean>;
  setIsSubmitting: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  takeoverText: Record<string, string>;
  setTakeoverText: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onCardClick: (card: any) => void;
  onStartAgent: (cardId: string) => void;
  onToggleTakeover: (cardId: string) => void;
  onSendCustomMessage: (cardId: string) => void;
  colTheme: Record<string, { border: string; bg: string; text: string; accent: string; indicator: string }>;
  columnTitles: { id: string; title: string; icon: string }[];
}

export default function KanbanBoard({
  kanbanCards,
  setKanbanCards,
  triggeringAgentId,
  setTriggeringAgentId,
  isSubmitting,
  setIsSubmitting,
  takeoverText,
  setTakeoverText,
  onCardClick,
  onStartAgent,
  onToggleTakeover,
  onSendCustomMessage,
  colTheme,
  columnTitles,
}: KanbanBoardProps) {
  const [draggedOverCol, setDraggedOverCol] = useState<string | null>(null);

  // Stage 2: WebSockets pipeline sync for active non-mock cards
  useEffect(() => {
    const activeRealCards = kanbanCards.filter(c => c.id && !String(c.id).startsWith("kb-"));
    const sockets: Record<string, WebSocket> = {};

    activeRealCards.forEach(card => {
      try {
        const protocol = window.location.protocol === "https:" ? "wss" : "ws";
        const apiHost = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000")
          .replace(/^https?:\/\//, "");
        const wsUrl = `${protocol}://${apiHost}/ws/negotiation/${card.id}`;
        
        const ws = new WebSocket(wsUrl);
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Check for status broadcast or normal messages
            if (data.sender_role) {
              setKanbanCards(prev => prev.map(c => {
                if (c.id === card.id) {
                  let updatedStatus = c.status;
                  
                  // Check if it's a transition or normal system note
                  if (data.type === "STATUS_TRANSITION") {
                    updatedStatus = data.status;
                  } else if (data.sender_role === "system") {
                    const text = String(data.content).toLowerCase();
                    if (text.includes("successful") || text.includes("scheduled") || text.includes("agreed")) {
                      updatedStatus = "scheduled";
                    } else if (text.includes("completed") || text.includes("impasse") || text.includes("terminated")) {
                      updatedStatus = "rejected";
                    }
                  }

                  const isPaused = data.sender_role === "system" && String(data.content).includes("paused");
                  const isResumed = data.sender_role === "system" && String(data.content).includes("resumed");
                  
                  return {
                    ...c,
                    status: updatedStatus,
                    is_paused: isPaused ? true : isResumed ? false : c.is_paused,
                    last_message: data.content || c.last_message
                  };
                }
                return c;
              }));
            }
          } catch (e) {
            console.error("WebSocket message parse error", e);
          }
        };

        sockets[card.id] = ws;
      } catch (err) {
        console.error("Error establishing WebSocket connection", err);
      }
    });

    return () => {
      Object.values(sockets).forEach(ws => {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      });
    };
  }, [kanbanCards.map(c => c.id).join(",")]);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    e.dataTransfer.setData("text/plain", cardId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    if (draggedOverCol !== colId) {
      setDraggedOverCol(colId);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    setDraggedOverCol(null);
    const cardId = e.dataTransfer.getData("text/plain");
    
    // Find the card being dragged
    const cardIndex = kanbanCards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;
    const card = kanbanCards[cardIndex];
    if (card.status === targetColId) return;

    // Optimistically update the UI status for slick real-time response
    const updatedCards = [...kanbanCards];
    updatedCards[cardIndex] = { ...card, status: targetColId };
    setKanbanCards(updatedCards);

    // Save status change to backend if it's a real card
    const isMock = String(cardId).startsWith("kb-");
    if (!isMock) {
      let mappedStatus: "active" | "matched" | "scheduled" | "completed" | "rejected" = "active";
      if (targetColId === "scheduled") mappedStatus = "scheduled";
      else if (targetColId === "matched") mappedStatus = "matched";
      else if (targetColId === "rejected") mappedStatus = "rejected";
      
      try {
        const { updateNegotiationStatus } = await import("@/lib/api");
        await updateNegotiationStatus(cardId, mappedStatus);
      } catch (err) {
        console.error("Failed to update status in DB:", err);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Premium Board Header / Tips & Legend bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-50 border border-slate-200/80 rounded-xl px-5 py-3 shadow-sm">
        <div className="flex items-center gap-1.5 text-slate-500 font-medium">
          <span className="text-sm">💡</span>
          <p>Drag & drop cards to progress candidates through stages in real-time.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-slate-500 font-semibold">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-400" /> Sourcing</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" /> Negotiating</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-purple-500" /> Scheduled</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Selected</span>
        </div>
      </div>

      {/* Board Deck */}
      <div className="flex flex-col md:grid md:grid-cols-5 gap-5 overflow-x-auto pb-4 pt-1 select-none">
        {columnTitles.map((col) => {
          const cardsInCol = kanbanCards.filter(c => c.status === col.id);
          
          return (
            <KanbanColumn
              key={col.id}
              colId={col.id}
              title={col.title}
              icon={col.icon}
              cards={cardsInCol}
              colTheme={colTheme}
              draggedOverCol={draggedOverCol}
              triggeringAgentId={triggeringAgentId}
              isSubmitting={isSubmitting}
              takeoverText={takeoverText}
              setTakeoverText={setTakeoverText}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragStart={handleDragStart}
              onCardClick={onCardClick}
              onStartAgent={onStartAgent}
              onToggleTakeover={onToggleTakeover}
              onSendCustomMessage={onSendCustomMessage}
            />
          );
        })}
      </div>
    </div>
  );
}
