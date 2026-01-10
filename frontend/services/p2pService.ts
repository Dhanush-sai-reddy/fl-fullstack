import { P2PMessage, P2PMessageType } from "../types";

export class P2PService {
  private channel: BroadcastChannel | null = null;
  public myId: string = Math.random().toString(36).substr(2, 9);

  public connect(code: string, onMessage: (msg: P2PMessage) => void) {
    if (this.channel) this.channel.close();
    this.channel = new BroadcastChannel(`fl_session_${code}`);
    this.channel.onmessage = (event) => onMessage(event.data as P2PMessage);
  }

  public send(type: P2PMessageType, payload: any) {
    if (this.channel) {
      this.channel.postMessage({ type, payload, senderId: this.myId });
    }
  }

  public close() {
    if (this.channel) {
      this.send('SESSION_CLOSED', {});
      this.channel.close();
      this.channel = null;
    }
  }
}

export const p2p = new P2PService();