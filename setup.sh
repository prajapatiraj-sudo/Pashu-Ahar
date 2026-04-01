#!/bin/bash

# Krushnam Management System - Linux Setup Script
# This script installs Node.js, SQLite, and configures the project.

# Exit on any error
set -e

echo "🚀 Starting setup for Krushnam Management System..."

# 1. Install Git
echo "📦 Installing Git..."
sudo apt-get update
sudo apt-get install -y git

# 2. Clone or Update the repository
REPO_URL="https://github.com/prajapatiraj-sudo/Pashu-Ahar"
PROJECT_DIR="Pashu-Ahar"

# Check if we are already inside the project directory
if [ -f "package.json" ] && [ "$(basename "$PWD")" == "$PROJECT_DIR" ]; then
    echo "ℹ️ Already inside $PROJECT_DIR, pulling latest changes..."
    # Stash local changes (like package-lock.json) to avoid pull conflicts
    git stash
    git pull
    git stash pop || true
else
    if [ ! -d "$PROJECT_DIR" ]; then
        echo "📥 Cloning repository from $REPO_URL..."
        git clone "$REPO_URL"
    else
        echo "ℹ️ Directory $PROJECT_DIR already exists, pulling latest changes..."
        cd "$PROJECT_DIR"
        # Stash local changes (like package-lock.json) to avoid pull conflicts
        git stash
        git pull
        git stash pop || true
        cd ..
    fi
    cd "$PROJECT_DIR"
fi

# 3. Update system packages
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# 4. Install build essentials (Required for better-sqlite3)
echo "🛠️ Installing build tools..."
sudo apt-get install -y build-essential python3 sqlite3

# 5. Install Node.js (Version 22.x)
echo "🟢 Installing Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 6. Verify installations
echo "✅ Verifying versions:"
node -v
npm -v
sqlite3 --version

# 7. Install project dependencies
echo "📥 Installing project dependencies..."
npm install

# 8. Setup environment variables
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    echo "JWT_SECRET=$(openssl rand -base64 32)" > .env
    echo "NODE_ENV=production" >> .env
    echo "PORT=3000" >> .env
    echo "GEMINI_API_KEY=\"YOUR_GEMINI_API_KEY_HERE\"" >> .env
    echo "APP_URL=\"http://localhost:3000\"" >> .env
    echo "✅ .env file created with a secure JWT_SECRET."
    echo "⚠️ Please update GEMINI_API_KEY in the .env file if needed."
else
    echo "ℹ️ .env file already exists, skipping creation."
fi

# 9. Build the application
echo "🏗️ Building the application..."
npm run build

# 10. Install PM2 for process management (Optional but recommended)
echo "🔄 Installing PM2..."
sudo npm install -g pm2

# 11. Start the application with PM2
echo "🚀 Starting the application..."
# Using npm start via PM2
pm2 start "npm start" --name krushnam-app

# 12. Setup PM2 to start on boot
echo "⚙️ Configuring PM2 to start on boot..."
pm2 save
# Note: You might need to run the command output by 'pm2 startup' manually if prompted.

# 13. Health Check
echo "🔍 Checking if the app is responding..."
sleep 5
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ App is responding on http://localhost:3000"
else
    echo "❌ App is NOT responding on http://localhost:3000"
    echo "📜 Checking PM2 logs for errors:"
    pm2 logs krushnam-app --lines 20 --no-daemon
fi

echo "✨ Setup complete!"
echo "-------------------------------------------------------"
echo "🌐 ACCESSING THE APP:"
echo "If you are on this machine: http://localhost:3000"
echo "If you are remote: http://$(curl -s ifconfig.me):3000"
echo "-------------------------------------------------------"
echo "📊 Use 'pm2 status' to check the app status."
echo "📜 Use 'pm2 logs krushnam-app' to view logs."
echo "🔄 Use 'pm2 restart krushnam-app' after making changes."
