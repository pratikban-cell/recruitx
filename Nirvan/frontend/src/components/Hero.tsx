"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";



interface ChatMessage {
  id: string;
  sender: "candidate" | "recruiter";
  text: string;
  avatar: string;
  senderName: string;
  roleTag: string;
}

const chatMessagesData: ChatMessage[] = [
  {
    id: "msg1",
    sender: "recruiter",
    text: "Hi there! I'm representing Stripe's engineering team. We are looking for a Senior Fullstack Engineer. Roshan's profile shows excellent expertise in Next.js and Tailwind. Is he open to new roles?",
    avatar: "S",
    senderName: "Stripe Agent",
    roleTag: "Stripe Engineering"
  },
  {
    id: "msg2",
    sender: "candidate",
    text: "Hello! Roshan is open to discussions. Let's align on core criteria: He requires 100% remote, a minimum $150k base salary, and a high-trust culture. How does this fit Stripe's budget?",
    avatar: "Ava",
    senderName: "Ava",
    roleTag: "Roshan's Career Agent"
  },
  {
    id: "msg3",
    sender: "recruiter",
    text: "Compensation is fully aligned ($150k - $175k base). The role is 100% remote. Our culture values high autonomy. We'd love to proceed.",
    avatar: "S",
    senderName: "Stripe Agent",
    roleTag: "Stripe Engineering"
  },
  {
    id: "msg4",
    sender: "candidate",
    text: "Great! I've scanned his Google Calendar. He is available next Tuesday at 10:00 AM or Wednesday at 2:00 PM EST. Do either of those work?",
    avatar: "Ava",
    senderName: "Ava",
    roleTag: "Roshan's Career Agent"
  },
  {
    id: "msg5",
    sender: "recruiter",
    text: "Tuesday at 10:00 AM works perfectly. Let's lock it in.",
    avatar: "S",
    senderName: "Stripe Agent",
    roleTag: "Stripe Engineering"
  },
  {
    id: "msg6",
    sender: "candidate",
    text: "Meeting booked with Stripe Tech Lead. Calendar invite and technical dossier have been dispatched.",
    avatar: "Ava",
    senderName: "Ava",
    roleTag: "Roshan's Career Agent"
  }
];

export default function Hero() {
  const [step, setStep] = useState(0);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto scroll chat smoothly inside the container only (preventing page jumps)
  useEffect(() => {
    const container = chatContainerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [step]);

  // Step Timeline Controller
  useEffect(() => {
    let active = true;
    const runSimulation = async () => {
      while (active) {
        // Step 0: Stripe Agent typing
        setStep(0);
        await new Promise((r) => setTimeout(r, 1500));
        if (!active) break;

        // Step 1: Stripe Agent message 1
        setStep(1);
        await new Promise((r) => setTimeout(r, 2000));
        if (!active) break;

        // Step 2: Ava typing
        setStep(2);
        await new Promise((r) => setTimeout(r, 1500));
        if (!active) break;

        // Step 3: Ava message 1
        setStep(3);
        await new Promise((r) => setTimeout(r, 2000));
        if (!active) break;

        // Step 4: Stripe Agent typing 2
        setStep(4);
        await new Promise((r) => setTimeout(r, 1500));
        if (!active) break;

        // Step 5: Stripe Agent message 2
        setStep(5);
        await new Promise((r) => setTimeout(r, 2000));
        if (!active) break;

        // Step 6: Ava typing 2
        setStep(6);
        await new Promise((r) => setTimeout(r, 1500));
        if (!active) break;

        // Step 7: Ava message 2
        setStep(7);
        await new Promise((r) => setTimeout(r, 2000));
        if (!active) break;

        // Step 8: Stripe Agent typing 3
        setStep(8);
        await new Promise((r) => setTimeout(r, 1500));
        if (!active) break;

        // Step 9: Stripe Agent message 3
        setStep(9);
        await new Promise((r) => setTimeout(r, 2000));
        if (!active) break;

        // Step 10: Ava message 3 (Booked)
        setStep(10);
        await new Promise((r) => setTimeout(r, 1500));
        if (!active) break;

        // Step 11: Final booked state
        setStep(11);
        await new Promise((r) => setTimeout(r, 8000)); // Hold completed state for 8s
      }
    };

    runSimulation();
    return () => {
      active = false;
    };
  }, []);

  // Compute states based on step
  const getVisibleMessages = () => {
    const msgs: ChatMessage[] = [];
    if (step >= 1) msgs.push(chatMessagesData[0]);
    if (step >= 3) msgs.push(chatMessagesData[1]);
    if (step >= 5) msgs.push(chatMessagesData[2]);
    if (step >= 7) msgs.push(chatMessagesData[3]);
    if (step >= 9) msgs.push(chatMessagesData[4]);
    if (step >= 10) msgs.push(chatMessagesData[5]);
    return msgs;
  };



  const isRecruiterTyping = step === 0 || step === 4 || step === 8;
  const isCandidateTyping = step === 2 || step === 6;

  // Fit score progression
  let fitScore = 50;
  if (step >= 5 && step < 9) fitScore = 85;
  if (step >= 9) fitScore = 96;

  // Checklist states
  const getChecklistStatus = (item: "git" | "salary" | "location" | "calendar") => {
    if (item === "git") {
      return step >= 3 ? "aligned" : "checking";
    }
    if (item === "salary" || item === "location") {
      if (step < 3) return "pending";
      if (step === 3 || step === 4) return "checking";
      return "aligned";
    }
    if (item === "calendar") {
      if (step < 7) return "pending";
      if (step === 7 || step === 8) return "checking";
      return "aligned";
    }
    return "pending";
  };

  return (
    <section className="relative min-h-screen overflow-hidden bg-background py-20 lg:py-32">
      {/* Visual background grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#f3f4f6_1px,transparent_1px),linear-gradient(to_bottom,#f3f4f6_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-80 pointer-events-none" />

      {/* Decorative Blur Orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 -top-32 h-[600px] w-[600px] rounded-full bg-accent/3 blur-[140px] animate-breathe" />
        <div className="absolute right-10 top-1/4 h-[500px] w-[500px] rounded-full bg-accent-gradient/2 blur-[120px] animate-breathe" style={{ animationDelay: "2.5s" }} />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 pt-16 lg:pt-20">
        {/* Hero Copy */}
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-xs font-semibold text-accent mb-6"
          >
            <span>✨ Introducing Agent-to-Agent Sourcing</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-7xl text-foreground"
          >
            Where agents negotiate, so humans only <span className="text-gradient">meet when it matters.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg"
          >
            recruitx is the first autonomous agent network for technical sourcing.
            Your dedicated AI agent represents your preferences, verifies skills from your GitHub,
            compares packages, and books final interviews automatically.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              href="/auth"
              className="group relative overflow-hidden rounded-xl bg-foreground px-8 py-3.5 text-sm font-semibold text-white transition-all hover:scale-[1.03] shadow-lg shadow-black/10 w-full sm:w-auto"
            >
              <span className="relative z-10">Start your agent</span>
              <span className="absolute inset-0 bg-gradient-to-r from-accent to-accent-gradient opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            </Link>
            <a
              href="#how-it-works"
              className="rounded-xl border border-card-border bg-white/70 backdrop-blur-sm px-8 py-3.5 text-sm font-semibold text-foreground transition-all hover:border-accent/30 hover:bg-accent/5 w-full sm:w-auto text-center"
            >
              How it works &nbsp;→
            </a>
          </motion.div>
        </div>

        {/* Demo Interface Card */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto mt-20 max-w-5xl rounded-2xl border border-card-border bg-card p-1 shadow-card"
        >
          {/* Card Header resembling browser bar */}
          <div className="flex items-center justify-between border-b border-card-border bg-subtle px-5 py-3.5 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-400/80" />
              <span className="h-3 w-3 rounded-full bg-yellow-400/80" />
              <span className="h-3 w-3 rounded-full bg-green-400/80" />
            </div>
            <div className="rounded-md border border-card-border bg-card px-4 py-1 text-xs font-semibold text-muted select-none">
              recruitx.app — Active Sourcing Engine
            </div>
            <div className="w-12" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-card-border/60">
            {/* Column 1: Active Pipelines Sidebar */}
            <div className="md:col-span-1 p-4 bg-subtle/30 space-y-4">
              <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider">Active Deals</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-2 rounded-xl bg-card border border-accent/20 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 bottom-0 left-0 w-1 bg-accent" />
                  <div className="h-8 w-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">S</div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">Stripe</p>
                    <p className="text-[10px] text-muted truncate">Senior Fullstack</p>
                  </div>
                  {step < 11 && (
                    <span className="absolute top-2 right-2 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 p-2 rounded-xl bg-transparent opacity-60">
                  <div className="h-8 w-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold">V</div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground">Vercel</p>
                    <p className="text-[10px] text-muted">Backend Engineer</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-xl bg-transparent opacity-60">
                  <div className="h-8 w-8 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center text-xs font-bold">F</div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground">Figma</p>
                    <p className="text-[10px] text-muted">Core Frontend</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2 & 3: Negotiation Chat Thread */}
            <div className="md:col-span-3 flex flex-col h-[480px] bg-background">
              {/* Chat Messages Log */}
              <div 
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-5 space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              >
                <AnimatePresence initial={false}>
                  {getVisibleMessages().map((msg) => {
                    const isCandidate = msg.sender === "candidate";
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-3 ${isCandidate ? "flex-row-reverse" : "flex-row"}`}
                      >
                        {/* Avatar */}
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-sm ${
                          isCandidate 
                            ? "bg-accent text-white" 
                            : "bg-indigo-50 border border-indigo-100 text-indigo-700"
                        }`}>
                          {msg.avatar === "Ava" ? "🤖" : msg.avatar}
                        </div>

                        {/* Speech Bubble */}
                        <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm relative ${
                          isCandidate
                            ? "bg-accent/[0.04] border border-accent/10 rounded-tr-none text-right"
                            : "bg-card border border-card-border rounded-tl-none text-left"
                        }`}>
                          <div className={`flex items-center gap-2 mb-1.5 ${isCandidate ? "justify-end" : "justify-start"}`}>
                            <span className="text-[11px] font-bold text-foreground">{msg.senderName}</span>
                            <span className="text-[9px] font-semibold text-muted bg-subtle px-1.5 py-0.5 rounded">
                              {msg.roleTag}
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed text-foreground font-medium">{msg.text}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {/* Live Typing Indicators */}
                {isRecruiterTyping && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 items-center">
                    <div className="h-8 w-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shadow-sm">S</div>
                    <div className="bg-card border border-card-border rounded-2xl rounded-tl-none p-3.5 flex items-center gap-1.5 shadow-sm">
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="text-[10px] text-muted font-medium ml-1">Stripe Agent is replying...</span>
                    </div>
                  </motion.div>
                )}

                {isCandidateTyping && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 items-center flex-row-reverse">
                    <div className="h-8 w-8 rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold shadow-sm">🤖</div>
                    <div className="bg-accent/[0.04] border border-accent/10 rounded-2xl rounded-tr-none p-3.5 flex items-center gap-1.5 shadow-sm">
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="text-[10px] text-accent/60 font-medium ml-1">Ava is negotiating...</span>
                    </div>
                  </motion.div>
                )}

                {/* Successful Booked Badge */}
                {step >= 11 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex justify-center py-2"
                  >
                    <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-3 shadow-sm text-emerald-800">
                      <div className="h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">✓</div>
                      <div>
                        <p className="text-xs font-bold">Meeting Booked Successfully</p>
                        <p className="text-[10px] text-emerald-600">Tuesday, 10:00 AM EST (30m, Zoom)</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Column 4 & 5: Fit Score & Align Check */}
            <div className="md:col-span-1 p-5 flex flex-col justify-between bg-subtle/15">
              {/* Radial Fit Score Card */}
              <div className="space-y-4 text-center">
                <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider">Alignment Score</h4>
                
                <div className="relative inline-flex items-center justify-center">
                  {/* SVG Dash Indicator */}
                  <svg className="w-24 h-24 transform -rotate-90">
                    <circle cx="48" cy="48" r="40" stroke="#f3f4f6" strokeWidth="6" fill="transparent" />
                    <circle 
                      cx="48" 
                      cy="48" 
                      r="40" 
                      stroke="url(#accent-grad)" 
                      strokeWidth="6" 
                      fill="transparent" 
                      strokeDasharray="251.2"
                      strokeDashoffset={251.2 - (251.2 * fitScore) / 100}
                      className="transition-all duration-1000 ease-out"
                    />
                    <defs>
                      <linearGradient id="accent-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#266df0" />
                        <stop offset="100%" stopColor="#0ea5e9" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <span className="absolute text-xl font-bold text-foreground tracking-tight">{fitScore}%</span>
                </div>
              </div>

              {/* Alignment Checklist */}
              <div className="space-y-3 mt-4">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-foreground/80">GitHub verification</span>
                  {getChecklistStatus("git") === "aligned" ? (
                    <span className="text-emerald-500 font-bold">✓</span>
                  ) : (
                    <span className="text-accent animate-pulse-subtle font-medium text-[9px]">checking</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-foreground/80">Compensation match</span>
                  {getChecklistStatus("salary") === "aligned" ? (
                    <span className="text-emerald-500 font-bold">✓</span>
                  ) : getChecklistStatus("salary") === "checking" ? (
                    <span className="text-accent animate-pulse-subtle font-medium text-[9px]">checking</span>
                  ) : (
                    <span className="text-muted/40 font-bold">•</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-foreground/80">Location/Remote</span>
                  {getChecklistStatus("location") === "aligned" ? (
                    <span className="text-emerald-500 font-bold">✓</span>
                  ) : getChecklistStatus("location") === "checking" ? (
                    <span className="text-accent animate-pulse-subtle font-medium text-[9px]">checking</span>
                  ) : (
                    <span className="text-muted/40 font-bold">•</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-foreground/80">Calendar alignment</span>
                  {getChecklistStatus("calendar") === "aligned" ? (
                    <span className="text-emerald-500 font-bold">✓</span>
                  ) : getChecklistStatus("calendar") === "checking" ? (
                    <span className="text-accent animate-pulse-subtle font-medium text-[9px]">checking</span>
                  ) : (
                    <span className="text-muted/40 font-bold">•</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
