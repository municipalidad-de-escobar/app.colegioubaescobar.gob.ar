# Sistema de Gestión - Curso de Ingreso
### Colegio Preuniversitario Dr. Ramón A. Cereijo · UBA Escobar

Aplicación web para la gestión integral del curso de ingreso: importación de estudiantes, carga de calificaciones mediante lectora de código de barras, generación de boletines en PDF y orden de mérito con condiciones de ingreso.

---

## 🚀 Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite 5 |
| Estilos | Tailwind CSS |
| Base de datos | Supabase PostgreSQL |
| Autenticación | Supabase Auth (Google OAuth) |
| Hosting actual | EC2 (Apache) |
| Generación PDF | jsPDF + jspdf-autotable |
| Exportación Excel | SheetJS (xlsx) |
| Código de barras | JsBarcode (CODE128) |

---

## 🏗️ Arquitectura

La aplicación es un **SPA (Single Page Application)** completamente estática. No requiere servidor backend propio — toda la lógica corre en el navegador del cliente y se comunica directamente con Supabase (PostgreSQL con autenticación Google).

```
Navegador del usuario
       │
       ├── React SPA (archivos estáticos: HTML + JS + CSS)
       │         Se sirve desde Apache en EC2
       │         (puede migrarse a Nginx, IIS, etc.)
       │
       └── Supabase ──► PostgreSQL (base de datos)
                   ──► Authentication (Google OAuth)
```

**Requisitos de hosting:**
- Servidor capaz de servir archivos estáticos (HTML/JS/CSS)
- HTTPS obligatorio (requerido por Supabase Authentication)
- Soporte para SPA: redirigir todas las rutas a `index.html`

**No requiere:** Node.js, Python, PHP, ni ningún proceso de servidor backend (la app es 100% client-side).

---

## 🔐 Autenticación y Roles

El acceso está restringido por una **whitelist** en Supabase (tabla `admins`). Solo los emails registrados pueden ingresar. Los permisos se controlan mediante **Row Level Security (RLS)** en PostgreSQL.

| Rol | Permisos |
|---|---|
| `admin` | Acceso completo: importar estudiantes, cargar notas, gestionar ciclos |
| `secretary` | Acceso parcial: cargar notas, consultar listas, imprimir boletines y orden de mérito |

El login utiliza **Google OAuth** — los usuarios ingresan con su cuenta Google institucional. No se manejan contraseñas en la aplicación.

---

## 📋 Funcionalidades

- **Gestión de ciclos:** Sistema multi-año. El admin archiva el ciclo vigente y activa el nuevo al comenzar cada año. Los ciclos archivados quedan en modo solo lectura para consulta.
- **Importación de estudiantes:** Carga masiva desde archivo CSV con validación de campos requeridos.
- **Carátulas de examen:** Generación de PDF con código de barras (CODE128) por estudiante o por comisión.
- **Carga de notas:** Lectura mediante pistola lectora de código de barras. Escala 0–100 puntos.
- **Boletines:** PDF con dos ejemplares por página (original escuela / copia estudiante). Exportación individual, por comisión o masiva.
- **Orden de mérito:** Clasificación automática con reglas de ingreso (piso por materia, mínimo de exámenes rendidos, cupo de vacantes configurable). Exportación a Excel.

---

## 🗄️ Estructura de la Base de Datos (Supabase PostgreSQL)

```
public schema
├── admins                         # Whitelist de usuarios autorizados
│   ├── id (UUID, PK)
│   ├── email (TEXT, UNIQUE)
│   ├── role ("admin" | "secretary")
│   ├── created_at (TIMESTAMP)
│   └── updated_at (TIMESTAMP)
│
├── cycles                         # Ciclos lectivos
│   ├── year (INTEGER, PK)         # Ej: 2026
│   ├── status ("active" | "archived")
│   ├── created_at (TIMESTAMP)
│   └── archived_at (TIMESTAMP)
│
└── students                       # Estudiantes (composite PK: id + cycle_year)
    ├── id (TEXT, PK)              # Ej: "2026-001"
    ├── cycle_year (INTEGER, PK, FK → cycles.year)
    ├── apellido (TEXT)
    ├── nombre (TEXT)
    ├── dni (TEXT)
    ├── comision (TEXT)
    ├── grades (JSONB)             # Calificaciones: {"M1-2026": 85, "L2-2026": "Aus"}
    ├── created_at (TIMESTAMP)
    └── updated_at (TIMESTAMP)
```

Ver `SUPABASE_SETUP.md` para detalles completos de setup incluidas RLS policies.

---

## 🛠️ Instalación local (desarrollo)

**Requisitos previos:** Node.js 18+ y npm.

```bash
# 1. Clonar el repositorio
git clone https://github.com/[usuario]/[repositorio].git
cd app.colegioubaescobar.gob.ar

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con las credenciales de Supabase (ver SUPABASE_SETUP.md)

# 4. Iniciar servidor de desarrollo
npm run dev
# La app queda disponible en http://localhost:5173
```

---

## 🚢 Build para producción

```bash
# Generar build optimizado
npm run build
# Los archivos estáticos quedan en la carpeta /dist
```

Para deploying en producción, ver `SUPABASE_SETUP.md` (base de datos) y la documentación del servidor de hosting (Apache, Nginx, etc.).

La carpeta `/dist` contiene:
- `index.html` — punto de entrada de la SPA
- `assets/` — JavaScript y CSS bundleados (code-splitting automático por Vite)
- Archivos estáticos requeridos

**Configuración Apache (SPA routing):**
```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</IfModule>
```

---

## 🔑 Variables de entorno

Crear un archivo `.env` en la raíz del proyecto con las credenciales de Supabase:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Obtener estos valores de: **Supabase Dashboard** → **Settings** → **API**.

> ⚠️ La `ANON_KEY` es pública por diseño (se expone al cliente). La seguridad está implementada a nivel de **Row Level Security (RLS)** en PostgreSQL.

---

## 📁 Estructura del proyecto

```
src/
├── components/
│   ├── auth/          # Login (Google OAuth)
│   ├── cycles/        # Gestión de ciclos (CycleManager)
│   ├── dashboard/     # Layout principal (Dashboard)
│   ├── grades/        # Notas, boletines, orden de mérito
│   │   ├── GradeBoard.jsx
│   │   ├── GradeUpload.jsx
│   │   ├── MeritOrder.jsx
│   │   └── ReportsManager.jsx
│   ├── import/        # Importación CSV (ImportStudents)
│   ├── students/      # Lista y edición de estudiantes
│   └── ui/            # Componentes reutilizables (Button, Card, Alert, etc.)
├── config/
│   └── supabase.js    # Cliente Supabase
├── utils/
│   ├── authUtils.js   # Verificación de whitelist
│   └── csvUtils.js    # Parseo e importación CSV
public/
└── logo2.png          # Logo institucional
```

---

## 📚 Documentación adicional

- **Configuración de Supabase:** Ver `SUPABASE_SETUP.md` (setup inicial, SQL schema, Google OAuth, RLS policies)
- **Guía general de proyectos:** Ver `../CLAUDE.md` (repository overview, monorepo structure)