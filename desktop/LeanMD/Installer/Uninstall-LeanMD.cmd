@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Uninstall-LeanMD.ps1"
if errorlevel 1 (
  echo.
  echo LeanMD removal failed.
  pause
)
endlocal
