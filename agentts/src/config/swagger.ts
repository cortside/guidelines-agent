import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Express } from 'express';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Swagger/OpenAPI configuration options
 */
const swaggerOptions: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Guidelines Agent API',
      version: '1.0.0',
      description: 'A TypeScript-based API that wraps a LangGraph agent for processing documents and providing intelligent responses based on the Cortside Guidelines repository.',
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 8002}`,
        description: 'Development server',
      },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './openapi.yaml',
  ],
};

/**
 * Load OpenAPI specification from YAML file
 */
function loadOpenApiSpec() {
  try {
    // Go up two levels from src/config/ to reach the root where openapi.yaml is
    const yamlPath = path.join(__dirname, '..', '..', 'openapi.yaml');
    console.log('Loading OpenAPI spec from:', yamlPath);
    return YAML.load(yamlPath);
  } catch (error) {
    console.warn('Could not load openapi.yaml, falling back to JSDoc specs:', error);
    return swaggerJSDoc(swaggerOptions);
  }
}

/**
 * Swagger UI options for customization
 */
const swaggerUiOptions: swaggerUi.SwaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #2c3e50 }
    .swagger-ui .scheme-container { background: #f8f9fa; padding: 10px; border-radius: 4px; }
  `,
  customSiteTitle: 'Guidelines Agent API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
  },
};

/**
 * Set up Swagger documentation middleware
 */
export function setupSwagger(app: Express): void {
  try {
    // Load OpenAPI specification
    const specs = loadOpenApiSpec();
    
    // Add JSON endpoint for the OpenAPI spec
    app.get('/api-docs.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(specs);
    });
    
    // Add YAML endpoint for the OpenAPI spec
    app.get('/api-docs.yaml', (req, res) => {
      res.setHeader('Content-Type', 'text/yaml');
      res.send(YAML.stringify(specs, 4));
    });
    
    // Serve Swagger UI
    app.use('/api-docs', swaggerUi.serve);
    app.get('/api-docs', swaggerUi.setup(specs, swaggerUiOptions));
    
    // Alternative path for API documentation
    app.use('/docs', swaggerUi.serve);
    app.get('/docs', swaggerUi.setup(specs, swaggerUiOptions));
    
    console.log('✅ Swagger documentation available at:');
    console.log(`   • Interactive UI: http://localhost:${process.env.PORT || 8002}/api-docs`);
    console.log(`   • Alternative UI: http://localhost:${process.env.PORT || 8002}/docs`);
    console.log(`   • JSON spec: http://localhost:${process.env.PORT || 8002}/api-docs.json`);
    console.log(`   • YAML spec: http://localhost:${process.env.PORT || 8002}/api-docs.yaml`);
    
  } catch (error) {
    console.error('❌ Failed to set up Swagger documentation:', error);
    console.error('API will continue to function, but documentation will not be available');
  }
}

/**
 * Generate OpenAPI specification programmatically
 * Useful for testing or programmatic access
 */
export function getOpenApiSpec(): object {
  return loadOpenApiSpec();
}

export default {
  setupSwagger,
  getOpenApiSpec,
};
