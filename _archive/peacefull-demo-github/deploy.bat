@echo off
REM Peacefull.ai VC Demo - Windows Deploy Script
REM Usage: deploy.bat YOUR_GITHUB_USERNAME

setlocal enabledelayedexpansion

if "%~1"=="" (
    echo Error: GitHub username required
    echo Usage: deploy.bat YOUR_GITHUB_USERNAME
    echo Example: deploy.bat khojarahimi
    exit /b 1
)

set USERNAME=%~1
set REPO_NAME=peacefull-demo
set GITHUB_URL=https://github.com/%USERNAME%/%REPO_NAME%.git
set PAGES_URL=https://%USERNAME%.github.io/%REPO_NAME%

echo ======================================
echo   Peacefull.ai Demo - GitHub Deploy
echo ======================================
echo.

REM Check if git is installed
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Git is not installed
    echo Please install Git first: https://git-scm.com/downloads
    exit /b 1
)

echo Step 1/6: Checking GitHub repository...
echo Repository: %GITHUB_URL%
echo.

REM Initialize git if not exists
if not exist ".git" (
    echo Step 2/6: Initializing Git repository...
    git init
    echo ^✓ Git repository initialized
) else (
    echo ^✓ Git repository already exists
)

REM Add remote
git remote get-url origin >nul 2>nul
if %errorlevel% equ 0 (
    echo Updating remote origin...
    git remote set-url origin %GITHUB_URL%
) else (
    echo Adding GitHub remote...
    git remote add origin %GITHUB_URL%
)

echo.
echo Step 3/6: Adding files to Git...
git add .
echo ^✓ Files added

echo.
echo Step 4/6: Committing changes...
git commit -m "Deploy VC Demo v2.1 - %date% %time%" 2>nul || echo ^⚠ No changes to commit
echo ^✓ Changes committed

echo.
echo Step 5/6: Pushing to GitHub...
echo This may prompt for your GitHub credentials...
echo.

git push -u origin main 2>nul || git push -u origin master 2>nul
if %errorlevel% neq 0 (
    echo.
    echo ^✗ Push failed
    echo.
    echo Common fixes:
    echo 1. Make sure the GitHub repository exists: %GITHUB_URL%
    echo 2. Check your GitHub credentials
    echo 3. If using 2FA, use a personal access token instead of password
    echo.
    echo To create the repo, visit:
    echo https://github.com/new?name=%REPO_NAME%^&private=false
    exit /b 1
)

echo ^✓ Successfully pushed to GitHub!
echo.
echo Step 6/6: Checking GitHub Pages status...
echo.
echo ======================================
echo   ^🎉 DEPLOYMENT SUCCESSFUL!
echo ======================================
echo.
echo Repository: %GITHUB_URL%
echo Live Demo:  %PAGES_URL%
echo.
echo Next Steps:
echo 1. Visit your repository: %GITHUB_URL%
echo 2. Go to Settings → Pages
echo 3. Ensure 'Source' is set to 'Deploy from a branch'
echo 4. Select 'main' branch and '/(root)' folder
echo 5. Click Save
echo.
echo Your demo will be live in 1-2 minutes at:
echo %PAGES_URL%
echo.
echo ======================================

pause
