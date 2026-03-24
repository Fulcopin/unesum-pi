# ============================================
# API FastAPI para el sistema RAG de UNESUM
# ============================================
import os
import shutil
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .config import DATA_DIR, API_HOST, API_PORT
from .pdf_extractor import PDFExtractor, extract_all_pdfs
from .chunking import CurricularTextSplitter
from .vectorstore import VectorStore
from .rag_chain import RAGChain, RAGSearchOnly

app = FastAPI(
    title="UNESUM RAG API",
    description="Sistema RAG para consulta de documentos curriculares de UNESUM",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instancias globales (lazy init)
_vector_store: VectorStore | None = None
_rag_chain: RAGChain | None = None
_search_only: RAGSearchOnly | None = None


def get_vector_store() -> VectorStore:
    global _vector_store
    if _vector_store is None:
        _vector_store = VectorStore()
    return _vector_store


def get_search() -> RAGSearchOnly:
    global _search_only
    if _search_only is None:
        _search_only = RAGSearchOnly(get_vector_store())
    return _search_only


def get_rag() -> RAGChain:
    global _rag_chain
    if _rag_chain is None:
        _rag_chain = RAGChain(get_vector_store())
    return _rag_chain


# ---- Schemas ----

class QueryRequest(BaseModel):
    question: str
    k: int = 5


class SearchRequest(BaseModel):
    query: str
    k: int = 5


class IngestResponse(BaseModel):
    filename: str
    regions_extracted: int
    chunks_created: int
    status: str


# ---- Endpoints ----

@app.get("/")
async def root():
    vs = get_vector_store()
    return {
        "service": "UNESUM RAG System",
        "status": "running",
        "documents_indexed": vs.count_documents(),
    }


@app.get("/stats")
async def stats():
    """Estadísticas del sistema."""
    vs = get_vector_store()
    pdf_count = len(list(DATA_DIR.glob("*.pdf")))
    return {
        "total_chunks_indexed": vs.count_documents(),
        "pdfs_in_directory": pdf_count,
        "pdf_directory": str(DATA_DIR),
    }


@app.post("/upload", response_model=IngestResponse)
async def upload_pdf(file: UploadFile = File(...)):
    """Sube un PDF y lo indexa en ChromaDB."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Solo se aceptan archivos PDF")

    # Guardar archivo
    safe_filename = Path(file.filename).name  # Evitar path traversal
    file_path = DATA_DIR / safe_filename
    content = await file.read()
    file_path.write_bytes(content)

    # Procesar
    try:
        extractor = PDFExtractor()
        regions = extractor.extract(file_path)

        splitter = CurricularTextSplitter()
        documents = splitter.split_regions(regions)

        vs = get_vector_store()
        count = vs.add_documents(documents)

        return IngestResponse(
            filename=safe_filename,
            regions_extracted=len(regions),
            chunks_created=count,
            status="success",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error procesando PDF: {str(e)}")


@app.post("/ingest-all")
async def ingest_all():
    """Procesa todos los PDFs en el directorio data/pdfs/."""
    regions = extract_all_pdfs(DATA_DIR)
    if not regions:
        return {"status": "no_pdfs", "message": f"No hay PDFs en {DATA_DIR}"}

    splitter = CurricularTextSplitter()
    documents = splitter.split_regions(regions)

    vs = get_vector_store()
    count = vs.add_documents(documents)

    return {
        "status": "success",
        "regions_extracted": len(regions),
        "chunks_created": count,
        "total_indexed": vs.count_documents(),
    }


@app.post("/query")
async def query(request: QueryRequest):
    """
    Consulta RAG completa: busca documentos relevantes y genera respuesta con LLM.
    Requiere OPENAI_API_KEY o Ollama corriendo.
    """
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="La pregunta no puede estar vacía")

    try:
        rag = get_rag()
        result = rag.query(request.question)
        return result
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.post("/search")
async def search(request: SearchRequest):
    """
    Búsqueda semántica sin LLM.
    Retorna los documentos más relevantes sin generar respuesta.
    No requiere API key.
    """
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="La consulta no puede estar vacía")

    search_engine = get_search()
    results = search_engine.search(request.query, k=request.k)
    return {
        "query": request.query,
        "results": results,
        "total_results": len(results),
    }


@app.get("/documents")
async def list_documents():
    """Lista los PDFs cargados."""
    pdfs = list(DATA_DIR.glob("*.pdf"))
    return {
        "documents": [
            {"name": p.name, "size_kb": round(p.stat().st_size / 1024, 1)}
            for p in pdfs
        ],
        "total": len(pdfs),
    }


def start():
    """Inicia el servidor."""
    import uvicorn
    uvicorn.run(
        "rag_system.api:app",
        host=API_HOST,
        port=API_PORT,
        reload=True,
    )
