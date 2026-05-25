const swaggerJsdoc = require("swagger-jsdoc");
const path = require("path");

const port = process.env.PORT || 5000;
const serverUrl = process.env.API_BASE_URL || `http://localhost:${port}`;

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Hotel Management API",
      version: "1.0.0",
      description: "API documentation for the Hotel Management backend.",
    },
    servers: [
      {
        url: serverUrl,
        description: "Current API server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: [path.join(__dirname, "../routes/**/*.js")],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

module.exports = swaggerSpec;
