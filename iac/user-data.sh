#!/bin/bash
set -e

# Update system
apt-get update -y
apt-get upgrade -y

# Install required packages
apt-get install -y git nginx certbot python3-certbot-nginx curl unzip

# Install Bun
curl -fsSL https://bun.sh/install | bash -s "bun-v1.0.0"
export PATH="/home/ubuntu/.bun/bin:$PATH"
echo 'export PATH="/home/ubuntu/.bun/bin:$PATH"' >> /home/ubuntu/.bashrc

# Create app directory
mkdir -p /opt/ttt99
chown ubuntu:ubuntu /opt/ttt99

# Create systemd service
cat > /etc/systemd/system/ttt99.service << 'EOF'
[Unit]
Description=TTT-99 Game Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/ttt99/current
ExecStart=/home/ubuntu/.bun/bin/bun run apps/server/index.ts
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=8080

[Install]
WantedBy=multi-user.target
EOF

# Configure Nginx
cat > /etc/nginx/sites-available/ttt99 << 'EOF'
server {
    listen 80;
    server_name _;

    # Frontend (will be served from CloudFront in production)
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket endpoint
    location /ws {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API endpoints
    location ~ ^/(status|health|openapi) {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/ttt99 /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Enable and start services
systemctl enable nginx
systemctl start nginx
systemctl enable ttt99

# Set up SSL if domain is provided
%{ if domain_name != "" }
# Wait for DNS to propagate and get SSL certificate
sleep 60
certbot --nginx -d ${domain_name} --non-interactive --agree-tos --email admin@${domain_name}
%{ endif }

# Create deployment script
cat > /opt/ttt99/deploy.sh << 'EOF'
#!/bin/bash
set -e

REPO_URL="https://github.com/your-username/tdc-amazon-project.git"
DEPLOY_DIR="/opt/ttt99"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RELEASE_DIR="$DEPLOY_DIR/releases/$TIMESTAMP"

echo "Starting deployment at $(date)"

# Create release directory
mkdir -p "$RELEASE_DIR"

# Clone repository
git clone "$REPO_URL" "$RELEASE_DIR"
cd "$RELEASE_DIR"

# Install dependencies and build
/home/ubuntu/.bun/bin/bun install
/home/ubuntu/.bun/bin/bun run build

# Update symlink
ln -sfn "$RELEASE_DIR" "$DEPLOY_DIR/current"

# Restart service
sudo systemctl restart ttt99

# Verify service is running
sleep 5
if systemctl is-active --quiet ttt99; then
    echo "Deployment successful at $(date)"
    
    # Clean up old releases (keep last 3)
    cd "$DEPLOY_DIR/releases"
    ls -t | tail -n +4 | xargs -r rm -rf
else
    echo "Deployment failed - service not running"
    exit 1
fi
EOF

chmod +x /opt/ttt99/deploy.sh
chown ubuntu:ubuntu /opt/ttt99/deploy.sh

echo "User data script completed at $(date)" >> /var/log/user-data.log
