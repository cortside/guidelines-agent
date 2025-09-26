import { Request, Response, NextFunction } from "express";
import { ThreadManagementService } from "../services/threadManagementService.js";

/**
 * Threads controller for managing conversation threads
 * @swagger
 * components:
 *   schemas:
 *     ThreadSummary:
 *       type: object
 *       properties:
 *         threadId:
 *           type: string
 *           description: Unique identifier for the thread
 *           example: "thread-abc123"
 *         name:
 *           type: string
 *           description: Display name for the thread
 *           example: "REST API Guidelines Discussion"
 *         lastMessage:
 *           type: string
 *           description: Preview of the last message
 *           example: "What are the REST API guidelines?"
 *         lastActivity:
 *           type: string
 *           format: date-time
 *           description: Timestamp of last activity
 *         messageCount:
 *           type: integer
 *           description: Number of messages in the thread
 *           example: 5
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Thread creation timestamp
 *     ThreadsResponse:
 *       type: object
 *       properties:
 *         threads:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ThreadSummary'
 */
export class ThreadsController {
  private threadManagementService: ThreadManagementService;

  constructor(threadManagementService: ThreadManagementService) {
    this.threadManagementService = threadManagementService;
  }

  /**
   * Get all conversation threads
   * @swagger
   * /threads:
   *   get:
   *     summary: Get all conversation threads
   *     description: Retrieves a list of all conversation threads with metadata
   *     tags: [Threads]
   *     responses:
   *       200:
   *         description: List of threads retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ThreadsResponse'
   *       500:
   *         description: Internal server error
   */
  async getAllThreads(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const threads = this.threadManagementService.getAllThreads();
      res.json({ threads });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new thread (optional explicit creation)
   * @swagger
   * /threads:
   *   post:
   *     summary: Create a new conversation thread
   *     description: Creates a new conversation thread with optional name
   *     tags: [Threads]
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *                 description: Optional thread name
   *                 example: "New Discussion"
   *     responses:
   *       201:
   *         description: Thread created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 threadId:
   *                   type: string
   *                   description: The created thread ID
   *       500:
   *         description: Internal server error
   */
  async createThread(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name } = req.body;
      
      // Generate new thread ID
      const threadId = `thread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create thread metadata with placeholder message for name generation
      const placeholderMessage = name || "New conversation";
      this.threadManagementService.updateThreadMetadata(threadId, placeholderMessage, true);
      
      // If custom name provided, update it
      if (name) {
        this.threadManagementService.updateThreadName(threadId, name);
      }
      
      res.status(201).json({ threadId });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update thread name
   * @swagger
   * /threads/{threadId}:
   *   patch:
   *     summary: Update thread properties
   *     description: Updates thread properties like name
   *     tags: [Threads]
   *     parameters:
   *       - in: path
   *         name: threadId
   *         required: true
   *         description: Thread ID to update
   *         schema:
   *           type: string
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *                 description: New thread name
   *     responses:
   *       200:
   *         description: Thread updated successfully
   *       400:
   *         description: Invalid request
   *       404:
   *         description: Thread not found
   *       500:
   *         description: Internal server error
   */
  async updateThread(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { threadId } = req.params;
      const { name } = req.body;

      if (!threadId) {
        res.status(400).json({ error: "Thread ID is required" });
        return;
      }

      if (!name || typeof name !== "string") {
        res.status(400).json({ error: "Name is required and must be a string" });
        return;
      }

      const success = this.threadManagementService.updateThreadName(threadId, name);
      
      if (!success) {
        res.status(404).json({ error: "Thread not found" });
        return;
      }

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a thread
   * @swagger
   * /threads/{threadId}:
   *   delete:
   *     summary: Delete a conversation thread
   *     description: Deletes a conversation thread and its metadata
   *     tags: [Threads]
   *     parameters:
   *       - in: path
   *         name: threadId
   *         required: true
   *         description: Thread ID to delete
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Thread deleted successfully
   *       404:
   *         description: Thread not found
   *       500:
   *         description: Internal server error
   */
  async deleteThread(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { threadId } = req.params;

      if (!threadId) {
        res.status(400).json({ error: "Thread ID is required" });
        return;
      }

      const success = this.threadManagementService.deleteThread(threadId);
      
      if (!success) {
        res.status(404).json({ error: "Thread not found" });
        return;
      }

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}
