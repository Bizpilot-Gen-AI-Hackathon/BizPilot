# BizPilot

Small-business analytics assistant with a dashboard and FastAPI backend.

## Run the backend

From the repository root in PowerShell:

```powershell
.\start_backend.ps1
```

For automatic reload during development:

```powershell
.\start_backend.ps1 -Reload
```

The API is available at `http://127.0.0.1:8000`, with interactive
documentation at `http://127.0.0.1:8000/docs`.

If the backend virtual environment has not been created yet:

```powershell
python -m venv backend\.venv
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
```

The equivalent manual command is:

```powershell
Set-Location backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Use the explicit `backend\.venv\Scripts\python.exe` path even if another
virtual environment is already activated. The repository-root `.venv` does
not contain the backend dependencies.
