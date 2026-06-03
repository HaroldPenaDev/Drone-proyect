"""
Connect to the flight controller via MAVLink and identify:
  - Autopilot type (ArduPilot vs PX4)
  - Vehicle type (Quad, Hex, Plane...)
  - Firmware version string (banner)
  - Detailed AUTOPILOT_VERSION (FW versions, capabilities, board id)

Usage:
    python real_drone/identify.py [--port /dev/cu.usbmodem101] [--baud 115200]
"""
import argparse
import sys
import time
from pymavlink import mavutil
from pymavlink.dialects.v20 import ardupilotmega as mavlink

LISTEN_SECONDS = 8

MAV_TYPE_NAMES = {
    0: "GENERIC", 1: "FIXED_WING", 2: "QUADROTOR", 3: "COAXIAL", 4: "HELICOPTER",
    5: "ANTENNA_TRACKER", 6: "GCS", 10: "GROUND_ROVER", 11: "SURFACE_BOAT",
    12: "SUBMARINE", 13: "HEXAROTOR", 14: "OCTOROTOR", 15: "TRICOPTER",
    19: "VTOL_DUOROTOR", 20: "VTOL_QUADROTOR", 21: "VTOL_TILTROTOR",
}
MAV_AUTOPILOT_NAMES = {0: "GENERIC", 3: "ARDUPILOTMEGA", 4: "OPENPILOT", 12: "PX4"}


def fw_version_decode(v):
    major = (v >> 24) & 0xFF
    minor = (v >> 16) & 0xFF
    patch = (v >> 8) & 0xFF
    fw_type = v & 0xFF
    fw_types = {0: "DEV", 64: "ALPHA", 128: "BETA", 192: "RC", 255: "OFFICIAL"}
    return f"{major}.{minor}.{patch} ({fw_types.get(fw_type, fw_type)})"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", default="/dev/cu.usbmodem101")
    ap.add_argument("--baud", type=int, default=115200)
    args = ap.parse_args()

    print(f"[+] Connecting to {args.port} @ {args.baud}...")
    m = mavutil.mavlink_connection(args.port, baud=args.baud, dialect="ardupilotmega")

    print("[+] Waiting for HEARTBEAT (timeout 10s)...")
    hb = m.wait_heartbeat(timeout=10)
    if hb is None:
        print("[!] No heartbeat received. Close any other tool using the port.")
        sys.exit(1)

    print(f"[OK] sysid={m.target_system} compid={m.target_component}")
    print(f"     autopilot = {MAV_AUTOPILOT_NAMES.get(hb.autopilot, hb.autopilot)}")
    print(f"     vehicle   = {MAV_TYPE_NAMES.get(hb.type, hb.type)}")
    print(f"     base_mode = 0x{hb.base_mode:02X}  custom_mode = {hb.custom_mode}")
    print(f"     system_status = {hb.system_status}")

    m.mav.command_long_send(
        m.target_system, m.target_component,
        mavlink.MAV_CMD_REQUEST_AUTOPILOT_CAPABILITIES, 0, 1, 0, 0, 0, 0, 0, 0,
    )
    m.mav.command_long_send(
        m.target_system, m.target_component,
        42428, 0, 0, 0, 0, 0, 0, 0, 0,  # MAV_CMD_DO_SEND_BANNER
    )

    seen = set()
    banner_lines = []
    start = time.time()
    while time.time() - start < LISTEN_SECONDS:
        msg = m.recv_match(blocking=True, timeout=1)
        if msg is None:
            continue
        t = msg.get_type()
        seen.add(t)
        if t == "STATUSTEXT":
            banner_lines.append(msg.text)
        elif t == "AUTOPILOT_VERSION":
            print("\n[AUTOPILOT_VERSION]")
            print(f"  flight_sw_version    = {fw_version_decode(msg.flight_sw_version)}")
            print(f"  middleware_sw_version= {fw_version_decode(msg.middleware_sw_version)}")
            print(f"  os_sw_version        = {fw_version_decode(msg.os_sw_version)}")
            print(f"  board_version        = {msg.board_version}")
            print(f"  vendor_id            = 0x{msg.vendor_id:04X}")
            print(f"  product_id           = 0x{msg.product_id:04X}")
            cap = msg.capabilities
            print(f"  capabilities bitmask = 0x{cap:016X}")

    print(f"\n[+] Message types in {LISTEN_SECONDS}s: {sorted(seen)}")
    if banner_lines:
        print("\n[BANNER / STATUSTEXT]")
        for line in banner_lines:
            print(f"  {line}")


if __name__ == "__main__":
    main()
