"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import SteeringDock from "./SteeringDock";

interface PlaybackDrawerProps {
  selectedCard: any | null;
  drawerTab: "playback" | "insights" | "brief" | "kit";
  setDrawerTab: (tab: "playback" | "insights" | "brief" | "kit") => void;
  messages: any[];
  loading: boolean;
  onClose: () => void;
  onSteer: (instruction: string) => Promise<void>;
  isSteering?: boolean;
}

const mockKits: Record<string, any> = {
  "Zoro": {
    "translation_brief": "Zoro is an elite Systems Architect with deep competency in backend engineering, distributed ledger design, and high-concurrency systems. His agent successfully aligned Go/gRPC requirements and negotiated a base salary of $118k/yr with standard hybrid options. Zoro presents very strong signals for infrastructure scale but is less vocal on product strategy, which aligns with your engineering-heavy requirements.",
    "verified_skills_highlight": [
      { "skill": "Go", "evidence": "Verified 14 active repositories, including a custom high-performance Redis client." },
      { "skill": "gRPC / Protobuf", "evidence": "Demonstrated async Protobuf payload serialization logic in agent negotiation." },
      { "skill": "PostgreSQL", "evidence": "Designed custom connection pooling and partitioning schemes." }
    ],
    "unverified_skills_probe": ["Distributed locking algorithms", "System monitoring & telemetry"],
    "interview_questions": [
      {
        "question": "How do you handle distributed locks in Go using Redis/Redlock? Explain the potential failure cases.",
        "expected_signals": "Mentions lease times, TTL refresh, network partitions, split-brain scenario, or consensus issues.",
        "weak_signals": "Uses simple SETNX without expiring TTL or doesn't know of Redlock limits.",
        "suggested_follow_up": "What happens if a Redis node crashes during lock acquisition?"
      },
      {
        "question": "Design a rate limiter for an API endpoint serving 15,000 requests per second. Which algorithm and database structure would you choose?",
        "expected_signals": "Token bucket, sliding window counter, Redis sorted sets (ZREMRANGEBYSCORE), clustering.",
        "weak_signals": "High-level description without algorithm specifics, lack of consideration for distributed concurrency.",
        "suggested_follow_up": "How would you handle user-specific vs. global IP-based rate limiting?"
      },
      {
        "question": "Describe a scenario where you debugged a concurrency deadlock in Go. What tools did you use?",
        "expected_signals": "go tool pprof, go test -race flag, thread dump analysis, runtime stacktrace checks.",
        "weak_signals": "Vague answers, print statements only, does not mention Go race detector.",
        "suggested_follow_up": "What is the performance overhead of running with -race in staging?"
      }
    ]
  },
  "Sanji": {
    "translation_brief": "Sanji is a high-caliber Machine Learning engineer specializing in Natural Language Processing and Deep Learning models. His agent locked a base salary of $95k/yr under stubborn budget constraints. Scanned repositories confirm production PyTorch work and transformers integration. Excellent communication style, but requires direct vetting on large-scale distributed training clusters.",
    "verified_skills_highlight": [
      { "skill": "Python / PyTorch", "evidence": "Scanned 8 open-source repositories featuring transformer pipeline fine-tuning." },
      { "skill": "NLP / Transformers", "evidence": "Implemented Hugging Face model deployment on custom endpoints." },
      { "skill": "Model Optimization", "evidence": "Fine-tuned models reducing inference latency by 35%." }
    ],
    "unverified_skills_probe": ["Kubeflow / Model orchestration", "Data parallel training"],
    "interview_questions": [
      {
        "question": "How do you optimize Transformer model training across multiple GPUs using PyTorch DDP?",
        "expected_signals": "DistributedDataParallel vs DataParallel, gradient accumulation, mixed-precision (AMP).",
        "weak_signals": "Refers only to basic DataParallel, doesn't mention communication bottlenecks.",
        "suggested_follow_up": "What is the difference between model parallelism and data parallelism?"
      },
      {
        "question": "Explain how you would handle vanishing/exploding gradients during deep network backpropagation.",
        "expected_signals": "Gradient clipping, weight initialization (He/Xavier), residual connections, layer normalization.",
        "weak_signals": "Suggests only lowering the learning rate without structural solutions.",
        "suggested_follow_up": "How does LayerNorm differ from BatchNorm in this context?"
      },
      {
        "question": "How do you evaluate and verify that a fine-tuned LLM is not hallucinating or regression-tested?",
        "expected_signals": "RAG evaluation (RAGAS), BLEU/ROUGE validation, human evaluation, model output temperature control.",
        "weak_signals": "Simply checks outputs manually for a few examples.",
        "suggested_follow_up": "What metric would you use to measure factual correctness?"
      }
    ]
  },
  "Luffy": {
    "translation_brief": "Luffy is a highly adaptable Fullstack Developer with exceptional technical generalist traits. He excels at startup velocity, rapid Docker packaging, and CI/CD automation pipelines. He agreed to base salary caps while prioritizing learning budgets. Luffy requires technical vetting on databases, database locks, and transactions under load.",
    "verified_skills_highlight": [
      { "skill": "Docker", "evidence": "Configured multi-stage builds and minimal image layers." },
      { "skill": "CI/CD", "evidence": "Wrote GitHub Actions automations triggering auto-tests on merge." },
      { "skill": "React / Frontend", "evidence": "Scanned 5 responsive dashboards featuring fast UI rendering." }
    ],
    "unverified_skills_probe": ["PostgreSQL ACID transactions", "Web security / OWASP top 10"],
    "interview_questions": [
      {
        "question": "Explain database transaction isolation levels (specifically Read Committed vs. Serializable) and how they affect concurrency.",
        "expected_signals": "Dirty reads, non-repeatable reads, phantom reads, MVCC implementation.",
        "weak_signals": "Doesn't know what isolation levels do or refers only to basic locking.",
        "suggested_follow_up": "What is a serialization anomaly and how does PostgreSQL prevent it?"
      },
      {
        "question": "How do you secure a Next.js application against Cross-Site Scripting (XSS) and CSRF attacks?",
        "expected_signals": "Content Security Policy (CSP), HTTPOnly cookies, CSRF tokens, sanitization.",
        "weak_signals": "Fails to mention HTTPOnly cookies or relies purely on framework defaults.",
        "suggested_follow_up": "How does Next.js handle inputs automatically to prevent XSS?"
      },
      {
        "question": "What is your approach to optimizing slow React renders and bundle sizes?",
        "expected_signals": "useMemo, useCallback, dynamic imports (next/dynamic), code-splitting, tree-shaking.",
        "weak_signals": "Suggests only upgrading RAM or server hosting bandwidth.",
        "suggested_follow_up": "How would you diagnose a memory leak in a React client?"
      }
    ]
  },
  "Nami": {
    "translation_brief": "Nami is a promising Frontend Intern with strong design sensibilities and hands-on React/Tailwind experience. Her agent negotiated a $14,000 package for the WebFlow internship, successfully aligning on compensation expectations. Nami displays good fundamentals in component structure, but requires direct validation on global state management and web accessibility standard practices.",
    "verified_skills_highlight": [
      { "skill": "React", "evidence": "Verified 5 personal and class projects utilizing functional components and hooks." },
      { "skill": "CSS & Tailwind", "evidence": "Designed several pixel-perfect, fully responsive landing pages." }
    ],
    "unverified_skills_probe": ["State Management (Zustand/Redux)", "Web accessibility (a11y) standards"],
    "interview_questions": [
      {
        "question": "How do you manage global state in a complex React application? When would you choose a lightweight store like Zustand over Redux?",
        "expected_signals": "Mentions store simplicity, boilerplate reduction, state subscription outside React, or devtools comparison.",
        "weak_signals": "Doesn't understand what state management is or suggests local useState for everything.",
        "suggested_follow_up": "How do you avoid unnecessary re-renders in Zustand?"
      },
      {
        "question": "Describe your workflow for ensuring a web application is accessible and responsive across mobile devices.",
        "expected_signals": "Mobile-first design, media queries, flexbox/grid, viewport units, semantic HTML, ARIA labels.",
        "weak_signals": "Hardcodes absolute pixels (px) or only designs for standard desktop widths.",
        "suggested_follow_up": "How do you test your designs for keyboard navigation?"
      }
    ]
  },
  "Usopp": {
    "translation_brief": "Usopp is a junior QA Tester focusing on automated end-to-end testing frameworks. While he claims proficiency in testing complex application flows, his agent was rejected during negotiation due to a poor fit score and weak alignment on modern CI/CD automation and load testing frameworks.",
    "verified_skills_highlight": [
      { "skill": "Selenium", "evidence": "Scanned 2 test suites using basic Selenium WebDriver." },
      { "skill": "Jest", "evidence": "Wrote unit tests for simple utility packages." }
    ],
    "unverified_skills_probe": ["CI/CD Pipeline Integration", "Performance & Load Testing"],
    "interview_questions": [
      {
        "question": "How do you integrate automated E2E tests into a GitHub Actions CI/CD pipeline?",
        "expected_signals": "Mentions workflow triggers, headless browser execution, node_modules caching, and test report artifacts.",
        "weak_signals": "Only runs tests locally, doesn't understand automation pipeline configurations.",
        "suggested_follow_up": "How do you handle flaky tests in a pipeline?"
      }
    ]
  },
  "Chopper": {
    "translation_brief": "Chopper is a dedicated Data Analyst Intern with solid proficiency in data manipulation and SQL query optimization. His agent initiated active dialogue, aligning on a SQL-heavy stack. He shows strong competency in Pandas and basic modeling but needs vetting on advanced database schemas and ETL pipelines.",
    "verified_skills_highlight": [
      { "skill": "Python / Pandas", "evidence": "Analyzed and cleaned 3 large public datasets using Jupyter Notebooks." },
      { "skill": "SQL", "evidence": "Wrote complex joins and aggregate queries in post-class exercises." }
    ],
    "unverified_skills_probe": ["ETL pipeline structures", "Database indexing & schema optimization"],
    "interview_questions": [
      {
        "question": "How do you optimize a slow-running SQL query that involves multiple tables?",
        "expected_signals": "Mentions EXPLAIN ANALYZE, database indexing, avoiding SELECT *, and query partitioning.",
        "weak_signals": "Suggests only rewriting code or restarting the DB server.",
        "suggested_follow_up": "What is the difference between an index scan and a sequential scan?"
      }
    ]
  }
}

export default function PlaybackDrawer({
  selectedCard,
  drawerTab,
  setDrawerTab,
  messages,
  loading,
  onClose,
  onSteer,
  isSteering = false,
}: PlaybackDrawerProps) {
  const [kitData, setKitData] = useState<any>(null);
  const [loadingKit, setLoadingKit] = useState(false);

  useEffect(() => {
    if (!selectedCard) {
      setKitData(null);
      return;
    }
    
    const isMockCard = String(selectedCard.id).startsWith("kb-");
    if (isMockCard) {
      setKitData(null);
      return;
    }

    const fetchKit = async () => {
      setLoadingKit(true);
      try {
        const { getInterviewKit } = await import("@/lib/api");
        const data = await getInterviewKit(selectedCard.id);
        setKitData(data);
      } catch (err) {
        console.error("Failed to fetch interview kit:", err);
      } finally {
        setLoadingKit(false);
      }
    };
    fetchKit();
  }, [selectedCard?.id]);

  if (!selectedCard) return null;

  const isMock = String(selectedCard.id).startsWith("kb-");
  const candidateName = selectedCard.candidate_name || "";
  const activeKit = isMock ? mockKits[candidateName] || mockKits["Zoro"] : kitData;

  return (
    <>
      {/* Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer Wrapper */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white/95 backdrop-blur-2xl border-l border-slate-200/80 shadow-2xl transition-all duration-500 transform translate-x-0 flex flex-col h-full overflow-hidden animate-slide-in">
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎬</span>
              <h2 className="text-lg font-bold text-slate-800">
                A2A Negotiation Playback
              </h2>
              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent animate-pulse-subtle">
                Live Session
              </span>
            </div>
            <p className="text-xs text-muted">
              Reviewing AI negotiation for{" "}
              <strong className="text-slate-700">
                {selectedCard.candidate_name}
              </strong>{" "}
              &rarr;{" "}
              <span className="text-slate-600">{selectedCard.company}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all shadow-sm focus:outline-none"
          >
            ✕
          </button>
        </div>

        {/* Candidate Card Summary Row in Drawer */}
        <div className="px-6 py-4 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 flex items-center justify-center font-bold text-accent">
              {selectedCard.candidate_name[0]}
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Candidate Agent Fit
              </h4>
              <p className="text-xs text-muted">{selectedCard.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="block text-[10px] uppercase font-bold text-slate-400">
                Fit Score
              </span>
              <span className="text-sm font-black text-accent">
                {selectedCard.fit_score}%
              </span>
            </div>
            <div className="text-right">
              <span className="block text-[10px] uppercase font-bold text-slate-400">
                Status
              </span>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  selectedCard.status === "scheduled"
                    ? "bg-purple-100 text-purple-700 border border-purple-200"
                    : selectedCard.status === "active"
                      ? "bg-blue-100 text-blue-700 border border-blue-200"
                      : selectedCard.status === "matched"
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-700 border border-slate-200"
                }`}
              >
                {selectedCard.status === "scheduled"
                  ? "Interview Scheduled"
                  : selectedCard.status === "active"
                    ? "Active Dialogue"
                    : selectedCard.status === "matched"
                      ? "Selected & Hired"
                      : selectedCard.status === "sourcing"
                        ? "Sourcing Stage"
                        : "Process Finished"}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Selector Inside Drawer */}
        <div className="flex border-b border-slate-100 bg-slate-50/30 p-1 m-4 rounded-xl border gap-1">
          <button
            onClick={() => setDrawerTab("playback")}
            className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
              drawerTab === "playback"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            🎬 Playback
          </button>
          <button
            onClick={() => setDrawerTab("insights")}
            className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
              drawerTab === "insights"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            📊 Insights
          </button>
          <button
            onClick={() => setDrawerTab("brief")}
            className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
              drawerTab === "brief"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            💡 HR Brief
          </button>
          <button
            onClick={() => setDrawerTab("kit")}
            className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
              drawerTab === "kit"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            📋 Interview Kit
          </button>
        </div>

        {/* Drawer Body Area */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0 space-y-6">
          {drawerTab === "playback" && (
            /* Dialogue Tab */
            <div className="space-y-6">
              {selectedCard.status === "active" && (
                <SteeringDock
                  negotiationId={selectedCard.id}
                  candidateName={selectedCard.candidate_name}
                  onSteer={onSteer}
                  isSteering={isSteering}
                />
              )}

              <div className="space-y-4">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left">
                  💬 Agent Dialogue Transcript:
                </span>
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                    <p className="text-xs text-muted">
                      Reading backend agent archives...
                    </p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-20 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <span className="text-2xl">📭</span>
                    <p className="text-xs text-slate-500 font-medium mt-2">
                      No messages stored in pipeline database yet.
                    </p>
                    <p className="text-[10px] text-muted mt-1">
                      Activate the agent to initiate the first conversation.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-4">
                    {messages.map((msg, index) => {
                      const isSystem = msg.sender_role === "system";
                      const isRecruiter = msg.sender_role === "recruiter";

                      if (isSystem) {
                        return (
                          <div
                            key={index}
                            className="flex items-center justify-center my-2"
                          >
                            <span className="text-center text-[10px] md:text-xs text-slate-500/80 bg-slate-100/80 px-3 py-1.5 rounded-full border border-slate-200/50 shadow-sm max-w-[85%] italic">
                              {msg.content}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={index}
                          className={`flex flex-col space-y-1 ${
                            isRecruiter ? "items-end" : "items-start"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 px-1.5">
                            <span className="text-[9px] font-semibold uppercase tracking-wider text-foreground/75">
                              {isRecruiter
                                ? `${selectedCard.company} Agent`
                                : `${selectedCard.candidate_name}'s Agent`}
                            </span>
                            <span className="text-[8px] text-muted/80">
                              {msg.created_at
                                ? new Date(msg.created_at).toLocaleTimeString(
                                    [],
                                    { hour: "2-digit", minute: "2-digit" },
                                  )
                                : "Now"}
                            </span>
                          </div>
 
                          <div
                            className={`p-3 text-xs text-foreground leading-relaxed rounded-2xl max-w-[85%] border transition-all ${
                              isRecruiter
                                ? "bg-subtle border-card-border rounded-tr-none hover:bg-subtle/80"
                                : "bg-card border-card-border rounded-tl-none hover:bg-subtle/20 shadow-sm"
                            }`}
                          >
                            {msg.content.includes("[AGREED]") ||
                            msg.content.includes("agreement reached") ? (
                              <div className="space-y-2">
                                <p>{msg.content.replace("[AGREED]", "")}</p>
                                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                                  🤝 AGREED TERMS LOCKED
                                </span>
                              </div>
                            ) : msg.content.includes("[IMPASSE]") ? (
                              <div className="space-y-2">
                                <p>{msg.content.replace("[IMPASSE]", "")}</p>
                                <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded border border-red-200">
                                  ⚠️ NEGOTIATION IMPASSE
                                </span>
                              </div>
                            ) : (
                              msg.content
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {drawerTab === "insights" && (
            /* Insights Tab */
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 text-left">
                  📊 Fit Logic & Match Weights
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/40 p-3 flex flex-col justify-between text-left">
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                        <span>Dealbreakers</span>
                        <span className="text-slate-600 bg-slate-100 px-1 rounded">30% wt</span>
                      </div>
                      <p className="text-xs font-extrabold text-slate-800 mt-2">Clear Pass</p>
                    </div>
                    <div className="mt-3">
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: "100%" }} />
                      </div>
                      <span className="text-[9px] font-bold text-emerald-600 mt-1 block">100% Score (0 Triggered)</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/40 p-3 flex flex-col justify-between text-left">
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                        <span>Skills Overlap</span>
                        <span className="text-slate-600 bg-slate-100 px-1 rounded">25% wt</span>
                      </div>
                      <p className="text-xs font-extrabold text-slate-800 mt-2">
                        {selectedCard.candidate_name === "Zoro" ? "Strong Tech Match" : "Good Fit"}
                      </p>
                    </div>
                    <div className="mt-3">
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full ${selectedCard.candidate_name === "Zoro" ? "bg-emerald-500" : "bg-amber-500"}`}
                          style={{ width: selectedCard.candidate_name === "Zoro" ? "90%" : "70%" }}
                        />
                      </div>
                      <span className="text-[9px] font-bold text-slate-500 mt-1 block">
                        {selectedCard.candidate_name === "Zoro" ? "90% Score (Go/gRPC)" : "70% Score"}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/40 p-3 flex flex-col justify-between text-left">
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                        <span>Salary Overlap</span>
                        <span className="text-slate-600 bg-slate-100 px-1 rounded">20% wt</span>
                      </div>
                      <p className="text-xs font-extrabold text-slate-800 mt-2">Budget Guardrail</p>
                    </div>
                    <div className="mt-3">
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: "85%" }} />
                      </div>
                      <span className="text-[9px] font-bold text-slate-500 mt-1 block">85% Range Overlap</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-indigo-900 text-white p-4 space-y-2.5 shadow-md text-left">
                <span className="text-[9px] font-extrabold uppercase bg-white/20 px-2 py-0.5 rounded tracking-wider font-semibold">
                  Behind-the-Scenes Math Formulas
                </span>
                <p className="text-xs leading-relaxed text-indigo-100/90 font-mono">
                  FitScore = (Dealbreaker * 0.30) + (SkillsMatch * 0.25) +
                  (SalaryOverlap * 0.20) + (PriorityAlignment * 0.15) +
                  (CultureSignals * 0.10)
                </p>
              </div>
            </div>
          )}

          {drawerTab === "brief" && (
            /* HR Translation Brief Tab */
            <div className="space-y-6 text-left">
              {loadingKit ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                  <p className="text-xs text-muted">Synthesizing translation brief...</p>
                </div>
              ) : !activeKit ? (
                <div className="text-center py-20 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <p className="text-xs text-slate-500 font-medium">Translation brief not available for this stage.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/20 p-5 shadow-sm space-y-3">
                    <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                      💡 HR Executive Translation
                    </h3>
                    <p className="text-xs text-slate-700 leading-relaxed font-semibold">
                      {activeKit.translation_brief}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      ✅ Verified Capabilities (Evidence Sourced)
                    </h3>
                    <div className="grid grid-cols-1 gap-2.5">
                      {activeKit.verified_skills_highlight?.map((item: any, i: number) => (
                        <div key={i} className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm space-y-1">
                          <span className="text-xs font-bold text-foreground block">
                            {item.skill}
                          </span>
                          <span className="text-[11px] text-muted block leading-relaxed">
                            {item.evidence}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {drawerTab === "kit" && (
            /* Technical Interview Kit Tab */
            <div className="space-y-6 text-left">
              {loadingKit ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                  <p className="text-xs text-muted">Generating customized questions...</p>
                </div>
              ) : !activeKit ? (
                <div className="text-center py-20 border border-dashed border-card-border rounded-xl bg-subtle/50">
                  <p className="text-xs text-slate-500 font-medium">Interview kit not available for this stage.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/10 p-5 shadow-sm space-y-2">
                    <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                      🔍 Recommended Probe Areas
                    </h3>
                    <p className="text-[11px] text-slate-600">
                      The agent identified these claimed skills as unverified or requiring direct validation:
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {activeKit.unverified_skills_probe?.map((skill: string, i: number) => (
                        <span key={i} className="text-[10px] bg-amber-100/50 text-amber-800 font-bold px-2 py-0.5 rounded border border-amber-200/50">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-foreground/80 uppercase tracking-wider">
                      📋 Custom Technical Questions
                    </h3>
                    
                    <div className="space-y-4">
                      {activeKit.interview_questions?.map((q: any, i: number) => (
                        <div key={i} className="rounded-xl border border-card-border bg-card p-5 shadow-card space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="h-5 w-5 rounded-full bg-accent/10 text-foreground flex items-center justify-center text-[10px] font-bold shrink-0">
                              {i + 1}
                            </span>
                            <h4 className="text-xs font-bold text-foreground">
                              {q.question}
                            </h4>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                            <div className="rounded-lg bg-green-50/20 border border-green-100 p-3 text-[11px] space-y-1">
                              <span className="font-bold text-green-700 block">🟢 Expected Signals:</span>
                              <span className="text-slate-600 leading-relaxed block">{q.expected_signals}</span>
                            </div>
                            <div className="rounded-lg bg-red-50/20 border border-red-100 p-3 text-[11px] space-y-1">
                              <span className="font-bold text-red-700 block">🔴 Weak Signals / Flags:</span>
                              <span className="text-slate-600 leading-relaxed block">{q.weak_signals}</span>
                            </div>
                          </div>

                          <div className="border-t border-card-border pt-2.5 text-[11px] text-muted flex items-start gap-1.5">
                            <span className="font-semibold text-accent shrink-0">🔎 Probe:</span>
                            <span>{q.suggested_follow_up}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 bg-subtle border-t border-card-border flex items-center justify-between">
          <span className="text-[10px] text-muted font-mono">
            Audit Log SHA-256: f4b8...e9a2
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-card-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-subtle transition-all shadow-sm"
            >
              Close
            </button>
            <Link
              href={isMock ? "#" : `/negotiations/${selectedCard.id}`}
              onClick={onClose}
              className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent/90 transition-all shadow-sm"
            >
              {isMock ? "Unlock Audit Trail" : "Open Full Match Room"}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
