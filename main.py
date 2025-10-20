from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import google.generativeai as genai
from dotenv import load_dotenv
import asyncio
import os

# Load environment variables
load_dotenv()
API_KEY = os.getenv("GENAI_API_KEY")
genai.configure(api_key=API_KEY)

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Load medical prompt
with open("prompts/medical_prompt.txt", encoding="utf-8") as f:
    PROMPT_TEMPLATE = f.read()


@app.get("/", response_class=HTMLResponse)
async def get_chat(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/chat")
async def chat(request: Request):
    try:
        data = await request.json()
        conversation = data.get("conversation", [])

        history_text = ""
        for msg in conversation:
            role = "User" if msg["role"] == "user" else "Bot"
            history_text += f"{role}: {msg['content']}\n"

        prompt = PROMPT_TEMPLATE.format(history_text=history_text)

        loop = asyncio.get_event_loop()
        model = genai.GenerativeModel("gemini-2.0-flash")

        def generate():
            response = model.generate_content(prompt)
            return response.text

        bot_text = await loop.run_in_executor(None, generate)

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
