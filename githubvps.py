# -*- coding: utf-8 -*-
import os, sys, json, time
from typing import Any, Dict

# ====== (A) CORE: chỗ gọi tới logic thật của Quân ======
# Đổi các hàm dưới đây để móc vào code hiện tại (attack/check/status...).
# Nếu Quân đã có sẵn các hàm tương đương, chỉ cần gọi lại ở đây.

def handle_attack(target: str, duration: int, method: str = "BypassCF", **kwargs) -> Dict[str, Any]:
    """
    TODO: GỌI HÀM/LOGIC TẤN CÔNG THẬT CỦA QUÂN Ở ĐÂY
    Ví dụ nếu trước đây endpoint /execute gọi một hàm attack(...),
    thì giờ ta gọi lại attack(...) y hệt.
    """
    # ví dụ trả về giống VPS:
    return {
        "status": "running",
        "task_id": f"ga-{int(time.time())}",
        "target": target,
        "duration": duration,
        "method": method,
        "worker": os.getenv("WORKER_ID", "1")
    }

def handle_check_proxies() -> Dict[str, Any]:
    """TODO: gọi logic kiểm tra proxy của Quân."""
    return {"ok": True, "alive": 0}

def handle_stop(task_id: str) -> Dict[str, Any]:
    """TODO: dừng task theo task_id nếu có."""
    return {"ok": True, "stopped": task_id}

def process_task(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Chuẩn hóa payload rồi gọi đúng handler.
    payload mẫu (từ GA):
      {"cmd":"attack","args":{"target":"https://...","duration":120,"method":"BypassCF"}}
    hoặc (từ VPS HTTP): body JSON tương tự.
    """
    cmd  = payload.get("cmd")
    args = payload.get("args", {}) or {}

    if cmd == "attack":
        target   = args.get("target")
        duration = int(args.get("duration", 60))
        method   = args.get("method", "BypassCF")
        return handle_attack(target, duration, method, **args)

    if cmd == "check_proxies":
        return handle_check_proxies()

    if cmd == "stop":
        return handle_stop(args.get("task_id", ""))

    # Nếu Quân có thêm lệnh: elif cmd == "xxx": ...
    return {"ok": False, "error": f"unknown cmd: {cmd}", "payload": payload}


# ====== (B) VPS MODE: Flask HTTP server như cũ ======
from flask import Flask, request, jsonify
app = Flask(__name__)

@app.post("/execute")
def http_execute():
    data = request.get_json(force=True) or {}
    # Có thể data đang là dạng cũ (không có "cmd"). Map nhanh nếu cần:
    if "cmd" not in data:
        # Ví dụ map body cũ thành cmd=attack (tuỳ Quân dùng gì trước đây)
        # data = {"cmd":"attack","args": data}
        pass
    result = process_task(data)
    return jsonify(result), 200

@app.get("/status")
def http_status():
    # TODO: nếu có trạng thái chi tiết thì trả ở đây
    return jsonify({"ok": True, "mode": "vps", "time": int(time.time())}), 200


# ====== (C) GA MODE: đọc ENV PAYLOAD_JSON rồi thoát ======
def run_ga_mode() -> int:
    """
    GA mode: không mở cổng. Đọc PAYLOAD_JSON, xử lý, in kết quả rồi thoát.
    """
    pj = os.getenv("PAYLOAD_JSON")
    if not pj:
        return 1

    try:
        payload = json.loads(pj)
    except Exception as e:
        print("Invalid PAYLOAD_JSON:", e)
        return 2

    # Nếu workflow truyền thêm WORKER_ID thì log cho dễ debug
    wid = os.getenv("WORKER_ID", "1")
    print(f"[GA] Worker #{wid} received payload: {payload}")

    res = process_task(payload)
    # In ra stdout để xem trong log GA
    print(json.dumps(res, ensure_ascii=False))
    return 0


# ====== (D) ENTRYPOINT ======
if __name__ == "__main__":
    if os.getenv("PAYLOAD_JSON"):
        # GA mode
        sys.exit(run_ga_mode())
    else:
        # VPS mode
        port = int(os.getenv("PORT", "5000"))
        app.run(host="0.0.0.0", port=port)
