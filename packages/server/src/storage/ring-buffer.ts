import type { LogEntry } from '../models.js';

/**
 * Ring Buffer for storing logs in memory
 *
 * A ring buffer (circular buffer) is a fixed-size data structure that automatically
 * overwrites the oldest entries when full. This prevents unbounded memory growth.
 *
 * How it works:
 * - We have a fixed-size array
 * - A write pointer tracks where to insert the next item
 * - When we reach the end, we wrap back to the beginning
 * - Old entries are automatically overwritten
 */
export class RingBuffer {
  private buffer: LogEntry[];
  private writeIndex: number = 0;
  private size: number = 0;
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
    // Pre-allocate the array for better performance
    this.buffer = new Array(maxSize);
  }

  /**
   * Add a new log entry to the buffer
   * If buffer is full, overwrites the oldest entry
   */
  add(entry: LogEntry): void {
    // Add entry at current write position
    this.buffer[this.writeIndex] = entry;

    // Move write pointer forward (with wrapping)
    this.writeIndex = (this.writeIndex + 1) % this.maxSize;

    // Track actual size (up to maxSize)
    if (this.size < this.maxSize) {
      this.size++;
    }
  }

  /**
   * Get all logs in chronological order (oldest first)
   *
   * Why the complexity?
   * - If buffer isn't full, items are at [0...size-1]
   * - If buffer is full and has wrapped, oldest item is at writeIndex
   *   and we need to return [writeIndex...end, 0...writeIndex-1]
   */
  getAll(): LogEntry[] {
    if (this.size < this.maxSize) {
      // Buffer not full yet, return items in order
      return this.buffer.slice(0, this.size);
    } else {
      // Buffer is full and has wrapped
      // Oldest item is at writeIndex, so we need to rearrange
      const olderHalf = this.buffer.slice(this.writeIndex);
      const newerHalf = this.buffer.slice(0, this.writeIndex);
      return [...olderHalf, ...newerHalf];
    }
  }

  /**
   * Get the N most recent logs
   */
  getRecent(count: number): LogEntry[] {
    const all = this.getAll();
    return all.slice(-count);
  }

  /**
   * Find a log by ID
   */
  findById(id: string): LogEntry | undefined {
    return this.buffer.find((entry) => entry?.id === id);
  }

  /**
   * Get current number of logs stored
   */
  getSize(): number {
    return this.size;
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.buffer = new Array(this.maxSize);
    this.writeIndex = 0;
    this.size = 0;
  }
}
