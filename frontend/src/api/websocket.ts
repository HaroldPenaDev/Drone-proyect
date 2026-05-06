import type { DroneSnapshot } from "@/types";
import {
  WEBSOCKET_RECONNECT_BASE_MS,
  WEBSOCKET_RECONNECT_MAX_MS,
} from "@/utils/constants";

type MessageHandler = (snapshot: DroneSnapshot) => void;
type StatusHandler = (connected: boolean) => void;

export class TelemetryWebSocket {
  private socket: WebSocket | null = null;
  private reconnectDelay: number = WEBSOCKET_RECONNECT_BASE_MS;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionallyClosed: boolean = false;
  private readonly url: string;
  private readonly onMessage: MessageHandler;
  private readonly onStatusChange: StatusHandler;

  constructor(url: string, onMessage: MessageHandler, onStatusChange: StatusHandler) {
    this.url = url;
    this.onMessage = onMessage;
    this.onStatusChange = onStatusChange;
  }

  connect(): void {
    this.intentionallyClosed = false;
    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      this.reconnectDelay = WEBSOCKET_RECONNECT_BASE_MS;
      this.onStatusChange(true);
    };

    this.socket.onmessage = (event: MessageEvent) => {
      const snapshot: DroneSnapshot = JSON.parse(event.data as string);
      this.onMessage(snapshot);
    };

    this.socket.onclose = () => {
      this.onStatusChange(false);
      if (!this.intentionallyClosed) {
        this.scheduleReconnect();
      }
    };

    this.socket.onerror = () => {
      this.socket?.close();
    };
  }

  disconnect(): void {
    this.intentionallyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
  }

  private scheduleReconnect(): void {
    this.reconnectTimer = setTimeout(() => {
      this.reconnectDelay = Math.min(
        this.reconnectDelay * 2,
        WEBSOCKET_RECONNECT_MAX_MS
      );
      this.connect();
    }, this.reconnectDelay);
  }
}
