import logging
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

# Import DB and models to create tables
from backend.database import engine, Base
from backend.config import settings

# Import Routers
from backend.routers import auth, documents, copilot, maintenance, compliance, incidents, graph

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("backend.log")
    ]
)
logger = logging.getLogger(__name__)

# Trigger SQLite Table Auto-Creation on Boot
logger.info("Initializing SQLite database tables...")
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized successfully.")
except Exception as e:
    logger.error(f"Failed to initialize database tables: {e}")

# Initialize FastAPI App
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Unified Industrial Knowledge Intelligence Platform - ET AI Hackathon 2026",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS for decoupled frontend (Localhost Dev and Production Vercel App)
origins = [
    "http://localhost:5173",  # Vite Dev
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "https://*.vercel.app",   # Vercel wildcards
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For hackathon prototype, allow all origins to prevent deployment CORS errors
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Register Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(documents.router, prefix=settings.API_V1_STR)
app.include_router(copilot.router, prefix=settings.API_V1_STR)
app.include_router(maintenance.router, prefix=settings.API_V1_STR)
app.include_router(compliance.router, prefix=settings.API_V1_STR)
app.include_router(incidents.router, prefix=settings.API_V1_STR)
app.include_router(graph.router, prefix=settings.API_V1_STR)

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": settings.PROJECT_NAME}

# Mount Frontend Build Directory
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")

if os.path.isdir(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Allow requests to /docs, /redoc, /openapi.json to bypass the frontend catch-all
        if full_path.startswith("api/") or full_path in ["docs", "redoc", "openapi.json"]:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="API route not found")
        
        # Serve the requested file if it exists, otherwise serve index.html (SPA routing)
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    logger.warning("Frontend dist folder not found. Running in API-only mode.")
    @app.get("/")
    def read_root():
        return {
            "platform": settings.PROJECT_NAME,
            "purpose": "Unified Industrial Knowledge & Operations Brain",
            "hackathon": "ET AI Hackathon 2026",
            "status": "Operational (API Only Mode)"
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=settings.HOST, port=settings.PORT, reload=True)
