import httpx

url = "https://r.jina.ai/https://github.com/VirajSawad1021"
headers = {
    "X-Return-Format": "text"
}

try:
    print("Fetching from Jina Reader...")
    res = httpx.get(url, headers=headers, timeout=10)
    print("Status:", res.status_code)
    print("Snippet:")
    print(res.text[:800])
except Exception as e:
    print("Error:", e)
