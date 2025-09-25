import { Request, Response } from "express";

/**
 * Health controller for service status monitoring
 */
export class HealthController {
  /**
   * Health check endpoint
   * @swagger
   * /health:
   *   get:
   *     summary: Health check endpoint
   *     description: Simple health check endpoint that returns the service status
   *     tags: [Health]
   *     responses:
   *       200:
   *         description: Service is healthy and operational
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   enum: [ok, degraded, down]
   *                   example: "ok"
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *                   example: "2025-09-25T23:00:00.000Z"
   *                 service:
   *                   type: string
   *                   example: "guidelines-agent-api"
   *       500:
   *         description: Service is unhealthy
   */
  async getHealth(req: Request, res: Response): Promise<void> {
    res.json({ 
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "guidelines-agent-api"
    });
  }
}
