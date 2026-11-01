import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const root = fileURLToPath(new URL("../", import.meta.url));
const python = resolve(root, process.platform === "win32" ? ".venv/Scripts/python.exe" : ".venv/bin/python");
const vite = resolve(root, "node_modules/vite/bin/vite.js");
const children = new Set();
let stopping = false;
let restarts = [];

function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill();
}
process.on("SIGINT", () => shutdown());
process.on("SIGTERM", () => shutdown());

function launch(command, args) {
  const child = spawn(command, args, { cwd: root, stdio: "inherit", windowsHide: true });
  children.add(child);
  child.on("exit", () => children.delete(child));
  child.on("error", (error) => {
    children.delete(child);
    console.error(`Could not start local service: ${error.message}`);
    shutdown(1);
  });
  return child;
}

async function portFree(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.listen(port, "127.0.0.1", () => server.close(() => resolve(true)));
  });
}

async function health() {
  try {
    const response = await fetch("http://127.0.0.1:8000/api/health", { signal: AbortSignal.timeout(2000) });
    const data = await response.json();
    return response.ok && data.status === "ok" && data.version === 1 && data.sign_language === "asl" && data.ready && Array.isArray(data.vocabulary) ? data : null;
  } catch { return null; }
}

async function startBackend() {
  const child = launch(python, ["-m", "uvicorn", "backend.app.main:app", "--host", "127.0.0.1", "--port", "8000"]);
  let started = false;
  let exited = false;
  child.on("exit", async () => {
    exited = true;
    if (stopping) return;
    if (!started) {
      console.error("Python could not start. See the error above and the setup steps in README.md.");
      shutdown(1);
      return;
    }
    restarts = restarts.filter((time) => Date.now() - time < 60000);
    if (restarts.length >= 3) {
      console.error("Python stopped repeatedly. Stopping the app instead of looping; inspect the error above.");
      shutdown(1);
      return;
    }
    restarts.push(Date.now());
    console.log("Local animation service stopped; restarting automatically...");
    await sleep(1000);
    if (!stopping) await startBackend();
  });
  const deadline = Date.now() + 90000;
  while (!stopping && !exited && Date.now() < deadline) {
    const data = await health();
    if (data && !exited) {
      started = true;
      console.log(`Local animation ready: ${data.vocabulary.length} ASL signs. No cloud animation service required.`);
      return true;
    }
    await sleep(500);
  }
  if (!stopping) {
    console.error("Local animation failed its readiness check. Verify Python dependencies and run .venv/Scripts/python.exe -m backend.scripts.prepare_asl --download if sign data is missing.");
    shutdown(1);
  }
  return false;
}

async function main() {
  if (!existsSync(python) || !existsSync(vite)) throw new Error("Local dependencies are missing. Follow the one-time setup in README.md first.");
  if (!await portFree(5173)) throw new Error("Port 5173 is already in use. Use the existing app, or stop that server before starting another.");
  if (!await portFree(8000)) {
    if (!await health()) throw new Error("Port 8000 is occupied by an unready or different service. Check that process before restarting.");
    console.log("Using the already-running local animation service (managed by its existing terminal).");
  } else if (!await startBackend()) return;
  if (stopping) return;
  console.log("Open http://127.0.0.1:5173. Keep this terminal open; Ctrl+C stops both services.");
  launch(process.execPath, [vite, "--host", "127.0.0.1", "--port", "5173", "--strictPort"])
    .on("exit", (code) => { if (!stopping) shutdown(code ?? 1); });
}

main().catch((error) => { console.error(error.message); shutdown(1); });
