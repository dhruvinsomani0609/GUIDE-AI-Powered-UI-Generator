from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
import httpx
import traceback

app = FastAPI()

# Enable all CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_URL = "http://localhost:11434/api/chat"
MODEL_NAME = "llama3:latest"

# Prompt to generate clean HTML
HTML_SYSTEM_PROMPT = """
You are a frontend UI expert. Given a natural language prompt, return only the HTML and embedded CSS required to render a clean GUI.

Strict rules:
- Return only valid HTML with embedded <style> in the <head>.
- NO explanations, descriptions, markdown, comments, or triple backticks.
- Do not describe what the code does.
- Just return pure HTML (no markdown formatting).

Your output must always start with <!DOCTYPE html> and end with </html>.
"""

class Prompt(BaseModel):
    text: str

# Core call to Ollama
async def call_ollama(system_prompt: str, user_prompt: str):
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "stream": False
    }

    async with httpx.AsyncClient(timeout=180) as client:
        try:
            response = await client.post(OLLAMA_URL, json=payload)
            response.raise_for_status()
            content = response.json()["message"]["content"]
            print("🧠 Raw Ollama Response:\n", content[:500])
            return content
        except httpx.HTTPStatusError as e:
            raise Exception(f"Ollama returned HTTP {e.response.status_code}")
        except Exception as e:
            raise e

@app.post("/preview", response_class=HTMLResponse)
async def preview_ui(p: Prompt):
    try:
        print(f"🧪 Preview prompt: {p.text}")
        html = await call_ollama(HTML_SYSTEM_PROMPT, p.text)

        # 🧽 Remove surrounding markdown if present
        html = html.strip().strip("`")
        if html.startswith("```html"):
            html = html[7:]
        elif html.startswith("```"):
            html = html[3:]
        if html.endswith("```"):
            html = html[:-3]

        # Remove any explanation text before the first <html> or <button>
        if "<!DOCTYPE html" in html:
            html = html[html.index("<!DOCTYPE html"):]
        elif "<button" in html:
            html = html[html.index("<button"):]

        return HTMLResponse(content=html, status_code=200)

    except Exception as e:
        return HTMLResponse(content=f"<h1>Error:</h1><pre>{str(e)}</pre>", status_code=500)


@app.get("/health")
async def health():
    try:
        _ = await call_ollama(HTML_SYSTEM_PROMPT, "Simple login form")
        return {"status": "ok", "ollama_status": "connected", "model": MODEL_NAME}
    except Exception as e:
        return {"status": "error", "ollama_status": "failed", "error": str(e)}

@app.get("/")
def root():
    return {
        "message": "LLM-powered UI generation server is running",
        "endpoints": ["/generate", "/preview", "/health"]
    }
