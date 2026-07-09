export class AnalysisWorkerClient {
  constructor() {
    if (typeof window === "undefined" || typeof Worker === "undefined") {
      this.isNode = true;
      this.nextId = 1;
      this.pending = new Map();
      return;
    }
    this.worker = new Worker(
      "js/gentrail/analysis-worker.js",
      { type: "module" },
    );
    this.nextId = 1;
    this.pending = new Map();

    this.worker.onmessage = (event) => {
      if (event.data.type === "worker-log") {
        const { level, text } = event.data;
        if (level === "ERROR") console.error(text);
        else if (level === "WARN") console.warn(text);
        else console.log(text);
        return;
      }

      const pending = this.pending.get(event.data.id);
      if (!pending) return;
      this.pending.delete(event.data.id);
      if (event.data.ok) pending.resolve(event.data.result);
      else pending.reject(new Error(event.data.error));
    };
    
    this.worker.onerror = (event) => {
      this.rejectAll(new Error(event.message || "Analysis worker failed"));
    };
  }

  analyzeRoutes(request) {
    return this.send({
      type: "analyze-routes",
      ...request,
    });
  }

  scoreRoutes(request) {
    return this.send({ type: "score-routes", ...request });
  }

  terminate(reason = "Generation cancelled") {
    if (this.isNode) return;
    this.worker.terminate();
    this.rejectAll(new DOMException(reason, "AbortError"));
  }

  async send(request) {
    if (this.isNode) {
      const { analyzeRoutes, scoreRoutes } = await import("./analysisTasks.js");
      if (request.type === "analyze-routes") {
        return analyzeRoutes(request);
      } else if (request.type === "score-routes") {
        return await scoreRoutes(request);
      }
      throw new Error(`Unknown task type: ${request.type}`);
    }
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolve, reject) => {
      this.pending.set(id, {
        resolve,
        reject,
      });
      this.worker.postMessage({ id, request });
    });
  }

  rejectAll(error) {
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
  }
}
