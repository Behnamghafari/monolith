export interface Closeable { name: string; close(): Promise<void> }

export function createShutdownManager(resources: Closeable[], timeoutMs: number, onTimeout = () => { process.exitCode = 1; }) {
  let running: Promise<void> | undefined;
  return async (_reason: string) => {
    if (running) return running;
    running = (async () => {
      const timer = setTimeout(onTimeout, timeoutMs);
      timer.unref();
      try { for (const resource of resources) await resource.close(); }
      finally { clearTimeout(timer); }
    })();
    return running;
  };
}
