import json
import os
import sys
import time
import urllib.error
import urllib.request

import serial

BASE = os.environ.get("BLUETAG_BASE", "http://127.0.0.1:8000")
PORT = os.environ.get("BLUETAG_COM_PORT", "COM3")
TAG_ID = os.environ.get("BLUETAG_TAG_ID", "BTAG-23729208")
ADMIN_EMAIL = os.environ.get("BLUETAG_ADMIN_EMAIL", "test@test.com")
ADMIN_PASSWORD = os.environ.get("BLUETAG_ADMIN_PASSWORD", "12345678")


def api(method: str, path: str, token: str | None = None, payload=None):
    data = None
    headers = {}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=20) as resp:
        body = resp.read().decode("utf-8")
        return resp.status, json.loads(body) if body else None


def serial_cmd(command: str) -> str:
    with serial.Serial(PORT, 115200, timeout=1.5, write_timeout=1.5) as ser:
        time.sleep(0.8)
        ser.reset_input_buffer()
        ser.write((command + "\n").encode("utf-8"))
        ser.flush()
        time.sleep(0.9)
        return ser.read_all().decode("utf-8", errors="replace").strip()


def main():
    try:
        _, login = api("POST", "/api/auth/login", payload={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        token = login["token"]
        _, cleared = api("POST", "/api/admin/cleanup/tag-state", token=token, payload={"tag_id": TAG_ID})
        board = serial_cmd("TECH_RESET")
        print(json.dumps({"cleanup": cleared, "board": board}, indent=2))
    except urllib.error.HTTPError as exc:
        print(exc.read().decode("utf-8"))
        sys.exit(1)


if __name__ == "__main__":
    main()
