#!/bin/bash
set -e
source ~/.bashrc 2>/dev/null || true

cd ~/saas-blueprint

echo "Pulling latest code..."
git pull

echo "Installing dependencies..."
npm install

echo "Building..."
npm run build

echo "Restarting server..."
pm2 restart saas-blueprint

echo "Deploy complete!"
