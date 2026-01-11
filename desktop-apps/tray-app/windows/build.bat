@echo off
echo Building WidgetizerTray.exe...

csc /target:winexe /win32icon:icon.ico /out:WidgetizerTray.exe WidgetizerTray.cs

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Build successful!
    echo Output: WidgetizerTray.exe
) else (
    echo.
    echo ❌ Build failed!
)

pause