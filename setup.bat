@echo off
SETLOCAL EnableDelayedExpansion

echo 🚀 Starting setup for Krushnam Management System on Windows...

:: 1. Check for Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please download and install it from https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js is installed.

:: 2. Check for Git (Optional but recommended)
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️ Git is not installed. You might need it to pull updates.
) else (
    echo ✅ Git is installed.
)

:: 3. Install project dependencies
echo 📥 Installing project dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies.
    echo ℹ️ If you see errors related to 'better-sqlite3', you may need to install C++ Build Tools.
    echo ℹ️ You can install them by running: npm install --global --production windows-build-tools
    echo ℹ️ Or by downloading Visual Studio Build Tools from: https://visualstudio.microsoft.com/visual-cpp-build-tools/
    pause
    exit /b 1
)

:: 4. Setup environment variables
if not exist .env (
    echo 📝 Creating .env file...
    
    :: Generate a random JWT_SECRET using PowerShell
    for /f "tokens=*" %%a in ('powershell -command "[Convert]::ToBase64String((1..32 | foreach { [byte](Get-Random -Minimum 0 -Maximum 255) }))"') do set RANDOM_SECRET=%%a
    
    echo JWT_SECRET="!RANDOM_SECRET!" > .env
    echo NODE_ENV=production >> .env
    echo PORT=3000 >> .env
    echo GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE" >> .env
    echo APP_URL="http://localhost:3000" >> .env
    
    echo ✅ .env file created with a secure JWT_SECRET.
    echo ⚠️ Please update GEMINI_API_KEY in the .env file if needed.
) else (
    echo ℹ️ .env file already exists, skipping creation.
)

:: 5. Build the application
echo 🏗️ Building the application...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed.
    pause
    exit /b 1
)

echo ✨ Setup complete!
echo -------------------------------------------------------
echo 🌐 ACCESSING THE APP:
echo Open your browser and go to: http://localhost:3000
echo -------------------------------------------------------
echo 🚀 To start the application, run:
echo npm start
echo -------------------------------------------------------

pause
