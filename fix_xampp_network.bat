@echo off
setlocal enabledelayedexpansion

:: Check for administrator privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ===========================================
    echo  ADMINISTRATOR PRIVILEGES REQUIRED!
    echo ===========================================
    echo This script needs to be run as Administrator to kill processes.
    echo Please right-click and select "Run as Administrator"
    echo.
    pause
    exit /b 1
)

echo ===========================================
echo  CHECKING AND FREEING PORT 80 AND 443
echo ===========================================

:: Function to kill processes on a specific port
call :KillProcessOnPort 80
call :KillProcessOnPort 443

:: Stop common services that might be using these ports
echo.
echo --- Stopping common web services ---
call :StopService "World Wide Web Publishing Service" "W3SVC"
call :StopService "IIS Admin Service" "IISADMIN" 
call :StopService "SQL Server Reporting Services" "ReportServer"

:: Final verification
echo.
echo ===========================================
echo  FINAL VERIFICATION
echo ===========================================
call :CheckPort 80
call :CheckPort 443

echo.
echo *** Process completed! ***
echo *** You can now start XAMPP Apache service ***
pause
exit /b 0

:: ====== FUNCTIONS ======

:KillProcessOnPort
set PORT=%1
echo.
echo --- Checking port %PORT% ---

:: Get PIDs using the port with more precise filtering
set "FOUND_PROCESSES="
for /f "tokens=2,5" %%a in ('netstat -ano 2^>nul ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
    set "PID=%%b"
    if "!PID!" neq "" (
        set "FOUND_PROCESSES=!FOUND_PROCESSES! !PID!"
        echo Found PID !PID! listening on port %PORT%
        
        :: Get process name for better identification
        for /f "tokens=1" %%c in ('tasklist /FI "PID eq !PID!" /FO CSV /NH 2^>nul ^| findstr /V "INFO:"') do (
            set "PROCESS_NAME=%%c"
            set "PROCESS_NAME=!PROCESS_NAME:"=!"
            echo   Process: !PROCESS_NAME! (PID: !PID!)
        )
        
        :: Kill the process
        echo   Terminating PID !PID! ...
        taskkill /PID !PID! /F >nul 2>&1
        if !errorlevel! equ 0 (
            echo   ✓ Successfully terminated PID !PID!
        ) else (
            echo   ✗ Failed to terminate PID !PID!
        )
        
        :: Wait a moment before checking next
        timeout /t 1 /nobreak >nul
    )
)

if "%FOUND_PROCESSES%"=="" (
    echo ✓ No processes found listening on port %PORT%
)

goto :eof

:StopService
set "SERVICE_NAME=%~1"
set "SERVICE_SHORT=%~2"

echo Checking service: %SERVICE_NAME%
sc query "%SERVICE_SHORT%" >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=4" %%s in ('sc query "%SERVICE_SHORT%" ^| findstr "STATE"') do (
        if "%%s"=="RUNNING" (
            echo   Stopping %SERVICE_NAME%...
            net stop "%SERVICE_SHORT%" >nul 2>&1
            if !errorlevel! equ 0 (
                echo   ✓ Successfully stopped %SERVICE_NAME%
            ) else (
                echo   ✗ Failed to stop %SERVICE_NAME%
            )
        ) else (
            echo   ℹ %SERVICE_NAME% is not running
        )
    )
) else (
    echo   ℹ %SERVICE_NAME% service not found
)
goto :eof

:CheckPort
set PORT=%1
echo Checking port %PORT%:
netstat -ano | findstr ":%PORT% " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo   ✗ Port %PORT% is still in use:
    for /f "tokens=2,5" %%a in ('netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
        for /f "tokens=1" %%c in ('tasklist /FI "PID eq %%b" /FO CSV /NH 2^>nul ^| findstr /V "INFO:"') do (
            set "PROCESS_NAME=%%c"
            set "PROCESS_NAME=!PROCESS_NAME:"=!"
            echo     !PROCESS_NAME! (PID: %%b)
        )
    )
) else (
    echo   ✓ Port %PORT% is free
)
goto :eof
