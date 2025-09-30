/**
 * Stream Health Monitoring Infrastructure
 * Tracks active streaming connections, performance metrics, and provides observability
 */

export interface StreamMetrics {
  activeConnections: number;
  totalStreamsStarted: number;
  completedStreams: number;
  cancelledStreams: number;
  erroredStreams: number;
  averageStreamDuration: number;
  averageTokensPerStream: number;
  lastStreamStartTime?: string;
  lastStreamEndTime?: string;
}

export interface StreamConnection {
  id: string;
  threadId: string;
  startTime: Date;
  currentStep: string;
  tokenCount: number;
  clientDisconnected: boolean;
}

/**
 * StreamMonitor class for tracking streaming chat performance and health
 */
export class StreamMonitor {
  private static instance: StreamMonitor | null = null;
  
  private readonly activeConnections: Map<string, StreamConnection> = new Map();
  private metrics: StreamMetrics = {
    activeConnections: 0,
    totalStreamsStarted: 0,
    completedStreams: 0,
    cancelledStreams: 0,
    erroredStreams: 0,
    averageStreamDuration: 0,
    averageTokensPerStream: 0
  };
  
  private streamDurations: number[] = [];
  private tokenCounts: number[] = [];
  
  // Singleton pattern for global stream monitoring
  public static getInstance(): StreamMonitor {
    StreamMonitor.instance ??= new StreamMonitor();
    return StreamMonitor.instance;
  }

  /**
   * Start tracking a new streaming connection
   */
  public startStream(messageId: string, threadId: string): void {
    const connection: StreamConnection = {
      id: messageId,
      threadId,
      startTime: new Date(),
      currentStep: 'initializing',
      tokenCount: 0,
      clientDisconnected: false
    };

    this.activeConnections.set(messageId, connection);
    this.metrics.activeConnections = this.activeConnections.size;
    this.metrics.totalStreamsStarted++;
    this.metrics.lastStreamStartTime = new Date().toISOString();
    
    console.log(`StreamMonitor: Started tracking stream ${messageId} for thread ${threadId}`);
  }

  /**
   * Update the current workflow step for a streaming connection
   */
  public updateStreamStep(messageId: string, step: string): void {
    const connection = this.activeConnections.get(messageId);
    if (connection) {
      connection.currentStep = step;
      console.log(`StreamMonitor: Stream ${messageId} moved to step: ${step}`);
    }
  }

  /**
   * Increment token count for a streaming connection
   */
  public incrementTokenCount(messageId: string, tokenCount: number = 1): void {
    const connection = this.activeConnections.get(messageId);
    if (connection) {
      connection.tokenCount += tokenCount;
    }
  }

  /**
   * Mark a stream as completed successfully
   */
  public completeStream(messageId: string): void {
    const connection = this.activeConnections.get(messageId);
    if (connection) {
      const duration = Date.now() - connection.startTime.getTime();
      
      this.streamDurations.push(duration);
      this.tokenCounts.push(connection.tokenCount);
      
      // Keep only the last 100 records for rolling averages
      if (this.streamDurations.length > 100) {
        this.streamDurations.shift();
      }
      if (this.tokenCounts.length > 100) {
        this.tokenCounts.shift();
      }
      
      this.metrics.completedStreams++;
      this.updateAverages();
      
      console.log(`StreamMonitor: Completed stream ${messageId} in ${duration}ms with ${connection.tokenCount} tokens`);
    }
    
    this.removeConnection(messageId);
  }

  /**
   * Mark a stream as cancelled
   */
  public cancelStream(messageId: string): void {
    const connection = this.activeConnections.get(messageId);
    if (connection) {
      const duration = Date.now() - connection.startTime.getTime();
      this.streamDurations.push(duration);
      this.tokenCounts.push(connection.tokenCount);
      
      this.metrics.cancelledStreams++;
      this.updateAverages();
      
      console.log(`StreamMonitor: Cancelled stream ${messageId} after ${duration}ms with ${connection.tokenCount} tokens`);
    }
    
    this.removeConnection(messageId);
  }

  /**
   * Mark a stream as errored
   */
  public errorStream(messageId: string, error: string): void {
    const connection = this.activeConnections.get(messageId);
    if (connection) {
      const duration = Date.now() - connection.startTime.getTime();
      this.streamDurations.push(duration);
      
      this.metrics.erroredStreams++;
      this.updateAverages();
      
      console.log(`StreamMonitor: Stream ${messageId} errored after ${duration}ms: ${error}`);
    }
    
    this.removeConnection(messageId);
  }

  /**
   * Mark a client as disconnected (for cleanup tracking)
   */
  public markClientDisconnected(messageId: string): void {
    const connection = this.activeConnections.get(messageId);
    if (connection) {
      connection.clientDisconnected = true;
      console.log(`StreamMonitor: Client disconnected for stream ${messageId}`);
    }
  }

  /**
   * Get current stream metrics
   */
  public getMetrics(): StreamMetrics {
    return { ...this.metrics };
  }

  /**
   * Get active connection details
   */
  public getActiveConnections(): StreamConnection[] {
    return Array.from(this.activeConnections.values());
  }

  /**
   * Get connection details by message ID
   */
  public getConnection(messageId: string): StreamConnection | undefined {
    return this.activeConnections.get(messageId);
  }

  /**
   * Cleanup stale connections (older than 5 minutes)
   */
  public cleanupStaleConnections(): number {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    let cleaned = 0;
    
    for (const [messageId, connection] of this.activeConnections.entries()) {
      if (connection.startTime.getTime() < fiveMinutesAgo) {
        console.log(`StreamMonitor: Cleaning up stale connection ${messageId}`);
        this.removeConnection(messageId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`StreamMonitor: Cleaned up ${cleaned} stale connections`);
    }
    
    return cleaned;
  }

  /**
   * Reset all metrics (useful for testing)
   */
  public resetMetrics(): void {
    this.activeConnections.clear();
    this.streamDurations = [];
    this.tokenCounts = [];
    this.metrics = {
      activeConnections: 0,
      totalStreamsStarted: 0,
      completedStreams: 0,
      cancelledStreams: 0,
      erroredStreams: 0,
      averageStreamDuration: 0,
      averageTokensPerStream: 0
    };
    
    console.log('StreamMonitor: Metrics reset');
  }

  /**
   * Remove a connection from tracking
   */
  private removeConnection(messageId: string): void {
    this.activeConnections.delete(messageId);
    this.metrics.activeConnections = this.activeConnections.size;
    this.metrics.lastStreamEndTime = new Date().toISOString();
  }

  /**
   * Update rolling averages
   */
  private updateAverages(): void {
    if (this.streamDurations.length > 0) {
      const sum = this.streamDurations.reduce((a, b) => a + b, 0);
      this.metrics.averageStreamDuration = Math.round(sum / this.streamDurations.length);
    }
    
    if (this.tokenCounts.length > 0) {
      const sum = this.tokenCounts.reduce((a, b) => a + b, 0);
      this.metrics.averageTokensPerStream = Math.round(sum / this.tokenCounts.length);
    }
  }
}

/**
 * Global stream monitor instance
 */
export const streamMonitor = StreamMonitor.getInstance();

/**
 * Initialize periodic cleanup of stale connections
 * Runs every 2 minutes
 */
export function initializeStreamMonitor(): void {
  console.log('StreamMonitor: Initializing with periodic cleanup');
  
  setInterval(() => {
    streamMonitor.cleanupStaleConnections();
  }, 2 * 60 * 1000); // 2 minutes
}
