import { analyzeRoutes, scoreRoutes } from "./analysisTasks.js";

const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

console.log = function(...args) {
  originalLog.apply(console, args);
  const text = args.map(arg => typeof arg === "object" ? JSON.stringify(arg) : String(arg)).join(" ");
  self.postMessage({ type: "worker-log", level: "LOG", text: `[Worker] ${text}` });
};

console.warn = function(...args) {
  originalWarn.apply(console, args);
  const text = args.map(arg => typeof arg === "object" ? JSON.stringify(arg) : String(arg)).join(" ");
  self.postMessage({ type: "worker-log", level: "WARN", text: `[Worker] ${text}` });
};

console.error = function(...args) {
  originalError.apply(console, args);
  const text = args.map(arg => typeof arg === "object" ? JSON.stringify(arg) : String(arg)).join(" ");
  self.postMessage({ type: "worker-log", level: "ERROR", text: `[Worker] ${text}` });
};

self.onmessage = async (event) => {
  const { id, request } = event.data;
  console.log(`Task ${request.type} started (id: ${id}). Number of routes: ${request.routes?.length ?? 0}`);
  const start = performance.now();
  try {
    const result =
      request.type === "analyze-routes"
        ? analyzeRoutes(request)
        : await scoreRoutes(request);
    console.log(`Task ${request.type} finished successfully in ${Math.round(performance.now() - start)}ms`);
    self.postMessage({ id, ok: true, result });
  } catch (error) {
    console.error(`Task ${request.type} failed after ${Math.round(performance.now() - start)}ms:`, error);
    self.postMessage({
      id,
      ok: false,
      error: error instanceof Error ? error.stack || error.message : "Worker analysis failed",
    });
  }
};
