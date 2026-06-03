"""Arm the vehicle and spin ALL motors simultaneously for a fixed time.

DANGEROUS COMPARED TO motor_test.py — read motor_test.py docstring first.

What this does, in order:
  1. Reads and SAVES the current ARMING_CHECK value.
  2. Sets ARMING_CHECK = 0 so we can arm without RC, battery monitor, GPS.
  3. Sets mode to STABILIZE.
  4. Streams RC_CHANNELS_OVERRIDE at throttle=MIN (so motors will go to
     MOT_SPIN_ARM ≈ 10% once armed, NOT higher).
  5. Sends MAV_CMD_COMPONENT_ARM_DISARM with force-magic (21196).
  6. Keeps streaming RC override at throttle=MIN for `--seconds` seconds.
     During this window the 4 motors are spinning simultaneously at idle
     ("motor spin armed" state). No throttle is pushed up.
  7. Disarms via MAV_CMD_COMPONENT_ARM_DISARM.
  8. Restores ARMING_CHECK to the saved value.
  9. Releases RC override.

Steps 7-9 are inside a finally block — if anything in 4-6 throws, we still
disarm and restore.

If THIS PROCESS dies (Ctrl-C, parent crash, USB unplug), ArduCopter's RC
failsafe (FS_THR_ENABLE=1) will trip ~3s after the override stream stops
and disarm the vehicle on the ground. So worst-case the motors keep
spinning at ~10% for ~3s after a crash, then stop.

SAFETY: PROPELLERS OFF. Drone secured (weight on it or strapped).
Battery connected. Hands clear of motor shafts.

Usage:
    python real_drone/arm_and_spin_all.py --port /dev/cu.usbmodem1301 --seconds 6
"""
import argparse
import sys
import time
from pymavlink import mavutil


ACK_RESULTS = {
    0: "ACCEPTED", 1: "TEMP_REJECTED", 2: "DENIED",
    3: "UNSUPPORTED", 4: "FAILED", 5: "IN_PROGRESS", 6: "CANCELLED",
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


def set_param(m, name, value, ptype):
    nb = name.encode("utf-8").ljust(16, b"\x00")[:16]
    m.mav.param_set_send(m.target_system, m.target_component, nb, float(value), ptype)
    time.sleep(0.5)


def send_rc_override(m, throttle_us):
    # ch1=roll center, ch2=pitch center, ch3=throttle, ch4=yaw center,
    # ch5-8 = 0 (release / no override)
    m.mav.rc_channels_override_send(
        m.target_system, m.target_component,
        1500, 1500, int(throttle_us), 1500, 0, 0, 0, 0,
    )


def release_rc_override(m):
    # All zero releases the override (gives control back to real RC, if any).
    m.mav.rc_channels_override_send(
        m.target_system, m.target_component, 0, 0, 0, 0, 0, 0, 0, 0,
    )


def send_arm_disarm(m, arm, label):
    m.mav.command_long_send(
        m.target_system, m.target_component,
        mavutil.mavlink.MAV_CMD_COMPONENT_ARM_DISARM,
        0,                # confirmation
        1 if arm else 0,  # param1
        21196,            # param2: force magic (bypass safety)
        0, 0, 0, 0, 0,
    )
    ack = m.recv_match(type="COMMAND_ACK", blocking=True, timeout=3)
    result = ACK_RESULTS.get(ack.result, ack.result) if ack else "no ACK"
    print(f"    {label}: {result}")
    return ack is not None and ack.result == 0


def set_mode_stabilize(m):
    # Stabilize custom_mode = 0 in ArduCopter
    m.mav.command_long_send(
        m.target_system, m.target_component,
        mavutil.mavlink.MAV_CMD_DO_SET_MODE,
        0,
        mavutil.mavlink.MAV_MODE_FLAG_CUSTOM_MODE_ENABLED,
        0,  # Stabilize
        0, 0, 0, 0, 0,
    )
    ack = m.recv_match(type="COMMAND_ACK", blocking=True, timeout=3)
    result = ACK_RESULTS.get(ack.result, ack.result) if ack else "no ACK"
    print(f"    SET_MODE STABILIZE: {result}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", default="/dev/cu.usbmodem1301")
    ap.add_argument("--baud", type=int, default=115200)
    ap.add_argument("--seconds", type=float, default=6.0,
                    help="seconds to keep all motors spinning (cap 10)")
    ap.add_argument("--throttle-us", type=int, default=1000,
                    help="RC throttle in microseconds (default 1000 = stick at min)")
    args = ap.parse_args()

    if args.seconds > 10:
        print(f"[!] Refusing duration {args.seconds}s — cap is 10s.")
        sys.exit(1)
    if args.throttle_us > 1100:
        print(f"[!] Refusing throttle {args.throttle_us}µs — cap is 1100µs.")
        sys.exit(1)

    print(f"[+] Connecting to {args.port}...")
    m = mavutil.mavlink_connection(args.port, baud=args.baud, dialect="ardupilotmega")
    if m.wait_heartbeat(timeout=10) is None:
        print("[!] No heartbeat")
        sys.exit(1)
    print(f"[OK] Heartbeat: sysid={m.target_system}")

    print("[+] Reading current ARMING_CHECK...")
    old_arming_check = read_param(m, "ARMING_CHECK")
    if old_arming_check is None:
        print("[!] Could not read ARMING_CHECK — aborting.")
        sys.exit(1)
    print(f"    ARMING_CHECK saved = {int(old_arming_check)}")

    armed_ok = False
    try:
        print("[+] Setting ARMING_CHECK = 0 (temporary)...")
        set_param(m, "ARMING_CHECK", 0, mavutil.mavlink.MAV_PARAM_TYPE_INT32)

        print("[+] Setting mode STABILIZE...")
        set_mode_stabilize(m)
        time.sleep(0.5)

        print("[+] Streaming RC override at throttle=MIN for 1.5s to establish...")
        t0 = time.time()
        while time.time() - t0 < 1.5:
            send_rc_override(m, args.throttle_us)
            time.sleep(0.05)

        print(f"[+] ARMING (force=1)...")
        armed_ok = send_arm_disarm(m, arm=True, label="ARM")
        if not armed_ok:
            print("[!] Arm failed — skipping spin.")
        else:
            print(f"[+] ARMED. Spinning ALL motors for {args.seconds}s at "
                  f"throttle={args.throttle_us}µs...")
            print(f"    >> OBSERVE: which physical motors are spinning RIGHT NOW <<")
            t_start = time.time()
            while time.time() - t_start < args.seconds:
                send_rc_override(m, args.throttle_us)
                time.sleep(0.05)
            print(f"    Spin window finished.")

    except Exception as e:
        print(f"[!] EXCEPTION in spin block: {e}")
    finally:
        print("[+] Cleanup: disarming...")
        try:
            send_arm_disarm(m, arm=False, label="DISARM")
        except Exception as e:
            print(f"    disarm error: {e}")

        print("[+] Cleanup: restoring ARMING_CHECK...")
        try:
            set_param(m, "ARMING_CHECK", int(old_arming_check),
                      mavutil.mavlink.MAV_PARAM_TYPE_INT32)
            after = read_param(m, "ARMING_CHECK")
            print(f"    ARMING_CHECK restored = {int(after) if after is not None else '?'}")
        except Exception as e:
            print(f"    restore error: {e}")

        print("[+] Cleanup: releasing RC override...")
        try:
            release_rc_override(m)
        except Exception as e:
            print(f"    release error: {e}")

        print("[+] Done.")


if __name__ == "__main__":
    main()
