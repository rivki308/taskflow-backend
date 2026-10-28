import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { openApiDocument } from './docs/openapi';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { apiRoutes } from './routes';

export function createApp() {
  const app = express();

  // Render (and most clouds) put a proxy in front of the app — needed for correct client IPs in rate limiting.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // Security headers. "upgrade-insecure-requests" is turned off so Swagger UI also works on http://localhost.
  app.use(helmet({ contentSecurityPolicy: { directives: { upgradeInsecureRequests: null } } }));

  // CORS: only the React client origins listed in CORS_ORIGINS may call the API from a browser.
  const allowAll = env.corsOrigins.includes('*');
  app.use(
    cors({
      origin: (origin, callback) => {
        // Requests without Origin (Swagger on the same server, curl, Postman) are allowed.
        if (!origin || allowAll || env.corsOrigins.includes(origin)) return callback(null, true);
        return callback(null, false);
      },
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 600,
    }),
  );

  // Limit request body size
  app.use(express.json({ limit: '100kb' }));

  // Swagger UI + raw OpenAPI file
  app.get('/api-docs.json', (_req, res) => {
    res.json(openApiDocument);
  });
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      customSiteTitle: 'TaskFlow Pro API',
      swaggerOptions: { persistAuthorization: true, displayRequestDuration: true, validatorUrl: null },
    }),
  );

  app.get('/', (_req, res) => {
    res.redirect('/api-docs');
  });

  app.use('/api', apiRoutes);
  app.use('/api', notFoundHandler);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
