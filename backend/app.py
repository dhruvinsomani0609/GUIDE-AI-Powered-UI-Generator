from deep_translator import GoogleTranslator
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import traceback
from langdetect import detect 
from googletrans import Translator 

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_URL = "http://localhost:11434/api/chat"
MODEL_NAME = "codellama:instruct"  # Use best for HTML

# SYSTEM PROMPT
HTML_SYSTEM_PROMPT = """
You are an expert frontend UI developer.

Given a natural language prompt, generate valid HTML5 with embedded CSS.

Rules:
- Output must begin with <!DOCTYPE html> and end with </html>
- Embed <style> CSS in the <head>
- NO markdown, explanations, triple backticks, or descriptions
- Only raw HTML is allowed
"""

class Prompt(BaseModel):
    text: str

# Initialize translator
translator = Translator()

# 🔁 Translate if not English
def translate_to_english(text: str) -> str:
    detected = translator.detect(text)
    if detected.lang != 'en':
        print(f"🌐 Detected language: {detected.lang}, translating to English...")
        translated = translator.translate(text, dest='en')
        return translated.text
    return text

# Call Ollama LLM
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
            print("🔁 Raw Ollama Response:\n", content[:500])
            return content
        except httpx.HTTPStatusError as e:
            print("❌ HTTP error:", e)
            raise Exception(f"Ollama returned HTTP {e.response.status_code}")
        except Exception as e:
            print("❌ Unexpected error in call_ollama:", str(e))
            raise e


# Preview Endpoint
@app.post("/preview", response_class=HTMLResponse)
async def preview_ui(p: Prompt):
    try:
        print(f"🧪 Original Prompt: {p.text}")

        # Step 1: Detect language
        detected_lang = detect(p.text)
        print(f"🌐 Detected language: {detected_lang}")

        # Step 2: Translate only if not English
        if detected_lang != "en":
            translated = GoogleTranslator(source='auto', target='en').translate(p.text)
            print(f"🔤 Translated Prompt: {translated}")
        else:
            translated = p.text
            print("🔤 No translation needed (English detected).")

        # Step 3: Send to LLM
        html = await call_ollama(HTML_SYSTEM_PROMPT, translated)

        # Step 4: Strip any extra formatting
        html = html.strip().strip("`")
        if "<!DOCTYPE html" in html:
            html = html[html.index("<!DOCTYPE html"):]
        else:
            raise Exception("LLM response missing HTML")

        return HTMLResponse(content=html, status_code=200)

    except Exception as e:
        print("❌ Error:", str(e))
        return HTMLResponse(
            content=f"<h1>Backend Error</h1><pre>{traceback.format_exc()}</pre>",
            status_code=500
        )

@app.get("/health")
async def health():
    return {"status": "ok"}
