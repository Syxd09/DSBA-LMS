from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from contextlib import asynccontextmanager
import uvicorn
from typing import List
import json

from app.core.config import settings
from app.core.database import engine, Base
from app.api.routes import auth, admin, courses, exams, analytics, proctoring
from app.core.websocket import WebSocketManager


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting up DSBA Exam Portal Backend...")
    # Create database tables
    Base.metadata.create_all(bind=engine)
    yield
    # Shutdown
    print("Shutting down...")


app = FastAPI(
    title="DSBA Exam Portal API",
    description="AI-Powered Academic Management & Exam Evaluation System",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket manager for real-time features
websocket_manager = WebSocketManager()

# Include API routes
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(admin.router, prefix="/api/admin", tags=["Administration"])
app.include_router(courses.router, prefix="/api/courses", tags=["Courses"])
app.include_router(exams.router, prefix="/api/exams", tags=["Examinations"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(proctoring.router, prefix="/api/proctoring", tags=["Proctoring"])


@app.get("/")
async def root():
    return {"message": "DSBA Exam Portal API - Running Successfully"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}


@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await websocket_manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle different websocket message types
            if message["type"] == "exam_heartbeat":
                # Update exam status
                await websocket_manager.send_personal_message(
                    {"type": "heartbeat_ack", "timestamp": message["timestamp"]}, 
                    user_id
                )
            elif message["type"] == "anti_cheat_event":
                # Log anti-cheat event
                await websocket_manager.broadcast({
                    "type": "anti_cheat_alert",
                    "user_id": user_id,
                    "event": message["event"]
                })
                
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket, user_id)


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )