import os
from dotenv import load_dotenv, find_dotenv
from langchain_huggingface import HuggingFaceEmbeddings
from llama_index.embeddings.langchain import LangchainEmbedding
from llama_index.llms.gemini import Gemini
from llama_index.llms.ollama import Ollama
from llama_index.core import Settings

_ = load_dotenv(find_dotenv())

# Initialize Gemini
os.environ["GEMINI_API_KEY"] = os.getenv('GEMINI_API_KEY')
llm = Gemini(model="models/gemini-2.0-flash", temperature=1)
# llm = Ollama(
#     model='gemma3:12b',
#     temperature=1
# )
# Initialize embedding model
lc_embed_model = HuggingFaceEmbeddings(
    model_name="intfloat/multilingual-e5-small"
)
embed_model = LangchainEmbedding(lc_embed_model)
Settings.embed_model = embed_model