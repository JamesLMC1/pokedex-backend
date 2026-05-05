require('dotenv').config();
console.log('URL:', process.env.SUPABASE_URL);
console.log('KEY:', process.env.SUPABASE_KEY?.slice(0, 20) + '...');

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Anime Characters API',
      version: '1.0.0',
      description: 'API REST para consultar información de personajes de anime almacenada en Supabase.',
    },
    servers: [
      {
        url: process.env.SERVER_URL || 'http://localhost:3000',
        description: 'Servidor',
      },
    ],
    components: {
      schemas: {
        Personaje: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            nombre: { type: 'string', example: 'Seiya' },
            descripcion: { type: 'string', example: 'Caballero de Pegaso' },
            habilidades: { type: 'string', example: 'Meteoros de Pegaso' },
            anime: { type: 'string', example: 'Saint Seiya' },
            imagenes: { type: 'array', items: { type: 'string' }, example: ['url1', 'url2', 'url3', 'url4'] },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Personaje no encontrado' },
          },
        },
      },
    },
  },
  apis: [__filename],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const fs = require('fs');
const path = require('path');
fs.writeFileSync(
  path.join(__dirname, 'openapi.json'),
  JSON.stringify(swaggerSpec, null, 2)
);

const ANIMES = ['saint-seiya', 'hunter-x-hunter', 'one-piece'];

async function getPersonajeByNombre(nombre, animeSlug) {
  const { data: anime, error: animeError } = await supabase
    .from('animes')
    .select('id')
    .eq('slug', animeSlug)
    .single();

  console.log('ANIME:', anime, 'ERROR:', animeError);

  if (animeError || !anime) return null;

  const { data: personajes, error: personajeError } = await supabase
    .from('personajes')
    .select('id, nombre, descripcion, habilidades, anime_id')
    .eq('anime_id', anime.id)
    .ilike('nombre', `%${nombre}%`)
    .limit(1);  // ← reemplaza .single()

  console.log('PERSONAJES:', personajes, 'ERROR:', personajeError); 

  if (personajeError || !personajes || personajes.length === 0) return null;

  const personaje = personajes[0];  // ← toma el primero

  const { data: imagenes, error: imgError } = await supabase
    .from('personaje_imagenes')
    .select('url')
    .eq('personaje_id', personaje.id)
    .order('orden');

  return {
    id: personaje.id,
    nombre: personaje.nombre,
    descripcion: personaje.descripcion,
    habilidades: personaje.habilidades,
    anime: animeSlug,
    imagenes: imgError ? [] : imagenes.map(img => img.url),
  };
}

/**
 * @openapi
 * /api/{anime}/{nombre}:
 *   get:
 *     summary: Obtener personaje por nombre
 *     description: Busca un personaje por nombre (búsqueda parcial e insensible a mayúsculas) dentro de un anime específico
 *     tags: [Personajes]
 *     parameters:
 *       - name: anime
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           enum: [saint-seiya, hunter-x-hunter, one-piece]
 *         description: Slug del anime
 *       - name: nombre
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Nombre del personaje (búsqueda parcial)
 *     responses:
 *       200:
 *         description: Personaje encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Personaje'
 *       400:
 *         description: Anime no válido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Personaje no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/api/:anime/:nombre', async (req, res) => {
  const { anime, nombre } = req.params;

  if (!ANIMES.includes(anime)) {
    return res.status(400).json({ error: 'Anime no válido. Usa: saint-seiya, hunter-x-hunter, one-piece' });
  }

  const personaje = await getPersonajeByNombre(nombre, anime);

  if (!personaje) {
    return res.status(404).json({ error: 'Personaje no encontrado' });
  }

  res.json(personaje);
});

/**
 * @openapi
 * /api/{anime}:
 *   get:
 *     summary: Obtener todos los personajes de un anime
 *     description: Retorna la lista completa de personajes de un anime específico
 *     tags: [Personajes]
 *     parameters:
 *       - name: anime
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           enum: [saint-seiya, hunter-x-hunter, one-piece]
 *         description: Slug del anime
 *     responses:
 *       200:
 *         description: Lista de personajes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Personaje'
 *       400:
 *         description: Anime no válido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Anime no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/api/:anime', async (req, res) => {
  const { anime } = req.params;

  if (!ANIMES.includes(anime)) {
    return res.status(400).json({ error: 'Anime no válido. Usa: saint-seiya, hunter-x-hunter, one-piece' });
  }

  const { data: animeData, error: animeError } = await supabase
    .from('animes')
    .select('id')
    .eq('slug', anime)
    .single();

  if (animeError || !animeData) {
    return res.status(404).json({ error: 'Anime no encontrado' });
  }

  const { data: personajes, error } = await supabase
    .from('personajes')
    .select('id, nombre, descripcion, habilidades')
    .eq('anime_id', animeData.id)
    .order('id');

  if (error) return res.status(500).json({ error: error.message });

  const result = [];
  for (const p of personajes) {
    const { data: imagenes } = await supabase
      .from('personaje_imagenes')
      .select('url')
      .eq('personaje_id', p.id)
      .order('orden');

    result.push({
      ...p,
      anime,
      imagenes: imagenes ? imagenes.map(img => img.url) : [],
    });
  }

  res.json(result);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Documentacion en http://localhost:${PORT}/api/docs`);
  console.log(`Endpoints:`);
  console.log(`   GET http://localhost:${PORT}/api/saint-seiya`);
  console.log(`   GET http://localhost:${PORT}/api/saint-seiya/:nombre`);
  console.log(`   GET http://localhost:${PORT}/api/hunter-x-hunter`);
  console.log(`   GET http://localhost:${PORT}/api/hunter-x-hunter/:nombre`);
  console.log(`   GET http://localhost:${PORT}/api/one-piece`);
  console.log(`   GET http://localhost:${PORT}/api/one-piece/:nombre`);
});
