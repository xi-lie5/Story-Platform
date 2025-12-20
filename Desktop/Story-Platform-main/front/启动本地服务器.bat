@echo off
chcp 65001 >nul
echo ========================================
echo    StoryForge 前端服务器启动脚本
echo ========================================
echo.

cd /d "%~dp0"

echo 正在检查可用的服务器...
echo.

REM 检查 Python 3
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo [√] 检测到 Python，使用 Python HTTP 服务器
    echo.
    echo 服务器将在 http://localhost:8000 启动
    echo 按 Ctrl+C 停止服务器
    echo.
    echo ========================================
    python -m http.server 8000
    goto :end
)

REM 检查 Python 2
python2 --version >nul 2>&1
if %errorlevel% == 0 (
    echo [√] 检测到 Python 2，使用 Python HTTP 服务器
    echo.
    echo 服务器将在 http://localhost:8000 启动
    echo 按 Ctrl+C 停止服务器
    echo.
    echo ========================================
    python2 -m SimpleHTTPServer 8000
    goto :end
)

REM 检查 Node.js 和 http-server
where http-server >nul 2>&1
if %errorlevel% == 0 (
    echo [√] 检测到 http-server，使用 Node.js HTTP 服务器
    echo.
    echo 服务器将在 http://localhost:8000 启动
    echo 按 Ctrl+C 停止服务器
    echo.
    echo ========================================
    http-server -p 8000 -c-1
    goto :end
)

REM 检查 Node.js
where node >nul 2>&1
if %errorlevel% == 0 (
    echo [√] 检测到 Node.js
    echo.
    echo 正在尝试安装 http-server...
    echo.
    call npm install -g http-server
    if %errorlevel% == 0 (
        echo.
        echo 服务器将在 http://localhost:8000 启动
        echo 按 Ctrl+C 停止服务器
        echo.
        echo ========================================
        http-server -p 8000 -c-1
        goto :end
    )
)

REM 如果都没有，提示用户
echo [×] 未检测到可用的服务器
echo.
echo 请安装以下任一工具：
echo   1. Python 3.x (推荐) - https://www.python.org/
echo   2. Node.js + http-server - https://nodejs.org/
echo.
echo 或者手动启动：
echo   Python 3: python -m http.server 8000
echo   Python 2: python -m SimpleHTTPServer 8000
echo   Node.js:  npx http-server -p 8000
echo.
pause

:end
