export const mockNegotiations: Array<{
  id: string;
  status: string;
  fit_score: number;
  created_at: string;
  recruiter: Array<{ company: string; position: string }>;
}> = [];

export const mockRecruiterNegotiations: Array<{
  id: string;
  status: string;
  fit_score: number;
  created_at: string;
  candidate: Array<{ title: string; skills: string[]; salary_min: number }>;
}> = [];

export const mockKanbanData: Array<{
  id: string;
  candidate_name: string;
  title: string;
  company: string;
  fit_score: number;
  status: string;
  action_label?: string;
  skills: string[];
  created_at: string;
  last_message?: string;
  meeting_time?: string;
  salary?: string;
  reason?: string;
  is_paused?: boolean;
}> = [];

export const mockMessages: Array<{
  id: string;
  sender_role: "candidate" | "recruiter" | "system";
  content: string;
  created_at: string;
}> = [];

export const mockJobs: Array<{
  id: string;
  company: string;
  title: string;
  location: string;
  remote_policy: "remote" | "hybrid" | "onsite";
  salary_min: number;
  salary_max: number;
  stack: string[];
  description: string;
  culture_signals: string;
  experience_required: string;
  dealbreaker_flexibility: string;
  status: string;
  fit_score: number;
  created_at: string;
}> = [];

export const mockProfile = {
  id: "mock-profile",
  role: "candidate",
  name: "Luffy",
  created_at: new Date().toISOString(),
};
