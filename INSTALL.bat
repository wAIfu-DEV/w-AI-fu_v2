@echo off

set CWD=%~dp0

set NODE_PATH=node
set NPM_PATH=npm
set PIP_PATH="%CWD%\venv\Scripts\pip.exe"

echo Installing w-AI-fu v2

::INSTALL NPM PACKAGES
echo Installing nodejs dependencies ...

::Check if node is installed
where %NODE_PATH% >nul 2>&1 || goto RetryNode
:AfterNode
::Check if npm is installed
where %NPM_PATH% >nul 2>&1 || goto RetryNpm
:AfterNpm

call %NPM_PATH% install

cd install

::CREATE PYTHON VENV
call %NODE_PATH% create_python_venv.js
if %errorlevel% neq 0 (
  echo Error when creating Python venv, aborting.
  goto:eof
) else (
  echo Successfuly created Python venv.
)

::INSTALL PIP PACKAGES
echo Installing python dependencies ...
call %PIP_PATH% install -r requirements.txt
::call %PIP_PATH% install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

:: INSTALL GIT
echo Checking if Git is installed...

:: Check if Git is installed
git --version >nul 2>&1
if %errorlevel% neq 0 (
  echo Git not found, installing...
  call "%CWD%\install\install_git.bat"
) else (
  echo Git is already installed.
)

::CREATE SHORTCUT
echo.
echo Creating shortcut ...

call cscript /b create_shortcut.vbs


::END OF NORMAL EXECUTION
echo Done.

pause
goto:eof


::RETRY DIRECT IF ERROR
:RetryNode
echo Could not find node env variable, trying with direct path...
if exist "%PROGRAMFILES%\nodejs\node.exe" (
  echo Found node path.
  set NODE_PATH="%PROGRAMFILES%\nodejs\node.exe"
  goto AfterNode
) else (
  goto ErrNode
)

:RetryNpm
echo Could not find npm env variable, trying with direct path...
if exist "%PROGRAMFILES%\nodejs\npm" (
  echo Found npm path.
  set NPM_PATH="%PROGRAMFILES%\nodejs\npm"
  goto AfterNpm
) else (
  goto ErrNpm
)

::ERROR HANDLING
:ErrNode
echo Could not find an installed NodeJS environment. Please install NodeJS (prefer v19.8.1) from the official website: https://nodejs.org/en/download/releases
echo Make sure to install Node using the .msi installer.
pause
goto:eof

:ErrNpm
echo Could not find npm. Please install NodeJS (prefer v19.8.1) from the official website: https://nodejs.org/en/download/releases
echo Make sure to install Node using the .msi installer.
pause
goto:eof