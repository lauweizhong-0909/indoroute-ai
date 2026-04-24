from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core import sku_router, alerts_router, fx_router # Import your routers
from db.database import engine
from db import models

app = FastAPI(title="IndoRoute-AI")

models.Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register the routers here
app.include_router(sku_router.router, prefix="/api")
app.include_router(alerts_router.router, prefix="/api")
app.include_router(fx_router.router, prefix="/api")

@app.get("/health")
def health_check():
    return {"status": "ok"}
