import { Router } from "express";
import { HealthController } from '../controllers/healthController.ts';

export function createHealthRoutes(healthController: HealthController): Router {
  const router = Router();

  router.get("/health", (req, res) => healthController.getHealth(req, res));

  return router;
}
