#!/bin/bash

# ==============================================================================
# INDUS BRAIN AI - AWS EC2 PRODUCTION DEPLOYMENT ENGINE
# Target Platform: Ubuntu 22.04 LTS / Debian
# Execution: sudo ./deploy.sh
# ==============================================================================

# Exit immediately if a command exits with a non-zero status
set -e

# Logging configuration
log() {
    echo -e "\e[1;34m[INDUS DEPLOY] $1\e[0m"
}

error_handler() {
    echo -e "\e[1;31m[DEPLOY ERROR] Critical failure at line $1\e[0m"
    exit 1
}
trap 'error_handler $LINENO' ERR

log "Starting deployment sequence for INDUS BRAIN AI..."

# 1. Update OS and Install System Packages
log "Updating package indexes and installing system binaries..."
sudo apt-get update -y
sudo apt-get install -y python3-pip python3-venv git nginx libgomp1 curl

# Install Node.js if missing (Node 18+ required)
if ! command -v node &> /dev/null; then
    log "NodeJS not found. Installing Node.js 20.x from NodeSource..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 2. Setup Project Directories
PROJECT_ROOT="/var/www/indus-brain-ai"
log "Synchronizing directories under $PROJECT_ROOT..."
sudo mkdir -p "$PROJECT_ROOT"
sudo chown -R $USER:$USER "$PROJECT_ROOT"

# Copy files from repository to web root (clean target first to prevent nesting bugs)
rm -rf "$PROJECT_ROOT/backend"
rm -rf "$PROJECT_ROOT/frontend"
cp -r ../backend "$PROJECT_ROOT/"
cp -r ../frontend "$PROJECT_ROOT/"

# 3. Setup Python Backend Environment
log "Creating Python virtual environment..."
cd "$PROJECT_ROOT/backend"
python3 -m venv venv
source venv/bin/activate
log "Installing pip requirements (this may take 2-3 minutes for FAISS & Torch)..."
pip install --upgrade pip
pip install --no-cache-dir -r requirements.txt
deactivate

# Setup baseline .env if missing
if [ ! -f .env ]; then
    log "Active .env missing. Constructing default environment parameters..."
    cp .env.example .env
fi

# 4. Build Frontend Static Assets
log "Building Vite React production assets..."
cd "$PROJECT_ROOT/frontend"
npm install
npm run build

# Move built site to Nginx html directory
log "Publishing static bundle to Nginx html directory..."
sudo mkdir -p /var/www/html/indus-brain
sudo cp -r dist/* /var/www/html/indus-brain/

# 5. Configure Systemd Service for Backend Daemon
log "Configuring systemd daemon for FastAPI backend..."
sudo bash -c 'cat > /etc/systemd/system/indus-backend.service <<EOF
[Unit]
Description=INDUS BRAIN AI - FastAPI Backend Service
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/var/www/indus-brain-ai/backend
ExecStart=/var/www/indus-brain-ai/backend/venv/bin/uvicorn backend.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5
Environment=PATH=/var/www/indus-brain-ai/backend/venv/bin:/usr/bin:/bin PYTHONPATH=/var/www/indus-brain-ai

[Install]
WantedBy=multi-user.target
EOF'

# Reload systemd and launch backend service
log "Enabling and launching backend daemon..."
sudo systemctl daemon-reload
sudo systemctl enable indus-backend.service
sudo systemctl restart indus-backend.service

# 6. Configure Nginx Reverse Proxy
log "Configuring Nginx server blocks..."
sudo bash -c 'cat > /etc/nginx/sites-available/indus-brain-ai <<EOF
server {
    listen 80;
    server_name _;

    # Serve static frontend assets
    location / {
        root /var/www/html/indus-brain;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    # Reverse proxy backend API calls
    location /api/v1 {
        proxy_pass http://127.0.0.1:8000/api/v1;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF'

# Enable site and restart nginx
if [ -f /etc/nginx/sites-enabled/default ]; then
    sudo rm -f /etc/nginx/sites-enabled/default
fi

sudo ln -sf /etc/nginx/sites-available/indus-brain-ai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

log "Port openings (opening port 80 and 443)..."
if command -v ufw &> /dev/null; then
    sudo ufw allow "Nginx Full"
fi

log "=============================================================================="
log "INDUS BRAIN AI SUCCESSFULLY DEPLOYED!"
log "FastAPI Backend is running on port 8000 via Uvicorn."
log "Nginx is reverse proxying frontend at http://localhost"
log "=============================================================================="
