#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "Building Kaveri Member Club Frontend..."
cd frontend
npm install
npm run build
cd ..

echo "Setting up Backend..."
cd backend
pip install -r requirements.txt
cd ..

echo "Kaveri Member Club Build Complete!"
