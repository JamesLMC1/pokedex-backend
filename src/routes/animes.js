const { Router } = require('express');
const supabase = require('../supabase');
const requireAuth = require('../middleware/auth');
const { uploadBase64 } = require('../utils/upload');

const router = Router();

/**
 * @openapi
 * /api/animes:
 *   get:
 *     tags:
 *       - Animes
 *     summary: Listar todos los animes
 *     description: Obtiene una lista de todos los animes registrados.
 *     responses:
 *       200:
 *         description: Lista de animes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Anime'
 *       500:
 *         description: Error del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('animes')
    .select('*')
    .order('id');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/**
 * @openapi
 * /api/animes/{id}:
 *   get:
 *     tags:
 *       - Animes
 *     summary: Obtener un anime por ID
 *     description: Obtiene los detalles de un anime junto con sus personajes e imágenes.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del anime
 *         example: 1
 *     responses:
 *       200:
 *         description: Anime encontrado
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Anime'
 *                 - type: object
 *                   properties:
 *                     personajes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           nombre:
 *                             type: string
 *                           descripcion:
 *                             type: string
 *                           habilidades:
 *                             type: string
 *                           imagenes:
 *                             type: array
 *                             items:
 *                               type: string
 *       404:
 *         description: Anime no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  const { data: anime, error: animeError } = await supabase
    .from('animes')
    .select('*')
    .eq('id', id)
    .single();

  if (animeError || !anime) {
    return res.status(404).json({ error: 'Anime no encontrado' });
  }

  const { data: personajes, error: personajesError } = await supabase
    .from('personajes')
    .select('id, nombre, descripcion, habilidades')
    .eq('anime_id', id)
    .order('id');

  if (personajesError) {
    return res.status(500).json({ error: personajesError.message });
  }

  const result = [];
  for (const p of personajes) {
    const { data: imagenes } = await supabase
      .from('personaje_imagenes')
      .select('url')
      .eq('personaje_id', p.id)
      .order('orden');

    result.push({
      ...p,
      imagenes: imagenes ? imagenes.map(img => img.url) : [],
    });
  }

  res.json({ ...anime, personajes: result });
});

/**
 * @openapi
 * /api/animes:
 *   post:
 *     tags:
 *       - Animes
 *     summary: Crear un nuevo anime
 *     description: Crea un nuevo anime. Requiere autenticación. Las imágenes se envían como base64.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: Saint Seiya
 *               descripcion:
 *                 type: string
 *                 example: Caballeros del Zodiaco
 *               imagenes:
 *                 type: array
 *                 items:
 *                   type: string
 *                   description: Imagen en formato base64 o URL
 *                   example: data:image/png;base64,iVBORw0KGgo...
 *     responses:
 *       201:
 *         description: Anime creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Anime'
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', requireAuth, async (req, res) => {
  const { nombre, descripcion, imagenes } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'El nombre del anime es requerido' });
  }

  const slug = nombre
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '-');

  let imageUrls = [];

  if (imagenes && Array.isArray(imagenes)) {
    for (const img of imagenes) {
      try {
        const url = await uploadBase64(img, `animes/${slug}`);
        imageUrls.push(url);
      } catch (err) {
        console.error('Error subiendo imagen:', err.message);
      }
    }
  }

  const { data, error } = await supabase
    .from('animes')
    .insert({
      nombre,
      descripcion: descripcion || '',
      slug,
      imagenes: imageUrls,
      user_id: req.user.id,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.status(201).json(data);
});

/**
 * @openapi
 * /api/animes/{id}:
 *   put:
 *     tags:
 *       - Animes
 *     summary: Actualizar un anime
 *     description: Actualiza los datos de un anime existente. Requiere autenticación.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del anime
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
 *                 example: Saint Seiya (Actualizado)
 *               descripcion:
 *                 type: string
 *                 example: Nueva descripción
 *               imagenes:
 *                 type: array
 *                 items:
 *                   type: string
 *                   description: URL existente o nueva imagen en base64
 *     responses:
 *       200:
 *         description: Anime actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Anime'
 *       401:
 *         description: No autorizado
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
 */
router.put('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, imagenes } = req.body;

  const updates = {};
  if (nombre) {
    updates.nombre = nombre;
    updates.slug = nombre
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '-');
  }
  if (descripcion !== undefined) updates.descripcion = descripcion;

  if (imagenes && Array.isArray(imagenes)) {
    const imageUrls = [];
    for (const img of imagenes) {
      if (img.startsWith('http')) {
        imageUrls.push(img);
      } else {
        try {
          const url = await uploadBase64(img, `animes/${updates.slug || nombre}`);
          imageUrls.push(url);
        } catch (err) {
          console.error('Error subiendo imagen:', err.message);
        }
      }
    }
    updates.imagenes = imageUrls;
  }

  const { data, error } = await supabase
    .from('animes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Anime no encontrado' });

  res.json(data);
});

/**
 * @openapi
 * /api/animes/{id}:
 *   delete:
 *     tags:
 *       - Animes
 *     summary: Eliminar un anime
 *     description: Elimina un anime y todos sus personajes e imágenes asociados. Requiere autenticación.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del anime
 *         example: 1
 *     responses:
 *       200:
 *         description: Anime eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Anime eliminado exitosamente
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  const { data: personajes } = await supabase
    .from('personajes')
    .select('id')
    .eq('anime_id', id);

  if (personajes) {
    for (const p of personajes) {
      await supabase
        .from('personaje_imagenes')
        .delete()
        .eq('personaje_id', p.id);
    }

    await supabase
      .from('personajes')
      .delete()
      .eq('anime_id', id);
  }

  const { error } = await supabase
    .from('animes')
    .delete()
    .eq('id', id);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ message: 'Anime eliminado exitosamente' });
});

/**
 * @openapi
 * /api/animes/{id}/personajes:
 *   post:
 *     tags:
 *       - Personajes
 *     summary: Crear un personaje en un anime
 *     description: Crea un nuevo personaje asociado a un anime. Requiere autenticación.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del anime
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: Seiya
 *               descripcion:
 *                 type: string
 *                 example: Caballero de Pegaso
 *               habilidades:
 *                 type: string
 *                 example: Meteoros de Pegaso
 *               imagenes:
 *                 type: array
 *                 items:
 *                   type: string
 *                   description: Imagen en base64
 *     responses:
 *       201:
 *         description: Personaje creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Personaje'
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: No autorizado
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
 */
router.post('/:id/personajes', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, habilidades, imagenes } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'El nombre del personaje es requerido' });
  }

  const { data: anime, error: animeError } = await supabase
    .from('animes')
    .select('id, slug')
    .eq('id', id)
    .single();

  if (animeError || !anime) {
    return res.status(404).json({ error: 'Anime no encontrado' });
  }

  const { data: personaje, error: personajeError } = await supabase
    .from('personajes')
    .insert({
      anime_id: parseInt(id),
      nombre,
      descripcion: descripcion || '',
      habilidades: habilidades || '',
    })
    .select()
    .single();

  if (personajeError) return res.status(500).json({ error: personajeError.message });

  if (imagenes && Array.isArray(imagenes)) {
    for (let i = 0; i < imagenes.length; i++) {
      try {
        const url = await uploadBase64(
          imagenes[i],
          `personajes/${anime.slug}/${personaje.id}`
        );
        await supabase.from('personaje_imagenes').insert({
          personaje_id: personaje.id,
          url,
          orden: i,
        });
      } catch (err) {
        console.error('Error subiendo imagen:', err.message);
      }
    }
  }

  const { data: imagenesData } = await supabase
    .from('personaje_imagenes')
    .select('url')
    .eq('personaje_id', personaje.id)
    .order('orden');

  res.status(201).json({
    ...personaje,
    anime: anime.slug,
    imagenes: imagenesData ? imagenesData.map(img => img.url) : [],
  });
});

module.exports = router;
