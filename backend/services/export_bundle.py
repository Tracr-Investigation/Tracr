"""export_bundle.py -- "report + sources" export (ZIP archive).

The archive gives investigators everything needed to work offline and check
the evidence:
  - the PDF report;
  - sources/ : the original archived files (cited in the report, or all of the
    investigation's sources), numbered like the PDF "Sources citées" annex;
  - sources/index.csv : metadata of each source (URL, capture date, SHA-256, notes...);
  - SHA256SUMS.txt : fingerprints in `sha256sum -c` format;
  - LISEZMOI.txt : contents and how to check integrity.
"""
import csv
import hashlib
import io
import os
import re
import tempfile
import unicodedata
import zipfile
from datetime import datetime
from typing import List, Tuple
from zoneinfo import ZoneInfo

from models.source import InvestigationSource
from services import report_blocks, source_service

SCOPE_CITED = "cited"
SCOPE_ALL = "all"
SCOPES = frozenset({SCOPE_CITED, SCOPE_ALL})

_MAX_NAME_LEN = 60


def _slug(text: str) -> str:
    """Goal: turn a title into a safe ASCII file name stem. Input: text. Output: slug (never empty)."""
    ascii_text = unicodedata.normalize("NFKD", text or "").encode("ascii", "ignore").decode()
    stem = os.path.splitext(ascii_text)[0]
    slug = re.sub(r"[^A-Za-z0-9]+", "_", stem).strip("_")
    return slug[:_MAX_NAME_LEN] or "source"


def _extension(source: InvestigationSource) -> str:
    """Goal: pick the file extension of an archived source. Input: source. Output: extension with dot, or ""."""
    ext = os.path.splitext(source.storage_key or "")[1]
    if not ext:
        ext = os.path.splitext(source.title or "")[1]
    return ext.lower() if re.fullmatch(r"\.[A-Za-z0-9]{1,8}", ext or "") else ""


def select_sources(db, document, scope: str, cited: List[InvestigationSource]) -> List[InvestigationSource]:
    """Goal: list the sources to bundle. Input: db, document, scope ("cited" or "all"), sources cited in the report (in annex order). Output: ordered list of sources (cited ones first, numbered like the annex)."""
    if scope == SCOPE_CITED:
        return cited
    cited_ids = {s.id_source for s in cited}
    others = (
        db.query(InvestigationSource)
        .filter(InvestigationSource.id_investigation == document.id_investigation)
        .order_by(InvestigationSource.captured_at.asc(), InvestigationSource.id_source.asc())
        .all()
    )
    return cited + [s for s in others if s.id_source not in cited_ids]


def _readme(document_title: str, pdf_name: str, scope: str, count: int, redacted: bool, problems: int) -> str:
    """Goal: build the LISEZMOI.txt text. Input: report title, PDF name, scope, number of sources, redacted flag, number of integrity problems. Output: text."""
    now = datetime.now(ZoneInfo("Europe/Paris")).strftime("%d/%m/%Y à %H:%M")
    scope_label = "sources citées dans le rapport" if scope == SCOPE_CITED else "toutes les sources archivées de l'enquête"
    lines = [
        f"Dossier d'export Tracr : {document_title}",
        f"Généré le {now}.",
        "",
        "Contenu",
        "-------",
        f"- {pdf_name} : le rapport.",
        f"- sources/ : {count} fichier(s) ({scope_label}), dans leur format d'origine.",
        "  La numérotation reprend celle de l'annexe « Sources citées » du rapport.",
        "- sources/index.csv : URL, date de capture, type, taille, empreinte SHA-256 et notes de chaque source.",
        "- SHA256SUMS.txt : empreintes SHA-256 de tous les fichiers du dossier.",
        "",
        "Vérifier l'intégrité",
        "--------------------",
        "Les empreintes ont été calculées lors de la capture : un fichier modifié ne correspond plus.",
        "- Linux / macOS : sha256sum -c SHA256SUMS.txt",
        "- Windows (PowerShell) : Get-FileHash -Algorithm SHA256 <fichier>",
        "  puis comparer avec la valeur de SHA256SUMS.txt.",
    ]
    if problems:
        lines += [
            "",
            f"ATTENTION : {problems} source(s) manquante(s) ou dont l'empreinte ne correspond pas",
            "à celle enregistrée à la capture (voir la colonne « Intégrité » de sources/index.csv).",
        ]
    if redacted:
        lines += [
            "",
            "ATTENTION : le rapport est en version caviardée, mais les fichiers sources",
            "sont fournis tels qu'archivés (non caviardés).",
        ]
    return "\r\n".join(lines) + "\r\n"


def build_bundle(
    sources: List[InvestigationSource], pdf_bytes: bytes, pdf_name: str,
    document_title: str, scope: str, redacted: bool,
) -> str:
    """Goal: write the ZIP archive (report + source files + index + fingerprints) to a temp file. Input: sources (ordered), PDF bytes and name, report title, scope, redacted flag. Output: path of the temp ZIP file (caller deletes it)."""
    checksums: List[Tuple[str, str]] = [(hashlib.sha256(pdf_bytes).hexdigest(), pdf_name)]
    index = io.StringIO()
    writer = csv.writer(index, delimiter=";", lineterminator="\r\n")
    writer.writerow([
        "N°", "Fichier", "Titre", "URL", "Type", "Capturée le", "Taille (octets)",
        "SHA-256", "Intégrité", "Notes",
    ])
    problems = 0

    handle, path = tempfile.mkstemp(prefix="tracr_export_", suffix=".zip")
    os.close(handle)
    try:
        with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            archive.writestr(pdf_name, pdf_bytes)
            for number, source in enumerate(sources, start=1):
                name = f"sources/{number:03d}_{_slug(source.title)}{_extension(source)}"
                try:
                    content = source_service.get_content(source)
                except Exception:
                    content = None
                if content is None:
                    integrity, name = "FICHIER INTROUVABLE", ""
                    problems += 1
                else:
                    actual = hashlib.sha256(content).hexdigest()
                    integrity = "OK" if actual == source.content_hash else "EMPREINTE DIFFÉRENTE"
                    if integrity != "OK":
                        problems += 1
                    archive.writestr(name, content)
                    checksums.append((actual, name))
                writer.writerow([
                    number,
                    name,
                    source.title,
                    source.source_url,
                    report_blocks.SOURCE_TYPE_LABELS.get(source.source_type, source.source_type),
                    report_blocks.format_captured_at(source.captured_at, "%d/%m/%Y %H:%M:%S"),
                    source.size_bytes,
                    source.content_hash,
                    integrity,
                    (source.notes or "").replace("\r", " ").replace("\n", " "),
                ])
            # BOM UTF-8 : accents corrects a l'ouverture dans Excel.
            archive.writestr("sources/index.csv", "﻿" + index.getvalue())
            archive.writestr("SHA256SUMS.txt", "".join(f"{digest}  {name}\n" for digest, name in checksums))
            archive.writestr(
                "LISEZMOI.txt",
                _readme(document_title, pdf_name, scope, len(sources), redacted, problems),
            )
    except Exception:
        os.remove(path)
        raise
    return path


def cited_sources(db, document, redacted: bool) -> List[InvestigationSource]:
    """Goal: sources cited in the report as exported (redacted passages excluded). Input: db, document, redacted flag. Output: ordered list of sources (annex order)."""
    from utils.html_sanitize import sanitize_editor_html

    html = sanitize_editor_html(document.content_html or "")
    if redacted:
        html = report_blocks.apply_redaction(html)
    return report_blocks.cited_sources(db, document.id_investigation, html)
