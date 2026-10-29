from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes_auth import router as auth_router
from app.api.routes_data import router as data_router
from app.config import settings
from app.api.routes_upload import router as upload_router
from app.api.routes_agents import router as agents_router
from app.api.routes_ussd import router as ussd_router


app = FastAPI(title="BizPilot API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(upload_router)
app.include_router(auth_router)
app.include_router(data_router)
app.include_router(agents_router)
app.include_router(ussd_router)

@app.get("/")
def root():
    return {"app": "BizPilot API", "status": "running", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "ok"}