@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo    StoryForge Frontend Server
echo ========================================
echo.

REM Check Python 3
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] Python detected, starting server...
    echo.
    echo Server will start at http://localhost:8000
    echo Press Ctrl+C to stop the server
    echo.
    echo ========================================
    python -m http.server 8000
    goto :end
)

REM Check Python 2
python2 --version >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] Python 2 detected, starting server...
    echo.
    echo Server will start at http://localhost:8000
    echo Press Ctrl+C to stop the server
    echo.
    echo ========================================
    python2 -m SimpleHTTPServer 8000
    goto :end
)

REM Check Node.js http-server
where http-server >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] http-server detected, starting server...
    echo.
    echo Server will start at http://localhost:8000
    echo Press Ctrl+C to stop the server
    echo.
    echo ========================================
    http-server -p 8000 -c-1
    goto :end
)

REM Check Node.js
where node >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] Node.js detected
    echo.
    echo Trying to install http-server...
    echo.
    call npm install -g http-server
    if %errorlevel% == 0 (
        echo.
        echo Server will start at http://localhost:8000
        echo Press Ctrl+C to stop the server
        echo.
        echo ========================================
        http-server -p 8000 -c-1
        goto :end
    )
)

REM If nothing found
echo [X] No available server detected
echo.
echo Please install one of the following:
echo   1. Python 3.x (recommended) - https://www.python.org/
echo   2. Node.js + http-server - https://nodejs.org/
echo.
echo Or start manually:
echo   Python 3: python -m http.server 8000
echo   Python 2: python -m SimpleHTTPServer 8000
echo   Node.js:  npx http-server -p 8000
echo.
pause

:end

