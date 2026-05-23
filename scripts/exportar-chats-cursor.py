"""Exporta agent-transcripts (.jsonl) a Markdown legible."""
import json
import re
from pathlib import Path

TRANSCRIPTS = Path.home() / ".cursor" / "projects" / (
    "g-JP-TFG-TFG-Aplicaci-n-de-gesti-n-de-eventos-orientados-a-la-UGR"
) / "agent-transcripts"
OUT = Path(__file__).resolve().parent.parent / "chats-recuperados"


def strip_tags(text: str) -> str:
    return re.sub(r"<[^>]+>", "", text or "").strip()


def text_from_message(msg: dict) -> str:
    content = msg.get("message", {}).get("content", [])
    parts = []
    for block in content:
        if block.get("type") == "text" and block.get("text"):
            parts.append(strip_tags(block["text"]))
    return "\n\n".join(p for p in parts if p)


def export_jsonl(path: Path, out_path: Path) -> None:
    lines = []
    title = path.parent.name
    for raw in path.read_text(encoding="utf-8", errors="replace").splitlines():
        if not raw.strip():
            continue
        try:
            row = json.loads(raw)
        except json.JSONDecodeError:
            continue
        role = row.get("role", "?").upper()
        body = text_from_message(row)
        if not body:
            continue
        lines.append(f"## {role}\n\n{body}\n")
    header = f"# Chat recuperado: {title}\n\n"
    out_path.write_text(header + "\n".join(lines), encoding="utf-8")
    print(f"OK {out_path.name} ({len(lines)} mensajes)")


def main() -> None:
    OUT.mkdir(exist_ok=True)
    if not TRANSCRIPTS.is_dir():
        print("No se encontró carpeta agent-transcripts:", TRANSCRIPTS)
        return
    for folder in sorted(TRANSCRIPTS.iterdir()):
        if not folder.is_dir():
            continue
        jsonl = folder / f"{folder.name}.jsonl"
        if jsonl.is_file():
            export_jsonl(jsonl, OUT / f"{folder.name}.md")
        sub = folder / "subagents"
        if sub.is_dir():
            for sf in sub.glob("*.jsonl"):
                export_jsonl(sf, OUT / f"{sf.stem}.md")
    print("\nArchivos en:", OUT)


if __name__ == "__main__":
    main()
