/**
 * Simple in-memory rate limiter for client-side requests
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  
  /**
   * Check if an action is rate limited
   * @param key - Unique identifier for the action (e.g., 'auth:email@example.com')
   * @param maxAttempts - Maximum number of attempts allowed
   * @param windowMs - Time window in milliseconds
   * @returns true if rate limit exceeded, false otherwise
   */
  isRateLimited(key: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
    const now = Date.now();
    const entry = this.limits.get(key);
    
    // Clean up expired entries periodically
    if (Math.random() < 0.1) {
      this.cleanup();
    }
    
    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired entry
      this.limits.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return false;
    }
    
    if (entry.count >= maxAttempts) {
      return true;
    }
    
    entry.count++;
    return false;
  }
  
  /**
   * Get remaining time until rate limit resets
   */
  getTimeUntilReset(key: string): number {
    const entry = this.limits.get(key);
    if (!entry) return 0;
    
    const remaining = entry.resetTime - Date.now();
    return Math.max(0, Math.ceil(remaining / 1000));
  }
  
  /**
   * Reset rate limit for a specific key
   */
  reset(key: string): void {
    this.limits.delete(key);
  }
  
  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }
}

export const rateLimiter = new RateLimiter();
