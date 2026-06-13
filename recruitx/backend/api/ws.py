from __future__ import annotations

import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()


class ConnectionManager:
    def __init__(self) -> None:
        self._rooms: dict[str, list[WebSocket]] = {}

    async def connect(self, room: str, ws: WebSocket) -> None:
        await ws.accept()
        self._rooms.setdefault(room, []).append(ws)

    def disconnect(self, room: str, ws: WebSocket) -> None:
        self._rooms.get(room, []).remove(ws)
        if not self._rooms[room]:
            del self._rooms[room]

    async def broadcast(self, room: str, message: dict) -> None:
        for ws in self._rooms.get(room, []):
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                pass


manager = ConnectionManager()


@router.websocket("/ws/negotiation/{room_id}")
async def negotiation_ws(ws: WebSocket, room_id: str):
    await manager.connect(room_id, ws)
    try:
        while True:
            data = await ws.receive_text()
            msg = json.loads(data)
            await manager.broadcast(room_id, msg)
    except WebSocketDisconnect:
        manager.disconnect(room_id, ws)
    except Exception:
        manager.disconnect(room_id, ws)
