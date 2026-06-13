from __future__ import annotations
from typing import Literal

# ── A2A message types for recruitx negotiation ──────────

NegotiationRound = Literal[1, 2, 3, 4]
NegotiationStatus = Literal[
    "alignment_check",
    "deeper_qualification",
    "soft_signals",
    "scheduling",
    "completed",
    "rejected",
    "escalated",
]


class NegotiationMessage:
    """A structured message exchanged between agents during negotiation."""

    def __init__(
        self,
        sender_role: Literal["candidate_agent", "recruiter_agent"],
        round: NegotiationRound,
        content: str,
        payload: dict | None = None,
    ):
        self.sender_role = sender_role
        self.round = round
        self.content = content
        self.payload = payload or {}


class FitScoreInput:
    """Input to the fit score calculation."""

    def __init__(
        self,
        candidate_verified_skills: dict,
        candidate_salary_min: int | None,
        candidate_salary_target: int | None,
        candidate_dealbreakers: list[str],
        candidate_priorities: list[str],
        recruiter_requirements: dict,
        recruiter_salary_ceiling: int | None,
        recruiter_salary_budget: int | None,
        recruiter_must_haves: list[str],
        recruiter_dealbreakers: list[str],
        negotiation_history: list[NegotiationMessage] | None = None,
    ):
        self.candidate_verified_skills = candidate_verified_skills
        self.candidate_salary_min = candidate_salary_min
        self.candidate_salary_target = candidate_salary_target
        self.candidate_dealbreakers = candidate_dealbreakers
        self.candidate_priorities = candidate_priorities
        self.recruiter_requirements = recruiter_requirements
        self.recruiter_salary_ceiling = recruiter_salary_ceiling
        self.recruiter_salary_budget = recruiter_salary_budget
        self.recruiter_must_haves = recruiter_must_haves
        self.recruiter_dealbreakers = recruiter_dealbreakers
        self.negotiation_history = negotiation_history or []


def calculate_fit_score(input: FitScoreInput) -> float:
    """Compute a weighted fit score (0.0–1.0) from both sides' data."""

    # Dealbreaker check — immediate 0 if triggered
    if any_dealbreaker_triggered(input):
        return 0.0

    weights = {
        "dealbreaker_clear": 0.30,
        "skill_verified_match": 0.25,
        "salary_overlap": 0.20,
        "priority_alignment": 0.15,
        "culture_signals": 0.10,
    }

    score = weights["dealbreaker_clear"]

    skill_match = _compute_skill_overlap(
        input.candidate_verified_skills, input.recruiter_requirements
    )
    score += weights["skill_verified_match"] * skill_match

    salary_overlap = _compute_salary_overlap(
        input.candidate_salary_min,
        input.candidate_salary_target,
        input.recruiter_salary_ceiling,
        input.recruiter_salary_budget,
    )
    score += weights["salary_overlap"] * salary_overlap

    priority_score = _compute_priority_alignment(
        input.candidate_priorities, input.recruiter_must_haves
    )
    score += weights["priority_alignment"] * priority_score

    # BUG FIX: Add the missing culture signals weight to the score (defaults to 1.0)
    score += weights["culture_signals"] * 1.0

    return round(score, 3)
def any_dealbreaker_triggered(input: FitScoreInput) -> bool:
    """Check if any dealbreaker from either side is triggered."""
    # 1. Salary check - absolute dealbreaker if candidate's min exceeds recruiter's ceiling (only if recruiter has salary limit dealbreaker enabled)
    has_salary_db = any("salary limit" in d.lower() for d in input.recruiter_dealbreakers)
    if has_salary_db and input.candidate_salary_min and input.recruiter_salary_ceiling:
        if input.candidate_salary_min > input.recruiter_salary_ceiling:
            return True

    # 2. Parse candidate dealbreakers
    for d in input.candidate_dealbreakers:
        d_clean = d.lower().strip()
        # If candidate rejects onsite: "no onsite", "remote only", "requires remote"
        if "onsite" in d_clean or "on-site" in d_clean:
            if "no" in d_clean or "not" in d_clean or "remote only" in d_clean or "requires remote" in d_clean:
                rec_str = str(input.recruiter_must_haves).lower()
                if "onsite" in rec_str or "on-site" in rec_str:
                    return True
        
        # If candidate rejects hybrid
        if "hybrid" in d_clean and ("no" in d_clean or "not" in d_clean):
            rec_str = str(input.recruiter_must_haves).lower()
            if "hybrid" in rec_str:
                return True

    # 3. Parse recruiter dealbreakers
    for d in input.recruiter_dealbreakers:
        d_clean = d.lower().strip()
        
        # If recruiter rejects remote: "no remote"
        if "remote" in d_clean and ("no" in d_clean or "not" in d_clean or "unable" in d_clean):
            cand_str = str(input.candidate_priorities).lower() + str(input.candidate_dealbreakers).lower()
            if "remote only" in cand_str or "requires remote" in cand_str:
                return True

        # If recruiter dealbreaker is a required skill (e.g. "requires python", "must have react"),
        # then candidate must have it. If negative (e.g. "no php"), candidate must not have it.
        if "no " in d_clean or "not " in d_clean or "without " in d_clean:
            skill_name = d_clean.replace("no ", "").replace("not ", "").replace("without ", "").strip()
            if skill_name in input.candidate_verified_skills:
                return True
        elif "need" in d_clean or "require" in d_clean or "must" in d_clean:
            skill_name = d_clean.replace("requires ", "").replace("require ", "").replace("must have ", "").replace("needs ", "").replace("need ", "").strip()
            if skill_name and skill_name not in input.candidate_verified_skills:
                has_skill = any(skill_name in sk.lower() for sk in input.candidate_verified_skills.keys())
                if not has_skill:
                    return True
    
    return False


def _compute_skill_overlap(
    verified_skills: dict, requirements: dict
) -> float:
    """Compute ratio of required skills found in verified skills, with a baseline boost."""
    if not requirements:
        return 1.0
    required = set(requirements.keys()) if isinstance(
        requirements, dict
    ) else set()
    if not required:
        return 1.0
    verified = set(verified_skills.keys())
    matched = required & verified
    if not matched:
        return 0.0
    # Non-linear boost so matching some skills gives a higher baseline score
    ratio = len(matched) / len(required)
    return 0.6 + 0.4 * ratio


def _compute_salary_overlap(
    candidate_min: int | None,
    candidate_target: int | None,
    recruiter_ceiling: int | None,
    recruiter_budget: int | None,
) -> float:
    """Assess salary compatibility based on candidate minimum and recruiter budget/ceiling."""
    low = candidate_min or 0
    high = recruiter_ceiling or recruiter_budget or 0
    if high <= 0 or (low > high and high > 0):
        return 0.0
        
    budget = recruiter_budget or int(high * 0.8)
    if low <= budget:
        return 1.0
    else:
        # Candidate's minimum is between the budget and the ceiling
        span = high - budget
        if span <= 0:
            return 1.0
        pct = (low - budget) / span
        return round(1.0 - pct * 0.25, 3) # Returns between 0.75 and 1.0


def _compute_priority_alignment(
    candidate_priorities: list[str], recruiter_signals: list[str]
) -> float:
    """Simple alignment score based on shared keywords with a high baseline."""
    if not candidate_priorities or not recruiter_signals:
        return 0.8
    combined = " ".join(candidate_priorities).lower()
    matches = sum(
        1 for s in recruiter_signals if s.lower() in combined
    )
    ratio = matches / len(recruiter_signals) if recruiter_signals else 1.0
    return 0.6 + 0.4 * min(ratio, 1.0)
