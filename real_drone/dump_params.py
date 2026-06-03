"""
Fetch ALL parameters from an ArduPilot flight controller via MAVLink.
ArduCopter typically has ~1100 parameters that fully describe its configuration.

Output is sorted alphabetically and written to the path given by --out.

Usage:
    python real_drone/dump_params.py --out snapshots/2026-05-08_first/params.txt
"""
import argparse
import sys
import time
from pymavlink import mavutil


def fetch_all_params(m, overall_timeout=120, settle_seconds=4):
    """Request the full param list and collect PARAM_VALUE messages.

    Strategy:
      1. Send PARAM_REQUEST_LIST.
      2. Stream PARAM_VALUE messages — each carries (param_index, param_count).
      3. After the stream goes quiet for `settle_seconds`, request any missing
         indices individually with PARAM_REQUEST_READ.
      4. Stop when we have all params or hit the overall timeout.
    """
    print("[+] Sending PARAM_REQUEST_LIST...")
    m.mav.param_request_list_send(m.target_system, m.target_component)

    params = {}            # name -> (value, type, index)
    received_indices = set()
    expected_count = None
    last_msg_at = time.time()
    started = time.time()
    progress_dots = 0

    while time.time() - started < overall_timeout:
        msg = m.recv_match(type="PARAM_VALUE", blocking=True, timeout=1)
        if msg is None:
            # Stream went quiet — see if we have everything.
            if expected_count is not None and len(received_indices) >= expected_count:
                break
            if time.time() - last_msg_at > settle_seconds and expected_count:
                # Find missing indices and re-request them individually.
                missing = sorted(set(range(expected_count)) - received_indices)
                if not missing:
                    break
                print(f"\n[+] Re-requesting {len(missing)} missing params "
                      f"(have {len(received_indices)}/{expected_count})")
                for idx in missing[:200]:  # cap per round
                    m.mav.param_request_read_send(
                        m.target_system, m.target_component, b"", idx
                    )
                last_msg_at = time.time()
            continue

        last_msg_at = time.time()
        if expected_count is None:
            expected_count = msg.param_count
            print(f"[+] Streaming {expected_count} parameters...")

        name = msg.param_id
        if isinstance(name, bytes):
            name = name.decode("utf-8", errors="replace")
        name = name.rstrip("\x00")
        params[name] = (msg.param_value, msg.param_type, msg.param_index)
        received_indices.add(msg.param_index)

        # Lightweight progress feedback every 50 params
        if len(received_indices) // 50 > progress_dots:
            progress_dots = len(received_indices) // 50
            sys.stdout.write(".")
            sys.stdout.flush()

    print()
    print(f"[+] Collected {len(params)}/{expected_count or '?'} parameters "
          f"in {time.time()-started:.1f}s")
    return params, expected_count


def write_params(params, path):
    with open(path, "w") as f:
        f.write(f"# {len(params)} parameters\n")
        f.write("# Format: NAME<tab>VALUE<tab>TYPE\n")
        for name in sorted(params):
            value, ptype, _idx = params[name]
            # Integers come as floats over MAVLink — keep precision but drop noise
            if value == int(value) and ptype in (1, 2, 3, 4, 5, 6, 7, 8):
                value_str = str(int(value))
            else:
                value_str = f"{value:.6g}"
            f.write(f"{name}\t{value_str}\t{ptype}\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", default="/dev/cu.usbmodem101")
    ap.add_argument("--baud", type=int, default=115200)
    ap.add_argument("--out", required=True)
    ap.add_argument("--timeout", type=int, default=180)
    args = ap.parse_args()

    print(f"[+] Connecting to {args.port}...")
    m = mavutil.mavlink_connection(args.port, baud=args.baud, dialect="ardupilotmega")
    hb = m.wait_heartbeat(timeout=10)
    if hb is None:
        print("[!] No heartbeat — is the FC connected and idle?")
        sys.exit(1)
    print(f"[OK] heartbeat from sysid={m.target_system}")

    params, expected = fetch_all_params(m, overall_timeout=args.timeout)
    if expected and len(params) < expected:
        print(f"[!] Warning: only {len(params)}/{expected} params received.")

    write_params(params, args.out)
    print(f"[+] Wrote {args.out}")


if __name__ == "__main__":
    main()
