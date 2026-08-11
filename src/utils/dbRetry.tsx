/**
 * Utility helper to retry async database operations upon network glitch or cold start.
 */
export async function retryCall<T>(fn: () => Promise<T>, retries = 3, delay = 800): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const errMsg = String(err?.message || err).toLowerCase();
      
      // Look for standard fetch pattern or browser exception signatures
      const isNetworkError = 
        errMsg.includes('load failed') || 
        errMsg.includes('typeerror') || 
        errMsg.includes('failed to fetch') ||
        errMsg.includes('network') ||
        errMsg.includes('timeout') ||
        errMsg.includes('aborted') ||
        err?.name === 'TypeError';
      
      if (isNetworkError && i < retries - 1) {
        console.warn(`[Network Retry] Glitch caught (${errMsg}). Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 1.5; // Exponential backoff
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}
