@echo off
title Digital Sommelier Kiosk Baslatiliyor

echo Eski acik servisler kapatiliyor...
taskkill /F /IM node.exe /T >nul 2>&1
taskkill /F /IM msedge.exe /T >nul 2>&1

echo Proje klasorune geciliyor...
cd /d C:\digital-sommelier

echo Proje icindeki hatali kiosk profil klasoru temizleniyor...
if exist "C:\digital-sommelier\kiosk-browser-profile" (
  rmdir /s /q "C:\digital-sommelier\kiosk-browser-profile"
)

echo Digital Sommelier lokal servisleri minimize olarak baslatiliyor...
start "Digital Sommelier Server" /min cmd /k "cd /d C:\digital-sommelier && npm.cmd run dev:local"

echo Sunucunun acilmasi bekleniyor...
timeout /t 15 /nobreak >nul

echo Edge yolu kontrol ediliyor...

set EDGE_EXE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe

if not exist "%EDGE_EXE%" (
  set EDGE_EXE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe
)

if not exist "%EDGE_EXE%" (
  echo Microsoft Edge bulunamadi.
  echo Lutfen Edge kurulu mu kontrol edin.
  pause
  exit /b
)

echo Microsoft Edge kiosk modunda aciliyor...
start "Digital Sommelier Kiosk" "%EDGE_EXE%" --kiosk "http://localhost:5173/" --edge-kiosk-type=fullscreen --no-first-run --disable-features=Translate --user-data-dir="C:\digital-sommelier-kiosk-profile"

exit