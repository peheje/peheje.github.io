export async function runWithTimeout(
  operation,
  sourceSignal,
  timeoutMs,
  timeoutMessage = `Request timed out after ${Math.round(timeoutMs / 1000)} seconds`,
) {
  sourceSignal?.throwIfAborted();
  const controller = new AbortController();
  const abortFromSource = () => {
    controller.abort(
      sourceSignal?.reason ?? new DOMException("Operation cancelled", "AbortError"),
    );
  };
  sourceSignal?.addEventListener("abort", abortFromSource, { once: true });
  if (sourceSignal?.aborted) abortFromSource();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort(new DOMException(timeoutMessage, "TimeoutError"));
  }, timeoutMs);

  try {
    const result = await operation(controller.signal);
    if (timedOut) {
      throw new DOMException(timeoutMessage, "TimeoutError");
    }
    return result;
  } catch (error) {
    if (timedOut) {
      throw new DOMException(timeoutMessage, "TimeoutError");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    sourceSignal?.removeEventListener("abort", abortFromSource);
  }
}
