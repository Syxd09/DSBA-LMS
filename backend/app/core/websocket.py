from fastapi import WebSocket
from typing import Dict, List
import json
import asyncio


class WebSocketManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.exam_rooms: Dict[str, List[str]] = {}  # exam_id -> list of user_ids
    
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        print(f"User {user_id} connected via WebSocket")
    
    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        
        # Remove user from exam rooms
        for exam_id, users in self.exam_rooms.items():
            if user_id in users:
                users.remove(user_id)
        
        print(f"User {user_id} disconnected from WebSocket")
    
    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            websocket = self.active_connections[user_id]
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                print(f"Error sending message to {user_id}: {e}")
                # Remove disconnected client
                del self.active_connections[user_id]
    
    async def broadcast(self, message: dict):
        disconnected = []
        for user_id, websocket in self.active_connections.items():
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                print(f"Error broadcasting to {user_id}: {e}")
                disconnected.append(user_id)
        
        # Remove disconnected clients
        for user_id in disconnected:
            del self.active_connections[user_id]
    
    async def broadcast_to_exam(self, message: dict, exam_id: str):
        if exam_id in self.exam_rooms:
            users = self.exam_rooms[exam_id]
            disconnected = []
            
            for user_id in users:
                if user_id in self.active_connections:
                    try:
                        websocket = self.active_connections[user_id]
                        await websocket.send_text(json.dumps(message))
                    except Exception as e:
                        print(f"Error sending exam message to {user_id}: {e}")
                        disconnected.append(user_id)
            
            # Remove disconnected clients from exam room
            for user_id in disconnected:
                if user_id in self.active_connections:
                    del self.active_connections[user_id]
                if user_id in users:
                    users.remove(user_id)
    
    def join_exam_room(self, user_id: str, exam_id: str):
        if exam_id not in self.exam_rooms:
            self.exam_rooms[exam_id] = []
        
        if user_id not in self.exam_rooms[exam_id]:
            self.exam_rooms[exam_id].append(user_id)
        
        print(f"User {user_id} joined exam room {exam_id}")
    
    def leave_exam_room(self, user_id: str, exam_id: str):
        if exam_id in self.exam_rooms and user_id in self.exam_rooms[exam_id]:
            self.exam_rooms[exam_id].remove(user_id)
        
        print(f"User {user_id} left exam room {exam_id}")
    
    def get_exam_participants(self, exam_id: str) -> List[str]:
        return self.exam_rooms.get(exam_id, [])