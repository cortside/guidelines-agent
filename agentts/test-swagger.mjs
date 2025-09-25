import express from 'express';

// Simple test without swagger first to verify basic functionality
const app = express();
const port = 3000;

console.log('Starting basic test server...');

// Simple test endpoint first
app.get('/test', (req, res) => {
  res.json({ 
    message: 'API Documentation test endpoint working!',
    timestamp: new Date().toISOString(),
    status: 'Basic server functionality confirmed'
  });
});

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`✅ Basic test server running on port ${port}`);
  console.log(`🧪 Test endpoint: http://localhost:${port}/test`);
  console.log(`� Health endpoint: http://localhost:${port}/health`);
  console.log('');
  console.log('This confirms our basic setup is working.');
  console.log('For full API with Swagger docs, run the main application.');
});
