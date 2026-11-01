import test from "node:test";
import assert from "node:assert/strict";
import { connectAnimation } from "../src/lib/animationConnection.js";

function harness(throws = false) {
  const sockets = [], timers = new Map(), sessions = [];
  let id = 0, disconnects = 0;
  class Socket {
    constructor() { if (throws) throw new Error("Unavailable"); sockets.push(this); }
    close() { this.closed = true; }
  }
  const stop = connectAnimation({ url: "ws://localhost/ws/animation", Socket,
    schedule(fn, delay) { timers.set(++id, { fn, delay }); return id; },
    unschedule(timer) { timers.delete(timer); },
    onSocket(socket, ready, retry) { sessions.push({ socket, ready, retry }); },
    onDisconnect() { disconnects++; },
  });
  return { sockets, sessions, timers, stop, get disconnects() { return disconnects; },
    tick() {
      const [key, timer] = timers.entries().next().value;
      timers.delete(key); timer.fn(); return timer.delay;
    },
  };
}

test("disconnect retries automatically, once even if error and close both fire", () => {
  const h = harness();
  h.sessions[0].ready();
  const close = h.sockets[0].onclose;
  h.sockets[0].onerror(); close();
  assert.equal(h.disconnects, 1);
  assert.equal(h.sockets[0].closed, true);
  assert.equal(h.sockets[0].onmessage, null);
  assert.equal(h.tick(), 1000);
  assert.equal(h.sockets.length, 2);
  h.sessions[1].ready();
  assert.equal(h.timers.size, 0);
  h.stop();
});

test("failed connections back off to ten seconds; ready resets the delay", () => {
  const h = harness();
  for (const delay of [1000, 2000, 4000, 8000, 10000, 10000]) {
    h.sockets.at(-1).onclose();
    assert.equal(h.tick(), delay);
  }
  h.sessions.at(-1).ready();
  h.sockets.at(-1).onclose();
  assert.equal(h.tick(), 1000);
  h.stop();
});

test("unresponsive handshake and socket construction failures retry", () => {
  const h = harness();
  assert.equal(h.tick(), 30000);
  assert.equal(h.disconnects, 1);
  assert.equal(h.tick(), 1000);
  h.stop();
  const failed = harness(true);
  assert.equal(failed.disconnects, 1);
  assert.equal(failed.tick(), 1000);
  assert.equal(failed.disconnects, 2);
  failed.stop();
  assert.equal(failed.timers.size, 0);
});

test("leaving animation cancels retries and late socket callbacks", () => {
  const h = harness();
  const lateClose = h.sockets[0].onclose;
  h.stop(); lateClose(); h.sessions[0].ready();
  assert.equal(h.timers.size, 0);
  assert.equal(h.disconnects, 0);
  assert.equal(h.sockets.length, 1);
  const retrying = harness();
  retrying.sockets[0].onclose();
  retrying.stop();
  assert.equal(retrying.timers.size, 0);
});
