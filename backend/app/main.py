import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import Base, engine
from .api import router

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    yield


app = FastAPI(title="Supply Chain Game Lab", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(","), allow_methods=["GET", "POST", "DELETE"], allow_headers=["Content-Type"])
app.include_router(router)


@app.exception_handler(RequestValidationError)
async def validation_error(request, exc):
    # Do not echo invalid inputs such as Infinity back into a JSON response.
    return JSONResponse(status_code=422, content={'detail': [
        {key: error[key] for key in ('loc', 'msg', 'type')} for error in exc.errors()
    ]})


@app.get("/api/health")
def health():
    return {"status": "ok"}


# A built frontend can be served by the same process for an offline classroom demo.
frontend_dist = Path(__file__).resolve().parents[2] / 'frontend' / 'dist'
if frontend_dist.is_dir():
    app.mount('/', StaticFiles(directory=frontend_dist, html=True), name='frontend')
