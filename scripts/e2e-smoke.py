import json
import os
import time
import urllib.error
import urllib.request
from datetime import datetime

import serial

BASE = os.environ.get("BLUETAG_BASE", "http://127.0.0.1:8000")
PORT = os.environ.get("BLUETAG_COM_PORT", "COM3")
TAG_ID = os.environ.get("BLUETAG_TAG_ID", "BTAG-23729208")
NAME = os.environ.get("BLUETAG_SMOKE_NAME", "smoketest")
EMAIL = os.environ.get("BLUETAG_SMOKE_EMAIL", f"smoke_{datetime.now().strftime('%Y%m%d%H%M%S')}@test.com")
PASSWORD = os.environ.get("BLUETAG_SMOKE_PASSWORD", "SmokeTest123!")
ADMIN_EMAIL = os.environ.get("BLUETAG_ADMIN_EMAIL", "")
ADMIN_PASSWORD = os.environ.get("BLUETAG_ADMIN_PASSWORD", "")


def slugify_connection_name(value: str) -> str:
    import re
    slug = value.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^\w\s-]", "", slug).strip()
    slug = re.sub(r"\s+", "-", slug)
    slug = re.sub(r"_+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug.upper() or "USER"


def hash_connection_seed(value: str) -> str:
    h = 0x811C9DC5
    for ch in value:
        h ^= ord(ch)
        h = (h * 0x01000193) & 0xFFFFFFFF
    digits = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    out = ""
    n = h
    if n == 0:
        out = "0"
    while n > 0:
        n, r = divmod(n, 36)
        out = digits[r] + out
    return out.rjust(10, "0")[-10:]


def build_default_web_id(name: str, email: str) -> str:
    raw_name = name.strip()
    email_local = email.strip().split("@")[0] if email.strip() else ""
    safe_name = slugify_connection_name(raw_name or email_local)
    seed = f"{email.strip().lower()}|{raw_name.lower()}"
    suffix = hash_connection_seed(seed or safe_name)
    return f"BLUETAG-{safe_name}-{suffix}"


def api(method: str, path: str, token: str | None = None, payload=None):
    data = None
    headers = {}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body else None
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8")
        raise RuntimeError(f"HTTP {exc.code} {path}: {body}") from exc


def serial_cmd(command: str) -> str:
    with serial.Serial(PORT, 115200, timeout=1.5, write_timeout=1.5) as ser:
        time.sleep(0.8)
        ser.reset_input_buffer()
        ser.write((command + "\n").encode("utf-8"))
        ser.flush()
        time.sleep(0.9)
        chunks: list[str] = []
        while True:
            data = ser.read_all()
            if not data:
                break
            chunks.append(data.decode("utf-8", errors="replace"))
            time.sleep(0.1)
        return "".join(chunks).strip()


def main():
    if ADMIN_EMAIL and ADMIN_PASSWORD:
        _, admin_login = api("POST", "/api/auth/login", payload={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        admin_token = admin_login["token"]
        api("POST", "/api/admin/cleanup/tag-state", token=admin_token, payload={"tag_id": TAG_ID})
        serial_cmd("TECH_RESET")

    _, register = api("POST", "/api/auth/register", payload={"email": EMAIL, "password": PASSWORD, "name": NAME})
    token = register["token"]
    _, me = api("GET", "/api/auth/me", token=token)
    web_id = build_default_web_id(me["name"], me["email"])
    _, created_web_id = api("POST", "/api/web-ids", token=token, payload={"web_id": web_id})
    _, web_ids = api("GET", "/api/web-ids", token=token)

    serial_reset = serial_cmd("TECH_RESET")
    serial_bind = serial_cmd(f"BIND {web_id}")
    serial_status = serial_cmd("ID")

    _, binding = api("POST", "/api/bindings", token=token, payload={"tag_id": TAG_ID, "web_id": web_id})
    board_hash = None
    for line in serial_bind.splitlines():
        if line.startswith("BIND_OK="):
            board_hash = line.split("=", 1)[1].strip()
            break

    lock_state = "locked" if "LOCK_STATE=LOCKED" in serial_status else "unbound"
    _, synced = api(
        "PATCH",
        f"/api/bindings/{TAG_ID}/board-state",
        token=token,
        payload={"web_id": web_id, "board_web_id_hash": board_hash, "board_lock_state": lock_state},
    )
    _, tag_write = api(
        "POST",
        "/api/tags",
        token=token,
        payload={
            "tag_id": TAG_ID,
            "estimated_latitude": 16.4419,
            "estimated_longitude": 102.8350,
            "estimate_source": "usb-smoke",
        },
    )
    _, tag_overview = api("GET", f"/api/web-ids/{web_id}/tags", token=token)
    _, history = api("GET", f"/api/web-ids/{web_id}/location-history?tag_id={TAG_ID}&limit=5", token=token)

    print(json.dumps({
        "user": {"email": EMAIL, "name": me["name"], "role": me["role"]},
        "web_id": web_id,
        "created_web_id": created_web_id,
        "web_ids": web_ids,
        "serial_reset": serial_reset,
        "serial_bind": serial_bind,
        "serial_status": serial_status,
        "binding": binding,
        "synced_board_state": synced,
        "tag_write": tag_write,
        "tag_overview": tag_overview,
        "location_history": history,
    }, indent=2))


if __name__ == "__main__":
    main()
