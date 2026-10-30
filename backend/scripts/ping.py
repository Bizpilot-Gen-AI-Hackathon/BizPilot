import sys
import time

from google import genai

from app.config import settings


models = sys.argv[1:] or settings.gemma_models
client = genai.Client(api_key=settings.gemini_api_key)

for model in models:
    for attempt in range(1, 4):
        started = time.time()
        try:
            response = client.models.generate_content(
                model=model, contents="Say hello in one short sentence."
            )
            print(f"OK   {model}: {response.text.strip()} ({time.time() - started:.1f}s)")
            break
        except Exception as error:
            print(
                f"FAIL {model} attempt {attempt}: "
                f"{type(error).__name__}: {str(error)[:400]}"
            )
            time.sleep(3)
