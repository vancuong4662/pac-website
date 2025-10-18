@echo off
echo ===========================================
echo  CHECKING AND FREEING PORT 80 AND 443
echo ===========================================

:: ====== Handle Port 80 ======
echo.
echo --- Checking port 80 ---
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :80 ^| findstr LISTENING') do (
    echo Found PID %%a occupying port 80
    echo Killing PID %%a ...
    taskkill /PID %%a /F
    echo PID %%a has been terminated
)

:: ====== Handle Port 443 ======
echo.
echo --- Checking port 443 ---
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :443 ^| findstr LISTENING') do (
    echo Found PID %%a occupying port 443
    echo Killing PID %%a ...
    taskkill /PID %%a /F
    echo PID %%a has been terminated
)

echo.
echo *** Done! Ports 80 and 443 have been freed (if they were in use). ***
pause
