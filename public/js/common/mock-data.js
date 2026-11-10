const STORAGE_KEYS = {
  PRODUCTS: 'fc_mock_products_v1',
  USERS: 'fc_mock_users_v1',
  CATEGORIES: 'fc_mock_categories_v1',
  SESSION: 'fc_mock_session_v1',
  CART: 'fc_mock_cart_v1',
  ORDERS: 'fc_mock_orders_v1'
};

const INITIAL_CATEGORIES = [
  { id: 1, name: 'RPG y Acción', slug: 'rpg-accion', description: 'Mundos épicos, combate intenso y progresión de personaje.' },
  { id: 2, name: 'Shooter y Cooperativo', slug: 'shooter-coop', description: 'Acción táctica y supervivencia multijugador.' },
  { id: 3, name: 'Terror y Supervivencia', slug: 'terror', description: 'Experiencias de tensión psicológica y horror.' },
  { id: 4, name: 'Lucha y Arcade', slug: 'lucha-arcade', description: 'Combates competitivos, plataformas y acción rápida.' },
  { id: 5, name: 'Estrategia yDeportes', slug: 'estrategia-deportes', description: 'Simulación deportiva, gestión táctica e imperios.' }
];

const INITIAL_USERS = [
  {
    id: 1,
    full_name: 'Administrador General',
    username: 'admin',
    email: 'admin@fernetcolocho.sv',
    password_plain: 'Admin123!',
    role: 'admin',
    is_active: true,
    created_at: '2026-11-01 08:00:00'
  },
  {
    id: 2,
    full_name: 'Julio Flores (Seller Oficial)',
    username: 'vendedor',
    email: 'vendedor@fernetcolocho.sv',
    password_plain: 'Vendedor123!',
    role: 'vendedor',
    is_active: true,
    created_at: '2026-11-02 10:15:00'
  },
  {
    id: 3,
    full_name: 'Andrea Álvarez (Gamer VIP)',
    username: 'comprador',
    email: 'comprador@fernetcolocho.sv',
    password_plain: 'Comprador123!',
    role: 'comprador',
    is_active: true,
    created_at: '2026-11-03 14:30:00'
  },
  {
    id: 4,
    full_name: 'Samuel Seguridad',
    username: 'samuel_sec',
    email: 'samuel@fernetcolocho.sv',
    password_plain: 'Samuel123!',
    role: 'comprador',
    is_active: true,
    created_at: '2026-11-04 16:00:00'
  },
  {
    id: 5,
    full_name: 'Colocho Design',
    username: 'colocho_ux',
    email: 'colocho@fernetcolocho.sv',
    password_plain: 'Colocho123!',
    role: 'vendedor',
    is_active: true,
    created_at: '2026-11-05 09:45:00'
  }
];

const INITIAL_PRODUCTS = [
  {
    id: 1,
    title: 'Elden Ring',
    description: 'Álzate, Sinluz, y que la gracia te guíe para abrazar el poder del Círculo de Elden en las Tierras Intermedias.',
    price: 44.99,
    old_price: 59.99,
    stock: 25,
    platform: 'PC / Steam',
    category_id: 1,
    seller_id: 2,
    is_featured: true,
    is_active: true,
    image_url: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1245620/header.jpg'
  },
  {
    id: 2,
    title: 'Cyberpunk 2077: Ultimate Edition',
    description: 'RPG de acción y aventura de mundo abierto ambientado en Night City, una megalópolis obsesionada con el poder.',
    price: 29.99,
    old_price: 59.99,
    stock: 40,
    platform: 'PC / GOG',
    category_id: 1,
    seller_id: 2,
    is_featured: true,
    is_active: true,
    image_url: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/header.jpg'
  },
  {
    id: 3,
    title: 'DRAGON BALL: Sparking! ZERO',
    description: 'Lleva las batallas legendarias de la saga Budokai Tenkaichi a un nuevo nivel con más de 180 luchadores.',
    price: 69.99,
    old_price: null,
    stock: 50,
    platform: 'PC / Steam',
    category_id: 4,
    seller_id: 2,
    is_featured: true,
    is_active: true,
    image_url: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1790600/header.jpg'
  },
  {
    id: 4,
    title: 'Left 4 Dead 2',
    description: 'Clásico cooperativo de acción y supervivencia zombi para cuatro jugadores a través de campañas intensas.',
    price: 1.99,
    old_price: 9.99,
    stock: 100,
    platform: 'PC / Steam',
    category_id: 2,
    seller_id: 5,
    is_featured: false,
    is_active: true,
    image_url: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/550/header.jpg'
  },
  {
    id: 5,
    title: 'Red Dead Redemption 2',
    description: 'La épica historia de Arthur Morgan y la banda de Van der Linde huyendo a través del corazón de América en 1899.',
    price: 19.79,
    old_price: 59.99,
    stock: 30,
    platform: 'PC / Rockstar',
    category_id: 1,
    seller_id: 2,
    is_featured: true,
    is_active: true,
    image_url: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1174180/header.jpg'
  },
  {
    id: 6,
    title: 'God of War Ragnarök',
    description: 'Kratos y Atreus deben viajar a cada uno de los Nueve Reinos en busca de respuestas mientras las fuerzas de Asgard se preparan.',
    price: 59.99,
    old_price: null,
    stock: 18,
    platform: 'PC / PlayStation',
    category_id: 1,
    seller_id: 2,
    is_featured: true,
    is_active: true,
    image_url: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2322010/header.jpg'
  },
  {
    id: 7,
    title: 'Outlast 2',
    description: 'Viaje retorcido a las profundidades de la mente humana y sus oscuros secretos en el desierto de Arizona.',
    price: 4.49,
    old_price: 29.99,
    stock: 35,
    platform: 'PC / Steam',
    category_id: 3,
    seller_id: 5,
    is_featured: false,
    is_active: true,
    image_url: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/414700/header.jpg'
  },
  {
    id: 8,
    title: 'Overcooked! 2',
    description: 'Regresa al Reino de la Cebolla y reúne a tu equipo de chefs en un caótico juego cooperativo local y en línea.',
    price: 6.24,
    old_price: 24.99,
    stock: 45,
    platform: 'Multiplataforma',
    category_id: 2,
    seller_id: 5,
    is_featured: false,
    is_active: true,
    image_url: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/728880/header.jpg'
  },
  {
    id: 9,
    title: 'Rayman Legends',
    description: 'Aventura de plataformas premiada por su estilo artístico musical y niveles cooperativos llenos de ritmo.',
    price: 3.99,
    old_price: 19.99,
    stock: 60,
    platform: 'Multiplataforma',
    category_id: 4,
    seller_id: 5,
    is_featured: false,
    is_active: true,
    image_url: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/242550/header.jpg'
  },
  {
    id: 10,
    title: 'Hollow Knight',
    description: 'Forja tu propio camino en Hallownest, un vasto reino en ruinas de insectos y héroes en un clásico Metroidvania.',
    price: 7.49,
    old_price: 14.99,
    stock: 80,
    platform: 'PC / Switch',
    category_id: 4,
    seller_id: 2,
    is_featured: false,
    is_active: true,
    image_url: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/367520/header.jpg'
  },
  {
    id: 11,
    title: "Baldur's Gate 3",
    description: 'Reúne a tu grupo y regresa a los Reinos Olvidados en una historia de compañerismo, traición y supervivencia.',
    price: 47.99,
    old_price: 59.99,
    stock: 22,
    platform: 'PC / Steam',
    category_id: 1,
    seller_id: 2,
    is_featured: true,
    is_active: true,
    image_url: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1086940/header.jpg'
  },
  {
    id: 12,
    title: 'Resident Evil 4 Remake',
    description: 'Sobrevivir es solo el principio. Leon S. Kennedy sigue el rastro de la hija secuestrada del presidente.',
    price: 29.99,
    old_price: 39.99,
    stock: 28,
    platform: 'PC / PlayStation',
    category_id: 3,
    seller_id: 2,
    is_featured: false,
    is_active: true,
    image_url: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2050650/header.jpg'
  },
  {
    id: 13,
    title: 'EA SPORTS FC 25',
    description: 'Vive el fútbol mundial con Rush 5v5, FC IQ para control táctico avanzado y las mejores ligas del planeta.',
    price: 48.99,
    old_price: 69.99,
    stock: 33,
    platform: 'Multiplataforma',
    category_id: 5,
    seller_id: 5,
    is_featured: false,
    is_active: true,
    image_url: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2669320/header.jpg'
  },
  {
    id: 14,
    title: 'Hades II',
    description: 'Ábrete paso más allá del Inframundo utilizando hechicería oscura para enfrentarte al Titán del Tiempo.',
    price: 29.99,
    old_price: null,
    stock: 55,
    platform: 'PC / Steam',
    category_id: 1,
    seller_id: 2,
    is_featured: false,
    is_active: true,
    image_url: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1145350/header.jpg'
  },
  {
    id: 15,
    title: 'Age of Empires II: Definitive Edition',
    description: 'Celebra uno de los juegos de estrategia más queridos con gráficos 4K y todas las expansiones incluidas.',
    price: 9.99,
    old_price: 19.99,
    stock: 40,
    platform: 'PC / Steam',
    category_id: 5,
    seller_id: 5,
    is_featured: false,
    is_active: true,
    image_url: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/813780/header.jpg'
  }
];

function initMockDatabase() {
  if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
  }
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.CART)) {
    localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.ORDERS)) {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify([]));
  }
}

initMockDatabase();

export const MockDB = {
  resetAll() {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
    initMockDatabase();
  },

  getCategories() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES) || '[]');
  },

  getProducts() {
    const products = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
    const categories = this.getCategories();
    return products.map((p) => {
      const cat = categories.find((c) => c.id === Number(p.category_id));
      return {
        ...p,
        category_name: cat ? cat.name : 'General'
      };
    });
  },

  saveProducts(products) {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  },

  getUsers() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
  },

  saveUsers(users) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  getSession() {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
    return raw ? JSON.parse(raw) : null;
  },

  setSession(user) {
    if (!user) {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
      return;
    }
    const safeUser = {
      id: user.id,
      full_name: user.full_name,
      username: user.username,
      email: user.email,
      role: user.role
    };
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(safeUser));
  },

  getCart() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CART) || '[]');
  },

  saveCart(cart) {
    localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent('fc:cart-updated'));
  },

  addToCart(productId, quantity = 1) {
    const products = this.getProducts();
    const product = products.find((p) => p.id === Number(productId));
    if (!product || product.stock <= 0) {
      return { ok: false, message: 'Producto sin stock disponible.' };
    }
    const cart = this.getCart();
    const existing = cart.find((item) => item.product_id === product.id);
    const newQty = (existing ? existing.quantity : 0) + Number(quantity);

    if (newQty > product.stock) {
      return { ok: false, message: `Stock máximo disponible: ${product.stock} unidades.` };
    }

    if (existing) {
      existing.quantity = newQty;
    } else {
      cart.push({
        product_id: product.id,
        title: product.title,
        price: Number(product.price),
        image_url: product.image_url,
        platform: product.platform,
        quantity: Number(quantity)
      });
    }
    this.saveCart(cart);
    return { ok: true, message: `"${product.title}" agregado al carrito.` };
  },

  getOrders() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');
  },

  saveOrders(orders) {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  },

  getFallbackCover(title = 'Fernet & Colocho') {
    const clean = encodeURIComponent(title.slice(0, 22));
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="460" height="215" viewBox="0 0 460 215"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%23151922"/><stop offset="100%" stop-color="%23311b47"/></linearGradient></defs><rect width="460" height="215" fill="url(%23g)"/><text x="50%" y="46%" fill="%23f59e0b" font-family="Orbitron,sans-serif" font-size="18" font-weight="bold" text-anchor="middle">FERNET %26 COLOCHO</text><text x="50%" y="62%" fill="%23f3f4f6" font-family="Inter,sans-serif" font-size="14" text-anchor="middle">${clean}</text></svg>`;
  }
};