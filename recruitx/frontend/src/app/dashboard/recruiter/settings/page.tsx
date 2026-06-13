"use client";

import { createClient } from "@/lib/supabase-client";
import { activateRecruiter, getCalendarStatus, getCalendarConnectUrl, disconnectCalendar, mockConnectCalendar } from "@/lib/api";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function RecruiterSettings() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [agentBuilding, setAgentBuilding] = useState(false);
  const [agentResult, setAgentResult] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [salaryRangeMin, setSalaryRangeMin] = useState("");
  const [salaryRangeMax, setSalaryRangeMax] = useState("");
  const [remotePolicy, setRemotePolicy] = useState("remote");
  const [mustHaves, setMustHaves] = useState("");
  const [maxSalaryFlex, setMaxSalaryFlex] = useState("");
  const [recruiterNegotiationStyle, setRecruiterNegotiationStyle] = useState("collaborative");
  
  // Guardrails/Dealbreaker states
  const [dealbreakerSalary, setDealbreakerSalary] = useState(false);
  const [dealbreakerSkills, setDealbreakerSkills] = useState(false);
  const [dealbreakerRemote, setDealbreakerRemote] = useState(false);

  // Calendar states
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarEmail, setCalendarEmail] = useState("");
  const [calendarConnecting, setCalendarConnecting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth"); return; }
      
      // Check query param redirects for calendar mock connect
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("mock_calendar_connect") === "true") {
        await mockConnectCalendar(user.id);
        router.replace("/dashboard/recruiter/settings");
      }

      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (prof) setName(prof.name || "");
      const { data: rec } = await supabase.from("recruiters").select("*").eq("profile_id", user.id).single();
      if (rec) {
        setCompany(rec.company || "");
        setPosition(rec.position || "");
        setSalaryRangeMin(rec.salary_range_min?.toString() || "");
        setSalaryRangeMax(rec.salary_range_max?.toString() || "");
        setMustHaves(rec.must_haves?.join(", ") || "");
        const policyStr = rec.remote_policy || "remote";
        if (policyStr.includes("|")) {
          const parts = policyStr.split("|");
          setRemotePolicy(parts[0]);
          parts.slice(1).forEach((p: string) => {
            const idx = p.indexOf(":");
            if (idx !== -1) {
              const k = p.substring(0, idx);
              const v = p.substring(idx + 1);
              if (k === "max_salary_flex") {
                setMaxSalaryFlex(v || "");
              } else if (k === "recruiter_negotiation_style") {
                setRecruiterNegotiationStyle(v || "collaborative");
              } else if (k === "dealbreaker_salary") {
                setDealbreakerSalary(v === "true");
              } else if (k === "dealbreaker_skills") {
                setDealbreakerSkills(v === "true");
              } else if (k === "dealbreaker_remote") {
                setDealbreakerRemote(v === "true");
              }
            }
          });
        } else {
          setRemotePolicy(policyStr);
          setMaxSalaryFlex("");
          setRecruiterNegotiationStyle("collaborative");
          setDealbreakerSalary(false);
          setDealbreakerSkills(false);
          setDealbreakerRemote(false);
        }
      }

      // Load calendar status
      const cal = await getCalendarStatus(user.id);
      if (cal && cal.connected) {
        setCalendarConnected(true);
        setCalendarEmail(cal.email);
      }

      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update({ name }).eq("id", user.id);
    const { data: rec } = await supabase.from("recruiters").select("id").eq("profile_id", user.id).single();
    const serializedRemotePolicy = `${remotePolicy}|max_salary_flex:${maxSalaryFlex ? parseInt(maxSalaryFlex) : ""}|recruiter_negotiation_style:${recruiterNegotiationStyle}|dealbreaker_salary:${dealbreakerSalary}|dealbreaker_skills:${dealbreakerSkills}|dealbreaker_remote:${dealbreakerRemote}`;
    await supabase.from("recruiters").upsert({
      id: rec?.id, profile_id: user.id, company, position,
      salary_range_min: salaryRangeMin ? parseInt(salaryRangeMin) : null,
      salary_range_max: salaryRangeMax ? parseInt(salaryRangeMax) : null,
      remote_policy: serializedRemotePolicy,
      must_haves: mustHaves.split(",").map((s) => s.trim()).filter(Boolean),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>;

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-xl border border-card-border bg-white p-6 shadow-sm space-y-5">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Basic Info</h2>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-card-border bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" placeholder="Your name" />
          </div>
        </div>

        <div className="rounded-xl border border-card-border bg-white p-6 shadow-sm space-y-5">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Company Profile</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Company</label>
              <input type="text" value={company} onChange={(e) => setCompany(e.target.value)}
                className="w-full rounded-lg border border-card-border bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" placeholder="Company name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Your Position</label>
              <input type="text" value={position} onChange={(e) => setPosition(e.target.value)}
                className="w-full rounded-lg border border-card-border bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" placeholder="e.g. CTO, Talent Lead" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Salary Range Min ($)</label>
              <input type="number" value={salaryRangeMin} onChange={(e) => setSalaryRangeMin(e.target.value)}
                className="w-full rounded-lg border border-card-border bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" placeholder="85000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Salary Range Max ($)</label>
              <input type="number" value={salaryRangeMax} onChange={(e) => setSalaryRangeMax(e.target.value)}
                className="w-full rounded-lg border border-card-border bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" placeholder="105000" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Remote Policy</label>
            <select value={remotePolicy} onChange={(e) => setRemotePolicy(e.target.value)}
              className="w-full rounded-lg border border-card-border bg-white px-4 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20">
              <option value="remote">Fully Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">On-site</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Must-Have Requirements (comma separated)</label>
            <input type="text" value={mustHaves} onChange={(e) => setMustHaves(e.target.value)}
              className="w-full rounded-lg border border-card-border bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" placeholder="React, 5+ years, US timezone" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Max Salary Flex Upper Bound ($)</label>
              <input type="number" value={maxSalaryFlex} onChange={(e) => setMaxSalaryFlex(e.target.value)}
                className="w-full rounded-lg border border-card-border bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" placeholder="e.g. 120000" />
              <p className="text-[10px] text-muted mt-1">Absolute maximum salary budget for exceptional candidates (not advertised, but used by agent as negotiation roof).</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Agent Negotiation Style</label>
              <select value={recruiterNegotiationStyle} onChange={(e) => setRecruiterNegotiationStyle(e.target.value)}
                className="w-full rounded-lg border border-card-border bg-white px-4 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20">
                <option value="collaborative">🤝 Collaborative (Aim for Win-Win)</option>
                <option value="firm">⚖️ Firm (Hold ground on budget limits)</option>
                <option value="flexible">🍃 Flexible (Settle deals quickly)</option>
                <option value="competitive">🏹 Competitive (Maximize recruiter value)</option>
                <option value="stubborn">🧱 Stubborn (Absolutely no budget compromise)</option>
              </select>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-card-border space-y-3">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">⚡ AI Agent Guardrails & Compliance</h3>
            <p className="text-xs text-muted">Configure absolute dealbreakers to ensure your AI Agent automatically defends boundaries and terminates/impasses non-compliant candidates.</p>
            
            <div className="space-y-2.5">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={dealbreakerSalary} onChange={(e) => setDealbreakerSalary(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-card-border text-accent focus:ring-accent/20" />
                <div>
                  <span className="text-xs font-semibold text-foreground block">Salary Limit Guardrail</span>
                  <span className="text-[10px] text-muted leading-tight block">Automatically impasse candidates demanding more than your Max Salary Flex ceiling.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={dealbreakerSkills} onChange={(e) => setDealbreakerSkills(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-card-border text-accent focus:ring-accent/20" />
                <div>
                  <span className="text-xs font-semibold text-foreground block">Must-Have Skills Guardrail</span>
                  <span className="text-[10px] text-muted leading-tight block">Automatically impasse candidates who lack any of your must-have technical requirements.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={dealbreakerRemote} onChange={(e) => setDealbreakerRemote(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-card-border text-accent focus:ring-accent/20" />
                <div>
                  <span className="text-xs font-semibold text-foreground block">Remote Policy Guardrail</span>
                  <span className="text-[10px] text-muted leading-tight block">Automatically impasse candidates whose remote/onsite preferences conflict with your policy.</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-card-border bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Calendar Settings</h2>
          <p className="text-xs text-muted">
            Connect your calendar to let your AI scheduling assistant schedule interviews and generate Google Meet details automatically when matches align.
          </p>
          {calendarConnected ? (
            <div className="flex items-center justify-between rounded-lg bg-green-50/50 border border-green-100 p-4">
              <div>
                <p className="text-sm font-semibold text-green-800">Connected</p>
                <p className="text-xs text-green-700 mt-0.5">{calendarEmail}</p>
              </div>
              <button type="button" onClick={async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  await disconnectCalendar(user.id);
                  setCalendarConnected(false);
                  setCalendarEmail("");
                }
              }} className="text-xs font-semibold text-red-600 hover:text-red-700 transition-colors">
                Disconnect
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={async () => {
                setCalendarConnecting(true);
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  const res = await getCalendarConnectUrl(user.id);
                  if (res && res.url) {
                    window.location.href = res.url;
                  }
                }
                setCalendarConnecting(false);
              }} disabled={calendarConnecting}
                className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50 transition-all shadow-sm">
                {calendarConnecting ? "Connecting..." : "Connect Google Calendar"}
              </button>
              <button type="button" onClick={async () => {
                setCalendarConnecting(true);
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  const res = await mockConnectCalendar(user.id);
                  if (res && res.status === "connected") {
                    setCalendarConnected(true);
                    setCalendarEmail(res.email);
                  }
                }
                setCalendarConnecting(false);
              }} disabled={calendarConnecting}
                className="rounded-lg bg-white border border-card-border px-6 py-2.5 text-sm font-semibold text-muted hover:text-foreground disabled:opacity-50 transition-all shadow-sm">
                Mock Connect (No OAuth)
              </button>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-card-border bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Agent Profile</h2>
          <p className="text-xs text-muted">Send your company/role details to your AI agent so it can source and negotiate candidates on your behalf.</p>
          <button type="button" onClick={async () => {
            setAgentBuilding(true);
            setAgentResult(null);
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) {
                setAgentResult("Not authenticated");
                setAgentBuilding(false);
                return;
              }
              const bio = `We are hiring for a ${position} at ${company}. Budget: $${salaryRangeMin} to $${salaryRangeMax}. Remote Policy: ${remotePolicy}. Must haves: ${mustHaves}. Max salary flex bound: $${maxSalaryFlex || salaryRangeMax}. Negotiation style: ${recruiterNegotiationStyle}.`;
              const res = await activateRecruiter(user.id, bio);
              if (res && res.status === "activated") {
                setAgentResult("Agent activated and matching scan initiated successfully!");
              } else {
                setAgentResult("Failed to activate agent: " + (res?.detail || "Unknown error"));
              }
            } catch {
              setAgentResult("Failed to reach agent backend. Is the server running?");
            }
            setAgentBuilding(false);
          }} disabled={agentBuilding}
            className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50 transition-all shadow-sm">
            {agentBuilding ? "Building agent profile..." : "Activate Agent"}
          </button>
          {agentResult && <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">{agentResult}</p>}
        </div>

        <div className="flex items-center justify-between">
          {saved && <span className="text-sm text-green-600 font-medium bg-green-50 px-3 py-1.5 rounded-lg">Saved successfully</span>}
          <div className="ml-auto">
            <button type="submit" disabled={saving}
              className="rounded-lg bg-foreground px-8 py-2.5 text-sm font-semibold text-white hover:bg-foreground/90 transition-all disabled:opacity-50 shadow-sm">
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
