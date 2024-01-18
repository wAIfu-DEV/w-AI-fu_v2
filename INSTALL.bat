@echo off

set CWD=%~dp0

set NODE_PATH=node
set NPM_PATH=npm
set PIP_PATH=pip
set PYTHON_PATH=python

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

::INSTALL PIP PACKAGES
echo Installing python dependencies ...

::Check if python is installed
%PYTHON_PATH% --version 2>NUL
if errorlevel 1 goto RetryPython
:AfterPython
::Check if pip is installed
%PIP_PATH% --version 2>NUL
if errorlevel 1 goto RetryPip
:AfterPip

call %PIP_PATH% install -r requirements.txt

:: INSTALL GIT
echo Installing Git...

:: Check if Git is installed
where %GIT_PATH% >nul 2>&1 || (
  echo Git not found, installing...
  call "%CWD%\install\install_git.bat"
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

:RetryPython
echo Could not find python env variable, trying with direct path...
if exist "%LOCALAPPDATA%\Programs\Python\Python310\python.exe" (
  echo Found python path.
  set PYTHON_PATH="%LOCALAPPDATA%\Programs\Python\Python310\python.exe"
  goto AfterPython
) else (
  goto ErrPython
)

:RetryPip
echo Could not find pip env variable, trying with direct path...
if exist "%LOCALAPPDATA%\Programs\Python\Python310\Scripts\pip.exe" (
  echo Found pip path.
  set PIP_PATH="%LOCALAPPDATA%\Programs\Python\Python310\Scripts\pip.exe"
  goto AfterPip
) else (
  goto ErrPip
)

::ERROR HANDLING
:ErrPython
echo Failed to find an installed Python environment. Please install Python (prefer v3.10.1X) from the official website: https://www.python.org/downloads/windows/
echo Make sure to tick "Add python to PATH" during installation.
pause
goto:eof

:ErrPip
echo Failed to find pip executable. Please install Python (prefer v3.10.1X) from the official website: https://www.python.org/downloads/windows/
echo Make sure to tick "Add python to PATH" during installation.
pause
goto:eof

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