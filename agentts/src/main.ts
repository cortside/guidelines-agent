import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { config } from "./config/index.js";
import { ChatService } from "./services/chatService.js";
import { ChatController } from "./controllers/chatController.js";
import { HealthController } from "./controllers/healthController.js";
import { ThreadsController } from "./controllers/threadsController.js";
import { createRoutes } from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";

async function startServer() {
  try {
    console.log("Starting Guidelines Agent API...");
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`Vector Store Provider: ${config.vectorStore.provider}`);
    
    // Initialize services
    const chatService = new ChatService();
    await chatService.initialize();
    
    // Initialize controllers
    const chatController = new ChatController(chatService);
    const healthController = new HealthController();
    const threadsController = new ThreadsController(chatService.getThreadManagementService());
    
    // Create Express app
    const app = express();
    
    // Middleware
    app.use(cors());
    app.use(bodyParser.json());
    
    // Routes
    app.use(createRoutes(chatController, healthController, threadsController));
    
    // Error handling middleware (must be last)
    app.use(errorHandler);
    
    // Start server
    const server = app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
      console.log(`Health check available at: http://localhost:${config.port}/health`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully...');
      server.close(() => {
        console.log('Process terminated');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully...');
      server.close(() => {
        console.log('Process terminated');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
