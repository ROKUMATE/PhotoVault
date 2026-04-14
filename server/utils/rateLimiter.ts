/**
 * Simple rate limiter: max N calls per second
 * Uses a sliding window approach
 */
export class RateLimiter {
  private maxCallsPerSecond: number;
  private calls: number[];

  constructor(maxCallsPerSecond: number = 3) {
    this.maxCallsPerSecond = maxCallsPerSecond;
    this.calls = [];
  }

  /**
   * Check if we can make a call, and add it to the buffer if so
   * Returns true if allowed, false if rate limited
   */
  canMakeCall(): boolean {
    const now = Date.now();
    const oneSecondAgo = now - 1000;

    // Remove calls older than 1 second
    this.calls = this.calls.filter((timestamp) => timestamp > oneSecondAgo);

    if (this.calls.length < this.maxCallsPerSecond) {
      this.calls.push(now);
      return true;
    }

    return false;
  }

  /**
   * Async method: wait until a call slot is available
   */
  async acquire(): Promise<void> {
    while (!this.canMakeCall()) {
      // Wait 50ms before checking again
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  /**
   * Get the time (in ms) to wait before the next call can be made
   */
  getWaitTime(): number {
    if (this.calls.length < this.maxCallsPerSecond) {
      return 0;
    }

    const oldestCall = this.calls[0];
    const now = Date.now();
    return Math.max(0, 1000 - (now - oldestCall));
  }
}

export default RateLimiter;
