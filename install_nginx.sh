#!/bin/bash
set -e

echo "=== [Install] Nginx & Dashboard ==="

# 1. ติดตั้ง Nginx
apt-get update
apt-get install -y nginx curl

# 2. ลบ Config เดิมทิ้ง
rm -rf /etc/nginx/sites-enabled/default
rm -f /etc/nginx/nginx.conf

# 3. สร้าง Directory สำหรับ Web Dashboard
mkdir -p /var/www/dashboard

# Cleanup
apt-get clean
rm -rf /var/lib/apt/lists/*

echo "=== [Install] Nginx Complete ==="