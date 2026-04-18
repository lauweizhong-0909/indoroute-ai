from fastapi import FastAPI
from core import sku_router, alerts_router

app = FastAPI()

# This is the line that was failing because 'router' wasn't found inside the file
app.include_router(sku_router.router, prefix="/api/skus")
app.include_router(alerts_router.router, prefix="/api/alerts")