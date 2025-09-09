# -*- coding: utf-8 -*-
import os, sys, json, time
from typing import Any, Dict
from flask import Flask, request, jsonify

# ========= (A) HANDLERS: móc vào logic thật của bạn =========

def handle_attack(target: str, duration: int, method: str = "BypassCF", **kwargs) -> Dict[str, Any]:
    # TODO: gọi hàm tấn công thật của bạn ở đây
    return {
        "status": "running",
        "task_id": f"ga-{int(time.time())}",
        "target": target,
        "duration": duration,
        "method": method,
        "worker": os.getenv("WORKER_ID", "1")
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
      {"cmd":"attack","args":{"target":"https://...","duration":120,"method":"BypassCF"}}
      {"cmd":"addproxy","args":{"proxy":"http://1.2.3.4:8080"}}
    """
    cmd  = payload.get("cmd")
    args = payload.get("args", {}) or {}

    if cmd == "attack":
        target   = args.get("target")
        duration = int(args.get("duration", 60))
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
    # Nếu trước đây body không có "cmd", bạn có thể map sang cmd mặc định tại đây.
    res = process_task(data)
    return jsonify(res), 200

@app.get("/status")
def http_status():
    return jsonify({"ok": True, "mode": "vps", "time": int(time.time())}), 200

# ========= (C) GA MODE (ENV) =========

def run_ga_mode() -> int:
    pj = os.getenv("PAYLOAD_JSON", "").strip()
    if not pj or pj in ("{}", "null"):
        return 1
    try:
        payload = json.loads(pj)
    except Exception as e:
        print("Invalid PAYLOAD_JSON:", e)
        return 2

    wid = os.getenv("WORKER_ID", "1")
    print(f"[GA] Worker #{wid} received payload: {payload}")
    res = process_task(payload)
    print(json.dumps(res, ensure_ascii=False))
    return 0

# ========= (D) ENTRY =========

if __name__ == "__main__":
    # Ép GA-mode nếu có FORCE_GA=1 hoặc có PAYLOAD_JSON
    if os.getenv("FORCE_GA") == "1" or os.getenv("PAYLOAD_JSON", "").strip():
        code = run_ga_mode()
        sys.exit(code)     # QUAN TRỌNG: không mở Flask sau khi chạy GA-mode

    # Mặc định: VPS mode (HTTP)
    print("[VPS] mode: starting Flask")
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port)
