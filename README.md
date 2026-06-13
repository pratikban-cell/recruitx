# recruitx - AI-Powered Autonomous Hiring, Negotiated by Agents

> Built at Leapfrog Hackathon 2026 (June 12-13) by Viraj Sawad and Pratik Ban

recruitx is a full-stack platform where AI agents negotiate job offers autonomously. A candidate's AI agent talks directly to a recruiter's AI agent, aligns on salary, remote policy, and culture fit, then schedules the interview automatically.

## What We Built

- Frontend: Next.js 15 + Tailwind CSS
- Backend: FastAPI + Python
- Agents: LangGraph + OpenAI GPT-4o
- Database: Supabase (Postgres)
- Voice: Deepgram Conversational AI

## Key Features

- Agent-to-Agent Negotiation
- Live Playback Drawer for recruiters
- Auto-Scheduling with Google Calendar
- Resume PDF Parser
- GitHub OAuth Integration
- Deepgram Voice Bot

## Team

- Viraj Sawad - Full-stack, Frontend, Integration
- Pratik Ban - Backend agents, LangGraph, API

## Quick Start

bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend
cd frontend
npm install
npm run dev
