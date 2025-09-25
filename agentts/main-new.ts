import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { config } from "./src/config/index.js";
import { ChatService } from "./src/services/chatService.js";
import { ChatController } from "./src/controllers/chatController.js";
import { HealthController } from "./src/controllers/healthController.js";
import { createRoutes } from "./src/routes/index.js";
import { errorHandler } from "./src/middleware/errorHandler.js";
import { setupSwagger } from "./src/config/swagger.js";

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
    
    // Create Express app
    const app = express();
    
    // Middleware
    app.use(cors());
    app.use(bodyParser.json());
    
    // Set up API documentation
    setupSwagger(app);
    
    // Routes
    app.use(createRoutes(chatController, healthController));
    
    // Error handling middleware (must be last)
    app.use(errorHandler);
    
    // Start server
    const server = app.listen(config.port, () => {
      console.log(`✅ Server running on port ${config.port}`);
      console.log(`📊 Health check: http://localhost:${config.port}/health`);
      console.log(`📚 API docs: http://localhost:${config.port}/api-docs`);
      console.log(`🔗 Alternative docs: http://localhost:${config.port}/docs`);
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
