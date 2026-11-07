#!/usr/bin/env bash
set -o errexit

echo "Preparing Kaveri Member Club..."

# If node & npm are available, build fresh assets
if command -v npm &> /dev/null; then
  echo "Node.js detected. Building frontend with npm..."
  cd frontend
  npm install
  npm run build
  cd ..
else
  echo "Node.js not in environment, using pre-built frontend/dist..."
fi

# Ensure both APKs are copied into frontend/dist
if [ -f "frontend/public/KaveriAdmin.apk" ] && [ -d "frontend/dist" ]; then
  cp -f frontend/public/KaveriAdmin.apk frontend/dist/KaveriAdmin.apk
  cp -f frontend/public/KaveriClub.apk frontend/dist/KaveriClub.apk
  cp -f frontend/public/manifest-admin.json frontend/dist/manifest-admin.json || true
fi

echo "Setting up Python Backend..."
cd backend
pip install -r requirements.txt
cd ..

echo "Kaveri Member Club Build Complete!"
