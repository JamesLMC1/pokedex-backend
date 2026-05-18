require('dotenv').config();

const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const fs = require('fs');
const path = require('path');

const authRoutes = require('./src/routes/auth');
const animeRoutes = require('./src/routes/animes');
const { legacyRouter, crudRouter } = require('./src/routes/personajes');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Anime Characters API',
      version: '2.0.0',
      description:
        'API REST para gestionar animes y personajes con autenticación mediante Supabase.',
    },
    servers: [
      {
        url: process.env.SERVER_URL || 'http://localhost:3000',
        description: 'Servidor',
      },
    ],
    tags: [
      { name: 'Auth', description: 'Autenticación de usuarios' },
      { name: 'Animes', description: 'CRUD de animes' },
      { name: 'Personajes', description: 'CRUD de personajes (requiere autenticación)' },
      { name: 'Personajes (consulta pública)', description: 'Consultas públicas de personajes por slug' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token de autenticación de Supabase. Se obtiene al iniciar sesión en /api/auth/login.',
        },
      },
      schemas: {
        Anime: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            nombre: { type: 'string', example: 'Saint Seiya' },
            descripcion: { type: 'string', example: 'Caballeros del Zodiaco' },
            slug: { type: 'string', example: 'saint-seiya' },
            imagenes: {
              type: 'array',
              items: { type: 'string' },
              example: ['https://...'],
            },
            user_id: { type: 'string', example: 'uuid' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        Personaje: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            nombre: { type: 'string', example: 'Seiya' },
            descripcion: { type: 'string', example: 'Caballero de Pegaso' },
            habilidades: { type: 'string', example: 'Meteoros de Pegaso' },
            anime: { type: 'string', example: 'saint-seiya' },
            imagenes: {
              type: 'array',
              items: { type: 'string' },
              example: ['url1', 'url2'],
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'No encontrado' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            user: { type: 'object' },
            session: { type: 'object' },
          },
        },
      },
    },
  },
  apis: [__filename, './src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

fs.writeFileSync(
  path.join(__dirname, 'openapi.json'),
  JSON.stringify(swaggerSpec, null, 2)
);

app.use('/api/auth', authRoutes);
app.use('/api/animes', animeRoutes);
app.use('/api/personajes', crudRouter);
app.use('/api', legacyRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Documentación en http://localhost:${PORT}/api/docs`);
  console.log('\nEndpoints disponibles:');
  console.log('  Auth:');
  console.log('    POST /api/auth/register');
  console.log('    POST /api/auth/login');
  console.log('  Animes (CRUD):');
  console.log('    GET    /api/animes');
  console.log('    GET    /api/animes/:id');
  console.log('    POST   /api/animes');
  console.log('    PUT    /api/animes/:id');
  console.log('    DELETE /api/animes/:id');
  console.log('  Personajes por anime:');
  console.log('    POST   /api/animes/:id/personajes');
  console.log('    PUT    /api/personajes/:id');
  console.log('    DELETE /api/personajes/:id');
  console.log('  Legacy (consulta pública por slug):');
  console.log('    GET /api/:anime');
  console.log('    GET /api/:anime/:nombre');
});
