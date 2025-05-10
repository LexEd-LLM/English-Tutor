import os
from dotenv import load_dotenv
from llama_index.llms.gemini import Gemini
from llama_index.llms.ollama import Ollama
from backend.libs.vllm import VllmServer
from transformers import pipeline

_ = load_dotenv(dotenv_path=".env", override=True)

os.environ["GEMINI_API_KEY"] = os.getenv('GEMINI_API_KEY')
llm = Gemini(model="models/gemini-2.0-flash", temperature=1)
# llm = VllmServer(api_url="http://localhost:8800/v1/generate", max_new_tokens=4096, temperature=0.6)
img_model = "gemini-2.0-flash-exp-image-generation"
asr_model = pipeline(model="vitouphy/wav2vec2-xls-r-300m-timit-phoneme", device='cpu')
