export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { schedulerService } = await import('./services/scheduler');
    console.log('[WebWatcher] Initializing scheduler from instrumentation...');
    // 注意：在开发环境下，HMR 可能会导致多次触发，我们在 start 内部已做了运行状态检查
    schedulerService.start().catch(err => {
      console.error('[WebWatcher] Failed to start scheduler:', err);
    });
  }
}
