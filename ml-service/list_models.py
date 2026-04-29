import os
import google.generativeai as genai
from dotenv import load_dotenv
from pathlib import Path

# Load .env from project root
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("❌ GEMINI_API_KEY not found in .env")
else:
    genai.configure(api_key=api_key)
    print(f"✅ API Key loaded: {api_key[:10]}...")
    
    try:
        print("Listing available models...")
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f"Model: {m.name} (Supports content generation)")
    except Exception as e:
        print(f"❌ Error listing models: {e}")
