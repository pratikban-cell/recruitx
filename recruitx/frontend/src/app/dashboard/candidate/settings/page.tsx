"use client";

import { createClient } from "@/lib/supabase-client";
import {
  activateCandidate,
  getCalendarStatus,
  getCalendarConnectUrl,
  disconnectCalendar,
  mockConnectCalendar,
  parseResume,
} from "@/lib/api";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function CandidateSettings() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentBuilding, setAgentBuilding] = useState(false);
  const [agentResult, setAgentResult] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [githubConnecting, setGithubConnecting] = useState(false);
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [remotePref, setRemotePref] = useState(true);
  const [skills, setSkills] = useState("");
  const [availability, setAvailability] = useState("immediate");
  const [equityDemandThreshold, setEquityDemandThreshold] = useState("");
  const [negotiationStyle, setNegotiationStyle] = useState("collaborative");
  const [bio, setBio] = useState("");

  // Resume Upload & Drag-and-Drop States
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeUploadResult, setResumeUploadResult] = useState<string | null>(
    null,
  );
  const [dragActive, setDragActive] = useState(false);

  // Instant Preview Modal States
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewBio, setPreviewBio] = useState("");
  const [previewSkills, setPreviewSkills] = useState("");
  const [previewSalaryMin, setPreviewSalaryMin] = useState("");
  const [previewRemotePref, setPreviewRemotePref] = useState(true);

  // Calendar states
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarEmail, setCalendarEmail] = useState("");
  const [calendarConnecting, setCalendarConnecting] = useState(false);

  const processFile = async (file: File) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      setResumeUploadResult(
        "Failed to parse resume: Please upload a PDF file.",
      );
      return;
    }

    setResumeUploading(true);
    setResumeUploadResult(null);
    try {
      const parsed = await parseResume(file);
      if (parsed && !parsed.detail) {
        // Prepare data for the preview overlay modal
        setPreviewTitle(parsed.title || "");
        setPreviewSkills(
          Array.isArray(parsed.skills)
            ? parsed.skills.join(", ")
            : parsed.skills || "",
        );
        setPreviewSalaryMin(
          parsed.salary_min ? parsed.salary_min.toString() : "",
        );
        setPreviewRemotePref(
          parsed.remote_pref !== undefined ? parsed.remote_pref : true,
        );
        setPreviewBio(parsed.bio || "");

        setShowPreviewModal(true);
        setResumeUploadResult("Resume parsed successfully!");
      } else {
        setResumeUploadResult(
          "Failed to parse resume: " + (parsed?.detail || "Unknown error"),
        );
      }
    } catch (err) {
      console.error(err);
      setResumeUploadResult("Error sending resume to parser.");
    } finally {
      setResumeUploading(false);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleApproveAndActivate = async () => {
    setSaving(true);
    setAgentBuilding(true);
    setAgentResult(null);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Not authenticated");
        return;
      }

      // Update primary form states
      setTitle(previewTitle);
      setBio(previewBio);
      setSkills(previewSkills);
      setSalaryMin(previewSalaryMin);
      setRemotePref(previewRemotePref);

      // Save user profiles name
      await supabase.from("profiles").update({ name }).eq("id", user.id);

      // Upsert candidate settings
      const { data: cand } = await supabase
        .from("candidates")
        .select("id")
        .eq("profile_id", user.id)
        .maybeSingle();
      const cleanGithub = githubUrl.trim() || null;
      const cleanPortfolio = portfolioUrl.trim() || null;

      const serializedAvailability = `${availability}|equity_demand_threshold:${equityDemandThreshold ? parseInt(equityDemandThreshold) : ""}|negotiation_style:${negotiationStyle}|bio:${encodeURIComponent(previewBio)}`;

      const { error: upsertErr } = await supabase.from("candidates").upsert({
        id: cand?.id,
        profile_id: user.id,
        title: previewTitle,
        github_url: cleanGithub,
        github_token: githubToken,
        portfolio_url: cleanPortfolio,
        salary_min: previewSalaryMin ? parseInt(previewSalaryMin) : null,
        remote_pref: previewRemotePref,
        skills: previewSkills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        availability: serializedAvailability,
      });

      if (upsertErr) {
        setError(`Failed to save settings: ${upsertErr.message}`);
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);

      // Activate agent
      const finalBio =
        previewBio ||
        `I'm ${name}, a ${previewTitle}. Skills: ${previewSkills}. Salary min: $${previewSalaryMin}. Remote: ${previewRemotePref ? "yes" : "no"}. Availability: ${availability}.`;
      const res = await activateCandidate(
        user.id,
        finalBio,
        cleanGithub || undefined,
        cleanPortfolio || undefined,
      );
      if (res && res.status === "activated") {
        setAgentResult(
          "Agent activated and matching scan initiated successfully!",
        );
        setShowPreviewModal(false);
      } else {
        setAgentResult(
          "Failed to activate agent: " + (res?.detail || "Unknown error"),
        );
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err.message || "An unexpected error occurred during activation.",
      );
    } finally {
      setSaving(false);
      setAgentBuilding(false);
    }
  };

  const handleConnectGithub = async () => {
    setGithubConnecting(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/dashboard/candidate/settings?github_connected=true`,
          scopes: "read:user,repo",
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error(err);
      setError(`GitHub OAuth redirect failed: ${err.message}`);
      setGithubConnecting(false);
    }
  };

  const handleDisconnectGithub = async () => {
    setSaving(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Not authenticated");
        return;
      }
      const { data: cand } = await supabase
        .from("candidates")
        .select("id")
        .eq("profile_id", user.id)
        .maybeSingle();

      const { error: disconnectErr } = await supabase.from("candidates").upsert({
        id: cand?.id,
        profile_id: user.id,
        github_token: null,
      });

      if (disconnectErr) throw disconnectErr;

      setGithubToken(null);
      setGithubUrl("");
      setAgentResult("GitHub account disconnected successfully.");
    } catch (err: any) {
      console.error(err);
      setError(`GitHub disconnect failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push("/auth");
          return;
        }

        // Check query param redirects for calendar mock connect
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get("mock_calendar_connect") === "true") {
          try {
            await mockConnectCalendar(user.id);
          } catch (calErr) {
            console.error("Mock calendar connect failed:", calErr);
          }
          router.replace("/dashboard/candidate/settings");
        }

        if (searchParams.get("github_connected") === "true") {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.provider_token;
            if (token) {
              const ghRes = await fetch("https://api.github.com/user", {
                headers: {
                  Authorization: `Bearer ${token}`,
                  Accept: "application/vnd.github+json",
                },
              });
              if (ghRes.ok) {
                const ghUser = await ghRes.json();
                const profileUrl = ghUser.html_url || `https://github.com/${ghUser.login}`;
                
                const { data: cand } = await supabase
                  .from("candidates")
                  .select("id")
                  .eq("profile_id", user.id)
                  .maybeSingle();
                
                await supabase.from("candidates").upsert({
                  id: cand?.id,
                  profile_id: user.id,
                  github_token: token,
                  github_url: profileUrl,
                });
                
                setGithubUrl(profileUrl);
                setGithubToken(token);
                setAgentResult("GitHub account connected via OAuth successfully!");
              } else {
                console.error("Failed to query GitHub user endpoint with provider token");
              }
            }
          } catch (err) {
            console.error("Error fetching GitHub user info:", err);
          }
          router.replace("/dashboard/candidate/settings");
        }

        const { data: prof } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (prof) setName(prof.name || "");

        const { data: cand } = await supabase
          .from("candidates")
          .select("*")
          .eq("profile_id", user.id)
          .single();
        if (cand) {
          setTitle(cand.title || "");
          setGithubUrl(cand.github_url || "");
          setGithubToken(cand.github_token || null);
          setPortfolioUrl(cand.portfolio_url || "");
          setSalaryMin(cand.salary_min?.toString() || "");
          setRemotePref(cand.remote_pref ?? true);
          setSkills(cand.skills?.join(", ") || "");
          const availStr = cand.availability || "immediate";
          if (availStr.includes("|")) {
            const parts = availStr.split("|");
            setAvailability(parts[0]);
            parts.slice(1).forEach((p: string) => {
              const idx = p.indexOf(":");
              if (idx !== -1) {
                const k = p.substring(0, idx);
                const v = p.substring(idx + 1);
                if (k === "equity_demand_threshold") {
                  setEquityDemandThreshold(v || "");
                } else if (k === "negotiation_style") {
                  setNegotiationStyle(v || "collaborative");
                } else if (k === "bio") {
                  setBio(decodeURIComponent(v || ""));
                }
              }
            });
          } else {
            setAvailability(availStr);
            setEquityDemandThreshold("");
            setNegotiationStyle("collaborative");
            setBio("");
          }
        }

        // Load calendar status
        try {
          const cal = await getCalendarStatus(user.id);
          if (cal && cal.connected) {
            setCalendarConnected(true);
            setCalendarEmail(cal.email);
          }
        } catch (calStatusErr) {
          console.error("Failed to load calendar status:", calStatusErr);
        }
      } catch (err) {
        console.error("Failed to load settings data:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Not authenticated");
        setSaving(false);
        return;
      }

      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ name })
        .eq("id", user.id);
      if (profileErr) {
        setError(`Failed to update profile: ${profileErr.message}`);
        setSaving(false);
        return;
      }

      const { data: cand, error: candErr } = await supabase
        .from("candidates")
        .select("id")
        .eq("profile_id", user.id)
        .maybeSingle();
      if (candErr) {
        setError(`Failed to retrieve candidate info: ${candErr.message}`);
        setSaving(false);
        return;
      }

      const cleanGithub = githubUrl.trim() || null;
      const cleanPortfolio = portfolioUrl.trim() || null;

      const serializedAvailability = `${availability}|equity_demand_threshold:${equityDemandThreshold ? parseInt(equityDemandThreshold) : ""}|negotiation_style:${negotiationStyle}|bio:${encodeURIComponent(bio)}`;

      const { error: upsertErr } = await supabase.from("candidates").upsert({
        id: cand?.id,
        profile_id: user.id,
        title,
        github_url: cleanGithub,
        github_token: githubToken,
        portfolio_url: cleanPortfolio,
        salary_min: salaryMin ? parseInt(salaryMin) : null,
        remote_pref: remotePref,
        skills: skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        availability: serializedAvailability,
      });

      if (upsertErr) {
        setError(`Failed to save candidate settings: ${upsertErr.message}`);
        setSaving(false);
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSave} className="space-y-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="font-semibold">⚠️ Save Failed:</span>
              <span>{error}</span>
            </div>
          </div>
        )}
        {/* AI Resume Upload Card */}
        {resumeUploading ? (
          <div className="rounded-2xl border-2 border-accent/20 bg-white p-8 shadow-card flex flex-col items-center justify-center space-y-4 animate-pulse">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-accent/10 blur-xl animate-breathe" />
              <svg
                className="animate-spin h-12 w-12 text-accent relative z-10"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                AI Agent parsing skills and experience...
              </h3>
              <p className="text-xs text-muted">
                Reading and extracting profile details from your resume...
              </p>
            </div>
          </div>
        ) : (
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 ${
              dragActive
                ? "border-accent bg-accent/5 scale-[1.02] shadow-lg animate-pulse-subtle"
                : "border-card-border bg-white hover:border-accent/40 hover:bg-subtle"
            }`}
          >
            <div className="flex flex-col items-center justify-center space-y-4">
              <div
                className={`p-4 rounded-full transition-colors duration-300 ${dragActive ? "bg-accent/20 text-accent" : "bg-accent/10 text-accent/80"}`}
              >
                <svg
                  className={`h-8 w-8 transform transition-transform duration-300 ${dragActive ? "scale-110" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  ⚡ Drag & Drop your Resume PDF
                </h3>
                <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
                  Or click to browse from your device. Our AI agent parser will
                  extract your skills, target title, bio, and salary floor
                  instantly.
                </p>
              </div>

              <label
                className={`cursor-pointer rounded-lg bg-accent px-6 py-2.5 text-xs font-semibold text-white hover:bg-accent/90 transition-all duration-200 shadow-sm ${resumeUploading ? "opacity-50 pointer-events-none" : ""}`}
              >
                Select Resume PDF
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleResumeUpload}
                  disabled={resumeUploading}
                />
              </label>

              {resumeUploadResult && (
                <p
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium animate-fade-in ${resumeUploadResult.startsWith("Failed") ? "text-red-600 bg-red-50 border border-red-100" : "text-green-600 bg-green-50 border border-green-100"}`}
                >
                  {resumeUploadResult}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-card-border bg-white p-6 shadow-sm space-y-5">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Basic Info
          </h2>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-card-border bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              placeholder="Your name"
            />
          </div>
        </div>

        <div className="rounded-xl border border-card-border bg-white p-6 shadow-sm space-y-5">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Candidate Profile
          </h2>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-card-border bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              placeholder="e.g. Senior Frontend Engineer"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Professional Summary / Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-card-border bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
              placeholder="A brief professional summary that your agent will use to represent you during negotiations..."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-card-border bg-subtle/20 p-4 space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                  GitHub Integration
                </label>
                {githubToken ? (
                  <span className="flex items-center gap-1.5 text-[10px] bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium shadow-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                    Connected via OAuth
                  </span>
                ) : (
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                    Not Connected
                  </span>
                )}
              </div>

              {githubToken ? (
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-foreground truncate">
                    {githubUrl}
                  </div>
                  <button
                    type="button"
                    onClick={handleDisconnectGithub}
                    className="text-xs text-red-600 hover:text-red-700 font-semibold transition-colors flex items-center gap-1"
                  >
                    Disconnect Account
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-muted">
                    Authorize recruitx to read your public and private repo metadata directly from the GitHub API.
                  </p>
                  <button
                    type="button"
                    onClick={handleConnectGithub}
                    disabled={githubConnecting}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-card-border bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-semibold text-foreground transition-all duration-200 shadow-sm"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.197 22 16.44 22 12.017 22 6.484 17.522 2 12 2z" />
                    </svg>
                    {githubConnecting ? "Connecting..." : "Connect GitHub (OAuth)"}
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Portfolio URL
              </label>
              <input
                type="url"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                className="w-full rounded-lg border border-card-border bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                placeholder="your.site"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Minimum Salary ($)
              </label>
              <input
                type="number"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value)}
                className="w-full rounded-lg border border-card-border bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                placeholder="80000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Availability
              </label>
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                className="w-full rounded-lg border border-card-border bg-white px-4 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              >
                <option value="immediate">Immediate</option>
                <option value="2weeks">2 weeks</option>
                <option value="1month">1 month</option>
                <option value="3months">3+ months</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Skills (comma separated)
            </label>
            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              className="w-full rounded-lg border border-card-border bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              placeholder="React, TypeScript, Python, Go"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Equity Demand Threshold ($)
              </label>
              <input
                type="number"
                value={equityDemandThreshold}
                onChange={(e) => setEquityDemandThreshold(e.target.value)}
                className="w-full rounded-lg border border-card-border bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                placeholder="e.g. 130000"
              />
              <p className="text-[10px] text-muted mt-1">
                If the recruiter offers a base salary under this amount, your
                agent will demand equity.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Agent Negotiation Style
              </label>
              <select
                value={negotiationStyle}
                onChange={(e) => setNegotiationStyle(e.target.value)}
                className="w-full rounded-lg border border-card-border bg-white px-4 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              >
                <option value="collaborative">
                  🤝 Collaborative (Aim for Win-Win)
                </option>
                <option value="firm">
                  ⚖️ Firm (Hold ground on preferences)
                </option>
                <option value="flexible">
                  🍃 Flexible (Maximize landing the role)
                </option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="remote"
              checked={remotePref}
              onChange={(e) => setRemotePref(e.target.checked)}
              className="h-4 w-4 rounded border-card-border text-accent focus:ring-accent/20"
            />
            <label htmlFor="remote" className="text-sm text-foreground">
              Prefer remote work
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-card-border bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Calendar Settings
          </h2>
          <p className="text-xs text-muted">
            Connect your calendar to let your AI scheduling assistant schedule
            interviews and generate Google Meet details automatically when
            matches align.
          </p>
          {calendarConnected ? (
            <div className="flex items-center justify-between rounded-lg bg-green-50/50 border border-green-100 p-4">
              <div>
                <p className="text-sm font-semibold text-green-800">
                  Connected
                </p>
                <p className="text-xs text-green-700 mt-0.5">{calendarEmail}</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const {
                    data: { user },
                  } = await supabase.auth.getUser();
                  if (user) {
                    await disconnectCalendar(user.id);
                    setCalendarConnected(false);
                    setCalendarEmail("");
                  }
                }}
                className="text-xs font-semibold text-red-600 hover:text-red-700 transition-colors"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={async () => {
                  setCalendarConnecting(true);
                  const {
                    data: { user },
                  } = await supabase.auth.getUser();
                  if (user) {
                    const res = await getCalendarConnectUrl(user.id);
                    if (res && res.url) {
                      window.location.href = res.url;
                    }
                  }
                  setCalendarConnecting(false);
                }}
                disabled={calendarConnecting}
                className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50 transition-all shadow-sm"
              >
                {calendarConnecting
                  ? "Connecting..."
                  : "Connect Google Calendar"}
              </button>
              <button
                type="button"
                onClick={async () => {
                  setCalendarConnecting(true);
                  const {
                    data: { user },
                  } = await supabase.auth.getUser();
                  if (user) {
                    const res = await mockConnectCalendar(user.id);
                    if (res && res.status === "connected") {
                      setCalendarConnected(true);
                      setCalendarEmail(res.email);
                    }
                  }
                  setCalendarConnecting(false);
                }}
                disabled={calendarConnecting}
                className="rounded-lg bg-white border border-card-border px-6 py-2.5 text-sm font-semibold text-muted hover:text-foreground disabled:opacity-50 transition-all shadow-sm"
              >
                Mock Connect (No OAuth)
              </button>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-card-border bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Agent Profile
          </h2>
          <p className="text-xs text-muted">
            Send your profile to your AI agent so it can negotiate on your
            behalf.
          </p>
          <button
            type="button"
            onClick={async () => {
              setAgentBuilding(true);
              setAgentResult(null);
              try {
                const {
                  data: { user },
                } = await supabase.auth.getUser();
                if (!user) {
                  setAgentResult("Not authenticated");
                  setAgentBuilding(false);
                  return;
                }
                const finalBio =
                  bio ||
                  `I'm ${name}, a ${title}. Skills: ${skills}. Salary min: $${salaryMin}. Remote: ${remotePref ? "yes" : "no"}. Availability: ${availability}.`;
                const res = await activateCandidate(
                  user.id,
                  finalBio,
                  githubUrl,
                  portfolioUrl,
                );
                if (res && res.status === "activated") {
                  setAgentResult(
                    "Agent activated and matching scan initiated successfully!",
                  );
                } else {
                  setAgentResult(
                    "Failed to activate agent: " +
                      (res?.detail || "Unknown error"),
                  );
                }
              } catch {
                setAgentResult(
                  "Failed to reach agent backend. Is the server running?",
                );
              }
              setAgentBuilding(false);
            }}
            disabled={agentBuilding}
            className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50 transition-all shadow-sm"
          >
            {agentBuilding ? "Building agent profile..." : "Activate Agent"}
          </button>
          {agentResult && (
            <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">
              {agentResult}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          {saved && (
            <span className="text-sm text-green-600 font-medium bg-green-50 px-3 py-1.5 rounded-lg">
              Saved successfully
            </span>
          )}
          <div className="ml-auto">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-foreground px-8 py-2.5 text-sm font-semibold text-white hover:bg-foreground/90 transition-all disabled:opacity-50 shadow-sm"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>

        {/* Sliding Instant Preview Overlay Modal */}
        {showPreviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/45 backdrop-blur-md transition-all duration-300 animate-fade-in">
            <div className="relative w-full max-w-2xl bg-white/95 backdrop-blur-2xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden animate-slide-up max-h-[90vh] flex flex-col">
              {/* Premium Header */}
              <div className="p-6 border-b border-card-border bg-gradient-to-r from-accent/5 to-accent-gradient/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent/10 text-accent rounded-lg">
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                      ✨ AI Resume Parsing Preview
                    </h2>
                    <p className="text-xs text-muted">
                      Review and tweak your AI Agent&apos;s negotiation profile
                      details before activating.
                    </p>
                  </div>
                </div>
              </div>

              {/* Extracted Fields Content Area */}
              <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-subtle/30">
                {/* Title and Base Target Salary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-card-border bg-white p-4 shadow-sm space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                        Target Title
                      </label>
                      <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded font-medium">
                        Extracted
                      </span>
                    </div>
                    <input
                      type="text"
                      value={previewTitle}
                      onChange={(e) => setPreviewTitle(e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-card-border px-0 py-1 text-sm font-semibold text-foreground focus:border-accent focus:outline-none focus:ring-0"
                    />
                  </div>

                  <div className="rounded-xl border border-card-border bg-white p-4 shadow-sm space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                        Base Target Salary Floor ($)
                      </label>
                      <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded font-medium">
                        Extracted
                      </span>
                    </div>
                    <input
                      type="number"
                      value={previewSalaryMin}
                      onChange={(e) => setPreviewSalaryMin(e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-card-border px-0 py-1 text-sm font-semibold text-foreground focus:border-accent focus:outline-none focus:ring-0"
                    />
                  </div>
                </div>

                {/* Bio / Summary */}
                <div className="rounded-xl border border-card-border bg-white p-4 shadow-sm space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                      Professional Bio / Executive Summary
                    </label>
                    <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded font-medium">
                      AI Synthesized
                    </span>
                  </div>
                  <textarea
                    value={previewBio}
                    onChange={(e) => setPreviewBio(e.target.value)}
                    rows={4}
                    className="w-full bg-transparent border-0 border-b border-card-border px-0 py-1 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-0 resize-none leading-relaxed"
                  />
                </div>

                {/* Skills */}
                <div className="rounded-xl border border-card-border bg-white p-4 shadow-sm space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                      Extracted Technical Skills
                    </label>
                    <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded font-medium">
                      Extracted
                    </span>
                  </div>
                  <input
                    type="text"
                    value={previewSkills}
                    onChange={(e) => setPreviewSkills(e.target.value)}
                    placeholder="React, TypeScript, Python, Docker"
                    className="w-full bg-transparent border-0 border-b border-card-border px-0 py-1 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-0"
                  />
                  <p className="text-[10px] text-muted">
                    Comma separated technical capabilities for matching scans.
                  </p>
                </div>

                {/* Remote toggle */}
                <div className="rounded-xl border border-card-border bg-white p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-muted uppercase tracking-wider block">
                      Remote Policy preference
                    </span>
                    <span className="text-[10px] text-muted mt-0.5">
                      Toggle if you prefer fully remote arrangements.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewRemotePref(!previewRemotePref)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${previewRemotePref ? "bg-accent" : "bg-gray-200"}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${previewRemotePref ? "translate-x-5" : "translate-x-0"}`}
                    />
                  </button>
                </div>
              </div>

              {/* Premium Footer Actions */}
              <div className="p-6 border-t border-card-border bg-gradient-to-r from-accent/5 to-accent-gradient/5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    // Edit Fields: Copy values and close modal
                    setTitle(previewTitle);
                    setBio(previewBio);
                    setSkills(previewSkills);
                    setSalaryMin(previewSalaryMin);
                    setRemotePref(previewRemotePref);
                    setShowPreviewModal(false);
                  }}
                  className="rounded-xl bg-white border border-card-border px-5 py-2.5 text-xs font-semibold text-muted hover:text-foreground transition-all shadow-sm"
                >
                  Edit Fields (Focus Form)
                </button>
                <button
                  type="button"
                  onClick={handleApproveAndActivate}
                  disabled={saving || agentBuilding}
                  className="rounded-xl bg-accent hover:bg-accent-dark px-6 py-2.5 text-xs font-semibold text-white transition-all disabled:opacity-50 shadow-md flex items-center gap-2"
                >
                  {saving || agentBuilding ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Activating...
                    </>
                  ) : (
                    <>🚀 Approve & Activate Agent</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
