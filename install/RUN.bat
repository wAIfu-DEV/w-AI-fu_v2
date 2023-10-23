@echo off
set NPX_PATH=npx

where %NPX_PATH% >nul 2>&1 || goto RetryNpx
:AfterNpx

%NPX_PATH% electron .
pause
goto:eof



:RetryNpx
echo Could not find npx env variable, trying with direct path...
if exist "%PROGRAMFILES%\nodejs\npx" (
  echo Found npx path.
  set NPX_PATH="%PROGRAMFILES%\nodejs\npx"
  goto AfterNpx
) else (
  goto ErrNpx
)

:ErrNpx
echo Could not find an installed NodeJS environment. Please install NodeJS (prefer v19.8.1) from the official website: https://nodejs.org/en/download/releases
echo Make sure to install Node using the .msi installer.
pause
goto:eof
