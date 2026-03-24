# ============================================
# UNESUM RAG System - Punto de entrada
# ============================================
# Uso:
#   python run_rag.py ingest     -> Procesar PDFs y cargar en ChromaDB
#   python run_rag.py server     -> Iniciar API FastAPI
#   python run_rag.py search     -> Búsqueda interactiva (sin LLM)
#   python run_rag.py query      -> Consulta interactiva (con LLM)
# ============================================
import sys
import os

# Cargar variables de entorno
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "rag_system", ".env"))


def main():
    if len(sys.argv) < 2:
        print_help()
        return

    command = sys.argv[1].lower()

    if command == "ingest":
        from rag_system.ingest import ingest
        pdf_dir = sys.argv[2] if len(sys.argv) > 2 else None
        ingest(pdf_dir)

    elif command == "server":
        from rag_system.api import start
        start()

    elif command == "search":
        interactive_search()

    elif command == "query":
        interactive_query()

    else:
        print(f"Comando desconocido: {command}")
        print_help()


def interactive_search():
    """Modo búsqueda interactiva sin LLM."""
    from rag_system.rag_chain import RAGSearchOnly

    print("=" * 60)
    print("  UNESUM RAG - Búsqueda Semántica")
    print("  (no requiere LLM, usa solo embeddings)")
    print("  Escribe 'salir' para terminar")
    print("=" * 60)

    search = RAGSearchOnly()
    while True:
        query = input("\nBuscar: ").strip()
        if query.lower() in ("salir", "exit", "q"):
            break
        if not query:
            continue

        results = search.search(query, k=3)
        if not results:
            print("  No se encontraron resultados.")
            continue

        for i, r in enumerate(results, 1):
            print(f"\n--- Resultado {i} (relevancia: {r['relevance_score']:.4f}) ---")
            print(f"  Fuente: {r['source']} | Pág: {r['page']} | Tipo: {r['type']}")
            content = r['content'][:300] + "..." if len(r['content']) > 300 else r['content']
            print(f"  {content}")


def interactive_query():
    """Modo consulta interactiva con LLM."""
    from rag_system.rag_chain import RAGChain

    print("=" * 60)
    print("  UNESUM RAG - Consulta con IA")
    print("  Escribe 'salir' para terminar")
    print("=" * 60)

    try:
        rag = RAGChain()
    except ValueError as e:
        print(f"\nError: {e}")
        return

    while True:
        question = input("\nPregunta: ").strip()
        if question.lower() in ("salir", "exit", "q"):
            break
        if not question:
            continue

        print("\nBuscando y generando respuesta...\n")
        result = rag.query(question)
        print(f"Respuesta: {result['answer']}")
        print(f"\nFuentes ({len(result['sources'])}):")
        for s in result['sources']:
            print(f"  - {s['source']} pág.{s['page']} ({s['type']}, relevancia: {s['relevance_score']:.4f})")


def print_help():
    print("""
╔══════════════════════════════════════════════════════════╗
║           UNESUM RAG System - Ayuda                      ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  Comandos disponibles:                                   ║
║                                                          ║
║  python run_rag.py ingest [directorio]                   ║
║    → Procesa PDFs y los carga en ChromaDB                ║
║    → Si no se especifica directorio, usa data/pdfs/      ║
║                                                          ║
║  python run_rag.py server                                ║
║    → Inicia la API REST en http://localhost:8100          ║
║    → Docs en http://localhost:8100/docs                   ║
║                                                          ║
║  python run_rag.py search                                ║
║    → Búsqueda semántica interactiva (sin LLM)            ║
║                                                          ║
║  python run_rag.py query                                 ║
║    → Consulta interactiva con IA (requiere LLM)          ║
║                                                          ║
╠══════════════════════════════════════════════════════════╣
║  Pasos para empezar:                                     ║
║  1. Pon tus PDFs en: rag_system/data/pdfs/               ║
║  2. Ejecuta: python run_rag.py ingest                    ║
║  3. Ejecuta: python run_rag.py server                    ║
║  4. Abre: http://localhost:8100/docs                     ║
╚══════════════════════════════════════════════════════════╝
""")


if __name__ == "__main__":
    main()
