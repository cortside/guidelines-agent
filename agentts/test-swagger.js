import express from 'express';
import { setupSwagger } from './src/config/swagger.js';

const app = express();
const port = 3000;

console.log('Starting Swagger test server...');

// Simple test endpoint first
app.get('/test', (req, res) => {
  res.json({ 
    message: 'API Documentation test endpoint working!',
    timestamp: new Date().toISOString()
  });
});

// Set up Swagger documentation
try {
  setupSwagger(app);
  console.log('✅ Swagger setup completed successfully');
} catch (error) {
  console.error('❌ Swagger setup failed:', error.message);
  console.error(error);
}

app.listen(port, () => {
  console.log(`✅ Test server running on port ${port}`);
  console.log(`📚 API docs available at: http://localhost:${port}/api-docs`);
  console.log(`🔗 Alternative docs: http://localhost:${port}/docs`);
  console.log(`🧪 Test endpoint: http://localhost:${port}/test`);
  console.log(`📄 JSON spec: http://localhost:${port}/api-docs.json`);
  console.log(`📋 YAML spec: http://localhost:${port}/api-docs.yaml`);
});
