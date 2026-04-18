-- =============================================
-- POKEDEX — Crear tablas e insertar datos
-- Para ejecutar en Supabase SQL Editor
-- =============================================

-- ----------------------
-- TABLA: tipos
-- ----------------------
CREATE TABLE IF NOT EXISTS tipos (
  id     SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE
);

-- ----------------------
-- TABLA: pokemon
-- ----------------------
CREATE TABLE IF NOT EXISTS pokemon (
  id               INT PRIMARY KEY,
  nombre           VARCHAR(100) NOT NULL,
  altura           DECIMAL(5,1) NOT NULL,
  peso             DECIMAL(7,1) NOT NULL,
  imagen_frontal   VARCHAR(255),
  imagen_posterior VARCHAR(255),
  imagen_shiny     VARCHAR(255),
  creado_en        TIMESTAMP DEFAULT NOW()
);

-- ----------------------
-- TABLA: pokemon_tipos
-- ----------------------
CREATE TABLE IF NOT EXISTS pokemon_tipos (
  pokemon_id INT NOT NULL REFERENCES pokemon(id) ON DELETE CASCADE,
  tipo_id    INT NOT NULL REFERENCES tipos(id)   ON DELETE CASCADE,
  slot       SMALLINT NOT NULL DEFAULT 1,
  PRIMARY KEY (pokemon_id, tipo_id)
);

-- =============================================
-- INSERTAR TIPOS
-- =============================================
INSERT INTO tipos (nombre) VALUES
  ('grass'), ('poison'), ('fire'), ('flying'),
  ('water'), ('electric'), ('normal'), ('ghost'),
  ('ice'), ('dragon')
ON CONFLICT DO NOTHING;

-- =============================================
-- INSERTAR 10 POKÉMON
-- =============================================
INSERT INTO pokemon (id, nombre, altura, peso, imagen_frontal, imagen_posterior, imagen_shiny) VALUES
(1,   'bulbasaur',  7,    69,
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png',
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/1.png',
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/1.png'),
(4,   'charmander', 6,    85,
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png',
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/4.png',
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/4.png'),
(7,   'squirtle',   5,    90,
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png',
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/7.png',
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/7.png'),
(25,  'pikachu',    4,    60,
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/25.png',
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/25.png'),
(39,  'jigglypuff', 5,    55,
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/39.png',
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/39.png',
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/39.png'),
(94,  'gengar',     15,   405,
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/94.png',
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/94.png',
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/94.png'),
(131, 'lapras',     25,   2200,
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/131.png',
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/131.png',
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/131.png'),
(133, 'eevee',      3,    65,
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/133.png',
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/133.png',
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/133.png'),
(143, 'snorlax',    21,   4600,
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/143.png',
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/143.png',
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/143.png'),
(149, 'dragonite',  22,   2100,
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/149.png',
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/149.png',
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/149.png')
ON CONFLICT DO NOTHING;

-- =============================================
-- INSERTAR RELACIONES POKEMON ↔ TIPOS
-- =============================================

-- Bulbasaur: grass, poison
INSERT INTO pokemon_tipos (pokemon_id, tipo_id, slot)
  SELECT 1, id, 1 FROM tipos WHERE nombre = 'grass' ON CONFLICT DO NOTHING;
INSERT INTO pokemon_tipos (pokemon_id, tipo_id, slot)
  SELECT 1, id, 2 FROM tipos WHERE nombre = 'poison' ON CONFLICT DO NOTHING;

-- Charmander: fire
INSERT INTO pokemon_tipos (pokemon_id, tipo_id, slot)
  SELECT 4, id, 1 FROM tipos WHERE nombre = 'fire' ON CONFLICT DO NOTHING;

-- Squirtle: water
INSERT INTO pokemon_tipos (pokemon_id, tipo_id, slot)
  SELECT 7, id, 1 FROM tipos WHERE nombre = 'water' ON CONFLICT DO NOTHING;

-- Pikachu: electric
INSERT INTO pokemon_tipos (pokemon_id, tipo_id, slot)
  SELECT 25, id, 1 FROM tipos WHERE nombre = 'electric' ON CONFLICT DO NOTHING;

-- Jigglypuff: normal, flying
INSERT INTO pokemon_tipos (pokemon_id, tipo_id, slot)
  SELECT 39, id, 1 FROM tipos WHERE nombre = 'normal' ON CONFLICT DO NOTHING;
INSERT INTO pokemon_tipos (pokemon_id, tipo_id, slot)
  SELECT 39, id, 2 FROM tipos WHERE nombre = 'flying' ON CONFLICT DO NOTHING;

-- Gengar: ghost, poison
INSERT INTO pokemon_tipos (pokemon_id, tipo_id, slot)
  SELECT 94, id, 1 FROM tipos WHERE nombre = 'ghost' ON CONFLICT DO NOTHING;
INSERT INTO pokemon_tipos (pokemon_id, tipo_id, slot)
  SELECT 94, id, 2 FROM tipos WHERE nombre = 'poison' ON CONFLICT DO NOTHING;

-- Lapras: water, ice
INSERT INTO pokemon_tipos (pokemon_id, tipo_id, slot)
  SELECT 131, id, 1 FROM tipos WHERE nombre = 'water' ON CONFLICT DO NOTHING;
INSERT INTO pokemon_tipos (pokemon_id, tipo_id, slot)
  SELECT 131, id, 2 FROM tipos WHERE nombre = 'ice' ON CONFLICT DO NOTHING;

-- Eevee: normal
INSERT INTO pokemon_tipos (pokemon_id, tipo_id, slot)
  SELECT 133, id, 1 FROM tipos WHERE nombre = 'normal' ON CONFLICT DO NOTHING;

-- Snorlax: normal
INSERT INTO pokemon_tipos (pokemon_id, tipo_id, slot)
  SELECT 143, id, 1 FROM tipos WHERE nombre = 'normal' ON CONFLICT DO NOTHING;

-- Dragonite: dragon, flying
INSERT INTO pokemon_tipos (pokemon_id, tipo_id, slot)
  SELECT 149, id, 1 FROM tipos WHERE nombre = 'dragon' ON CONFLICT DO NOTHING;
INSERT INTO pokemon_tipos (pokemon_id, tipo_id, slot)
  SELECT 149, id, 2 FROM tipos WHERE nombre = 'flying' ON CONFLICT DO NOTHING;

-- =============================================
-- POLÍTICAS DE ACCESO PÚBLICO (RLS)
-- =============================================
ALTER TABLE pokemon       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE pokemon_tipos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON pokemon       FOR SELECT USING (true);
CREATE POLICY "public read" ON tipos         FOR SELECT USING (true);
CREATE POLICY "public read" ON pokemon_tipos FOR SELECT USING (true);

-- =============================================
-- VERIFICAR
-- =============================================
SELECT
  p.id,
  p.nombre,
  p.altura,
  p.peso,
  STRING_AGG(t.nombre, ', ' ORDER BY pt.slot) AS tipos
FROM pokemon p
LEFT JOIN pokemon_tipos pt ON p.id = pt.pokemon_id
LEFT JOIN tipos t ON pt.tipo_id = t.id
GROUP BY p.id, p.nombre, p.altura, p.peso
ORDER BY p.id;