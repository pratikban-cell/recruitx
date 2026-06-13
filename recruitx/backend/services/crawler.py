import os
import httpx
from openai import OpenAI
from db.client import get_db

async def crawl_url(url: str) -> str:
    """
    Crawls the target URL keylessly using Jina Reader API to get a clean Markdown representation.
    """
    if not url:
        return ""
    
    url = url.strip()
    if not url.startswith("http"):
        url = "https://" + url
        
    jina_url = f"https://r.jina.ai/{url}"
    try:
        async with httpx.AsyncClient() as client:
            print(f"[Crawler] Fetching: {jina_url}")
            resp = await client.get(jina_url, timeout=20.0)
            if resp.status_code == 200:
                text = resp.text or ""
                # Cap the text size to avoid overloading LLM context limits (cap at 60k characters)
                return text[:60000]
            else:
                print(f"[Crawler] Jina Reader returned status {resp.status_code} for URL: {url}")
                return ""
    except Exception as e:
        print(f"[Crawler] Failed to crawl URL {url}: {str(e)}")
        return ""

async def crawl_github_api(token: str) -> str:
    """
    Queries the official GitHub API using the OAuth token to extract 
    user profile details and recent repository metadata, returning a formatted markdown summary.
    """
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "Nirvana-Agent-Platform"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            # 1. Fetch user profile
            print("[Crawler] Fetching GitHub profile via API...")
            profile_resp = await client.get("https://api.github.com/user", headers=headers, timeout=15.0)
            if profile_resp.status_code != 200:
                print(f"[Crawler] GitHub profile API returned status {profile_resp.status_code}: {profile_resp.text}")
                return ""
            
            profile = profile_resp.json()
            login = profile.get("login")
            name = profile.get("name") or login
            bio = profile.get("bio") or "No bio provided"
            public_repos = profile.get("public_repos", 0)
            total_private_repos = profile.get("total_private_repos", 0)
            followers = profile.get("followers", 0)
            
            # 2. Fetch repos
            print("[Crawler] Fetching GitHub repositories via API...")
            repos_resp = await client.get("https://api.github.com/user/repos?sort=updated&per_page=50", headers=headers, timeout=15.0)
            repos_list = []
            if repos_resp.status_code == 200:
                repos = repos_resp.json()
                for r in repos:
                    if r.get("fork"):
                        continue
                    repos_list.append({
                        "name": r.get("name"),
                        "description": r.get("description") or "No description",
                        "language": r.get("language") or "Not specified",
                        "stars": r.get("stargazers_count", 0),
                        "private": r.get("private", False)
                    })
            else:
                print(f"[Crawler] GitHub repos API returned status {repos_resp.status_code}")

            # 3. Format to markdown
            md = []
            md.append("### Live GitHub Profile (OAuth Verified)")
            md.append(f"- **Username:** {login} ({name})")
            md.append(f"- **Bio:** {bio}")
            md.append(f"- **Followers:** {followers}")
            md.append(f"- **Public Repositories:** {public_repos}")
            md.append(f"- **Private Repositories (Authorized Access):** {total_private_repos}")
            md.append("")
            md.append("### Recent Repository Contributions & Projects")
            if repos_list:
                for r in repos_list[:25]:
                    privacy = "Private" if r["private"] else "Public"
                    md.append(f"- **{r['name']}** ({r['language']}) - *{privacy} Repo* | Stars: {r['stars']}")
                    md.append(f"  Description: {r['description']}")
            else:
                md.append("No repositories found or available.")
            
            return "\n".join(md)
            
        except Exception as e:
            print(f"[Crawler] Error fetching from GitHub API: {str(e)}")
            return ""

async def enrich_profile(candidate_id: str):
    """
    Background worker that crawls candidate's GitHub and Portfolio URLs via Jina Reader,
    distills the information using gpt-4o-mini, and updates the candidate's profile bio.
    """
    print(f"[Crawler] Starting enrichment for candidate: {candidate_id}")
    db = get_db()
    
    # Load candidate row
    res = db.table("candidates").select("*").eq("id", candidate_id).execute()
    if not res.data:
        print(f"[Crawler] Candidate {candidate_id} not found in database.")
        return
        
    cand = res.data[0]
    github_url = cand.get("github_url")
    github_token = cand.get("github_token")
    portfolio_url = cand.get("portfolio_url")
    original_bio = cand.get("bio") or ""
    
    # If no URLs or tokens are provided, we don't need to crawl anything
    if not github_url and not portfolio_url and not github_token:
        print(f"[Crawler] Candidate {candidate_id} has no GitHub or Portfolio details. Skipping.")
        return

    # Extract original raw resume bio from serialized availability if bio column is clean or empty
    if not original_bio:
        import urllib.parse
        avail = cand.get("availability") or ""
        if "bio:" in avail:
            try:
                parts = avail.split("|")
                for p in parts:
                    if p.startswith("bio:"):
                        original_bio = urllib.parse.unquote(p.split(":", 1)[1])
                        break
            except Exception:
                pass
                
    github_text = ""
    portfolio_text = ""
    
    # 1. Crawl GitHub Profile
    if github_token:
        print("[Crawler] Crawling GitHub using official API token...")
        github_text = await crawl_github_api(github_token)
        
    if not github_text and github_url:
        print(f"[Crawler] Falling back to keyless HTML crawl for GitHub: {github_url}")
        github_text = await crawl_url(github_url)
        
    # 2. Crawl Portfolio via Jina Reader
    if portfolio_url:
        print(f"[Crawler] Crawling Portfolio: {portfolio_url}")
        portfolio_text = await crawl_url(portfolio_url)
        
    if not github_text and not portfolio_text:
        print("[Crawler] Both scrapes returned empty. Skipping LLM enrichment.")
        return

    # 3. Use gpt-4o-mini to summarize/distill the scrapes
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("[Crawler] OpenAI key missing. Skipping summarization.")
        return
        
    client = OpenAI(api_key=api_key)
    
    system_prompt = """You are an elite, highly detailed AI technical recruiter.
Analyze the raw markdown web scrapes from a candidate's GitHub profile and portfolio site.
Distill this live information into a highly professional, verified accomplishments summary.
Highlight:
- Verified GitHub Profile details: list their actual popular/pinned repositories, languages used, activity indicators (e.g. contribution graph counts), and notable codebase structures.
- Portfolio Highlights: list featured portfolio projects, actual live demos, work highlights, and visual/technical experience.

Keep the summary compact, objective, extremely detailed, and professional (under 250 words total).
Do not exaggerate, make up details, or write pleasantries. Return only the distilled markdown points."""

    user_content = ""
    if github_text:
        user_content += f"=== RAW GITHUB SCRAPE ===\n{github_text[:20000]}\n=========================\n\n"
    if portfolio_text:
        user_content += f"=== RAW PORTFOLIO SCRAPE ===\n{portfolio_text[:20000]}\n============================\n"

    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            temperature=0.3,
        )
        crawled_summary = resp.choices[0].message.content or ""
    except Exception as e:
        print(f"[Crawler] OpenAI request failed: {str(e)}")
        return

    # 4. Save the enriched bio in Supabase candidates table
    enriched_bio = original_bio.split("\n\n--- Verified Live Sourced Credentials ---")[0]
    
    enriched_bio += "\n\n--- Verified Live Sourced Credentials ---\n"
    enriched_bio += crawled_summary.strip()
    
    print("[Crawler] Saving enriched bio to database.")
    db.table("candidates").update({
        "bio": enriched_bio
    }).eq("id", candidate_id).execute()
    
    print(f"[Crawler] Completed enrichment successfully for candidate: {candidate_id}")
