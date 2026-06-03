"""Safe per-motor bench test using MAV_CMD_DO_MOTOR_TEST.

Spins one motor at a time at low throttle for a short duration so the
operator can hear/see which ones respond. This is the same command the
Mission Planner "Motor Test A/B/C/D" buttons issue under the hood.

For a Quad-X frame, ArduCopter fires the motors in this **physical**
order regardless of the SERVOx_FUNCTION mapping:
    A = front-right
    B = back-right
    C = back-left
    D = front-left

SAFETY: PROPELLERS OFF. Drone secured. Battery connected (the ESCs
won't drive the motors on USB-only power).

Usage:
    python real_drone/motor_test.py --port /dev/cu.usbmodem1301
    python real_drone/motor_test.py --throttle 8 --seconds 2 --motors 1,2,3,4
"""
import argparse
import time
from pymavlink import mavutil


ACK_RESULTS = {
    0: "ACCEPTED",
    1: "TEMP_REJECTED",
    2: "DENIED",
    3: "UNSUPPORTED",
    4: "FAILED",
    5: "IN_PROGRESS",
    6: "CANCELLED",
}

LETTERS = {1: "A (front-right)", 2: "B (back-right)",
           3: "C (back-left)",  4: "D (front-left)"}


def test_motor(m, motor_num, throttle_pct, seconds):
    label = LETTERS.get(motor_num, f"#{motor_num}")
    print(f"\n[+] Motor {label}: {throttle_pct}% for {seconds}s...")
    m.mav.command_long_send(
        m.target_system,
        m.target_component,
        mavutil.mavlink.MAV_CMD_DO_MOTOR_TEST,
        0,                       # confirmation
        float(motor_num),        # param1: motor sequence (1=A, 2=B, 3=C, 4=D)
        0,                       # param2: throttle type (0 = percent)
        float(throttle_pct),     # param3: throttle value
        float(seconds),          # param4: timeout (seconds)
        0,                       # param5: motor count (0 = single motor)
        0,                       # param6: test order
        0,                       # param7
    )
    ack = m.recv_match(type="COMMAND_ACK", blocking=True, timeout=3)
    if ack is not None:
        print(f"    ACK: {ACK_RESULTS.get(ack.result, ack.result)}")
    else:
        print("    [!] No ACK received")
    time.sleep(seconds + 1)  # let the firmware finish the spin


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", default="/dev/cu.usbmodem1301")
    ap.add_argument("--baud", type=int, default=115200)
    ap.add_argument("--throttle", type=int, default=6,
                    help="throttle percent per motor (default 6, hard cap 15)")
    ap.add_argument("--seconds", type=int, default=2,
                    help="duration per motor (default 2)")
    ap.add_argument("--motors", default="1,2,3,4",
                    help="comma-separated motor letters as numbers (A=1, B=2, C=3, D=4)")
    args = ap.parse_args()

    if args.throttle > 15:
        print(f"[!] Refusing throttle {args.throttle}% — bench test cap is 15%.")
        return
    if args.seconds > 5:
        print(f"[!] Refusing duration {args.seconds}s — bench test cap is 5s.")
        return

    print(f"[+] Connecting to {args.port}...")
    m = mavutil.mavlink_connection(args.port, baud=args.baud, dialect="ardupilotmega")
    if m.wait_heartbeat(timeout=10) is None:
        print("[!] No heartbeat")
        return
    print(f"[OK] Heartbeat from sysid={m.target_system}, compid={m.target_component}")
    print(f"\n[!] SAFETY CHECK: props off, drone secured, battery connected?")
    print(f"[!] Plan: motors {args.motors} at {args.throttle}% for "
          f"{args.seconds}s each, gap 1s.\n")

    motors = [int(x) for x in args.motors.split(",")]
    for motor_num in motors:
        test_motor(m, motor_num, args.throttle, args.seconds)

    print("\n[+] Done. Report which motors spun.")


if __name__ == "__main__":
    main()
