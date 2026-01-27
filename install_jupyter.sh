#!/bin/bash
set -e # ถ้ามี error ให้หยุดทันที

# ==========================================
# 1. กำหนดค่าตัวแปร (CONFIG VARIABLES)
# ==========================================
JUPYTER_PASSWORD="master"      # <--- แก้รหัสผ่านตรงนี้
BASE_URL="/jupyter"            # Path สำหรับเข้าผ่าน Nginx
WORK_DIR="/config"             # โฟลเดอร์ทำงาน (Volume ของ Webtop)

echo "Starting Jupyter Installation..."
echo "Password set to: $JUPYTER_PASSWORD"

# ==========================================
# 2. ติดตั้ง Dependencies และ Jupyter
# ==========================================
apt-get update
apt-get install -y \
    python3-pip \
    python3-venv \
    openjdk-11-jdk \
    curl \
    iputils-ping \
    net-tools

pip3 install --no-cache-dir jupyterlab --break-system-packages

# ==========================================
# 3. สร้าง Config File
# ==========================================
mkdir -p /root/.jupyter
CONFIG_FILE="/root/.jupyter/jupyter_lab_config.py"

# เขียน Config ลงไฟล์
cat <<EOT > "$CONFIG_FILE"
c.ServerApp.ip = '0.0.0.0'
c.ServerApp.port = 8888
c.ServerApp.open_browser = False
c.ServerApp.allow_root = True
c.ServerApp.allow_origin = '*'
c.ServerApp.token = '$JUPYTER_PASSWORD'
c.ServerApp.base_url = '$BASE_URL'
c.ServerApp.root_dir = '$WORK_DIR'
EOT

echo "Jupyter Configuration created at $CONFIG_FILE"

# ==========================================
# 4. ล้างขยะ (Clean up)
# ==========================================
apt-get clean
rm -rf /var/lib/apt/lists/*