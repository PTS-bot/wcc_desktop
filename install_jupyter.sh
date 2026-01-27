#!/bin/bash
set -e

# ==========================================
# 1. กำหนดค่าตัวแปร
# ==========================================
# เปลี่ยน Token ตามใจชอบ
JUP_TOKEN="${JUPYTER_TOKEN:-master}"       
# 🔥 เปลี่ยนให้ไปใช้ Folder เดียวกับ Desktop จะได้เห็นไฟล์กัน
WORK_DIR="/config"             
REQ_FILE="requirements_python.txt"          

echo "Starting Installation..."

# ==========================================
# 2. ติดตั้ง Dependencies
# ==========================================
apt-get update
apt-get install -y \
    python3-pip \
    python3-venv \
    openjdk-11-jdk \
    git \
    curl \
    iputils-ping \
    net-tools \
    sudo  # ลง sudo เผื่อเรียกใช้คำสั่ง root ผ่าน jupyter

apt-get clean
rm -rf /var/lib/apt/lists/*

pip3 install --no-cache-dir --upgrade pip
pip3 install --no-cache-dir jupyterlab

# ==========================================
# 3. สร้าง Config File (ย้ายไปไว้ /opt เพื่อให้ abc อ่านได้)
# ==========================================
# 🔥 ย้าย Config ออกจาก /root ไปไว้ที่ /opt
CONFIG_FILE="/opt/jupyter_lab_config.py"

echo "Generating Jupyter Config at $CONFIG_FILE..."

cat <<EOT > "$CONFIG_FILE"
c.ServerApp.ip = '0.0.0.0'
c.ServerApp.port = 8888
c.ServerApp.open_browser = False
c.ServerApp.allow_root = True
c.ServerApp.allow_origin = '*'
c.ServerApp.token = '$JUP_TOKEN'
c.ServerApp.root_dir = '$WORK_DIR'
c.ServerApp.base_url = '/jupyter'
EOT

# 🔥 สำคัญ: ให้สิทธิ์ทุกคนอ่านไฟล์ config นี้ได้ (ไม่งั้น user abc จะอ่านไม่ได้)
chmod 644 "$CONFIG_FILE"

echo "Jupyter installation complete."