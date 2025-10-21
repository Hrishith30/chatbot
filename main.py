from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from openai import AsyncOpenAI  # <-- CHANGED
from dotenv import load_dotenv
import os
import json

# Load environment variables
load_dotenv()
# --- MODIFIED: Use OPENAI_API_KEY ---
API_KEY = os.getenv("OPENAI_API_KEY")
if not API_KEY:
    raise ValueError("OPENAI_API_KEY environment variable not set.")

# --- MODIFIED: Initialize AsyncOpenAI client ---
client = AsyncOpenAI(api_key=API_KEY)

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# --- MODIFIED: Load prompt and extract the system message ---
try:
    with open("prompts/medical_prompt.txt", encoding="utf-8") as f:
        PROMPT_CONTENT = f.read()
    
    # Split the prompt to get only the system instructions
    # This makes it compatible with your old prompt file
    SYSTEM_PROMPT = PROMPT_CONTENT.split("Conversation so far:")[0].strip()
    if not SYSTEM_PROMPT:
         SYSTEM_PROMPT = "You are a helpful medical chatbot."

except FileNotFoundError:
    print("Warning: 'prompts/medical_prompt.txt' not found. Using default system prompt.")
    SYSTEM_PROMPT = "You are a helpful medical chatbot. Please add the medical disclaimer."
except Exception as e:
    print(f"Error loading prompt, using default: {e}")
    SYSTEM_PROMPT = "You are a helpful medical chatbot. Please add the medical disclaimer."


@app.get("/", response_class=HTMLResponse)
async def get_chat(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/get-suggestions")
async def get_suggestions():
    try:
        prompt = """
        Generate 50 brief, common medical questions a user might ask a medical chatbot.
        Return *only* a valid JSON-formatted list of strings.
        Example: ["Question 1", "Question 2", "Question 3", ..., "Question 50"]
        Do not include any other text, markdown, or explanations.
        """
        
        # --- MODIFIED: OpenAI Async API Call ---
        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",  # Good, fast model for JSON generation
            messages=[
                {"role": "system", "content": "You are an assistant that only returns valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.5,
        )
        response_text = response.choices[0].message.content
        # --- End of modification ---

        # Clean the response text (same as before)
        clean_text = response_text.strip().replace("```json", "").replace("```", "").strip()
        suggestions_list = json.loads(clean_text)
        
        return JSONResponse({"suggestions": suggestions_list})

    except Exception as e:
        print(f"Error generating suggestions: {e}")
        # Fallback list (same as before)
        fallback_suggestions = [
            "What are the symptoms of the flu?",
            "How do I treat a common cold?",
            "Tell me about Type 2 diabetes.",
            "Medicines for Asthma taken by oral.",
            "What causes high blood pressure?",
            "Symptoms of a migraine headache"
        ]
        return JSONResponse({"suggestions": fallback_suggestions})


@app.post("/chat")
async def chat(request: Request):
    try:
        data = await request.json()
        conversation = data.get("conversation", [])

        # --- MODIFIED: Prepare messages for OpenAI API ---
        # 1. Start with the system prompt
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        # 2. Add the conversation history, translating roles
        for msg in conversation:
            # Translate "bot" to "assistant" for the OpenAI API
            role = "assistant" if msg["role"] == "bot" else "user"
            messages.append({"role": role, "content": msg["content"]})
        # --- End of modification ---

        # --- MODIFIED: OpenAI Async API Call ---
        response = await client.chat.completions.create(
            model="gpt-4o-mini",  # Use a modern, capable model
            messages=messages,
            temperature=0.7,
        )
        bot_text = response.choices[0].message.content
        # --- End of modification ---

        return JSONResponse({"bot_response": bot_text})

    except Exception as e:
        print("Error:", e)
        return JSONResponse(
            {"bot_response": "⚠️ Sorry, something went wrong. Please try again."},
            status_code=500
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)