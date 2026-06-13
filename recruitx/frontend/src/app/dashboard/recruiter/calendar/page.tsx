"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-client";

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

type CalendarEvent = {
  day: number;
  month: number;
  year: number;
  title: string;
  time: string;
  type: string;
  meetLink: string;
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function RecruiterCalendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = now.getDate();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: recruiter } = await supabase
        .from("recruiters")
        .select("id")
        .eq("profile_id", user.id)
        .single();

      if (recruiter) {
        const { data: negs } = await supabase
          .from("negotiations")
          .select("*, candidate:candidates(*), messages(*)")
          .eq("recruiter_id", recruiter.id)
          .eq("status", "scheduled");

        if (negs && negs.length > 0) {
          const mapped = negs.map((n: any) => {
            // Find system message containing Google Meet
            const sysMsg = n.messages?.find(
              (m: any) => m.sender_role === "system" && m.content.includes("Google Meet video link:")
            );

            let eventDate = new Date(n.updated_at || n.created_at);
            eventDate.setDate(eventDate.getDate() + 3); // Fallback
            let timeStr = "2:00 PM";
            let meetLink = "";

            if (sysMsg) {
              const timeMatch = sysMsg.content.match(/scheduled an interview for (.*?)\. Google Meet/);
              const linkMatch = sysMsg.content.match(/Google Meet video link:\s*([^\s]+)/);
              
              if (timeMatch && timeMatch[1]) {
                const parsed = new Date(timeMatch[1]);
                if (!isNaN(parsed.getTime())) {
                  eventDate = parsed;
                  timeStr = parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }
              }
              if (linkMatch && linkMatch[1]) {
                meetLink = linkMatch[1];
              }
            }

            return {
              day: eventDate.getDate(),
              month: eventDate.getMonth(),
              year: eventDate.getFullYear(),
              title: `Interview: ${n.candidate?.title || "Candidate Agent"}`,
              time: timeStr,
              type: "interview",
              meetLink,
            };
          });
          setEvents(mapped);
        } else {
          setEvents([]);
        }
      }
      setLoading(false);
    };
    load();
  }, []);

  const prev = () => {
    if (month === 0) {
      setYear(y => y - 1);
      setMonth(11);
    } else {
      setMonth(m => m - 1);
    }
  };

  const next = () => {
    if (month === 11) {
      setYear(y => y + 1);
      setMonth(0);
    } else {
      setMonth(m => m + 1);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  // Filter events for the currently viewed month and year
  const activeEvents = events.filter(e => e.month === month && e.year === year);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={prev} className="rounded-lg border border-card-border p-2 text-muted hover:bg-subtle hover:text-foreground transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-foreground">{months[month]} {year}</h2>
          <button onClick={next} className="rounded-lg border border-card-border p-2 text-muted hover:bg-subtle hover:text-foreground transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-card-border bg-white shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-card-border">
          {days.map((d) => (
            <div key={d} className="px-3 py-2.5 text-center text-xs font-medium text-muted bg-subtle/50 border-r border-card-border last:border-r-0">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[100px] border-b border-r border-card-border/60 p-2 bg-gray-50/30" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayEvents = activeEvents.filter((e) => e.day === day);
            const isToday = day === today && month === now.getMonth() && year === now.getFullYear();
            return (
              <div key={day} className={`min-h-[100px] border-b border-r border-card-border/60 p-2 ${isToday ? "bg-accent/5" : "hover:bg-subtle/30"} transition-colors`}>
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${isToday ? "bg-accent text-white" : "text-foreground"}`}>{day}</span>
                <div className="mt-1 space-y-1">
                  {dayEvents.map((e, j) => (
                    <div key={j} className="rounded px-1.5 py-0.5 text-[10px] font-medium truncate bg-purple-50 text-purple-700 border border-purple-100">
                      {e.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-card-border bg-white shadow-sm p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Upcoming Interviews</h3>
        {events.length === 0 ? (
          <p className="text-xs text-muted">No interviews scheduled yet. Once your AI agent completes a negotiation, your schedule will appear here.</p>
        ) : (
          <div className="space-y-3">
            {events.map((e, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-card-border hover:shadow-sm transition-all">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
                    <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{e.title}</p>
                    <p className="text-xs text-muted">{months[e.month]} {e.day}, {e.year} at {e.time}</p>
                  </div>
                </div>
                {e.meetLink ? (
                  <a
                    href={e.meetLink}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent/90 transition-all shadow-sm text-center"
                  >
                    Join Google Meet
                  </a>
                ) : (
                  <span className="text-[10px] uppercase bg-gray-100 px-2.5 py-1 rounded text-muted font-semibold tracking-wider self-start sm:self-center">
                    Pending Link
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
