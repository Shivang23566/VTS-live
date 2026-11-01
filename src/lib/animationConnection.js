// Own one socket and one retry timer. Discard old sessions before reconnecting.
export function connectAnimation({ url, onSocket, onDisconnect,
  Socket = WebSocket, schedule = setTimeout, unschedule = clearTimeout }) {
  let stopped = false;
  let active = null;
  let retryTimer;
  let handshake;
  let failures = 0;

  const detach = () => {
    unschedule(handshake);
    if (!active) return;
    active.onmessage = active.onerror = active.onclose = null;
    active.close();
    active = null;
  };
  const connect = () => {
    if (stopped) return;
    let failed = false;
    const retry = () => {
      if (stopped || failed) return;
      failed = true;
      detach();
      const delay = Math.min(1000 * 2 ** Math.min(failures++, 4), 10000);
      onDisconnect();
      retryTimer = schedule(connect, delay);
    };
    try {
      const socket = new Socket(url);
      active = socket;
      socket.onerror = retry;
      socket.onclose = retry;
      handshake = schedule(retry, 30000);
      onSocket(socket, () => {
        if (stopped || failed || active !== socket) return;
        unschedule(handshake);
        failures = 0;
      }, retry);
    } catch { retry(); }
  };
  connect();
  return () => {
    stopped = true;
    unschedule(retryTimer);
    detach();
  };
}
