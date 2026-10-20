# NETRADRISHTI — OpenCV FastAPI Microservice

This microservice provides high-performance server-side computer vision inference using OpenCV (Canny edge detection, Laplacian variance, contour extraction, and ORB feature alignment).

## Quick Start

1. Create a virtual environment and install requirements:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

2. Run the FastAPI development server:
```bash
uvicorn main:app --reload --port 8000
```

3. Verification:
- Health endpoint: `http://localhost:8000/health`
- Interactive Swagger docs: `http://localhost:8000/docs`

When running, set **Backend Execution Mode** to `External Python FastAPI Backend` in the NetraDrishti **Settings** (`/app/settings`) page and click **Test Ping**.
