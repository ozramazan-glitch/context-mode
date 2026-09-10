@echo off
setlocal enabledelayedexpansion
title YapiCAD - Windows exe olusturucu

rem Bu dosya yapicad klasorunun icinde veya tools\ altinda durabilir.
rem Her iki durumda da package.json'un bulundugu klasore gecer.
cd /d "%~dp0"
if not exist "package.json" cd ..

echo ==========================================================
echo    YapiCAD  -  Windows .exe olusturucu
echo ==========================================================
echo.

if not exist "package.json" (
  echo HATA: package.json bulunamadi.
  echo Bulundugum klasor: %CD%
  echo.
  echo Bu dosyayi yapicad klasorunun icine ^(main.js'in yanina^)
  echo veya onun tools\ klasorune koyup tekrar calistirin.
  goto SON
)

echo Calisma klasoru : %CD%

where npm >nul 2>nul
if errorlevel 1 goto NODEYOK
where node >nul 2>nul
if errorlevel 1 goto NODEYOK

for /f "delims=" %%v in ('node -v 2^>nul') do set "NODEV=%%v"
echo Node.js surumu  : !NODEV!
echo.

echo [1/2] Bagimliliklar kuruluyor...
echo       Ilk calistirmada Electron indirilir ^(~100 MB^), birkac dakika surer.
echo.
call npm install
if errorlevel 1 goto HATA

echo.
echo [2/2] Windows .exe paketleniyor...
echo.
call npm run dist:win
if errorlevel 1 goto HATA

echo.
echo ==========================================================
echo    TAMAMLANDI
echo ==========================================================
echo.
echo Cikti klasoru: %CD%\dist\release
echo.
echo   YapiCAD-Kurulum-0.1.0.exe      Kurulum sihirbazi
echo   YapiCAD-Tasinabilir-0.1.0.exe  Kurulumsuz tek dosya
echo   win-unpacked\YapiCAD.exe       Acilmis klasor
echo.
echo Not: exe imzasiz oldugu icin Windows SmartScreen ilk acilista
echo      uyarabilir. "Daha fazla bilgi" -^> "Yine de calistir".
echo.
if exist "dist\release" start "" "%CD%\dist\release"
goto SON

:NODEYOK
echo.
echo ----------------------------------------------------------
echo  HATA: Node.js kurulu degil ^(npm komutu bulunamadi^).
echo ----------------------------------------------------------
echo.
echo  Kurulum icin iki yol var:
echo.
echo   A^) Komut isteminde tek satir:
echo        winget install OpenJS.NodeJS.LTS
echo.
echo   B^) Elle indirin:
echo        https://nodejs.org  -^>  "LTS" dugmesi  -^>  .msi kurulumu
echo        Kurulumda varsayilanlari degistirmeyin.
echo.
echo  ONEMLI: Kurulum bittikten sonra bu pencereyi KAPATIN ve bu
echo  dosyayi TEKRAR calistirin. PATH yalnizca yeni acilan
echo  pencerelerde guncellenir.
echo.
goto SON

:HATA
echo.
echo ----------------------------------------------------------
echo  Islem hata ile durdu. Yukaridaki son mesaja bakin.
echo ----------------------------------------------------------
echo.
echo  Sik karsilasilan durumlar:
echo   - Internet baglantisi yok ^(Electron indirilemez^)
echo   - Disk alani yetersiz ^(en az 1.5 GB bos alan gerekir^)
echo   - Kurumsal proxy/guvenlik duvari npm'i engelliyor
echo.

:SON
echo.
pause
endlocal
