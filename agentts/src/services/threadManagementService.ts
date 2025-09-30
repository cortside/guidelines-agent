import fs from "fs";
import path from "path";

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
 * Uses in-memory storage with JSON file backup for persistence across restarts
 */
export class ThreadManagementService {
  private threadMetadata: Map<string, ThreadMetadata> = new Map();
  private isInitialized: boolean = false;
  private storageFile: string = "threads-metadata.json";

  constructor() {
    console.log(
      "ThreadManagementService initialized with in-memory storage + JSON backup"
    );
    this.loadFromBackup();
  }

  /**
   * Initialize with ChatService to validate threads against actual agent data
   */
  async initializeWithValidation(chatService: any): Promise<void> {
    console.log(
      "ThreadManagementService: Validating threads against agent data"
    );

    const threadIds = Array.from(this.threadMetadata.keys());
    console.log(
      `ThreadManagementService: Found ${threadIds.length} threads to validate`
    );
    const validThreadIds: string[] = [];

    for (const threadId of threadIds) {
      try {
        console.log(
          `ThreadManagementService: Validating thread ${threadId}...`
        );
        // Try to get the thread history to see if it exists in the agent
        const history = await chatService.getThreadHistory(threadId);

        // A thread is only valid if it has actual messages (not just empty array)
        // Empty threads that were just created but never used should be cleaned up
        if (Array.isArray(history) && history.length > 0) {
          console.log(
            `ThreadManagementService: Thread ${threadId} is valid (${history.length} messages)`
          );
          validThreadIds.push(threadId);
        } else {
          console.log(
            `ThreadManagementService: Thread ${threadId} has no messages, removing from metadata (${history ? history.length : "null"} messages)`
          );
          this.threadMetadata.delete(threadId);
        }
      } catch (error) {
        console.log(
          `ThreadManagementService: Thread ${threadId} validation failed, removing from metadata:`,
          error instanceof Error ? error.message : String(error)
        );
        this.threadMetadata.delete(threadId);
      }
    }

    // Save the cleaned metadata
    this.saveToBackup();

    console.log(
      `ThreadManagementService: Validation complete. ${validThreadIds.length}/${threadIds.length} threads are valid`
    );
  }

  /**
   * Load thread metadata from JSON backup file
   */
  private loadFromBackup(): void {
    try {
      const backupPath = path.join(process.cwd(), this.storageFile);

      if (fs.existsSync(backupPath)) {
        const data = fs.readFileSync(backupPath, "utf8");
        const threads: ThreadMetadata[] = JSON.parse(data);

        threads.forEach((thread) => {
          // Convert date strings back to Date objects
          thread.createdAt = new Date(thread.createdAt);
          thread.lastActivity = new Date(thread.lastActivity);
          this.threadMetadata.set(thread.threadId, thread);
        });

        console.log(
          `ThreadManagementService: Loaded ${threads.length} threads from backup`
        );
      } else {
        console.log(
          "ThreadManagementService: No backup file found, starting fresh"
        );
      }
    } catch (error) {
      console.error("ThreadManagementService: Error loading backup:", error);
    }
  }

  /**
   * Save thread metadata to JSON backup file
   */
  private saveToBackup(): void {
    try {
      const backupPath = path.join(process.cwd(), this.storageFile);

      const threads = Array.from(this.threadMetadata.values());
      fs.writeFileSync(backupPath, JSON.stringify(threads, null, 2), "utf8");
      console.log(
        `ThreadManagementService: Saved ${threads.length} threads to backup`
      );
    } catch (error) {
      console.error("ThreadManagementService: Error saving backup:", error);
    }
  }

  /**
   * Clear the backup file on startup to start fresh
   */
  private clearBackupFile(): void {
    try {
      const backupPath = path.join(process.cwd(), this.storageFile);

      if (fs.existsSync(backupPath)) {
        fs.writeFileSync(backupPath, JSON.stringify([], null, 2), "utf8");
        console.log(
          "ThreadManagementService: Cleared backup file to start fresh"
        );
      } else {
        console.log(
          "ThreadManagementService: No backup file to clear, starting fresh"
        );
      }
    } catch (error) {
      console.error("ThreadManagementService: Error clearing backup:", error);
    }
  }

  /**
   * Get all thread summaries
   */
  getAllThreads(): ThreadSummary[] {
    const threads = Array.from(this.threadMetadata.values())
      .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
      .map((metadata) => ({
        threadId: metadata.threadId,
        name: metadata.name,
        lastMessage: metadata.firstMessage,
        lastActivity: metadata.lastActivity,
        messageCount: metadata.messageCount,
        createdAt: metadata.createdAt,
      }));

    console.log(
      `ThreadManagementService: Returning ${threads.length} threads sorted by lastActivity`
    );
    threads.forEach((thread, index) => {
      console.log(
        `  ${index + 1}. ${thread.threadId} - ${thread.name} - lastActivity: ${thread.lastActivity.toISOString()}`
      );
    });

    return threads;
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
   * Create thread metadata for a new thread (without message activity)
   */
  createThreadMetadata(threadId: string, name?: string): void {
    const now = new Date();

    // Don't create if already exists
    if (this.threadMetadata.has(threadId)) {
      console.log(
        `Thread ${threadId} metadata already exists, skipping creation`
      );
      return;
    }

    const threadName = name || this.generateThreadName("New conversation");
    const metadata: ThreadMetadata = {
      threadId,
      name: threadName,
      createdAt: now,
      // Set lastActivity to creation time, but this will be updated when first real message is sent
      lastActivity: now,
      messageCount: 0, // No messages yet
      firstMessage: undefined,
    };

    this.threadMetadata.set(threadId, metadata);
    console.log(
      `Created thread metadata for ${threadId} with name "${threadName}"`
    );

    // Save to backup file
    this.saveToBackup();
  }

  /**
   * Create or update thread metadata when processing a message
   */
  updateThreadMetadata(
    threadId: string,
    userMessage: string,
    isNewThread: boolean = false,
    messageTimestamp?: Date
  ): void {
    const now = messageTimestamp || new Date();
    const existing = this.threadMetadata.get(threadId);

    if (existing) {
      if (existing.messageCount === 0) {
        // This is the first real message for an existing empty thread
        existing.lastActivity = now;
        existing.messageCount = 1;
        existing.firstMessage = userMessage;
        // Update thread name based on first real message
        existing.name = this.generateThreadName(userMessage);
        console.log(
          `Updated thread ${threadId} with first real message, new name: "${existing.name}"`
        );
      } else {
        // Update existing thread with more messages
        existing.lastActivity = now;
        existing.messageCount += 1;
        console.log(
          `Updated thread ${threadId} lastActivity to ${now.toISOString()}, messageCount: ${existing.messageCount}`
        );
      }
    } else {
      // Create new thread metadata (this should be rare, prefer using createThreadMetadata)
      const threadName = this.generateThreadName(userMessage);
      const metadata: ThreadMetadata = {
        threadId,
        name: threadName,
        createdAt: now,
        lastActivity: now,
        messageCount: 1,
        firstMessage: userMessage,
      };
      this.threadMetadata.set(threadId, metadata);
      console.log(
        `Created new thread ${threadId} via updateThreadMetadata with first message`
      );
    }

    // Save to backup file
    this.saveToBackup();
  }

  /**
   * Generate a thread name from the first message
   */
  private generateThreadName(firstMessage: string): string {
    // Extract meaningful words from the first message
    const words = firstMessage
      .toLowerCase()
      .replace(/[^\w\s]/g, "") // Remove punctuation
      .split(/\s+/)
      .filter(
        (word) =>
          word.length > 2 &&
          ![
            "the",
            "and",
            "but",
            "for",
            "are",
            "not",
            "you",
            "all",
            "can",
            "had",
            "was",
            "one",
            "our",
            "out",
            "day",
            "get",
            "has",
            "him",
            "his",
            "how",
            "its",
            "may",
            "new",
            "now",
            "old",
            "see",
            "two",
            "way",
            "who",
            "boy",
            "did",
            "she",
            "use",
            "her",
            "how",
            "say",
            "she",
            "use",
            "each",
            "which",
            "their",
            "said",
            "they",
            "have",
            "what",
            "were",
            "been",
            "have",
            "their",
            "said",
            "each",
            "which",
            "words",
            "like",
            "just",
            "long",
            "make",
            "thing",
            "see",
            "him",
            "two",
            "more",
            "go",
            "no",
            "way",
            "could",
            "my",
            "than",
            "first",
            "been",
            "call",
            "who",
            "oil",
            "sit",
            "now",
            "find",
            "down",
            "day",
            "did",
            "get",
            "come",
            "made",
            "may",
            "part",
          ].includes(word)
      )
      .slice(0, 4); // Take first 4 meaningful words

    if (words.length === 0) {
      return `New Conversation ${new Date().toLocaleString()}`;
    }

    // Capitalize first letter of each word
    const capitalizedWords = words.map(
      (word) => word.charAt(0).toUpperCase() + word.slice(1)
    );

    return capitalizedWords.join(" ");
  }

  /**
   * Update thread name manually
   */
  updateThreadName(threadId: string, newName: string): boolean {
    const metadata = this.threadMetadata.get(threadId);
    if (metadata) {
      metadata.name = newName;
      // Don't update lastActivity for name changes, only for actual messages
      this.saveToBackup();
      return true;
    }
    return false;
  }

  /**
   * Update the last activity time for a thread (when a new message is sent)
   */
  updateThreadActivity(threadId: string, activityTime?: Date): boolean {
    const metadata = this.threadMetadata.get(threadId);
    if (metadata) {
      metadata.lastActivity = activityTime || new Date();
      console.log(
        `Updated thread ${threadId} activity to ${metadata.lastActivity.toISOString()}`
      );
      this.saveToBackup();
      return true;
    }
    return false;
  }

  /**
   * Delete thread metadata
   */
  deleteThread(threadId: string): boolean {
    const deleted = this.threadMetadata.delete(threadId);
    if (deleted) {
      this.saveToBackup();
    }
    return deleted;
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
  cleanupOldThreads(maxAge: number = 30 * 24 * 60 * 60 * 1000): number {
    // 30 days default
    const now = new Date();
    let deletedCount = 0;

    for (const [threadId, metadata] of this.threadMetadata) {
      const age = now.getTime() - metadata.lastActivity.getTime();
      if (age > maxAge) {
        this.threadMetadata.delete(threadId);
        deletedCount++;
        console.log(
          `Cleaned up old thread: ${threadId} (age: ${Math.round(age / (24 * 60 * 60 * 1000))} days)`
        );
      }
    }

    if (deletedCount > 0) {
      console.log(
        `ThreadManagementService: Cleaned up ${deletedCount} old threads`
      );
    }

    return deletedCount;
  }

  /**
   * Get detailed statistics about thread storage (for debugging)
   */
  getStorageStats(): {
    totalThreads: number;
    oldestThread?: { threadId: string; createdAt: Date };
    newestThread?: { threadId: string; createdAt: Date };
    mostActiveThread?: {
      threadId: string;
      lastActivity: Date;
      messageCount: number;
    };
    averageMessageCount: number;
  } {
    const threads = Array.from(this.threadMetadata.values());
    if (threads.length === 0) {
      return {
        totalThreads: 0,
        averageMessageCount: 0,
      };
    }

    const sortedByCreation = threads.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
    const sortedByMessages = threads.sort(
      (a, b) => b.messageCount - a.messageCount
    );

    const totalMessages = threads.reduce(
      (sum, thread) => sum + thread.messageCount,
      0
    );

    return {
      totalThreads: threads.length,
      oldestThread: {
        threadId: sortedByCreation[0].threadId,
        createdAt: sortedByCreation[0].createdAt,
      },
      newestThread: {
        threadId: sortedByCreation[sortedByCreation.length - 1].threadId,
        createdAt: sortedByCreation[sortedByCreation.length - 1].createdAt,
      },
      mostActiveThread: {
        threadId: sortedByMessages[0].threadId,
        lastActivity: sortedByMessages[0].lastActivity,
        messageCount: sortedByMessages[0].messageCount,
      },
      averageMessageCount: totalMessages / threads.length,
    };
  }
}
