require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();
app.use(cors());
app.use(express.json());

// =============================================
// SUPABASE
// =============================================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// =============================================
// SWAGGER - CONFIGURACIÓN
// =============================================
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Pokédex API',
      version: '1.0.0',
      description: 'API REST para consultar información de Pokémon almacenada en Supabase.',
    },
    servers: [
        {
            url: process.env.SERVER_URL || 'http://localhost:3000',
            description: 'Servidor',
        },
    ],
    components: {
      schemas: {
        Pokemon: {
          type: 'object',
          properties: {
            id:               { type: 'integer', example: 25 },
            nombre:           { type: 'string',  example: 'pikachu' },
            altura:           { type: 'number',  example: 4,  description: 'En decímetros' },
            peso:             { type: 'number',  example: 60, description: 'En hectogramos' },
            imagen_frontal:   { type: 'string',  example: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png' },
            imagen_posterior: { type: 'string',  example: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/25.png' },
            imagen_shiny:     { type: 'string',  example: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/25.png' },
            tipos:            { type: 'array', items: { type: 'string' }, example: ['electric'] },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Pokémon no encontrado' },
          },
        },
      },
    },
  },
  apis: ['./index.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// =============================================
// RUTAS
// =============================================

/**
 * @swagger
 * /api/pokemon:
 *   get:
 *     summary: Obtener todos los Pokémon
 *     description: Retorna la lista completa de los 10 Pokémon con sus tipos e imágenes.
 *     tags:
 *       - Pokemon
 *     responses:
 *       200:
 *         description: Lista de Pokémon obtenida correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Pokemon'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/api/pokemon', async (req, res) => {
  const { data, error } = await supabase
    .from('pokemon')
    .select(`
      id, nombre, altura, peso,
      imagen_frontal, imagen_posterior, imagen_shiny,
      pokemon_tipos ( slot, tipos ( nombre ) )
    `)
    .order('id');

  if (error) return res.status(500).json({ error: error.message });

  const result = data.map(p => ({
    ...p,
    tipos: p.pokemon_tipos
      .sort((a, b) => a.slot - b.slot)
      .map(pt => pt.tipos.nombre),
    pokemon_tipos: undefined,
  }));

  res.json(result);
});

/**
 * @swagger
 * /api/pokemon/{nombre}:
 *   get:
 *     summary: Obtener un Pokémon por nombre
 *     description: Retorna la información detallada de un Pokémon buscado por su nombre.
 *     tags:
 *       - Pokemon
 *     parameters:
 *       - in: path
 *         name: nombre
 *         required: true
 *         schema:
 *           type: string
 *         description: Nombre del Pokémon en minúsculas
 *         example: pikachu
 *     responses:
 *       200:
 *         description: Pokémon encontrado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Pokemon'
 *       404:
 *         description: Pokémon no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/api/pokemon/:nombre', async (req, res) => {
  const { data, error } = await supabase
    .from('pokemon')
    .select(`
      id, nombre, altura, peso,
      imagen_frontal, imagen_posterior, imagen_shiny,
      pokemon_tipos ( slot, tipos ( nombre ) )
    `)
    .eq('nombre', req.params.nombre.toLowerCase())
    .single();

  if (error) return res.status(404).json({ error: 'Pokémon no encontrado' });

  const result = {
    ...data,
    tipos: data.pokemon_tipos
      .sort((a, b) => a.slot - b.slot)
      .map(pt => pt.tipos.nombre),
    pokemon_tipos: undefined,
  };

  res.json(result);
});

// =============================================
// INICIAR SERVIDOR
// =============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📚 Documentación en  http://localhost:${PORT}/api/docs`);
  console.log(`📡 Endpoints:`);
  console.log(`   GET http://localhost:${PORT}/api/pokemon`);
  console.log(`   GET http://localhost:${PORT}/api/pokemon/:nombre`);
});