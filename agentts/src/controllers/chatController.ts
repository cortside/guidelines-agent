import { Request, Response, NextFunction } from "express";
import { ChatService } from "../services/chatService.js";

/**
 * Chat controller handling conversational AI interactions
 * @swagger
 * components:
 *   schemas:
 *     ChatRequest:
 *       type: object
 *       required:
 *         - threadId
 *         - message
 *       properties:
 *         threadId:
 *           type: string
 *           description: Unique identifier for the conversation thread
 *           example: "thread-abc123"
 *         message:
 *           type: string
 *           description: The user's message or question
 *           example: "What are the REST API guidelines?"
 */
export class ChatController {
  private chatService: ChatService;

  constructor(chatService: ChatService) {
    this.chatService = chatService;
  }

  /**
   * Process a chat message and generate AI response
   * @swagger
   * /chat:
   *   post:
   *     summary: Process a chat message
   *     description: Processes a chat message within a specific thread context using AI
   *     tags: [Chat]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ChatRequest'
   *     responses:
   *       200:
   *         description: Successful response with AI-generated answer
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 answer:
   *                   type: string
   *                   description: AI-generated response
   *       400:
   *         description: Invalid request parameters
   *       500:
   *         description: Internal server error
   */
  async handleChatMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { threadId, message } = req.body;

      if (typeof threadId !== "string" || typeof message !== "string") {
        res.status(400).json({ error: "threadId and message must be strings" });
        return;
      }

      if (!threadId.trim() || !message.trim()) {
        res.status(400).json({ error: "threadId and message cannot be empty" });
        return;
      }

      const answer = await this.chatService.processMessage(threadId, message);
      res.json({ answer });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get conversation history for a thread
   * @swagger
   * /threads/{threadId}:
   *   get:
   *     summary: Get thread conversation history
   *     description: Retrieves the complete message history for a specific conversation thread
   *     tags: [Threads]
   *     parameters:
   *       - in: path
   *         name: threadId
   *         required: true
   *         description: Unique identifier for the conversation thread
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Thread history retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 messages:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                       type:
   *                         type: string
   *                       content:
   *                         type: string
   *       400:
   *         description: Invalid thread ID parameter
   *       404:
   *         description: Thread not found
   *       500:
   *         description: Internal server error
   */
  async getThreadHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const threadId = req.params.threadId;

      if (typeof threadId !== "string" || !threadId) {
        res.status(400).json({ error: "threadId must be a string" });
        return;
      }

      const messages = await this.chatService.getThreadHistory(threadId);
      
      if (messages.length === 0) {
        res.status(404).json({ error: "Thread not found" });
        return;
      }

      res.json({ messages });
    } catch (error) {
      next(error);
    }
  }
}
