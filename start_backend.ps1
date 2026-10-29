param(
    [int]$Port = 8000,
    [string]$BackendHost = "127.0.0.1",
    [switch]$Reload
)

$repositoryRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendRoot = Join-Path $repositoryRoot "backend"
$python = Join-Path $backendRoot ".venv\Scripts\python.exe"

if (-not (Test-Path $python)) {
    throw "Backend virtual environment not found at $python. Create it and install backend\requirements.txt first."
}

Set-Location $backendRoot
$uvicornArgs = @("app.main:app", "--host", $BackendHost, "--port", $Port)
if ($Reload) {
    $uvicornArgs += "--reload"
}

& $python -m uvicorn @uvicornArgs
exit $LASTEXITCODE
