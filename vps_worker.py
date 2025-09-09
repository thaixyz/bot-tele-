# -*- coding: utf-8 -*-
import os, sys, json, time
from typing import Any, Dict
from flask import Flask, request, jsonify

# ========= (A) HANDLERS: móc vào logic thật của bạn =========

def handle_attack(target: str, duration: int, method: str = "BypassCF", **kwargs) -> Dict[str, Any]:
    # TODO: gọi hàm tấn công thật của bạn ở đây
    # Lấy các tham số bổ sung từ kwargs
    script = kwargs.get("script", "cfhieu.js")
    rate = kwargs.get("rate", "8")
    thread = kwargs.get("thread", "4")
    proxyfile = kwargs.get("proxyfile", "proxy.txt")
    
    # Logic giả lập (thay bằng code thật để chạy script)
    print(f"Running attack: target={target}, duration={duration}, method={method}, script={script}, rate={rate}, thread={thread}, proxyfile={proxyfile}")
    return {
        "status": "running",
        "task_id": f"ga-{int(time.time())}",
        "target": target,
        "duration": duration,
        "method": method,
        "worker": os.getenv("WORKER_ID", "1"),
        "script": script,
        "rate": rate,
        "thread": thread,
        "proxyfile": proxyfile
    }

def handle_add_proxy(proxy: str) -> Dict[str, Any]:
    # TODO: thêm proxy vào kho của bạn
    return {"ok": True, "added": proxy}

def handle_check_proxies() -> Dict[str, Any]:
    # TODO: kiểm tra proxy
    return {"ok": True, "alive": 0}

def handle_stop(task_id: str) -> Dict[str, Any]:
    # TODO: dừng task theo task_id
    return {"ok": True, "stopped": task_id}

def process_task(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    payload mẫu:
      {"cmd":"attack","args":{"target":"https://...","duration":120,"method":"BypassCF", "script":"cfhieu.js", "rate":"16", "thread":"3", "proxyfile":"proxy.txt"}}
      {"cmd":"addproxy","args":{"proxy":"http://1.2.3.4:8080"}}
    """
    cmd  = payload.get("cmd")
    args = payload.get("args", {}) or {}

    if cmd == "attack":
        target   = args.get("target")
        duration = int(args.get("duration", 60))  # Chuyển time thành duration
        method   = args.get("method", "BypassCF")
        return handle_attack(target, duration, method, **args)

    if cmd == "addproxy":
        return handle_add_proxy(args.get("proxy", ""))

    if cmd == "check_proxies":
        return handle_check_proxies()

    if cmd == "stop":
        return handle_stop(args.get("task_id", ""))

    return {"ok": False, "error": f"unknown cmd: {cmd}", "payload": payload}

# ========= (B) VPS MODE (HTTP) =========

app = Flask(__name__)

@app.post("/execute")
def http_execute():
    data = request.get_json(force=True) or {}
    res = process_task(data)
    return jsonify(res), 200

@app.get("/status")
def http_status():
    return jsonify({"ok": True, "mode": "vps", "time": int(time.time())}), 200

# ========= (C) GA MODE (ENV) =========

def run_ga_mode(payload_file: str = None) -> int:
    # Đọc payload từ file nếu có, nếu không thử từ env
    payload = {}
    if payload_file and os.path.exists(payload_file):
        try:
            with open(payload_file, "r") as f:
                payload = json.load(f)
            print(f"[GA] Worker #{os.getenv('WORKER_ID', '1')} loaded payload from {payload_file}: {payload}")
        except Exception as e:
            print(f"[GA] Error loading payload from {payload_file}: {e}")
    else:
        pj = os.getenv("PAYLOAD_JSON", "").strip()
        if pj and pj not in ("{}", "null"):
            try:
                payload = json.loads(pj)
                print(f"[GA] Worker #{os.getenv('WORKER_ID', '1')} received payload from env: {payload}")
            except Exception as e:
                print(f"[GA] Invalid PAYLOAD_JSON: {e}")
                return 2

    if not payload:
        print("[GA] No valid payload found, exiting.")
        return 1

    res = process_task(payload)
    print(f"[GA] Worker #{os.getenv('WORKER_ID', '1')} processed task: {json.dumps(res, ensure_ascii=False)}")
    return 0

# ========= (D) ENTRY =========

if __name__ == "__main__":
    # Kiểm tra tham số dòng lệnh cho GA-mode
    payload_file = None
    if len(sys.argv) > 1 and sys.argv[1] == "--payload":
        if len(sys.argv) > 2:
            payload_file = sys.argv[2]
        else:
            print("[GA] Error: --payload requires a file path.")
            sys.exit(1)

    # Ép GA-mode nếu có FORCE_GA=1 hoặc có payload_file hoặc PAYLOAD_JSON
    if os.getenv("FORCE_GA") == "1" or payload_file or os.getenv("PAYLOAD_JSON", "").strip():
        code = run_ga_mode(payload_file)
        sys.exit(code)  # QUAN TRỌNG: không mở Flask sau khi chạy GA-mode

    # Mặc định: VPS mode (HTTP)
    print("[VPS] mode: starting Flask")
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port)
