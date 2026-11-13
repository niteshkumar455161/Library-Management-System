@echo off
setlocal
set "PROJECT_DIR=%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js nahi mila. App chalane ke liye Node.js install karna hoga.
  pause
  exit /b 1
)

powershell -NoProfile -Command "if (Test-NetConnection 127.0.0.1 -Port 27017 -InformationLevel Quiet) { exit 0 } else { exit 1 }"
if errorlevel 1 (
  echo MongoDB abhi chalu nahi hai. Use install hone ke baad dobara koshish karein.
  pause
  exit /b 1
)

if not exist "%PROJECT_DIR%backend\node_modules" (
  echo Backend taiyar kar raha hoon...
  pushd "%PROJECT_DIR%backend"
  call npm install
  if errorlevel 1 (
    popd
    pause
    exit /b 1
  )
  popd
)

if not exist "%PROJECT_DIR%frontend\node_modules" (
  echo Website taiyar kar raha hoon...
  pushd "%PROJECT_DIR%frontend"
  call npm install
  if errorlevel 1 (
    popd
    pause
    exit /b 1
  )
  popd
)

start "Library API" /D "%PROJECT_DIR%backend" cmd /k "npm run dev"
start "Library Website" /D "%PROJECT_DIR%frontend" cmd /k "npm run dev"
timeout /t 3 /nobreak >nul
start "" "http://localhost:5173"
