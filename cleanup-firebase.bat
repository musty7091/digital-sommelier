@echo off
echo Eski Firebase donemi dosyalari siliniyor...
del /f /q firebase.json 2>nul
del /f /q firestore.rules 2>nul
del /f /q storage.rules 2>nul
del /f /q seed.js 2>nul
echo.
echo Tamamlandi.
echo NOT: src\firebase\products.js KORUNDU (ismi firebase ama aktif lokal API istemcisi, SILINMEZ).
echo NOT: package.json zaten guncellendi (firebase bagimliligi ve seed scripti kaldirildi).
pause
