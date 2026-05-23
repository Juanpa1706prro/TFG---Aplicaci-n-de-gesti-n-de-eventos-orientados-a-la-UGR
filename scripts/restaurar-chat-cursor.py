"""
Restaura un chat de Cursor por composerId (desarchiva + lo selecciona al abrir).

IMPORTANTE: Cierra Cursor por completo antes de ejecutar.
"""
from __future__ import annotations

import json
import shutil
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

COMPOSER_ID = "bff630cb-a0dd-4722-8f4d-46910fbf8893"
WORKSPACE_ID = "4ac24ab4909ccfd7786a525031289fb4"
APP_DATA = Path.home() / "AppData" / "Roaming" / "Cursor" / "User"
GLOBAL_DB = APP_DATA / "globalStorage" / "state.vscdb"
WORKSPACE_DB = APP_DATA / "workspaceStorage" / WORKSPACE_ID / "state.vscdb"
TRANSCRIPT = (
    Path.home()
    / ".cursor"
    / "projects"
    / "g-JP-TFG-TFG-Aplicaci-n-de-gesti-n-de-eventos-orientados-a-la-UGR"
    / "agent-transcripts"
    / COMPOSER_ID
    / f"{COMPOSER_ID}.jsonl"
)


def backup(path: Path) -> Path:
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    dest = path.with_suffix(path.suffix + f".bak-{stamp}")
    shutil.copy2(path, dest)
    return dest


def patch_global_db() -> None:
    conn = sqlite3.connect(GLOBAL_DB)
    cur = conn.cursor()

    cur.execute(
        "SELECT value FROM ItemTable WHERE key=?",
        ("composer.composerHeaders",),
    )
    raw = cur.fetchone()[0]
    headers = json.loads(raw.decode() if isinstance(raw, bytes) else raw)
    found = False
    for c in headers.get("allComposers", []):
        if c.get("composerId") == COMPOSER_ID:
            found = True
            c["isArchived"] = False
            c["hasUnreadMessages"] = False
            print(f"  Chat: {c.get('name')}")
    if not found:
        conn.close()
        raise SystemExit(f"No encontrado en composerHeaders: {COMPOSER_ID}")
    cur.execute(
        "UPDATE ItemTable SET value=? WHERE key=?",
        (json.dumps(headers, ensure_ascii=False), "composer.composerHeaders"),
    )

    tabs_key = f"cursor/glass.tabs.v2/{WORKSPACE_ID}/state.json"
    cur.execute("SELECT value FROM ItemTable WHERE key=?", (tabs_key,))
    row = cur.fetchone()
    if row:
        tabs = json.loads(row[0].decode() if isinstance(row[0], bytes) else row[0])
        tabs["activeTarget"] = {
            "scope": "agentApp",
            "agentId": COMPOSER_ID,
            "kind": "file",
        }
        cur.execute(
            "UPDATE ItemTable SET value=? WHERE key=?",
            (json.dumps(tabs), tabs_key),
        )
        print("  activeTarget ->", COMPOSER_ID)

    cur.execute(
        "INSERT OR REPLACE INTO ItemTable (key, value) VALUES (?, ?)",
        ("cursor/glass.selectedAgent", COMPOSER_ID),
    )
    print("  selectedAgent ->", COMPOSER_ID)

    conn.commit()
    conn.close()


def patch_workspace_db() -> None:
    if not WORKSPACE_DB.is_file():
        print("  (sin workspace DB, omitido)")
        return
    conn = sqlite3.connect(WORKSPACE_DB)
    cur = conn.cursor()
    cur.execute(
        "SELECT value FROM ItemTable WHERE key=?",
        ("composer.composerData",),
    )
    row = cur.fetchone()
    if not row:
        conn.close()
        return
    data = json.loads(row[0].decode() if isinstance(row[0], bytes) else row[0])
    data["selectedComposerIds"] = [COMPOSER_ID]
    data["lastFocusedComposerIds"] = [COMPOSER_ID]
    cur.execute(
        "UPDATE ItemTable SET value=? WHERE key=?",
        (json.dumps(data), "composer.composerData"),
    )
    conn.commit()
    conn.close()
    print("  workspace selectedComposerIds ->", COMPOSER_ID)


def main() -> None:
    if not TRANSCRIPT.is_file():
        print("AVISO: no hay transcript local:", TRANSCRIPT)
    else:
        print("Transcript OK:", TRANSCRIPT, f"({TRANSCRIPT.stat().st_size // 1024} KB)")

    for db in (GLOBAL_DB, WORKSPACE_DB):
        if not db.is_file():
            print("Falta:", db)
            sys.exit(1)

    print("Copia de seguridad...")
    print(" ", backup(GLOBAL_DB))
    if WORKSPACE_DB.is_file():
        print(" ", backup(WORKSPACE_DB))

    print("Parcheando globalStorage...")
    patch_global_db()
    print("Parcheando workspaceStorage...")
    patch_workspace_db()

    print()
    print("Listo. Ahora:")
    print("  1. Abre Cursor")
    print("  2. Archivo -> Abrir carpeta -> proyecto TFG")
    print("  3. En la barra izquierda, pulsa: Reubicacion del agente en el IDE")
    print("  4. Si no carga mensajes: Ctrl+Shift+P -> Developer: Reload Window")


if __name__ == "__main__":
    main()
