import { createClient } from "@/lib/supabase-client";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function authHeaders(headers: HeadersInit = {}): Promise<HeadersInit> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return {
    ...headers,
    ...(session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}),
  };
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  return fetch(`${BASE}${path}`, {
    ...init,
    headers: await authHeaders(init.headers),
  });
}

// ── A2A JSON-RPC types (subset needed by frontend) ─────

interface A2AMessage {
  role: number;
  parts: { text?: string; data?: unknown }[];
  task_id?: string;
}

interface SendMessageParams {
  message: A2AMessage;
  sessionId?: string;
  metadata?: Record<string, string>;
}

interface A2AResponse {
  id: string;
  result?: {
    message?: A2AMessage;
    task?: {
      id: string;
      status: { state: number; message?: string };
      artifact?: unknown;
    };
  };
  error?: { code: number; message: string };
}

// ── Robust Safe JSON Parser ────────────────────────────

async function safeJson(res: Response, fallback: any = {}): Promise<any> {
  try {
    const contentType = res.headers.get("content-type");
    if (!res.ok) {
      console.warn(`Fetch to ${res.url} failed with status ${res.status}`);
      return fallback;
    }
    if (contentType && contentType.includes("application/json")) {
      const text = await res.text();
      if (!text.trim()) return fallback;
      return JSON.parse(text);
    }
    return fallback;
  } catch (err) {
    console.error("Error in safeJson parsing:", err);
    return fallback;
  }
}

// ── Generic JSON-RPC caller ────────────────────────────

async function jsonrpcCall(
  url: string,
  method: string,
  params: unknown,
): Promise<A2AResponse> {
  try {
    const res = await apiFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "A2A-Version": "1.0",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: crypto.randomUUID(),
        method,
        params,
      }),
    });
    return safeJson(res, {
      id: "",
      error: { code: -32603, message: "Network error or non-JSON response" },
    });
  } catch (err) {
    console.error(`jsonrpcCall to ${url} failed:`, err);
    return { id: "", error: { code: -32603, message: "Network error" } };
  }
}

// ── Agent card ──────────────────────────────────────────

export async function getAgentCard(agent: "candidate" | "recruiter") {
  try {
    const res = await apiFetch(`/a2a/${agent}`);
    return safeJson(res, {});
  } catch (err) {
    console.error("getAgentCard failed:", err);
    return {};
  }
}

// ── Candidate agent ─────────────────────────────────────

export async function candidateSendMessage(text: string, taskId?: string) {
  return jsonrpcCall("/a2a/candidate/jsonrpc", "SendMessage", {
    message: {
      role: 1,
      parts: [{ text }],
      task_id: taskId || crypto.randomUUID(),
    },
  } satisfies SendMessageParams);
}

export async function candidateGetTask(taskId: string) {
  return jsonrpcCall("/a2a/candidate/jsonrpc", "GetTask", {
    id: taskId,
  });
}

// ── Recruiter agent ─────────────────────────────────────

export async function recruiterSendMessage(text: string, taskId?: string) {
  return jsonrpcCall("/a2a/recruiter/jsonrpc", "SendMessage", {
    message: {
      role: 1,
      parts: [{ text }],
      task_id: taskId || crypto.randomUUID(),
    },
  } satisfies SendMessageParams);
}

export async function recruiterGetTask(taskId: string) {
  return jsonrpcCall("/a2a/recruiter/jsonrpc", "GetTask", {
    id: taskId,
  });
}

// ── REST endpoints ──────────────────────────────────────

export async function listJobs() {
  try {
    const res = await apiFetch(`/api/jobs/`);
    return safeJson(res, []);
  } catch (err) {
    console.error("listJobs failed:", err);
    return [];
  }
}

export async function getJob(jobId: string) {
  try {
    const res = await apiFetch(`/api/jobs/${jobId}`);
    return safeJson(res, {});
  } catch (err) {
    console.error(`getJob for ${jobId} failed:`, err);
    return {};
  }
}

export async function createJob(payload: Record<string, unknown>) {
  try {
    const res = await apiFetch(`/api/jobs/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return safeJson(res, {});
  } catch (err) {
    console.error("createJob failed:", err);
    return {};
  }
}

export async function activateCandidate(
  profileId: string,
  bio: string,
  githubUrl?: string,
  portfolioUrl?: string,
) {
  try {
    const res = await apiFetch(`/api/candidates/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile_id: profileId,
        bio,
        github_url: githubUrl,
        portfolio_url: portfolioUrl,
      }),
    });
    return safeJson(res, {});
  } catch (err) {
    console.error("activateCandidate failed:", err);
    return {};
  }
}

export async function activateRecruiter(profileId: string, bio: string) {
  try {
    const res = await apiFetch(`/api/recruiters/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_id: profileId, bio }),
    });
    return safeJson(res, {});
  } catch (err) {
    console.error("activateRecruiter failed:", err);
    return {};
  }
}

// ── WebSocket helpers ───────────────────────────────────

export function createNegotiationWebSocket(
  roomId: string,
  onMessage: (data: unknown) => void,
): WebSocket {
  const protocol = BASE.startsWith("https") ? "wss" : "ws";
  const host = BASE.replace(/^https?:\/\//, "");
  const ws = new WebSocket(`${protocol}://${host}/ws/negotiation/${roomId}`);

  ws.onmessage = (event) => {
    try {
      onMessage(JSON.parse(event.data));
    } catch {
      onMessage(event.data);
    }
  };

  return ws;
}

// ── Calendar API helpers ────────────────────────────────

export async function getCalendarConnectUrl(profileId: string) {
  try {
    const res = await apiFetch(`/api/calendar/connect?profile_id=${profileId}`);
    return safeJson(res, {});
  } catch (err) {
    console.error("getCalendarConnectUrl failed:", err);
    return {};
  }
}

export async function getCalendarStatus(profileId: string) {
  try {
    const res = await apiFetch(`/api/calendar/status?profile_id=${profileId}`);
    return safeJson(res, { connected: false, error: true });
  } catch (err) {
    console.error("Error in getCalendarStatus:", err);
    return { connected: false, error: true };
  }
}

export async function getCalendarEvents(
  profileId: string,
  timeMin?: string,
  timeMax?: string,
) {
  try {
    const params = new URLSearchParams();
    params.append("profile_id", profileId);
    if (timeMin) params.append("time_min", timeMin);
    if (timeMax) params.append("time_max", timeMax);
    const res = await apiFetch(`/api/calendar/events?${params.toString()}`);
    return safeJson(res, { events: [] });
  } catch (err) {
    console.error("Error in getCalendarEvents:", err);
    return { events: [] };
  }
}

export async function disconnectCalendar(profileId: string) {
  try {
    const res = await apiFetch(`/api/calendar/disconnect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_id: profileId }),
    });
    return safeJson(res, {});
  } catch (err) {
    console.error("disconnectCalendar failed:", err);
    return {};
  }
}

export async function mockConnectCalendar(profileId: string) {
  try {
    const res = await apiFetch(`/api/calendar/mock-connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_id: profileId }),
    });
    return safeJson(res, {});
  } catch (err) {
    console.error("mockConnectCalendar failed:", err);
    return {};
  }
}

export async function getTalentPool(filters: {
  skills?: string;
  salaryMax?: number;
  title?: string;
  remote?: string;
  category?: string;
  experienceLevel?: string;
  verificationType?: string;
  availability?: string;
  jobId?: string;
}) {
  try {
    const params = new URLSearchParams();
    if (filters.skills) params.append("skills", filters.skills);
    if (filters.salaryMax)
      params.append("salary_max", filters.salaryMax.toString());
    if (filters.title) params.append("title", filters.title);
    if (filters.remote) params.append("remote", filters.remote);
    if (filters.category) params.append("category", filters.category);
    if (filters.experienceLevel) params.append("experience_level", filters.experienceLevel);
    if (filters.verificationType) params.append("verification_type", filters.verificationType);
    if (filters.availability) params.append("availability", filters.availability);
    if (filters.jobId) params.append("job_id", filters.jobId);

    const res = await apiFetch(`/api/recruiters/talent?${params.toString()}`);
    return safeJson(res, { talent: [] });
  } catch (err) {
    console.error("getTalentPool failed:", err);
    return { talent: [] };
  }
}

export async function getPersonalizedRecommendations() {
  try {
    const res = await apiFetch(`/api/matching/recommendations`);
    return safeJson(res, []);
  } catch (err) {
    console.error("getPersonalizedRecommendations failed:", err);
    return [];
  }
}

export async function initiateNegotiation(
  recruiterId: string,
  candidateId: string,
  jobId?: string,
) {
  try {
    const res = await apiFetch(`/api/recruiters/initiate-negotiation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recruiter_id: recruiterId,
        candidate_id: candidateId,
        job_id: jobId,
      }),
    });
    return safeJson(res, {});
  } catch (err) {
    console.error("initiateNegotiation failed:", err);
    return {};
  }
}

export async function parseResume(file: File) {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await apiFetch(`/api/candidates/parse-resume`, {
      method: "POST",
      body: formData,
    });
    return safeJson(res, {});
  } catch (err) {
    console.error("parseResume failed:", err);
    return {};
  }
}

export async function getCoaching(
  negotiationId: string,
  userMessage?: string,
  chatHistory: any[] = [],
) {
  try {
    const res = await apiFetch(`/api/candidates/coach`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        negotiation_id: negotiationId,
        user_message: userMessage,
        chat_history: chatHistory,
      }),
    });
    return safeJson(res, {});
  } catch (err) {
    console.error("getCoaching failed:", err);
    return {};
  }
}

export async function updateNegotiationStatus(
  negotiationId: string,
  status: "active" | "matched" | "scheduled" | "completed" | "rejected",
) {
  try {
    const res = await apiFetch(`/api/negotiations/${negotiationId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    return safeJson(res, {});
  } catch (err) {
    console.error("updateNegotiationStatus failed:", err);
    return {};
  }
}

export async function steerNegotiation(
  negotiationId: string,
  instruction: string,
) {
  try {
    const res = await apiFetch(`/api/negotiations/${negotiationId}/steer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instruction }),
    });
    return safeJson(res, {});
  } catch (err) {
    console.error("steerNegotiation failed:", err);
    return {};
  }
}

export async function runNegotiation(negotiationId: string) {
  try {
    const res = await apiFetch(`/api/negotiations/${negotiationId}/run`, {
      method: "POST",
    });
    return safeJson(res, {});
  } catch (err) {
    console.error("runNegotiation failed:", err);
    return {};
  }
}

export async function pauseNegotiation(negotiationId: string, role: string) {
  try {
    const res = await apiFetch(`/api/negotiations/${negotiationId}/pause`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    return safeJson(res, {});
  } catch (err) {
    console.error("pauseNegotiation failed:", err);
    return {};
  }
}

export async function resumeNegotiation(negotiationId: string) {
  try {
    const res = await apiFetch(`/api/negotiations/${negotiationId}/resume`, {
      method: "POST",
    });
    return safeJson(res, {});
  } catch (err) {
    console.error("resumeNegotiation failed:", err);
    return {};
  }
}

export async function getInterviewKit(negotiationId: string) {
  try {
    const res = await apiFetch(`/api/negotiations/${negotiationId}/interview-kit`);
    return safeJson(res, null);
  } catch (err) {
    console.error("getInterviewKit failed:", err);
    return null;
  }
}
