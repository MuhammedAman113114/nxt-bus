/**
 * Progressive Loading Utility
 * Loads data in priority order for better perceived performance
 */

export interface LoadingPriority {
  critical: () => Promise<any>;
  important?: () => Promise<any>;
  optional?: () => Promise<any>;
}

export class ProgressiveLoader {
  /**
   * Load data progressively based on priority
   * Critical data loads first, then important, then optional
   */
  static async loadProgressive<T>(
    priorities: LoadingPriority,
    onProgress?: (stage: 'critical' | 'important' | 'optional', data: any) => void
  ): Promise<{ critical: any; important?: any; optional?: any }> {
    const results: any = {};

    try {
      // Load critical data first (blocking)
      results.critical = await priorities.critical();
      onProgress?.('critical', results.critical);

      // Load important data in background (non-blocking)
      if (priorities.important) {
        priorities.important().then(data => {
          results.important = data;
          onProgress?.('important', data);
        }).catch(err => {
          console.warn('Failed to load important data:', err);
        });
      }

      // Load optional data last (non-blocking)
      if (priorities.optional) {
        priorities.optional().then(data => {
          results.optional = data;
          onProgress?.('optional', data);
        }).catch(err => {
          console.warn('Failed to load optional data:', err);
        });
      }

      return results;
    } catch (error) {
      console.error('Failed to load critical data:', error);
      throw error;
    }
  }

  /**
   * Preload images for faster display
   */
  static preloadImages(urls: string[]): Promise<void[]> {
    return Promise.all(
      urls.map(url => {
        return new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = url;
        });
      })
    );
  }

  /**
   * Defer non-critical operations until idle
   */
  static deferUntilIdle(callback: () => void, timeout: number = 2000): void {
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(callback, { timeout });
    } else {
      setTimeout(callback, timeout);
    }
  }

  /**
   * Load data in chunks to avoid blocking
   */
  static async loadInChunks<T>(
    items: T[],
    chunkSize: number,
    processor: (chunk: T[]) => Promise<void>,
    onProgress?: (processed: number, total: number) => void
  ): Promise<void> {
    const chunks: T[][] = [];
    
    // Split into chunks
    for (let i = 0; i < items.length; i += chunkSize) {
      chunks.push(items.slice(i, i + chunkSize));
    }

    // Process chunks sequentially
    let processed = 0;
    for (const chunk of chunks) {
      await processor(chunk);
      processed += chunk.length;
      onProgress?.(processed, items.length);
      
      // Yield to browser between chunks
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  /**
   * Check if user is on slow connection
   */
  static isSlowConnection(): boolean {
    if ('connection' in navigator) {
      const conn = (navigator as any).connection;
      if (conn) {
        // Check effective type (slow-2g, 2g, 3g, 4g)
        if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') {
          return true;
        }
        // Check if save-data is enabled
        if (conn.saveData) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Get recommended chunk size based on connection
   */
  static getRecommendedChunkSize(): number {
    if (this.isSlowConnection()) {
      return 5; // Smaller chunks for slow connections
    }
    return 20; // Larger chunks for fast connections
  }

  /**
   * Prefetch data for next page
   */
  static prefetch(url: string): void {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  }

  /**
   * Check if element is in viewport
   */
  static isInViewport(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  /**
   * Lazy load when element enters viewport
   */
  static observeElement(
    element: HTMLElement,
    callback: () => void,
    options?: IntersectionObserverInit
  ): IntersectionObserver {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          callback();
          observer.unobserve(entry.target);
        }
      });
    }, options);

    observer.observe(element);
    return observer;
  }
}
