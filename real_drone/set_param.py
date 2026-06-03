"""Generic single-parameter setter + optional reboot.

Usage:
    python real_drone/set_param.py NAME VALUE [--type INT8|INT16|INT32|REAL32] [--reboot]
"""
import argparse
import time
from pymavlink import mavutil


TYPES = {
    "INT8": mavutil.mavlink.MAV_PARAM_TYPE_INT8,
    "INT16": mavutil.mavlink.MAV_PARAM_TYPE_INT16,
    "INT32": mavutil.mavlink.MAV_PARAM_TYPE_INT32,
    "REAL32": mavutil.mavlink.MAV_PARAM_TYPE_REAL32,
}


def read_param(m, name, timeout=3):
    nb = name.encode("utf-8").ljust(16, b"\x00")[:16]
    m.mav.param_request_read_send(m.target_system, m.target_component, nb, -1)
    end = time.time() + timeout
    while time.time() < end:
        msg = m.recv_match(type="PARAM_VALUE", blocking=True, timeout=1)
        if msg is None:
            continue
        pid = msg.param_id
        if isinstance(pid, bytes):
            pid = pid.decode("utf-8", errors="replace")
        if pid.rstrip("\x00") == name:
            return msg.param_value
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("name")
    ap.add_argument("value", type=float)
    ap.add_argument("--type", default="INT16", choices=TYPES.keys())
    ap.add_argument("--port", default="/dev/cu.usbmodem1101")
    ap.add_argument("--baud", type=int, default=115200)
    ap.add_argument("--reboot", action="store_true")
    args = ap.parse_args()

    m = mavutil.mavlink_connection(args.port, baud=args.baud, dialect="ardupilotmega")
    if m.wait_heartbeat(timeout=10) is None:
        print("[!] No heartbeat")
        return

    before = read_param(m, args.name)
    print(f"[+] {args.name} before: {before}")

    nb = args.name.encode("utf-8").ljust(16, b"\x00")[:16]
    m.mav.param_set_send(m.target_system, m.target_component, nb, args.value, TYPES[args.type])
    time.sleep(0.5)

    after = read_param(m, args.name)
    print(f"[+] {args.name} after:  {after}")

    if args.reboot:
        print("[+] Rebooting FC...")
        m.mav.command_long_send(
            m.target_system, m.target_component,
            mavutil.mavlink.MAV_CMD_PREFLIGHT_REBOOT_SHUTDOWN,
            0, 1, 0, 0, 0, 0, 0, 0,
        )


if __name__ == "__main__":
    main()
