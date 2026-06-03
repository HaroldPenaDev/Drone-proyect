"""
Watch for RC link to come up.
Prints when chancount transitions from 0 -> N, dumps channel snapshot
every time a channel value changes by more than DELTA_US, captures
STATUSTEXT messages (ArduPilot logs the detected RC protocol there),
and reports RSSI / link quality.
"""
import argparse
import time
from pymavlink import mavutil

DELTA_US = 30
DURATION = 75


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", default="/dev/cu.usbmodem101")
    ap.add_argument("--baud", type=int, default=115200)
    ap.add_argument("--seconds", type=int, default=DURATION)
    args = ap.parse_args()

    print(f"[+] Connecting {args.port}...", flush=True)
    m = mavutil.mavlink_connection(args.port, baud=args.baud, dialect="ardupilotmega")
    if m.wait_heartbeat(timeout=10) is None:
        print("[!] No heartbeat", flush=True)
        return
    print(f"[OK] heartbeat sysid={m.target_system}", flush=True)

    # Crank up the RC + status streams
    for sid, rate in [(1, 4), (2, 4), (3, 4), (10, 5)]:
        m.mav.request_data_stream_send(
            m.target_system, m.target_component, sid, rate, 1
        )

    print(f"[+] Listening for RC link for {args.seconds}s. Turn on the TX16S now.", flush=True)

    last_chancount = -1
    last_chans = None
    end = time.time() + args.seconds
    moves_seen = {i: False for i in range(1, 17)}

    while time.time() < end:
        msg = m.recv_match(blocking=True, timeout=1)
        if msg is None:
            continue
        t = msg.get_type()

        if t == "STATUSTEXT":
            print(f"[STATUSTEXT] {msg.text}", flush=True)

        elif t == "RC_CHANNELS":
            chans = [getattr(msg, f"chan{i}_raw") for i in range(1, 17)]
            if msg.chancount != last_chancount:
                print(f"\n[RC] chancount: {last_chancount} -> {msg.chancount}  rssi={msg.rssi}", flush=True)
                last_chancount = msg.chancount
                if msg.chancount > 0:
                    active = [c for c in chans[:msg.chancount] if c not in (0, 65535)]
                    print(f"[RC] initial values (us): {active}", flush=True)

            if last_chans is not None and msg.chancount > 0:
                for i in range(min(msg.chancount, 16)):
                    if abs(chans[i] - last_chans[i]) > DELTA_US:
                        if not moves_seen[i + 1]:
                            print(f"[RC] CH{i+1} active (delta>{DELTA_US}us): {last_chans[i]} -> {chans[i]}", flush=True)
                            moves_seen[i + 1] = True
            last_chans = chans

        elif t == "RADIO_STATUS":
            # SiK telemetry-radio status; not relevant here but capture if appears
            print(f"[RADIO_STATUS] rssi={msg.rssi} remrssi={msg.remrssi} txbuf={msg.txbuf}", flush=True)

    print("\n[+] Window closed.", flush=True)
    print(f"[+] Active channels detected: {sorted(c for c, v in moves_seen.items() if v)}", flush=True)
    if last_chancount > 0:
        print(f"[+] Final chancount={last_chancount}, last values: {last_chans[:last_chancount]}", flush=True)
    elif last_chancount == 0:
        print("[!] FC saw zero RC channels for the whole window. RX silent or wired wrong port.", flush=True)


if __name__ == "__main__":
    main()
