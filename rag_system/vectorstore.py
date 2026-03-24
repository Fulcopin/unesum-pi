# ============================================
# Motor de embeddings y almacenamiento ChromaDB
# Usa all-MiniLM-L6-v2 para embeddings
# ============================================
import chromadb
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings
from sentence_transformers import SentenceTransformer

from .config import EMBEDDING_MODEL, CHROMA_DIR, COLLECTION_NAME


class LocalEmbeddings(Embeddings):
    """Wrapper de sentence-transformers para LangChain."""

    def __init__(self, model_name: str = EMBEDDING_MODEL):
        self.model = SentenceTransformer(model_name)

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        embeddings = self.model.encode(texts, show_progress_bar=True)
        return embeddings.tolist()

    def embed_query(self, text: str) -> list[float]:
        embedding = self.model.encode([text])
        return embedding[0].tolist()


class VectorStore:
    """Gestiona el almacenamiento vectorial con ChromaDB."""

    def __init__(self):
        self.embeddings = LocalEmbeddings()
        self.vectorstore = Chroma(
            collection_name=COLLECTION_NAME,
            embedding_function=self.embeddings,
            persist_directory=str(CHROMA_DIR),
        )

    def add_documents(self, documents: list[Document]) -> int:
        """Agrega documentos al vector store."""
        if not documents:
            return 0
        self.vectorstore.add_documents(documents)
        return len(documents)

    def similarity_search(self, query: str, k: int = 5) -> list[Document]:
        """Búsqueda por similitud."""
        return self.vectorstore.similarity_search(query, k=k)

    def similarity_search_with_score(
        self, query: str, k: int = 5
    ) -> list[tuple[Document, float]]:
        """Búsqueda por similitud con scores de distancia."""
        return self.vectorstore.similarity_search_with_score(query, k=k)

    def get_retriever(self, k: int = 5):
        """Retorna un retriever para usar con LangChain."""
        return self.vectorstore.as_retriever(
            search_type="similarity",
            search_kwargs={"k": k},
        )

    def count_documents(self) -> int:
        """Retorna la cantidad de documentos en la colección."""
        return self.vectorstore._collection.count()

    def reset(self):
        """Elimina todos los documentos de la colección."""
        self.vectorstore._collection.delete(
            where={"page": {"$gte": 0}}
        )
