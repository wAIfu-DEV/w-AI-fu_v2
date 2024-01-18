@echo off
echo Installing Git for Windows...

:: Specify the download URL for the Git installer
set "gitInstallerURL=https://github.com/git-for-windows/git/releases/download/v2.43.0.windows.1/Git-2.43.0-64-bit.exe"

:: Specify the path to save the installer
set "installerPath=%TEMP%\GitInstaller.exe"

:: Download the Git installer
curl -L -o "%installerPath%" "%gitInstallerURL%"

:: Install Git silently
start /wait "" "%installerPath%" /VERYSILENT /NORESTART /CLOSEAPPLICATIONS /COMPONENTS="icons,ext\reg\shellhere,assoc,assoc_sh"

:: Delete the installer
del "%installerPath%"

echo Git installation completed.
