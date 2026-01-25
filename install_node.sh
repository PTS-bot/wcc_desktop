#!/bin/bash
set -e

echo "=== [Install] Node.js & Dependencies ==="

# 1. ติดตั้ง Pre-requisites (curl เพื่อดึงตัวติดตั้ง)
apt-get update
apt-get install -y curl gnupg

# 2. เพิ่ม NodeSource Repository (เพื่อลง Node.js เวอร์ชันใหม่ล่าสุด)
# ดึง Script setup สำหรับ Node.js เวอร์ชัน 20 (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -

# 3. ติดตั้ง Node.js (รวม npm มาให้แล้ว)
apt-get install -y nodejs

# 4. สร้าง Directory สำหรับ Application (Backend)
mkdir -p /usr/src/app

# 5. ติดตั้ง Global Packages ที่จำเป็น
# pm2 = ตัวช่วยรัน Server ให้ทำงานตลอดเวลา (Production Process Manager)
npm install -g pm2

# Cleanup (ลบ cache เพื่อลดขนาด Docker Image)
apt-get clean
rm -rf /var/lib/apt/lists/*

echo "=== [Install] Node.js Complete ==="