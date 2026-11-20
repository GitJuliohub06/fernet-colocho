# Fernet & Colocho — Tienda Digital de Videojuegos

Aplicación web Full Stack de comercio electrónico de videojuegos digitales desarrollada y desplegada localmente en Debian Server 13 (VirtualBox) como proyecto académico de desarrollo web, administración de servidores Linux y seguridad informática.

---

## 1. Descripción del Proyecto y Roles del Sistema

**Fernet & Colocho** permite navegar un catálogo de videojuegos con filtros avanzados, gestionar un carrito de compras persistente, emitir facturas electrónicas con cálculo de IVA (13%) y administrar inventario y cuentas según el rol del usuario.

| Rol | Vistas accesibles | Permisos principales |
| :--- | :--- | :--- |
| **Público (Visitante)** | `index.html`, `login.html`, `register.html` | Consultar catálogo, ofertas, buscador, detalles de videojuegos, registrarse e iniciar sesión. |
| **Comprador** | `index.html`, `buyer.html` | Gestionar carrito persistente, validar stock, confirmar compras, imprimir facturas y revisar su historial. |
| **Vendedor** | `index.html`, `buyer.html`, `seller.html` | Publicar videojuegos, subir portadas locales, editar sus propios productos y ajustar stock (`-1` / `+5`). |
| **Administrador** | Todas (`admin.html`, `seller.html`, `buyer.html`, `index.html`) | CRUD completo de productos y usuarios, asignación de roles, activación/bloqueo de cuentas y consulta de KPIs globales. |

---

## 2. Arquitectura Completa

### Tecnologías Utilizadas
* **Sistema Operativo:** Debian Server 13 (máquina virtual en VirtualBox, hostname `f-colocho`).
* **Servidor Web / Proxy Inverso:** Nginx (puerto `80`).
* **Backend:** Node.js 20 LTS + Express.js (puerto interno `127.0.0.1:3000`, gestionado por `systemd`).
* **Base de Datos:** PostgreSQL con driver directo `pg` (sin ORM).
* **Sesiones y Archivos:** `express-session` (cookie `connect.sid`), `crypto` nativo (SHA-256) y `multer` para portadas locales.
* **Frontend:** HTML5, CSS3 y JavaScript modular nativo (`fetch` API), sin frameworks que automaticen la sanitización.

### Base de Datos (`fernet_db`)
Modelo relacional compuesto por 6 tablas normalizadas:
* `users`: cuentas, hashes de contraseña, rol (`comprador`, `vendedor`, `admin`) y estado `is_active`.
* `categories`: categorías del catálogo.
* `products`: videojuegos, precios, ofertas, stock, plataforma, `category_id`, `seller_id` y ruta de portada.
* `cart_items`: carrito persistente por usuario con restricción única `(user_id, product_id)`.
* `orders`: cabecera de facturas electrónicas (`FC-YYYY-NNNN`), comprador, subtotal, IVA (13%) y total.
* `order_items`: líneas de detalle de cada factura.

### Estructura de Carpetas
```text
fernet-colocho/
├── .env.example
├── package.json
├── README.md
├── database/
│   ├── schema.sql
│   └── seed.sql
├── deploy/
│   ├── fernet-colocho.service
│   └── nginx-fernet-colocho.conf
├── public/
│   ├── index.html, login.html, register.html, buyer.html, seller.html, admin.html
│   ├── assets/games/
│   ├── uploads/games/
│   ├── css/ (global.css, catalog.css, auth.css, buyer.css, seller.css, admin.css)
│   └── js/
│       ├── catalog.js, seller.js, admin.js
│       └── common/ (api.js, auth.js, buyer.js, navbar.js)
└── src/
    ├── server.js
    ├── config/db.js
    ├── middlewares/ (authMiddleware.js, uploadMiddleware.js)
    ├── controllers/ (authController.js, productController.js, cartController.js, orderController.js, userController.js)
    └── routes/ (authRoutes.js, productRoutes.js, cartRoutes.js, orderRoutes.js, userRoutes.js)
```

### Diagrama de Arquitectura
```text
[ Navegador en Red Local (http://<IP_SERVIDOR>) ]
                      |
                      | HTTP :80 (Permitido por UFW)
                      v
+================================================================+
|        VM VirtualBox: Debian Server 13 (f-colocho)             |
|                                                                |
|  +----------------------------------------------------------+  |
|  |  Nginx (:80)                                             |  |
|  |   ├── /*        -> /var/www/fernet-colocho/public/       |  |
|  |   ├── /uploads/ -> /var/www/fernet-colocho/public/uploads|  |
|  |   └── /api/*    -> proxy_pass [http://127.0.0.1:3000](http://127.0.0.1:3000)      |  |
|  +-----------------------------+----------------------------+  |
|                                |                               |
|                                v                               |
|  +----------------------------------------------------------+  |
|  |  Node.js + Express (127.0.0.1:3000 - systemd)            |  |
|  |   API REST + express-session + multer + driver pg        |  |
|  +-----------------------------+----------------------------+  |
|                                | TCP 5432 (Solo localhost)     |
|                                v                               |
|  +----------------------------------------------------------+  |
|  |  PostgreSQL (Base de datos: fernet_db)                   |  |
|  +----------------------------------------------------------+  |
+================================================================+
```

---

## 3. Guía de Instalación y Despliegue Local (Debian Server 13)

### 3.1. Máquina Virtual en VirtualBox
1. Crear VM Linux → Debian (64-bit), 2 GB RAM, 2 vCPU y 20 GB de disco.
2. En **Configuración → Red → Adaptador 1**, seleccionar **Adaptador puente (Bridged Adapter)** sobre la interfaz de la red local del laboratorio.
3. Instalar Debian Server 13 con hostname `f-colocho`, usuario `f-colocho` y paquete **Servidor SSH**.

### 3.2. Preparación del Sistema y Paquetes
```bash
# Como root: asignar contraseñas seguras y permisos sudo
passwd root
passwd f-colocho
apt update && apt install -y sudo
usermod -aG sudo f-colocho
timedatectl set-timezone America/El_Salvador
```

```bash
# Como f-colocho: instalar servicios base y Node.js 20 LTS
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl ca-certificates gnupg ufw nginx postgresql postgresql-contrib
curl -fsSL [https://deb.nodesource.com/setup_20.x](https://deb.nodesource.com/setup_20.x) | sudo -E bash -
sudo apt install -y nodejs
```

### 3.3. Configuración de PostgreSQL
```bash
sudo systemctl enable --now postgresql
sudo -u postgres psql -c "CREATE USER fernet_user WITH PASSWORD '<CONTRASEÑA_BD>';"
sudo -u postgres psql -c "CREATE DATABASE fernet_db OWNER fernet_user ENCODING 'UTF8';"
```

### 3.4. Clonación, Dependencias, `.env` y Carga SQL
```bash
sudo mkdir -p /var/www/fernet-colocho
sudo chown -R f-colocho:www-data /var/www/fernet-colocho
git clone -b main <URL_REPOSITORIO> /var/www/fernet-colocho
cd /var/www/fernet-colocho
npm install --omit=dev

cp .env.example .env
# Editar .env y definir DB_PASSWORD y SESSION_SECRET
chmod 640 .env

mkdir -p public/uploads/games
sudo chown -R f-colocho:www-data /var/www/fernet-colocho
sudo chmod -R 775 /var/www/fernet-colocho/public/uploads

PGPASSWORD='<CONTRASEÑA_BD>' psql -h 127.0.0.1 -U fernet_user -d fernet_db -f database/schema.sql
PGPASSWORD='<CONTRASEÑA_BD>' psql -h 127.0.0.1 -U fernet_user -d fernet_db -f database/seed.sql
```

### 3.5. Servicio `systemd`, Nginx y Firewall UFW
```bash
sudo cp deploy/fernet-colocho.service /etc/systemd/system/fernet-colocho.service
sudo systemctl daemon-reload
sudo systemctl enable --now fernet-colocho.service

sudo cp deploy/nginx-fernet-colocho.conf /etc/nginx/sites-available/fernet-colocho
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/fernet-colocho /etc/nginx/sites-enabled/fernet-colocho
sudo nginx -t && sudo systemctl enable --now nginx && sudo systemctl restart nginx

sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw --force enable
```

### 3.6. Verificación
```bash
hostname -I
curl -s [http://127.0.0.1/api/health](http://127.0.0.1/api/health)
```
Abrir `http://<IP_SERVIDOR>/index.html` desde el navegador de cualquier equipo de la red del laboratorio.

---

## 4. Usuarios y Credenciales de Prueba de la Aplicación

| Rol | Usuario (`username`) | Correo | Contraseña |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin` | `admin@fernetcolocho.sv` | `Admin123!` |
| **Vendedor** | `vendedor` | `vendedor@fernetcolocho.sv` | `Vendedor123!` |
| **Vendedor** | `colocho_ux` | `colocho@fernetcolocho.sv` | `Colocho123!` |
| **Comprador** | `comprador` | `comprador@fernetcolocho.sv` | `Comprador123!` |
| **Comprador** | `samuel_sec` | `samuel@fernetcolocho.sv` | `Samuel123!` |

---

## 5. Flujo de Trabajo en GitHub (GitFlow)

* **Ramas permanentes:** `main` (versión lista para entrega y despliegue) y `develop` (integración continua del equipo).
* **Ramas de trabajo:** `feature/<modulo>` creadas desde `develop`, integradas mediante Pull Request con revisión de pares.
* **Ramas de cierre y corrección:** `release/v1.0.0` para estabilización y pruebas previas a la entrega en `main`, y `hotfix/*` para correcciones urgentes sobre `main`.

---

## Notas académicas adicionales

*(Sección reservada para que el equipo documente manualmente las notas académicas específicas aprobadas por el docente antes de la entrega final).*