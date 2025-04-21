import os
from dotenv import load_dotenv
from llama_index.llms.gemini import Gemini
from llama_index.llms.ollama import Ollama
from transformers import pipeline

_ = load_dotenv(dotenv_path=".env", override=True)

os.environ["GEMINI_API_KEY"] = os.getenv('GEMINI_API_KEY')
llm = Gemini(model="models/gemini-2.0-flash", temperature=1)
# llm = Ollama(
#     model='gemma3:12b',
#     temperature=1
# )
img_model = "gemini-2.0-flash-exp-image-generation"
asr_model = pipeline(model="vitouphy/wav2vec2-xls-r-300m-timit-phoneme")
