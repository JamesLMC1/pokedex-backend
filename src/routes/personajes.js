const { Router } = require('express');
const supabase = require('../supabase');
const requireAuth = require('../middleware/auth');
const { uploadBase64 } = require('../utils/upload');

async function getPersonajeByNombre(nombre, animeSlug) {
  const { data: anime, error: animeError } = await supabase
    .from('animes')
    .select('id')
    .eq('slug', animeSlug)
    .single();

  if (animeError || !anime) return null;

  const { data: personajes, error: personajeError } = await supabase
    .from('personajes')
    .select('id, nombre, descripcion, habilidades, anime_id')
    .eq('anime_id', anime.id)
    .ilike('nombre', `%${nombre}%`)
    .limit(1);

  if (personajeError || !personajes || personajes.length === 0) return null;

  const personaje = personajes[0];

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

const legacyRouter = Router();

/**
 * @openapi
 * /api/{anime}:
 *   get:
 *     tags:
 *       - Personajes (consulta pública)
 *     summary: Obtener personajes por slug del anime
 *     description: Obtiene todos los personajes de un anime usando su slug (nombre en URL).
 *     parameters:
 *       - in: path
 *         name: anime
 *         required: true
 *         schema:
 *           type: string
 *         description: 'Slug del anime (ej: saint-seiya)'
 *         example: saint-seiya
 *     responses:
 *       200:
 *         description: Lista de personajes del anime
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Personaje'
 *       404:
 *         description: Anime no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
legacyRouter.get('/:anime', async (req, res) => {
  const { anime } = req.params;

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

/**
 * @openapi
 * /api/{anime}/{nombre}:
 *   get:
 *     tags:
 *       - Personajes (consulta pública)
 *     summary: Buscar un personaje por nombre dentro de un anime
 *     description: Busca un personaje por su nombre (búsqueda parcial) dentro de un anime específico.
 *     parameters:
 *       - in: path
 *         name: anime
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug del anime
 *         example: saint-seiya
 *       - in: path
 *         name: nombre
 *         required: true
 *         schema:
 *           type: string
 *         description: Nombre del personaje (búsqueda parcial)
 *         example: Seiya
 *     responses:
 *       200:
 *         description: Personaje encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Personaje'
 *       404:
 *         description: Personaje no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
legacyRouter.get('/:anime/:nombre', async (req, res) => {
  const { anime, nombre } = req.params;

  const personaje = await getPersonajeByNombre(nombre, anime);

  if (!personaje) {
    return res.status(404).json({ error: 'Personaje no encontrado' });
  }

  res.json(personaje);
});

const crudRouter = Router();

/**
 * @openapi
 * /api/personajes/{id}:
 *   put:
 *     tags:
 *       - Personajes
 *     summary: Actualizar un personaje
 *     description: Actualiza los datos de un personaje existente. Requiere autenticación.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del personaje
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: Seiya (Actualizado)
 *               descripcion:
 *                 type: string
 *                 example: Nueva descripción
 *               habilidades:
 *                 type: string
 *                 example: Nueva habilidad
 *               imagenes:
 *                 type: array
 *                 items:
 *                   type: string
 *                   description: URL existente o nueva imagen en base64
 *     responses:
 *       200:
 *         description: Personaje actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Personaje'
 *       401:
 *         description: No autorizado
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
crudRouter.put('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, habilidades, imagenes } = req.body;

  const updates = {};
  if (nombre !== undefined) updates.nombre = nombre;
  if (descripcion !== undefined) updates.descripcion = descripcion;
  if (habilidades !== undefined) updates.habilidades = habilidades;

  const { data: personaje, error: updateError } = await supabase
    .from('personajes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (updateError) return res.status(500).json({ error: updateError.message });
  if (!personaje) return res.status(404).json({ error: 'Personaje no encontrado' });

  if (imagenes && Array.isArray(imagenes)) {
    await supabase.from('personaje_imagenes').delete().eq('personaje_id', id);

    for (let i = 0; i < imagenes.length; i++) {
      let url = imagenes[i];
      if (!url.startsWith('http')) {
        try {
          url = await uploadBase64(url, `personajes/update/${id}`);
        } catch (err) {
          console.error('Error subiendo imagen:', err.message);
          continue;
        }
      }
      await supabase.from('personaje_imagenes').insert({
        personaje_id: parseInt(id),
        url,
        orden: i,
      });
    }
  }

  const { data: imagenesData } = await supabase
    .from('personaje_imagenes')
    .select('url')
    .eq('personaje_id', id)
    .order('orden');

  const { data: animeData } = await supabase
    .from('animes')
    .select('slug')
    .eq('id', personaje.anime_id)
    .single();

  res.json({
    ...personaje,
    anime: animeData?.slug || '',
    imagenes: imagenesData ? imagenesData.map(img => img.url) : [],
  });
});

/**
 * @openapi
 * /api/personajes/{id}:
 *   delete:
 *     tags:
 *       - Personajes
 *     summary: Eliminar un personaje
 *     description: Elimina un personaje y sus imágenes asociadas. Requiere autenticación.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del personaje
 *         example: 1
 *     responses:
 *       200:
 *         description: Personaje eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Personaje eliminado exitosamente
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
crudRouter.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  await supabase.from('personaje_imagenes').delete().eq('personaje_id', id);

  const { error } = await supabase
    .from('personajes')
    .delete()
    .eq('id', id);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ message: 'Personaje eliminado exitosamente' });
});

module.exports = { legacyRouter, crudRouter };
