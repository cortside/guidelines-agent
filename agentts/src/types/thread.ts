export interface ThreadState {
  threadId: string;
  messageHistory: any[];
  lastActivity: Date;
}

export interface ThreadConfig {
  configurable: {
    thread_id: string;
  };
  streamMode: 'values';
}
