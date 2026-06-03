"""
Quick live snapshot of the FC: which sensors are reporting, RC channel values,
detected RC protocol, GPS state, battery state.
"""
import argparse
import time
from pymavlink import mavutil


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", default="/dev/cu.usbmodem101")
    ap.add_argument("--baud", type=int, default=115200)
    ap.add_argument("--seconds", type=int, default=6)
    args = ap.parse_args()

    m = mavutil.mavlink_connection(args.port, baud=args.baud, dialect="ardupilotmega")
    if m.wait_heartbeat(timeout=10) is None:
        print("[!] No heartbeat")
        return

    # Ask for higher rate streams briefly
    for stream_id, rate in [(1, 4), (2, 4), (3, 4), (6, 2), (10, 2)]:
        m.mav.request_data_stream_send(
            m.target_system, m.target_component, stream_id, rate, 1
        )

    summary = {}
    end = time.time() + args.seconds
    while time.time() < end:
        msg = m.recv_match(blocking=True, timeout=0.5)
        if msg is None:
            continue
        t = msg.get_type()
        if t == "RC_CHANNELS":
            chs = [getattr(msg, f"chan{i}_raw") for i in range(1, 17)]
            summary["RC_CHANNELS"] = {
                "rssi": msg.rssi,
                "chancount": msg.chancount,
                "channels_us": [c for c in chs if c not in (0, 65535)],
            }
        elif t == "GPS_RAW_INT":
            summary["GPS"] = {
                "fix_type": msg.fix_type,
                "satellites": msg.satellites_visible,
                "hdop": msg.eph / 100.0 if msg.eph != 65535 else None,
                "lat": msg.lat / 1e7,
                "lon": msg.lon / 1e7,
                "alt_msl_m": msg.alt / 1000.0,
            }
        elif t == "SYS_STATUS":
            summary["SYS_STATUS"] = {
                "voltage_V": msg.voltage_battery / 1000.0 if msg.voltage_battery != 65535 else None,
                "current_A": msg.current_battery / 100.0 if msg.current_battery != -1 else None,
                "battery_remaining_pct": msg.battery_remaining,
                "sensors_present": hex(msg.onboard_control_sensors_present),
                "sensors_enabled": hex(msg.onboard_control_sensors_enabled),
                "sensors_health": hex(msg.onboard_control_sensors_health),
                "errors_count1": msg.errors_count1,
            }
        elif t == "ATTITUDE":
            summary["ATTITUDE"] = {
                "roll_deg": round(msg.roll * 57.2958, 2),
                "pitch_deg": round(msg.pitch * 57.2958, 2),
                "yaw_deg": round(msg.yaw * 57.2958, 2),
            }
        elif t == "VFR_HUD":
            summary["VFR_HUD"] = {
                "alt_m": msg.alt,
                "climb_ms": msg.climb,
                "throttle_pct": msg.throttle,
            }
        elif t == "RAW_IMU":
            summary["RAW_IMU_seen"] = True
        elif t == "SCALED_PRESSURE":
            summary["BARO_press_hPa"] = msg.press_abs
            summary["BARO_temp_C"] = msg.temperature / 100.0
        elif t == "SERVO_OUTPUT_RAW":
            summary["SERVO_OUTPUT_us"] = [
                getattr(msg, f"servo{i}_raw") for i in range(1, 9)
            ]

    print("=== Live snapshot ===")
    import json
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
