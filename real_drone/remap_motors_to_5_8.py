"""Remap motor functions from FC outputs S1-S4 to S5-S8.

Use when the user has physically moved the 4 signal wires from the FC
pads S1-S4 to the FC pads S5-S8 (to bypass suspected dead pads).

Sets:
    SERVO1-4_FUNCTION = 0   (disabled)
    SERVO5_FUNCTION   = 33  (Motor 1)
    SERVO6_FUNCTION   = 34  (Motor 2)
    SERVO7_FUNCTION   = 35  (Motor 3)
    SERVO8_FUNCTION   = 36  (Motor 4)

Then reboots the FC so changes take effect.

To revert, run with --revert (sets S1-S4 back to Motor1-4 and S5-S8 to 0).

Usage:
    python real_drone/remap_motors_to_5_8.py --port /dev/cu.usbmodem1301
    python real_drone/remap_motors_to_5_8.py --port /dev/cu.usbmodem1301 --revert
"""
import argparse
import sys
import time
from pymavlink import mavutil


PTYPE = mavutil.mavlink.MAV_PARAM_TYPE_INT16

REMAP_TO_5_8 = [
    ("SERVO1_FUNCTION", 0),
    ("SERVO2_FUNCTION", 0),
    ("SERVO3_FUNCTION", 0),
    ("SERVO4_FUNCTION", 0),
    ("SERVO5_FUNCTION", 33),   # Motor 1
    ("SERVO6_FUNCTION", 34),   # Motor 2
    ("SERVO7_FUNCTION", 35),   # Motor 3
    ("SERVO8_FUNCTION", 36),   # Motor 4
]

REVERT_TO_1_4 = [
    ("SERVO1_FUNCTION", 33),
    ("SERVO2_FUNCTION", 34),
    ("SERVO3_FUNCTION", 35),
    ("SERVO4_FUNCTION", 36),
    ("SERVO5_FUNCTION", 0),
    ("SERVO6_FUNCTION", 0),
    ("SERVO7_FUNCTION", 0),
    ("SERVO8_FUNCTION", 0),
]


def read_param(m, name, timeout=2):
    nb = name.encode().ljust(16, b"\x00")[:16]
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


def set_param(m, name, value):
    nb = name.encode().ljust(16, b"\x00")[:16]
    m.mav.param_set_send(m.target_system, m.target_component, nb, float(value), PTYPE)
    time.sleep(0.4)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", default="/dev/cu.usbmodem1301")
    ap.add_argument("--baud", type=int, default=115200)
    ap.add_argument("--revert", action="store_true",
                    help="restore S1-S4 mapping (undo this remap)")
    args = ap.parse_args()

    plan = REVERT_TO_1_4 if args.revert else REMAP_TO_5_8
    label = "REVERT to S1-S4" if args.revert else "REMAP to S5-S8"

    print(f"[+] Connecting to {args.port}...")
    m = mavutil.mavlink_connection(args.port, baud=args.baud, dialect="ardupilotmega")
    if m.wait_heartbeat(timeout=10) is None:
        print("[!] No heartbeat")
        sys.exit(1)
    print(f"[OK] Heartbeat: sysid={m.target_system}")

    print(f"\n[+] Plan: {label}")
    for name, value in plan:
        set_param(m, name, value)
        # verify
        readback = read_param(m, name)
        ok = readback is not None and int(readback) == value
        flag = "OK" if ok else "MISMATCH"
        print(f"    {name} := {value}   readback={readback}   [{flag}]")

    print("\n[+] Rebooting FC...")
    m.mav.command_long_send(
        m.target_system, m.target_component,
        mavutil.mavlink.MAV_CMD_PREFLIGHT_REBOOT_SHUTDOWN,
        0, 1, 0, 0, 0, 0, 0, 0,
    )
    print("[+] Done. Wait ~10s for FC to come back as KakuteH7 (not _BL).")


if __name__ == "__main__":
    main()
