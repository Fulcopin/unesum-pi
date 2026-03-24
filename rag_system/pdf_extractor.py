# ============================================
# Extractor de PDF con detección de tablas
# Usa pdfplumber para extraer texto y tablas
# ============================================
import pdfplumber
from pathlib import Path
from dataclasses import dataclass, field


@dataclass
class ExtractedRegion:
    """Región extraída de un PDF."""
    content: str
    page_number: int
    region_type: str  # "text" o "table"
    metadata: dict = field(default_factory=dict)


class PDFExtractor:
    """
    Extrae contenido de PDFs detectando tablas con pdfplumber.
    Las tablas se preservan como texto estructurado para evitar
    que el chunking rompa su estructura.
    """

    def extract(self, pdf_path: str | Path) -> list[ExtractedRegion]:
        """Extrae todas las regiones (texto y tablas) de un PDF."""
        pdf_path = Path(pdf_path)
        if not pdf_path.exists():
            raise FileNotFoundError(f"No se encontró el archivo: {pdf_path}")

        regions = []
        with pdfplumber.open(pdf_path) as pdf:
            for page_num, page in enumerate(pdf.pages, start=1):
                page_regions = self._extract_page(page, page_num, pdf_path.name)
                regions.extend(page_regions)
        return regions

    def _extract_page(
        self, page: pdfplumber.page.Page, page_num: int, filename: str
    ) -> list[ExtractedRegion]:
        """Extrae regiones de una página, separando tablas del texto."""
        regions = []
        tables = page.find_tables()

        if not tables:
            # Sin tablas: extraer todo como texto
            text = page.extract_text() or ""
            if text.strip():
                regions.append(ExtractedRegion(
                    content=text.strip(),
                    page_number=page_num,
                    region_type="text",
                    metadata={"source": filename}
                ))
            return regions

        # Con tablas: extraer texto fuera de tablas + tablas por separado
        table_bboxes = [t.bbox for t in tables]

        # Texto fuera de las tablas
        text_outside = self._extract_text_outside_tables(page, table_bboxes)
        if text_outside.strip():
            regions.append(ExtractedRegion(
                content=text_outside.strip(),
                page_number=page_num,
                region_type="text",
                metadata={"source": filename}
            ))

        # Cada tabla como región separada
        for i, table in enumerate(tables):
            table_data = table.extract()
            if table_data:
                table_text = self._table_to_text(table_data)
                if table_text.strip():
                    regions.append(ExtractedRegion(
                        content=table_text.strip(),
                        page_number=page_num,
                        region_type="table",
                        metadata={
                            "source": filename,
                            "table_index": i,
                            "rows": len(table_data),
                            "cols": len(table_data[0]) if table_data else 0
                        }
                    ))
        return regions

    def _extract_text_outside_tables(
        self, page: pdfplumber.page.Page, table_bboxes: list
    ) -> str:
        """Extrae texto de la página excluyendo las áreas de tablas."""
        cropped = page
        for bbox in sorted(table_bboxes, key=lambda b: b[1], reverse=True):
            try:
                # Recortar la región de la tabla
                x0, top, x1, bottom = bbox
                # Obtener texto arriba y abajo de la tabla
                cropped = page.outside_bboxes(table_bboxes)
            except Exception:
                pass
        text = cropped.extract_text() or ""
        return text

    def _table_to_text(self, table_data: list[list]) -> str:
        """
        Convierte datos de tabla a texto estructurado.
        Formato: cada fila en una línea, columnas separadas por ' | '.
        Headers en la primera fila.
        """
        if not table_data:
            return ""

        lines = []
        headers = table_data[0]

        # Limpiar celdas None
        clean_headers = [str(h).strip() if h else "" for h in headers]
        lines.append("[TABLA]")
        lines.append(" | ".join(clean_headers))
        lines.append("-" * 40)

        for row in table_data[1:]:
            clean_row = [str(cell).strip() if cell else "" for cell in row]
            lines.append(" | ".join(clean_row))

        lines.append("[/TABLA]")
        return "\n".join(lines)


def extract_all_pdfs(directory: str | Path) -> list[ExtractedRegion]:
    """Extrae regiones de todos los PDFs en un directorio."""
    directory = Path(directory)
    extractor = PDFExtractor()
    all_regions = []

    pdf_files = list(directory.glob("*.pdf"))
    if not pdf_files:
        print(f"No se encontraron PDFs en {directory}")
        return all_regions

    for pdf_file in pdf_files:
        print(f"  Procesando: {pdf_file.name}")
        try:
            regions = extractor.extract(pdf_file)
            all_regions.extend(regions)
            print(f"    -> {len(regions)} regiones extraídas")
        except Exception as e:
            print(f"    -> Error: {e}")

    return all_regions
