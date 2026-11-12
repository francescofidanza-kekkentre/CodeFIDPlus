#!/usr/bin/env python3
"""
CodeFID+ — Bridge Server Locale per Google Antigravity Python SDK
=================================================================
Consente al tablet Android (tramite la PWA CodeFID+) di inviare prompt
direttamente a un'istanza locale dell'agente `google-antigravity` in esecuzione
sul PC o workstation, raccogliendo:
  - Token di risposta (response stream)
  - Ragionamenti interni (response.thoughts)
  - Chiamate agli strumenti (response.tool_calls)

Avvio rapido:
  pip install google-antigravity
  python backend/antigravity_bridge.py --port 8765
"""

import argparse
import asyncio
import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any, Dict, List

# Verifica disponibilità dell'SDK ufficiale google-antigravity
try:
    from google.antigravity import Agent, CapabilitiesConfig, LocalAgentConfig
    ANTIGRAVITY_SDK_AVAILABLE = True
except ImportError:
    ANTIGRAVITY_SDK_AVAILABLE = False


async def execute_antigravity_chat(
    prompt: str,
    system_instructions: str,
) -> Dict[str, Any]:
    """Esegue una sessione con l'SDK ufficiale google-antigravity."""
    if not ANTIGRAVITY_SDK_AVAILABLE:
        return {
            "reply": (
                "⚠️ Il pacchetto `google-antigravity` non è installato in questo ambiente Python.\n\n"
                "Esegui sul tuo PC:\n"
                "```sh\npip install google-antigravity\n```\n"
                "oppure usa la modalità **PWA Autonoma (Gemini Cloud)** nelle impostazioni di CodeFID+."
            ),
            "thoughts": [
                "Bridge Python raggiunto correttamente dal tablet Android.",
                "Modulo google.antigravity non trovato: restituisco istruzioni di installazione.",
            ],
            "tool_calls": [],
            "sdk_available": False,
        }

    config = LocalAgentConfig(
        system_instructions=system_instructions,
        capabilities=CapabilitiesConfig(),
    )

    thoughts: List[str] = []
    tool_calls: List[Dict[str, Any]] = []
    reply_chunks: List[str] = []

    async with Agent(config) as agent:
        response = await agent.chat(prompt)

        async def collect_thoughts() -> None:
            try:
                async for thought in response.thoughts:
                    if thought:
                        thoughts.append(str(thought))
            except Exception:
                pass

        async def collect_tools() -> None:
            try:
                async for call in response.tool_calls:
                    tool_calls.append(
                        {
                            "name": getattr(call, "name", "tool"),
                            "args": getattr(call, "args", {}),
                        }
                    )
            except Exception:
                pass

        async def collect_tokens() -> None:
            async for token in response:
                reply_chunks.append(str(token))

        await asyncio.gather(
            collect_tokens(),
            collect_thoughts(),
            collect_tools(),
        )

    return {
        "reply": "".join(reply_chunks),
        "thoughts": thoughts or ["Elaborazione completata tramite Google Antigravity SDK."],
        "tool_calls": tool_calls,
        "sdk_available": True,
    }


class AntigravityBridgeHandler(BaseHTTPRequestHandler):
    """HTTP Handler con supporto CORS per il collegamento dal tablet Android."""

    def _send_cors_headers(self, status_code: int = 200) -> None:
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_OPTIONS(self) -> None:
        self._send_cors_headers(200)

    def do_GET(self) -> None:
        if self.path.startswith("/api/antigravity/health"):
            self._send_cors_headers(200)
            payload = {
                "status": "ok",
                "service": "CodeFID+ Antigravity SDK Bridge",
                "version": "1.0.0",
                "sdk_available": ANTIGRAVITY_SDK_AVAILABLE,
            }
            self.wfile.write(json.dumps(payload).encode("utf-8"))
            return

        self._send_cors_headers(404)
        self.wfile.write(json.dumps({"error": "Endpoint non trovato"}).encode("utf-8"))

    def do_POST(self) -> None:
        if self.path.startswith("/api/antigravity/chat"):
            content_length = int(self.headers.get("Content-Length", 0))
            raw_body = self.rfile.read(content_length).decode("utf-8") if content_length else "{}"
            try:
                body = json.loads(raw_body)
                prompt = body.get("prompt", "")
                system_instructions = body.get(
                    "system_instructions",
                    "Sei Antigravity AI collegato a CodeFID+ Tablet IDE.",
                )
                result = asyncio.run(
                    execute_antigravity_chat(prompt, system_instructions)
                )
                self._send_cors_headers(200)
                self.wfile.write(json.dumps(result).encode("utf-8"))
            except Exception as exc:
                self._send_cors_headers(500)
                self.wfile.write(
                    json.dumps({"error": str(exc)}).encode("utf-8")
                )
            return

        self._send_cors_headers(404)
        self.wfile.write(json.dumps({"error": "Endpoint non trovato"}).encode("utf-8"))


def main() -> None:
    parser = argparse.ArgumentParser(description="CodeFID+ Antigravity Python SDK Bridge")
    parser.add_argument("--host", default="0.0.0.0", help="Indirizzo di ascolto (default: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=8765, help="Porta HTTP (default: 8765)")
    args = parser.parse_args()

    server = HTTPServer((args.host, args.port), AntigravityBridgeHandler)
    print("===============================================================")
    print(f" 🚀 CodeFID+ Antigravity SDK Bridge attivo su http://{args.host}:{args.port}")
    print(f" 📦 SDK google-antigravity installato: {'SI' if ANTIGRAVITY_SDK_AVAILABLE else 'NO (Modalità fallback)'}")
    print(" 📱 Imposta questo URL nelle Impostazioni della PWA sul tuo tablet Android.")
    print("===============================================================")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nChiusura del Bridge Antigravity.")
        server.server_close()


if __name__ == "__main__":
    main()
