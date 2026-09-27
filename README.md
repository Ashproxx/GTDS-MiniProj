# Supply Chain Inventory Optimization Using Game Theory

A college mini project with a Python/FastAPI simulation engine and a React dashboard.

## Run locally

Python 3.12+ and Node 22+ are recommended.

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. API documentation: http://localhost:8000/docs.

Checks: `python -m pytest` from backend; `npm run build` from frontend.
