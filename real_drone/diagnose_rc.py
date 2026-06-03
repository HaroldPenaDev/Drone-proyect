"""
Deep diagnostic for why RC isn't reaching the FC after configuring SERIAL6.
Reads back the SERIAL6 params, checks SYS_STATUS for the RC sensor health
bit, and listens for RC + STATUSTEXT messages.
"""
import argparse
import time
from pymavlink import mavutil

RC_RECEIVER_BIT = 0x10000


def read_param(m, name, timeout=3):
    name_b = name.encode("utf-8").ljust(16, b"\x00")[:16]
    m.mav.param_request_read_send(m.target_system, m.target_component, name_b, -1)
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
    ap.add_argument("--port", default="/dev/cu.usbmodem1101")
    ap.add_argument("--baud", type=int, default=115200)
    ap.add_argument("--seconds", type=int, default=20)
    args = ap.parse_args()

    m = mavutil.mavlink_connection(args.port, baud=args.baud, dialect="ardupilotmega")
    if m.wait_heartbeat(timeout=10) is None:
        print("[!] No heartbeat")
        return

    print("=== Param verification ===")
    for p in ["SERIAL6_PROTOCOL", "SERIAL6_OPTIONS", "SERIAL6_BAUD",
              "RC_PROTOCOLS", "RC_OPTIONS", "BRD_ALT_CONFIG"]:
        v = read_param(m, p)
        print(f"  {p:20s} = {v}")

    print("\n=== Live listen ===")
    for sid, rate in [(1, 4), (2, 5), (3, 5), (10, 5)]:
        m.mav.request_data_stream_send(m.target_system, m.target_component, sid, rate, 1)

    last_chancount = None
    last_present = None
    last_enabled = None
    last_health = None
    end = time.time() + args.seconds
    statustexts = []

    while time.time() < end:
        msg = m.recv_match(blocking=True, timeout=1)
        if msg is None:
            continue
        t = msg.get_type()

        if t == "STATUSTEXT":
            statustexts.append(msg.text)

        elif t == "RC_CHANNELS":
            if msg.chancount != last_chancount:
                print(f"[RC] chancount: {last_chancount} -> {msg.chancount}  rssi={msg.rssi}")
                last_chancount = msg.chancount

        elif t == "SYS_STATUS":
            if (msg.onboard_control_sensors_present != last_present
                    or msg.onboard_control_sensors_enabled != last_enabled
                    or msg.onboard_control_sensors_health != last_health):
                last_present = msg.onboard_control_sensors_present
                last_enabled = msg.onboard_control_sensors_enabled
                last_health = msg.onboard_control_sensors_health
                rc_p = bool(last_present & RC_RECEIVER_BIT)
                rc_e = bool(last_enabled & RC_RECEIVER_BIT)
                rc_h = bool(last_health & RC_RECEIVER_BIT)
                print(f"[SYS] RC sensor — present={rc_p} enabled={rc_e} health={rc_h}  "
                      f"(masks p=0x{last_present:08x} e=0x{last_enabled:08x} h=0x{last_health:08x})")

    print("\n=== STATUSTEXT messages captured ===")
    for s in statustexts:
        print(f"  {s}")
    if last_chancount == 0:
        print("\n[!] FC reports chancount=0 throughout. RX TX line not delivering CRSF.")


if __name__ == "__main__":
    main()
