from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth
import os

app = FastAPI(
    title="Production Auth API",
    description="Enterprise-grade JWT Authentication System",
    version="1.0.0"
)

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Authentication"])

@app.get("/health")
def health_check():
    return {"status": "healthy", "system": "operational"}