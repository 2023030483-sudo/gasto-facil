# 💰 Gasto Fácil

App de administración de gastos con escaneo de tickets por IA.

## 🚀 Tecnologías

- **Node.js + Express** — servidor
- **EJS** — vistas/templating
- **CSS propio** — diseño fiel a Figma (Plus Jakarta Sans)
- **Supabase** — base de datos PostgreSQL
- **Anthropic Claude API** — análisis de tickets con IA

## 📦 Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Edita .env con tus credenciales

# 3. Crear la base de datos en Supabase
# Abre el SQL Editor en https://supabase.com
# Ejecuta el contenido de: supabase-schema.sql

# 4. Iniciar el servidor
npm start
# o en modo desarrollo:
npm run dev
```

## 🗂 Estructura del proyecto

```
gasto-facil/
├── app.js                  # Entry point Express
├── .env.example            # Variables de entorno (copia como .env)
├── supabase-schema.sql     # Schema de base de datos
├── middleware/
│   └── supabase.js         # Cliente Supabase
├── routes/
│   ├── index.js            # Home
│   ├── gastos.js           # CRUD de gastos
│   ├── escanear.js         # Flujo de escaneo
│   ├── resumen.js          # Estadísticas
│   └── api.js              # Endpoint IA
├── views/
│   ├── index.ejs           # Pantalla Home
│   ├── gastos.ejs          # Mis Gastos
│   ├── nuevo-gasto.ejs     # Formulario nuevo gasto
│   ├── escanear.ejs        # Escáner de ticket
│   ├── confirmar-gasto.ejs # Confirmación datos IA
│   ├── resumen.ejs         # Dashboard/Resumen
│   └── partials/
│       ├── header.ejs
│       ├── bottomnav.ejs
│       └── expense-item.ejs
└── public/
    └── css/
        └── main.css        # Estilos completos
```

## 📱 Pantallas

| Ruta              | Vista               |
|-------------------|---------------------|
| `/`               | Home                |
| `/gastos`         | Mis Gastos          |
| `/gastos/nuevo`   | Nuevo Gasto         |
| `/escanear`       | Escanear Ticket     |
| `/escanear/confirmar` | Confirmar (IA)  |
| `/resumen`        | Resumen/Dashboard   |

## 🤖 Función de IA

El endpoint `POST /api/analizar-ticket` recibe una imagen en base64 y usa **Claude claude-opus-4-5** para extraer:
- Establecimiento
- Concepto del gasto
- Monto total
- Fecha
- Categoría sugerida

## 🗄 Supabase

Tabla `gastos`:
| Campo        | Tipo     |
|-------------|---------|
| id           | UUID     |
| concepto     | TEXT     |
| monto        | DECIMAL  |
| fecha        | DATE     |
| categoria    | TEXT     |
| metodo_pago  | TEXT     |
| notas        | TEXT     |
| created_at   | TIMESTAMP|
