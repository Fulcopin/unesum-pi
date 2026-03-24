# ============================================
# Script de ingesta de documentos PDF
# Uso: python -m rag_system.ingest
# ============================================
import sys
from pathlib import Path

from .config import DATA_DIR
from .pdf_extractor import extract_all_pdfs
from .chunking import CurricularTextSplitter
from .vectorstore import VectorStore


def ingest(pdf_dir: str | None = None):
    """Procesa PDFs y los indexa en ChromaDB."""
    directory = Path(pdf_dir) if pdf_dir else DATA_DIR

    print("=" * 60)
    print("  UNESUM RAG - Ingesta de Documentos")
    print("=" * 60)
    print(f"\nDirectorio de PDFs: {directory}")

    # 1. Extraer contenido de PDFs
    print("\n[1/3] Extrayendo contenido de PDFs...")
    regions = extract_all_pdfs(directory)
    if not regions:
        print("No se encontraron PDFs. Coloca archivos PDF en:")
        print(f"  {directory}")
        return

    text_regions = sum(1 for r in regions if r.region_type == "text")
    table_regions = sum(1 for r in regions if r.region_type == "table")
    print(f"  Total regiones: {len(regions)} ({text_regions} texto, {table_regions} tablas)")

    # 2. Chunking
    print("\n[2/3] Dividiendo en chunks...")
    splitter = CurricularTextSplitter()
    documents = splitter.split_regions(regions)
    print(f"  Total chunks: {len(documents)}")

    # 3. Indexar en ChromaDB
    print("\n[3/3] Indexando en ChromaDB...")
    vs = VectorStore()
    count = vs.add_documents(documents)
    print(f"  Documentos indexados: {count}")

    print("\n" + "=" * 60)
    print(f"  Ingesta completada!")
    print(f"  Total en ChromaDB: {vs.count_documents()} chunks")
    print("=" * 60)


if __name__ == "__main__":
    pdf_dir = sys.argv[1] if len(sys.argv) > 1 else None
    ingest(pdf_dir)
