# ============================================
# Chunking personalizado para documentos curriculares
# Separa texto normal de tablas y aplica estrategias
# diferentes para cada tipo
# ============================================
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

from .pdf_extractor import ExtractedRegion
from .config import CHUNK_SIZE, CHUNK_OVERLAP, TABLE_CHUNK_OVERLAP_RATIO


class CurricularTextSplitter:
    """
    Splitter personalizado que maneja tablas y texto de forma diferente:
    - Texto normal: RecursiveCharacterTextSplitter con separadores por párrafo
    - Tablas: Separadores por fila con overlap dinámico basado en tamaño de fila
    """

    def __init__(
        self,
        chunk_size: int = CHUNK_SIZE,
        chunk_overlap: int = CHUNK_OVERLAP,
    ):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

        # Splitter para texto normal (párrafos)
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", ". ", " ", ""],
            length_function=len,
        )

    def split_regions(self, regions: list[ExtractedRegion]) -> list[Document]:
        """Divide regiones en documentos LangChain con metadata."""
        documents = []
        for region in regions:
            if region.region_type == "table":
                docs = self._split_table(region)
            else:
                docs = self._split_text(region)
            documents.extend(docs)
        return documents

    def _split_text(self, region: ExtractedRegion) -> list[Document]:
        """Divide texto normal con RecursiveCharacterTextSplitter estándar."""
        metadata = {
            "page": region.page_number,
            "type": "text",
            **region.metadata,
        }
        chunks = self.text_splitter.create_documents(
            texts=[region.content],
            metadatas=[metadata],
        )
        return chunks

    def _split_table(self, region: ExtractedRegion) -> list[Document]:
        """
        Divide tablas con estrategia especial:
        - Separadores por fila (\\n)
        - Overlap dinámico = tamaño promedio de fila
        - Preserva headers en cada chunk
        """
        lines = region.content.split("\n")
        if len(lines) <= 3:
            # Tabla muy pequeña, no dividir
            return [Document(
                page_content=region.content,
                metadata={
                    "page": region.page_number,
                    "type": "table",
                    **region.metadata,
                }
            )]

        # Calcular tamaño promedio de fila para overlap dinámico
        row_lengths = [len(line) for line in lines if line.strip() and not line.startswith("[")]
        avg_row_length = sum(row_lengths) // max(len(row_lengths), 1)
        dynamic_overlap = int(avg_row_length * TABLE_CHUNK_OVERLAP_RATIO)

        # Extraer header de la tabla (marcador + header + separador)
        header_lines = []
        data_lines = []
        for i, line in enumerate(lines):
            if line.startswith("[TABLA]") or line.startswith("[/TABLA]"):
                continue
            elif line.startswith("-"):
                continue
            elif i <= 2:
                header_lines.append(line)
            else:
                data_lines.append(line)

        header_text = "\n".join(header_lines)

        # Splitter para tablas con separadores por fila
        table_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=min(dynamic_overlap, self.chunk_size // 2),
            separators=["\n"],
            length_function=len,
        )

        if not data_lines:
            return [Document(
                page_content=region.content,
                metadata={
                    "page": region.page_number,
                    "type": "table",
                    **region.metadata,
                }
            )]

        data_text = "\n".join(data_lines)
        chunks = table_splitter.split_text(data_text)

        # Agregar header a cada chunk para contexto
        documents = []
        for i, chunk in enumerate(chunks):
            content = f"[TABLA]\n{header_text}\n{chunk}\n[/TABLA]"
            documents.append(Document(
                page_content=content,
                metadata={
                    "page": region.page_number,
                    "type": "table",
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                    **region.metadata,
                }
            ))

        return documents
