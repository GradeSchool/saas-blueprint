#!/bin/bash
set -e

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
