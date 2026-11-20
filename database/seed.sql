-- ============================================================================
-- FERNET & COLOCHO — DATOS INICIALES (SEED)
-- Contraseñas en texto plano (para documentación en README):
--   admin      -> Admin123!
--   vendedor   -> Vendedor123!
--   comprador  -> Comprador123!
--   samuel_sec -> Samuel123!
--   colocho_ux -> Colocho123!
-- ============================================================================

-- 1. CATEGORÍAS (Typo de categoría 5 corregido)
INSERT INTO categories (id, name, slug, description) VALUES
(1, 'RPG y Acción', 'rpg-accion', 'Mundos épicos, combate intenso y progresión de personaje.'),
(2, 'Shooter y Cooperativo', 'shooter-coop', 'Acción táctica y supervivencia multijugador.'),
(3, 'Terror y Supervivencia', 'terror', 'Experiencias de tensión psicológica y horror.'),
(4, 'Lucha y Arcade', 'lucha-arcade', 'Combates competitivos, plataformas y acción rápida.'),
(5, 'Estrategia y Deportes', 'estrategia-deportes', 'Simulación deportiva, gestión táctica e imperios.');

-- 2. USUARIOS DE PRUEBA (SHA-256 en minúsculas, idéntico a Node.js crypto)
INSERT INTO users (id, full_name, username, email, password_hash, role, is_active, created_at) VALUES
(1, 'Administrador General', 'admin', 'admin@fernetcolocho.sv',
 '3b612c75a7b5048a435fb6ec81e52ff92d6d795a8b5a9c17070f6a63c97a53b2', 'admin', TRUE, '2026-11-01 08:00:00'),
(2, 'Julio Flores (Seller Oficial)', 'vendedor', 'vendedor@fernetcolocho.sv',
 '5539e66d04629a578459c3963c13302402406657c910a916b17253a3d8d18523', 'vendedor', TRUE, '2026-11-02 10:15:00'),
(3, 'Andrea Álvarez (Gamer VIP)', 'comprador', 'comprador@fernetcolocho.sv',
 '0b6902127b102f8b06227f1727a340668443d87d39278e8d38d86b681f087a6b', 'comprador', TRUE, '2026-11-03 14:30:00'),
(4, 'Samuel Seguridad', 'samuel_sec', 'samuel@fernetcolocho.sv',
 '6d64b8d105885249e27514815b8c254e67281e565d79047e4f8e1a588c5e351e', 'comprador', TRUE, '2026-11-04 16:00:00'),
(5, 'Colocho Design', 'colocho_ux', 'colocho@fernetcolocho.sv',
 '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'vendedor', TRUE, '2026-11-05 09:45:00');
-- Nota: Ejecutar `node -e "const c=require('crypto'); ['Admin123!','Vendedor123!','Comprador123!','Samuel123!','Colocho123!'].forEach(p=>console.log(p, c.createHash('sha256').update(p).digest('hex')))"` para verificar/regenerar los hashes exactos antes de poblar.

-- 3. VIDEOJUEGOS (15 títulos originales; usar rutas locales /assets/games/*.jpg para operar sin internet)
INSERT INTO products (id, title, description, price, old_price, stock, platform, category_id, seller_id, is_featured, is_active, image_url) VALUES
(1, 'Elden Ring', 'Álzate, Sinluz, y que la gracia te guíe para abrazar el poder del Círculo de Elden en las Tierras Intermedias.', 44.99, 59.99, 25, 'PC / Steam', 1, 2, TRUE, TRUE, '/assets/games/elden-ring.jpg'),
(2, 'Cyberpunk 2077: Ultimate Edition', 'RPG de acción y aventura de mundo abierto ambientado en Night City, una megalópolis obsesionada con el poder.', 29.99, 59.99, 40, 'PC / GOG', 1, 2, TRUE, TRUE, '/assets/games/cyberpunk-2077.jpg'),
(3, 'DRAGON BALL: Sparking! ZERO', 'Lleva las batallas legendarias de la saga Budokai Tenkaichi a un nuevo nivel con más de 180 luchadores.', 69.99, NULL, 50, 'PC / Steam', 4, 2, TRUE, TRUE, '/assets/games/db-sparking-zero.jpg'),
(4, 'Left 4 Dead 2', 'Clásico cooperativo de acción y supervivencia zombi para cuatro jugadores a través de campañas intensas.', 1.99, 9.99, 100, 'PC / Steam', 2, 5, FALSE, TRUE, '/assets/games/l4d2.jpg'),
(5, 'Red Dead Redemption 2', 'La épica historia de Arthur Morgan y la banda de Van der Linde huyendo a través del corazón de América en 1899.', 19.79, 59.99, 30, 'PC / Rockstar', 1, 2, TRUE, TRUE, '/assets/games/rdr2.jpg'),
(6, 'God of War Ragnarök', 'Kratos y Atreus deben viajar a cada uno de los Nueve Reinos en busca de respuestas mientras las fuerzas de Asgard se preparan.', 59.99, NULL, 18, 'PC / PlayStation', 1, 2, TRUE, TRUE, '/assets/games/gow-ragnarok.jpg'),
(7, 'Outlast 2', 'Viaje retorcido a las profundidades de la mente humana y sus oscuros secretos en el desierto de Arizona.', 4.49, 29.99, 35, 'PC / Steam', 3, 5, FALSE, TRUE, '/assets/games/outlast-2.jpg'),
(8, 'Overcooked! 2', 'Regresa al Reino de la Cebolla y reúne a tu equipo de chefs en un caótico juego cooperativo local y en línea.', 6.24, 24.99, 45, 'Multiplataforma', 2, 5, FALSE, TRUE, '/assets/games/overcooked-2.jpg'),
(9, 'Rayman Legends', 'Aventura de plataformas premiada por su estilo artístico musical y niveles cooperativos llenos de ritmo.', 3.99, 19.99, 60, 'Multiplataforma', 4, 5, FALSE, TRUE, '/assets/games/rayman-legends.jpg'),
(10, 'Hollow Knight', 'Forja tu propio camino en Hallownest, un vasto reino en ruinas de insectos y héroes en un clásico Metroidvania.', 7.49, 14.99, 80, 'PC / Switch', 4, 2, FALSE, TRUE, '/assets/games/hollow-knight.jpg'),
(11, 'Baldur''s Gate 3', 'Reúne a tu grupo y regresa a los Reinos Olvidados en una historia de compañerismo, traición y supervivencia.', 47.99, 59.99, 22, 'PC / Steam', 1, 2, TRUE, TRUE, '/assets/games/baldurs-gate-3.jpg'),
(12, 'Resident Evil 4 Remake', 'Sobrevivir es solo el principio. Leon S. Kennedy sigue el rastro de la hija secuestrada del presidente.', 29.99, 39.99, 28, 'PC / PlayStation', 3, 2, FALSE, TRUE, '/assets/games/re4-remake.jpg'),
(13, 'EA SPORTS FC 25', 'Vive el fútbol mundial con Rush 5v5, FC IQ para control táctico avanzado y las mejores ligas del planeta.', 48.99, 69.99, 33, 'Multiplataforma', 5, 5, FALSE, TRUE, '/assets/games/ea-fc-25.jpg'),
(14, 'Hades II', 'Ábrete paso más allá del Inframundo utilizando hechicería oscura para enfrentarte al Titán del Tiempo.', 29.99, NULL, 55, 'PC / Steam', 1, 2, FALSE, TRUE, '/assets/games/hades-2.jpg'),
(15, 'Age of Empires II: Definitive Edition', 'Celebra uno de los juegos de estrategia más queridos con gráficos 4K y todas las expansiones incluidas.', 9.99, 19.99, 40, 'PC / Steam', 5, 5, FALSE, TRUE, '/assets/games/aoe2-de.jpg');

-- SINCRONIZAR SECUENCIAS SERIAL TRAS INSERTAR IDS EXPLÍCITOS
SELECT setval(pg_get_serial_sequence('categories', 'id'), (SELECT MAX(id) FROM categories));
SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT MAX(id) FROM users));
SELECT setval(pg_get_serial_sequence('products', 'id'), (SELECT MAX(id) FROM products));