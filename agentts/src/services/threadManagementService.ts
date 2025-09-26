export interface ThreadSummary {
  threadId: string;
  name: string;
  lastMessage?: string;
  lastActivity: Date;
  messageCount: number;
  createdAt: Date;
}

export interface ThreadMetadata {
  threadId: string;
  name: string;
  createdAt: Date;
  lastActivity: Date;
  messageCount: number;
  firstMessage?: string;
}

/**
 * Service for managing thread metadata and operations
 */
export class ThreadManagementService {
  private threadMetadata: Map<string, ThreadMetadata> = new Map();

  /**
   * Get all thread summaries
   */
  getAllThreads(): ThreadSummary[] {
    return Array.from(this.threadMetadata.values())
      .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
      .map(metadata => ({
        threadId: metadata.threadId,
        name: metadata.name,
        lastMessage: metadata.firstMessage,
        lastActivity: metadata.lastActivity,
        messageCount: metadata.messageCount,
        createdAt: metadata.createdAt
      }));
  }

  /**
   * Get thread metadata by ID
   */
  getThreadMetadata(threadId: string): ThreadMetadata | undefined {
    return this.threadMetadata.get(threadId);
  }

  /**
   * Check if thread exists
   */
  threadExists(threadId: string): boolean {
    return this.threadMetadata.has(threadId);
  }

  /**
   * Create or update thread metadata when processing a message
   */
  updateThreadMetadata(
    threadId: string, 
    userMessage: string, 
    isNewThread: boolean = false
  ): void {
    const now = new Date();
    const existing = this.threadMetadata.get(threadId);

    if (existing) {
      // Update existing thread
      existing.lastActivity = now;
      existing.messageCount += 1;
    } else {
      // Create new thread metadata
      const threadName = this.generateThreadName(userMessage);
      const metadata: ThreadMetadata = {
        threadId,
        name: threadName,
        createdAt: now,
        lastActivity: now,
        messageCount: 1,
        firstMessage: userMessage
      };
      this.threadMetadata.set(threadId, metadata);
    }
  }

  /**
   * Generate a thread name from the first message
   */
  private generateThreadName(firstMessage: string): string {
    // Extract meaningful words from the first message
    const words = firstMessage
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(/\s+/)
      .filter(word => 
        word.length > 2 && 
        !['the', 'and', 'but', 'for', 'are', 'not', 'you', 'all', 'can', 'had', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'she', 'use', 'her', 'how', 'say', 'she', 'use', 'each', 'which', 'their', 'said', 'they', 'have', 'what', 'were', 'been', 'have', 'their', 'said', 'each', 'which', 'words', 'like', 'just', 'long', 'make', 'thing', 'see', 'him', 'two', 'more', 'go', 'no', 'way', 'could', 'my', 'than', 'first', 'been', 'call', 'who', 'oil', 'sit', 'now', 'find', 'down', 'day', 'did', 'get', 'come', 'made', 'may', 'part'].includes(word)
      )
      .slice(0, 4); // Take first 4 meaningful words

    if (words.length === 0) {
      return `New Conversation ${new Date().toLocaleString()}`;
    }

    // Capitalize first letter of each word
    const capitalizedWords = words.map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    );

    return capitalizedWords.join(' ');
  }

  /**
   * Update thread name manually
   */
  updateThreadName(threadId: string, newName: string): boolean {
    const metadata = this.threadMetadata.get(threadId);
    if (metadata) {
      metadata.name = newName;
      metadata.lastActivity = new Date();
      return true;
    }
    return false;
  }

  /**
   * Delete thread metadata
   */
  deleteThread(threadId: string): boolean {
    return this.threadMetadata.delete(threadId);
  }

  /**
   * Get thread count
   */
  getThreadCount(): number {
    return this.threadMetadata.size;
  }

  /**
   * Clean up old threads (optional feature)
   */
  cleanupOldThreads(maxAge: number = 30 * 24 * 60 * 60 * 1000): number { // 30 days default
    const now = new Date();
    let deletedCount = 0;

    for (const [threadId, metadata] of this.threadMetadata) {
      const age = now.getTime() - metadata.lastActivity.getTime();
      if (age > maxAge) {
        this.threadMetadata.delete(threadId);
        deletedCount++;
      }
    }

    return deletedCount;
  }
}
