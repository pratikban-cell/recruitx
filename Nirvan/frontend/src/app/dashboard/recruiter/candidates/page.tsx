"use client";

import { createClient } from "@/lib/supabase-client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { mockKanbanData } from "@/lib/mock-data";
import {
  getTalentPool,
  initiateNegotiation,
  pauseNegotiation,
  resumeNegotiation,
  runNegotiation,
  steerNegotiation,
} from "@/lib/api";

import KanbanBoard from "@/components/dashboard/recruiter/KanbanBoard";
import PlaybackDrawer from "@/components/dashboard/recruiter/PlaybackDrawer";

type Negotiation = {
  id: string;
  status: string;
  fit_score: number | null;
  created_at: string;
  recruiter_notes?: string | null;
  candidate_notes?: string | null;
  candidate: { title: string; skills: string[]; salary_min: number }[] | null;
};

type CandidateProfile = {
  id: string;
  name: string;
  title: string | null;
  skills: string[];
  salary_min: number | null;
  remote_pref: boolean;
  bio: string;
  email: string;
};

// Colors matching columns in premium design system
const colTheme: Record<
  string,
  {
    border: string;
    bg: string;
    text: string;
    accent: string;
    indicator: string;
  }
> = {
  sourcing: {
    border: "border-t-slate-400 border-l-slate-400/40",
    bg: "bg-slate-50/60",
    text: "text-slate-700",
    accent: "bg-slate-100 text-slate-800 border-slate-200",
    indicator: "bg-slate-400",
  },
  active: {
    border: "border-t-blue-500 border-l-blue-500/40",
    bg: "bg-blue-50/30",
    text: "text-blue-700",
    accent: "bg-blue-50 text-blue-700 border-blue-100",
    indicator: "bg-blue-505", // Keeping the exact reference styles matching previous HSL definitions
  },
  scheduled: {
    border: "border-t-purple-500 border-l-purple-500/40",
    bg: "bg-purple-50/30",
    text: "text-purple-700",
    accent: "bg-purple-50 text-purple-700 border-purple-100",
    indicator: "bg-purple-500",
  },
  matched: {
    border: "border-t-emerald-500 border-l-emerald-500/40",
    bg: "bg-emerald-50/30",
    text: "text-emerald-700",
    accent: "bg-emerald-50 text-emerald-700 border-emerald-100",
    indicator: "bg-emerald-500",
  },
  rejected: {
    border: "border-t-neutral-500 border-l-neutral-400/40",
    bg: "bg-neutral-50/60",
    text: "text-neutral-700",
    accent: "bg-neutral-100 text-neutral-800 border-neutral-200",
    indicator: "bg-neutral-500",
  },
};

const columnTitles = [
  { id: "sourcing", title: "Sourcing (Matched)", icon: "📂" },
  { id: "active", title: "Active Negotiation", icon: "💬" },
  { id: "scheduled", title: "Interview Scheduled", icon: "📅" },
  { id: "matched", title: "Selected & Hired", icon: "🎉" },
  { id: "rejected", title: "Process Completed", icon: "🏁" },
];

export default function RecruiterCandidates() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pipeline" | "search">("pipeline");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");

  // Pipeline state
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [recruiterId, setRecruiterId] = useState<string>("");
  const [kanbanCards, setKanbanCards] = useState<any[]>([]);

  // Search state
  const [talent, setTalent] = useState<CandidateProfile[]>([]);
  const [searchTitle, setSearchTitle] = useState("");
  const [searchSkills, setSearchSkills] = useState("");
  const [searchSalaryMax, setSearchSalaryMax] = useState("");
  const [searchRemoteOnly, setSearchRemoteOnly] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [initiatingId, setInitiatingId] = useState<string | null>(null);

  // Interaction UI states
  const [takeoverText, setTakeoverText] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<Record<string, boolean>>({});
  const [triggeringAgentId, setTriggeringAgentId] = useState<string | null>(
    null,
  );

  // A2A Playback Drawer states
  const [selectedCardForDrawer, setSelectedCardForDrawer] = useState<
    any | null
  >(null);
  const [drawerTab, setDrawerTab] = useState<"playback" | "insights" | "brief" | "kit">(
    "playback",
  );
  const [drawerMessages, setDrawerMessages] = useState<any[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [isSteering, setIsSteering] = useState(false);

  const loadPipeline = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }

      const { data: recruiter } = await supabase
        .from("recruiters")
        .select("id, company")
        .eq("profile_id", user.id)
        .single();
      let dbNegos: any[] = [];
      if (recruiter) {
        setRecruiterId(recruiter.id);
        const { data: negoData } = await supabase
          .from("negotiations")
          .select(
            `
            id,
            status,
            fit_score,
            created_at,
            recruiter_notes,
            candidate_notes,
            candidate:candidates(
              id,
              title,
              skills,
              salary_min,
              profile:profiles(name)
            )
          `,
          )
          .eq("recruiter_id", recruiter.id)
          .order("created_at", { ascending: false });
        if (negoData) {
          dbNegos = negoData;
          setNegotiations(negoData);
        }
      }

      const merged: any[] = [];

      // Add all active negotiations from Supabase to the Kanban board
      dbNegos.forEach((n: any) => {
        const cand = Array.isArray(n.candidate) ? n.candidate[0] : n.candidate;
        if (!cand) return;

        const dbName = cand.profile?.name || "Candidate";
        
        let stage = "active";
        const status = n.status;
        const rNotes = n.recruiter_notes || "";
        const cNotes = n.candidate_notes || "";

        if (status === "active") {
          if (
            rNotes.toLowerCase().includes("sourcing") ||
            cNotes.toLowerCase().includes("sourcing")
          ) {
            stage = "sourcing";
          } else {
            stage = "active";
          }
        } else if (status === "scheduled") {
          stage = "scheduled";
        } else if (status === "matched") {
          stage = "matched";
        } else if (status === "completed" || status === "rejected") {
          stage = "rejected";
        }

        const isPaused =
          rNotes.toLowerCase().includes("paused") ||
          cNotes.toLowerCase().includes("paused");

        let meetingTime = null;
        if (cNotes && cNotes.includes("|")) {
          meetingTime = cNotes.split("|")[1];
        }

        merged.push({
          id: n.id,
          candidate_name: dbName,
          title: cand.title || "Software Engineer",
          company: recruiter?.company || "Partner",
          fit_score: n.fit_score !== null ? n.fit_score : 80,
          status: stage,
          is_paused: isPaused,
          skills: cand.skills || [],
          created_at: n.created_at,
          meeting_time: meetingTime,
          dbRecord: n,
        });
      });

      setKanbanCards(merged);
    } catch (err) {
      console.error("Error loading pipeline:", err);
      setKanbanCards([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadPipeline();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);



  useEffect(() => {
    if (!selectedCardForDrawer) return;

    const fetchDrawerMessages = async () => {
      setDrawerLoading(true);
      const isMock = String(selectedCardForDrawer.id).startsWith("kb-");
      if (isMock) {
        // Load mock dialogue based on the candidate name
        const name = String(selectedCardForDrawer.candidate_name).toLowerCase();
        let msgs = [];
        if (name === "luffy") {
          msgs = [
            {
              sender_role: "system",
              content:
                "Negotiation started: candidate Luffy matched with TechCorp.",
            },
            {
              sender_role: "recruiter",
              content:
                "Hi Luffy! Excited about your DevOps background with Docker and Linux. We're looking for an intern. Our standard budget is $20/hr. How does that align?",
            },
            {
              sender_role: "candidate",
              content:
                "Hi there! I love shipping code fast! I've been building CI/CD pipelines in my projects. The $20/hr works for me, but is there any flexibility for extra learning resources or mentoring?",
            },
            {
              sender_role: "recruiter",
              content:
                "Absolutely. We pair every intern with a Senior DevOps Engineer and provide a $1,000 learning budget. We can formalize that!",
            },
            {
              sender_role: "candidate",
              content: "Awesome, that sounds perfect! Let's lock it in!",
            },
            {
              sender_role: "system",
              content:
                "Negotiation successful: core requirements aligned. Candidate and Recruiter agents have marked this as scheduled.",
            },
          ];
        } else if (name === "sanji") {
          msgs = [
            {
              sender_role: "system",
              content:
                "Negotiation started: candidate Sanji matched with Logpoint.",
            },
            {
              sender_role: "recruiter",
              content:
                "Hi Sanji, Thank you for considering the AI Fellow position at Logpoint. We've reviewed your ML background. We see your Python and PyTorch skills. Can you share salary expectations?",
            },
            {
              sender_role: "candidate",
              content:
                "Hi, thanks for reaching out! Given my practical experience with PyTorch and NLP applications, I'm targeting a range of $90,000 to $105,000.",
            },
            {
              sender_role: "recruiter",
              content:
                "Our target standard salary maximum is $85,000 for this fellow role. However, we do have some flexibility up to $95,000 for exceptional candidates.",
            },
            {
              sender_role: "candidate",
              content:
                "I understand. If we can agree on $95,000 with a hybrid remote policy, I'd be very happy to move forward.",
            },
            {
              sender_role: "recruiter",
              content:
                "That's feasible. Let me confirm terms and set up our interview. [AGREED]",
            },
          ];
        } else if (name === "zoro") {
          msgs = [
            {
              sender_role: "system",
              content:
                "Negotiation started: candidate Zoro matched with TechCorp.",
            },
            {
              sender_role: "recruiter",
              content:
                "Hi Zoro, we are hiring for a Backend position at TechCorp. Budget: $100k - $120k. We require strong Go and gRPC expertise. What are your thoughts?",
            },
            {
              sender_role: "candidate",
              content:
                "Hello. I have deep Go and gRPC experience. I build high-throughput microservices. I'm looking for a minimum of $115k and hybrid flexibility.",
            },
            {
              sender_role: "recruiter",
              content:
                "That fits our budget parameters. We can offer $118k with 2 days remote. This seems like a perfect match.",
            },
            {
              sender_role: "candidate",
              content: "Agreed. Let's schedule the next steps.",
            },
            {
              sender_role: "system",
              content:
                "Negotiation successful: core requirements aligned. Candidate and Recruiter agents have scheduled an interview for Friday, May 22 at 02:00 PM UTC.",
            },
          ];
        } else if (name === "nami") {
          msgs = [
            {
              sender_role: "system",
              content:
                "Negotiation started: candidate Nami matched with WebFlow.",
            },
            {
              sender_role: "recruiter",
              content:
                "Hi Nami, we'd love to chat about the Frontend Intern role. We standardly offer $12,000. Let's align.",
            },
            {
              sender_role: "candidate",
              content:
                "Hi! I have built several projects using React and Tailwind. Given the cost of living, I was hoping for $15,000.",
            },
            {
              sender_role: "recruiter",
              content:
                "We can offer $14,000. We also provide full healthcare coverage for all interns, which is a rare perk.",
            },
            {
              sender_role: "candidate",
              content:
                "That healthcare perk is fantastic! $14,000 with healthcare works beautifully for me.",
            },
            { sender_role: "recruiter", content: "Perfect! [AGREED]" },
          ];
        } else {
          msgs = [
            {
              sender_role: "system",
              content: "Negotiation active: A2A agents matches ongoing.",
            },
            {
              sender_role: "recruiter",
              content:
                "Hello candidate! Let's align on standard requirements and salary ranges.",
            },
            {
              sender_role: "candidate",
              content:
                "Hello! I am excited to discuss details. Here is my current skillset and base salary floor expectation.",
            },
          ];
        }
        setDrawerMessages(msgs);
      } else {
        // Fetch real messages from Supabase
        const { data } = await supabase
          .from("messages")
          .select("*")
          .eq("negotiation_id", selectedCardForDrawer.id)
          .order("created_at", { ascending: true });
        if (data) {
          setDrawerMessages(data);
        } else {
          setDrawerMessages([]);
        }
      }
      setDrawerLoading(false);
    };

    fetchDrawerMessages();
  }, [selectedCardForDrawer]);

  const fetchTalent = async () => {
    setSearchLoading(true);
    try {
      const res = await getTalentPool({
        title: searchTitle || undefined,
        skills: searchSkills || undefined,
        salaryMax: searchSalaryMax ? parseInt(searchSalaryMax) : undefined,
        remote: searchRemoteOnly ? "true" : undefined,
      });
      if (res && res.talent) {
        setTalent(res.talent);
      }
    } catch (err) {
      console.error("Failed to query talent pool:", err);
    }
    setSearchLoading(false);
  };

  useEffect(() => {
    if (activeTab !== "search") return;

    const timer = window.setTimeout(() => {
      fetchTalent();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [activeTab]);

  const handleInitiate = async (candidateId: string) => {
    if (!recruiterId) {
      alert(
        "Please activate your recruiter agent profile first in settings to configure budget rules.",
      );
      return;
    }
    setInitiatingId(candidateId);
    try {
      const res = await initiateNegotiation(recruiterId, candidateId);
      if (res && res.negotiation_id) {
        router.push(`/negotiations/${res.negotiation_id}`);
      } else {
        alert(
          "Failed to initiate match negotiation: " +
            (res?.detail || "Unknown error"),
        );
      }
    } catch (err) {
      console.error(err);
      alert("Failed to connect to negotiation backend.");
    }
    setInitiatingId(null);
  };

  const handleStartAgent = async (cardId: string) => {
    setTriggeringAgentId(cardId);

    // Optimistic UI updates
    const cardIndex = kanbanCards.findIndex((c) => c.id === cardId);
    if (cardIndex !== -1) {
      const card = kanbanCards[cardIndex];
      const updated = [...kanbanCards];
      updated[cardIndex] = {
        ...card,
        status: "active",
        action_label: "Manual Takeover",
      };
      setKanbanCards(updated);
    }

    const isMock = String(cardId).startsWith("kb-");
    if (!isMock) {
      try {
        await supabase
          .from("negotiations")
          .update({
            recruiter_notes: "Active dialogue ongoing",
            status: "active",
          })
          .eq("id", cardId);

        await runNegotiation(cardId);
      } catch (err) {
        console.error("Failed to trigger agent on backend:", err);
      }
    }

    setTimeout(() => {
      setTriggeringAgentId(null);
    }, 1500);
  };

  const handleToggleTakeover = async (cardId: string) => {
    const cardIndex = kanbanCards.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) return;
    const card = kanbanCards[cardIndex];
    const newPausedState = !card.is_paused;

    // Optimistic UI Update
    const updated = [...kanbanCards];
    updated[cardIndex] = { ...card, is_paused: newPausedState };
    setKanbanCards(updated);

    const isMock = String(cardId).startsWith("kb-");
    if (!isMock) {
      try {
        if (newPausedState) {
          await pauseNegotiation(cardId, "recruiter");
        } else {
          await resumeNegotiation(cardId);
        }
      } catch (err) {
        console.error("Failed to execute pause/resume in DB:", err);
      }
    }
  };

  const handleSendCustomMessage = async (cardId: string) => {
    const text = takeoverText[cardId]?.trim();
    if (!text) return;

    setIsSubmitting((prev) => ({ ...prev, [cardId]: true }));

    const isMock = String(cardId).startsWith("kb-");
    if (!isMock) {
      try {
        await supabase.from("messages").insert({
          negotiation_id: cardId,
          sender_role: "recruiter",
          content: text,
        });

        await resumeNegotiation(cardId);
      } catch (err) {
        console.error("Failed to post custom message & resume:", err);
      }
    }

    // Update UI status smoothly
    const cardIndex = kanbanCards.findIndex((c) => c.id === cardId);
    if (cardIndex !== -1) {
      const card = kanbanCards[cardIndex];
      const updated = [...kanbanCards];
      updated[cardIndex] = {
        ...card,
        is_paused: false,
        last_message: "Just now",
      };
      setKanbanCards(updated);
    }

    setTakeoverText((prev) => ({ ...prev, [cardId]: "" }));
    setIsSubmitting((prev) => ({ ...prev, [cardId]: false }));
  };

  // Co-Pilot Mid-Negotiation Steering Logic
  const handleSteerAgent = async (instruction: string) => {
    if (!selectedCardForDrawer) return;

    setIsSteering(true);
    const isMock = String(selectedCardForDrawer.id).startsWith("kb-");

    if (isMock) {
      // For mock, simply simulate a response in transcript after a second
      setTimeout(() => {
        setDrawerMessages((prev) => [
          ...prev,
          {
            sender_role: "system",
            content: `Steering command injected: "${instruction}"`,
          },
          {
            sender_role: "recruiter",
            content: `Aligning negotiation terms on: ${instruction}`,
          },
        ]);
        setIsSteering(false);
      }, 1000);
      return;
    }

    try {
      await steerNegotiation(selectedCardForDrawer.id, instruction);

      // Re-trigger the active negotiation loop with the new steer parameters
      await runNegotiation(selectedCardForDrawer.id);

      // Poll messages after a small delay to see the updated turn
      setTimeout(async () => {
        const { data } = await supabase
          .from("messages")
          .select("*")
          .eq("negotiation_id", selectedCardForDrawer.id)
          .order("created_at", { ascending: true });
        if (data) {
          setDrawerMessages(data);
        }
      }, 2000);
    } catch (err) {
      console.error("Failed to steer agent:", err);
    }
    setIsSteering(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Premium Title bar & Segmented View switchers */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-card-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Talent & Pipeline
            <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent animate-pulse-subtle">
              AI Connected
            </span>
          </h1>
          <p className="text-sm text-muted">
            Manage active negotiations or source qualified candidates on the
            platform.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          {activeTab === "pipeline" && (
            <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/50 shadow-sm">
              <button
                onClick={() => setViewMode("kanban")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  viewMode === "kanban"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Kanban Board
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  viewMode === "list"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Pipeline List
              </button>
            </div>
          )}

          <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/50 shadow-sm">
            <button
              onClick={() => setActiveTab("pipeline")}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "pipeline"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Active Pipeline ({kanbanCards.length})
            </button>
            <button
              onClick={() => setActiveTab("search")}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "search"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Find Talent
            </button>
          </div>
        </div>
      </div>

      {activeTab === "pipeline" ? (
        viewMode === "kanban" ? (
          /* Decoupled Kanban Board component */
          <KanbanBoard
            kanbanCards={kanbanCards}
            setKanbanCards={setKanbanCards}
            triggeringAgentId={triggeringAgentId}
            setTriggeringAgentId={setTriggeringAgentId}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
            takeoverText={takeoverText}
            setTakeoverText={setTakeoverText}
            onCardClick={setSelectedCardForDrawer}
            onStartAgent={handleStartAgent}
            onToggleTakeover={handleToggleTakeover}
            onSendCustomMessage={handleSendCustomMessage}
            colTheme={colTheme}
            columnTitles={columnTitles}
          />
        ) : (
          /* --- EXISTING LIST VIEW AS FALLBACK VIEW --- */
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted">
                {negotiations.length} candidates in pipeline
              </p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <div className="h-2 w-2 rounded-full bg-blue-500" /> Active
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <div className="h-2 w-2 rounded-full bg-green-500" /> Match
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <div className="h-2 w-2 rounded-full bg-purple-500" />{" "}
                  Interview
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {negotiations.map((n) => {
                const candidate = Array.isArray(n.candidate)
                  ? n.candidate[0]
                  : n.candidate;
                const statusColor: Record<string, string> = {
                  active: "border-l-blue-500 bg-blue-50/40",
                  matched: "border-l-green-500 bg-green-50/40",
                  scheduled: "border-l-purple-500 bg-purple-50/40",
                  completed: "border-l-gray-400 bg-gray-50/40",
                  rejected: "border-l-red-500 bg-red-50/40",
                };
                const statusLabel: Record<string, string> = {
                  active: "Negotiating",
                  matched: "Match Found",
                  scheduled: "Interview Set",
                  completed: "Done",
                  rejected: "Passed",
                };

                return (
                  <Link
                    key={n.id}
                    href={`/negotiations/${n.id}`}
                    className={`group rounded-xl border border-card-border bg-white shadow-sm hover:shadow-md transition-all border-l-4 ${
                      statusColor[n.status] || "border-l-gray-300"
                    }`}
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 text-lg font-bold text-accent">
                            {candidate?.title?.[0] || "?"}
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors">
                              {candidate?.title || "Candidate"}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              {candidate?.skills
                                ?.slice(0, 3)
                                .map((s: string) => (
                                  <span
                                    key={s}
                                    className="rounded-full bg-accent/5 px-2 py-0.5 text-[10px] font-medium text-accent"
                                  >
                                    {s}
                                  </span>
                                ))}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${
                            n.status === "active"
                              ? "bg-blue-50 text-blue-600"
                              : n.status === "matched"
                                ? "bg-green-50 text-green-600"
                                : n.status === "scheduled"
                                  ? "bg-purple-50 text-purple-600"
                                  : "bg-gray-50 text-gray-600"
                          }`}
                        >
                          {statusLabel[n.status] || n.status}
                        </span>
                      </div>

                      {n.fit_score && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted">Fit score</span>
                            <span className="font-semibold text-foreground">
                              {n.fit_score}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-accent to-accent/60 transition-all"
                              style={{ width: `${n.fit_score}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {candidate?.salary_min && (
                        <p className="text-xs text-muted">
                          Min salary: ${candidate.salary_min.toLocaleString()}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-muted/60">
                          {new Date(n.created_at).toLocaleDateString()}
                        </span>
                        <span className="text-xs font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                          Open chat &rarr;
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )
      ) : (
        /* --- ADVANCED SEARCH FILTER PANEL & SOURCE TALENT TAB --- */
        <>
          <div className="rounded-xl border border-card-border bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Search Parameters
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Job Title keyword
                </label>
                <input
                  type="text"
                  value={searchTitle}
                  onChange={(e) => setSearchTitle(e.target.value)}
                  placeholder="e.g. Frontend"
                  className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-xs text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Required Skills (comma separated)
                </label>
                <input
                  type="text"
                  value={searchSkills}
                  onChange={(e) => setSearchSkills(e.target.value)}
                  placeholder="e.g. React, Go"
                  className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-xs text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Max Salary floor ($)
                </label>
                <input
                  type="number"
                  value={searchSalaryMax}
                  onChange={(e) => setSearchSalaryMax(e.target.value)}
                  placeholder="e.g. 140000"
                  className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-xs text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="searchRemote"
                  checked={searchRemoteOnly}
                  onChange={(e) => setSearchRemoteOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-card-border text-accent focus:ring-accent/20"
                />
                <label
                  htmlFor="searchRemote"
                  className="text-xs text-foreground"
                >
                  Prefer Remote Only
                </label>
              </div>
              <button
                onClick={fetchTalent}
                disabled={searchLoading}
                className="rounded-lg bg-accent px-5 py-2 text-xs font-semibold text-white hover:bg-accent/90 disabled:opacity-50 transition-all shadow-sm"
              >
                {searchLoading ? "Searching..." : "Apply Filters"}
              </button>
            </div>
          </div>

          {/* Sourced Talent List */}
          {searchLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
          ) : talent.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-card-border rounded-xl bg-white p-6">
              <p className="text-sm text-muted">
                No candidate agents match your search criteria.
              </p>
              <p className="text-xs text-muted/60 mt-1">
                Try relaxing filters or search for all available talent.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {talent.map((t) => (
                <div
                  key={t.id}
                  className="rounded-xl border border-card-border bg-white p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-shadow"
                >
                  <div className="space-y-2 max-w-xl">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/5 text-sm font-bold text-accent">
                        {t.name?.[0] || "?"}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {t.name || "Anonymous Candidate"}
                        </h3>
                        <p className="text-xs font-medium text-accent">
                          {t.title || "No Title Specified"}
                        </p>
                      </div>
                    </div>
                    {t.bio && (
                      <p className="text-xs text-muted/80 line-clamp-2">
                        {t.bio}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {t.skills.map((s) => (
                        <span
                          key={s}
                          className="rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-medium text-muted"
                        >
                          {s}
                        </span>
                      ))}
                      {t.remote_pref && (
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-[9px] font-medium text-green-600">
                          🏠 Remote
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 sm:text-right self-start sm:self-center">
                    {t.salary_min && (
                      <span className="text-xs font-semibold text-foreground">
                        Salary Floor: ${t.salary_min.toLocaleString()}/yr
                      </span>
                    )}
                    <button
                      onClick={() => handleInitiate(t.id)}
                      disabled={initiatingId !== null}
                      className="rounded-lg bg-foreground px-4 py-2 text-xs font-semibold text-white hover:bg-foreground/90 disabled:opacity-50 transition-all shadow-sm"
                    >
                      {initiatingId === t.id
                        ? "Initiating Loop..."
                        : "Initiate AI Match"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* PlaybackDrawer component */}
      <PlaybackDrawer
        selectedCard={selectedCardForDrawer}
        drawerTab={drawerTab}
        setDrawerTab={setDrawerTab}
        messages={drawerMessages}
        loading={drawerLoading}
        onClose={() => setSelectedCardForDrawer(null)}
        onSteer={handleSteerAgent}
        isSteering={isSteering}
      />
    </div>
  );
}
