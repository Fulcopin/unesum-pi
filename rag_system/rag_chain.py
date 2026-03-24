# ============================================
# Cadena RAG con LangChain
# Soporte para OpenAI, Ollama (Mistral/Llama)
# ============================================
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

from .config import LLM_PROVIDER, OPENAI_API_KEY, OLLAMA_BASE_URL, OLLAMA_MODEL
from .vectorstore import VectorStore


SYSTEM_PROMPT = """Eres un asistente académico especializado de la Universidad Estatal del Sur de Manabí (UNESUM).
Tu función es responder preguntas sobre programas de estudio, mallas curriculares, syllabus,
créditos, prerequisitos, horarios y cualquier dato curricular de la universidad.

REGLAS:
- Responde SOLAMENTE con información que encuentres en el contexto proporcionado.
- Si la información no está en el contexto, di claramente "No encontré esa información en los documentos disponibles."
- Cuando cites datos de tablas (créditos, horas, prerequisitos), sé preciso con los números.
- Responde en español.
- Si el contexto contiene tablas marcadas con [TABLA]...[/TABLA], interpreta los datos correctamente.

CONTEXTO DE LOS DOCUMENTOS:
{context}
"""

USER_PROMPT = """Pregunta: {question}"""


def _get_llm():
    """Obtiene el LLM según la configuración."""
    if LLM_PROVIDER == "openai":
        from langchain_openai import ChatOpenAI
        if not OPENAI_API_KEY:
            raise ValueError(
                "OPENAI_API_KEY no configurada. "
                "Configúrala en .env o usa LLM_PROVIDER=ollama"
            )
        return ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0,
            api_key=OPENAI_API_KEY,
        )
    elif LLM_PROVIDER == "ollama":
        from langchain_community.llms import Ollama
        return Ollama(
            model=OLLAMA_MODEL,
            base_url=OLLAMA_BASE_URL,
            temperature=0,
        )
    else:
        raise ValueError(f"LLM_PROVIDER no soportado: {LLM_PROVIDER}")


def _format_docs(docs) -> str:
    """Formatea documentos recuperados para el prompt."""
    formatted = []
    for i, doc in enumerate(docs, 1):
        source = doc.metadata.get("source", "desconocido")
        page = doc.metadata.get("page", "?")
        doc_type = doc.metadata.get("type", "text")
        header = f"[Documento {i} | Fuente: {source} | Pág: {page} | Tipo: {doc_type}]"
        formatted.append(f"{header}\n{doc.page_content}")
    return "\n\n---\n\n".join(formatted)


class RAGChain:
    """Cadena RAG completa: retrieval + generación."""

    def __init__(self, vector_store: VectorStore | None = None):
        self.vector_store = vector_store or VectorStore()
        self.llm = _get_llm()
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", SYSTEM_PROMPT),
            ("human", USER_PROMPT),
        ])
        self.retriever = self.vector_store.get_retriever(k=5)
        self.chain = (
            {
                "context": self.retriever | _format_docs,
                "question": RunnablePassthrough(),
            }
            | self.prompt
            | self.llm
            | StrOutputParser()
        )

    def query(self, question: str) -> dict:
        """
        Ejecuta una consulta RAG completa.
        Retorna la respuesta y los documentos fuente.
        """
        # Recuperar documentos relevantes
        docs = self.vector_store.similarity_search_with_score(question, k=5)

        # Generar respuesta
        answer = self.chain.invoke(question)

        # Preparar fuentes
        sources = []
        for doc, score in docs:
            sources.append({
                "content": doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content,
                "source": doc.metadata.get("source", ""),
                "page": doc.metadata.get("page", 0),
                "type": doc.metadata.get("type", "text"),
                "relevance_score": round(1 - score, 4),  # Convertir distancia a similitud
            })

        return {
            "question": question,
            "answer": answer,
            "sources": sources,
            "total_docs_searched": self.vector_store.count_documents(),
        }

    def query_simple(self, question: str) -> str:
        """Ejecuta una consulta y retorna solo la respuesta."""
        return self.chain.invoke(question)


class RAGSearchOnly:
    """Solo búsqueda semántica sin LLM (no requiere API key)."""

    def __init__(self, vector_store: VectorStore | None = None):
        self.vector_store = vector_store or VectorStore()

    def search(self, query: str, k: int = 5) -> list[dict]:
        """Busca documentos relevantes sin generar respuesta."""
        results = self.vector_store.similarity_search_with_score(query, k=k)
        return [
            {
                "content": doc.page_content,
                "source": doc.metadata.get("source", ""),
                "page": doc.metadata.get("page", 0),
                "type": doc.metadata.get("type", "text"),
                "relevance_score": round(1 - score, 4),
                "metadata": doc.metadata,
            }
            for doc, score in results
        ]
