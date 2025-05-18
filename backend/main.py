from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from prometheus_fastapi_instrumentator import Instrumentator, metrics
from prometheus_fastapi_instrumentator.metrics import (
    info,
    latency,
    request_size,
    response_size,
    requests
)
import sys, os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.api.router import api_router

# Thêm thư mục gốc vào sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount media directory for static file serving
app.mount("/media", StaticFiles(directory="media"), name="media")

# Include tất cả API routes
app.include_router(api_router)

# Prometheus metrics setup
instrumentator = Instrumentator(
    should_group_status_codes=True,
    should_ignore_untemplated=True,
    should_respect_env_var=False,
    excluded_handlers=["/metrics", "/favicon.ico"]
)

instrumentator \
    .add(info()) \
    .add(latency()) \
    .add(request_size()) \
    .add(response_size()) \
    .add(requests())

# Gọi sau khi app đã có router và mount đầy đủ
instrumentator.instrument(app).expose(app, include_in_schema=False)

# Optional: middleware to limit /metrics access in production
@app.middleware("http")
async def restrict_metrics_endpoint(request: Request, call_next):
    if request.url.path == "/metrics":
        if os.getenv("ENV") == "production":
            return JSONResponse(
                {"detail": "Forbidden"},
                status_code=status.HTTP_403_FORBIDDEN
            )
    return await call_next(request)

# Chạy với uvicorn
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 