import chromadb
from llama_index.core import VectorStoreIndex, StorageContext
from llama_index.vector_stores.chroma import ChromaVectorStore
from prototype.config.settings import embed_model

chroma_client = chromadb.PersistentClient(path="/home/buma04/ai-tutor/chromadb")

def load_database():
    """Connect database with ChromaDB backend."""
    chroma_collection = chroma_client.get_collection("unit1_db")
    vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)
    
    index = VectorStoreIndex.from_vector_store(
        vector_store=vector_store,
        embed_model=embed_model,
    )
    return index

def get_relevant_chunk(index, question_context, top_k=3):
    """Gets the most relevant chunks of text."""
    query_engine = index.as_query_engine(
        similarity_top_k=top_k,
        response_mode="no_text"
    )
    response = query_engine.query(question_context)
    return [node.node.text for node in response.source_nodes]