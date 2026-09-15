@echo off
title MEP GROUP - ID Card Generator
echo ========================================================
echo       MEP GROUP ID CARD GENERATION SOFTWARE
echo ========================================================
echo.
echo Starting ID Card Generator...
echo.

:: Try opening index.html directly or running server if python is available
start "" "%~dp0index.html"

echo Application opened in your default browser.
echo You can also run with local server using python server.py
timeout /t 3 >nul
