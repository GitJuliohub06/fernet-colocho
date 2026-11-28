# Fernet & Colocho Store

![Node.js](https://img.shields.io/badge/Node.js-Express_5.3-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16_Alpine-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Apache2](https://img.shields.io/badge/Apache2-Reverse_Proxy-D22128?style=for-the-badge&logo=apache&logoColor=white)
![Debian](https://img.shields.io/badge/Debian-13_Trixie-A81D33?style=for-the-badge&logo=debian&logoColor=white)

---

## Descripción

**Fernet & Colocho Store** es una aplicación web Full Stack de comercio electrónico de videojuegos construida sobre **Node.js/Express** y **PostgreSQL**, servida detrás de **Apache2** en **Debian Server 13**.

El objetivo del proyecto es diseñar, explotar, documentar y remediar vulnerabilidades reales basadas en el **OWASP Top 10** siguiendo un ciclo completo de desarrollo bajo metodología **GitFlow**.

---

## Tecnologías Utilizadas

| Categoría | Tecnología / Componente | Detalle |
| :--- | :--- | :--- |
| **Sistema Operativo** | Debian Server 13 (Trixie) | Host de la máquina virtual |
| **Servidor Web** | Apache2 | Proxy inverso (puertos `80`/`443` hacia `3000`) |
| **Backend** | Node.js + Express (`^5.3.0`) | API REST y servidor de archivos estáticos |
| **Dependencias clave** | `express-session`, `multer`, `pg`, `dotenv` | Sesiones, carga de imágenes, pool SQL y entorno |
| **Base de Datos** | PostgreSQL (`postgres:16-alpine`) | Contenedor `fernet_colocho_db` con volumen `pgdata` |
| **Contenerización** | Docker Engine + Docker Compose | Orquestación aislada del motor de base de datos |
| **Control de Versiones** | Git / GitHub | Flujo de trabajo bajo metodología GitFlow |
| **Auditoría y Pentesting** | `curl`, `sqlmap`, Hydra, Burp Suite | Validación y pruebas de concepto (PoC) |

---

## Arquitectura

PostgreSQL se ejecuta en un contenedor Docker aislado con el puerto publicado únicamente en la interfaz de loopback (`127.0.0.1:5432`), mientras que Apache2 y Node.js corren directamente sobre el host.

```text
[ Cliente / Navegador ]
          |
          v  (HTTP/HTTPS - Puertos 80/443)
[ Apache2 - Reverse Proxy ]
          |
          v  (ProxyPass - 127.0.0.1:3000)
[ Node.js / Express (src/server.js) ]
          |
          v  (pg.Pool - 127.0.0.1:5432)
[ Docker: fernet_colocho_db (PostgreSQL 16) ]
