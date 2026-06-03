"""
Configure an ArduPilot UART as RCIN (protocol 23) so a CRSF/ELRS receiver
wired to that UART becomes the active RC input. Then reboot the FC.

Usage:
    python real_drone/configure_rc_uart.py --uart 6
"""
import argparse
import time
from pymavlink import mavutil


def set_param(m, name, value, ptype):
    name_b = name.encode("utf-8").ljust(16, b"\x00")[:16]
    m.mav.param_set_send(m.target_system, m.target_component, name_b, value, ptype)


def read_param(m, name, timeout=3):
    name_b = name.encode("utf-8").ljust(16, b"\x00")[:16]
    m.mav.param_request_read_send(m.target_system, m.target_component, name_b, -1)
    end = time.time() + timeout
    while time.time() < end:
        msg = m.recv_match(type="PARAM_VALUE", blocking=True, timeout=1)
        if msg is None:
            continue
        param_id = msg.param_id
        if isinstance(param_id, bytes):
            param_id = param_id.decode("utf-8", errors="replace")
        if param_id.rstrip("\x00") == name:
            return msg.param_value
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", default="/dev/cu.usbmodem101")
    ap.add_argument("--baud", type=int, default=115200)
    ap.add_argument("--uart", type=int, default=6, help="UART index (e.g. 6 for R6/T6)")
    args = ap.parse_args()

    print(f"[+] Connecting {args.port}...")
    m = mavutil.mavlink_connection(args.port, baud=args.baud, dialect="ardupilotmega")
    if m.wait_heartbeat(timeout=10) is None:
        print("[!] No heartbeat")
        return

    proto_param = f"SERIAL{args.uart}_PROTOCOL"
    opts_param = f"SERIAL{args.uart}_OPTIONS"

    before = read_param(m, proto_param)
    print(f"[+] {proto_param} before: {before}")

    print(f"[+] Setting {proto_param} = 23 (RCIN)...")
    set_param(m, proto_param, 23.0, mavutil.mavlink.MAV_PARAM_TYPE_INT8)
    set_param(m, opts_param, 0.0, mavutil.mavlink.MAV_PARAM_TYPE_INT16)
    time.sleep(0.5)

    after = read_param(m, proto_param)
    print(f"[+] {proto_param} after:  {after}")
    if after is None or int(after) != 23:
        print("[!] Param did not update — aborting reboot.")
        return

    print("[+] Rebooting FC (USB will drop briefly)...")
    m.mav.command_long_send(
        m.target_system, m.target_component,
        mavutil.mavlink.MAV_CMD_PREFLIGHT_REBOOT_SHUTDOWN,
        0,  # confirmation
        1,  # 1 = reboot autopilot
        0, 0, 0, 0, 0, 0,
    )
    print("[+] Reboot command sent.")


if __name__ == "__main__":
    main()
