# ============================================
# UNESUM RAG System - Configuración
# ============================================
import os
from pathlib import Path

# Rutas
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data" / "pdfs"
CHROMA_DIR = BASE_DIR / "data" / "chroma_db"

# Crear directorios si no existen
DATA_DIR.mkdir(parents=True, exist_ok=True)
CHROMA_DIR.mkdir(parents=True, exist_ok=True)

# Embeddings
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

# Chunking
CHUNK_SIZE = 800
CHUNK_OVERLAP = 200
TABLE_CHUNK_OVERLAP_RATIO = 1.0  # overlap = tamaño promedio de fila

# ChromaDB
COLLECTION_NAME = "unesum_curricular"

# LLM (por defecto usa OpenAI, pero se puede cambiar)
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai")  # "openai", "ollama", "local"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "mistral")

# FastAPI
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8100"))
