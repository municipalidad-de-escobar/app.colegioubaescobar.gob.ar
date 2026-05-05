# Sistema de Gestión - Curso de Ingreso
### Colegio Preuniversitario Dr. Ramón A. Cereijo · UBA Escobar

Aplicación web para la gestión integral del curso de ingreso: importación de estudiantes, carga de calificaciones mediante lectora de código de barras, generación de boletines en PDF y orden de mérito con condiciones de ingreso.

---

## Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite 5 |
| Estilos | Tailwind CSS v3 |
| Base de datos | Firebase Firestore |
| Autenticación | Firebase Auth (Google OAuth) |
| Hosting | EC2 (Apache) vía GitHub Actions |
| Generación PDF | jsPDF + jspdf-autotable |
| Exportación Excel | SheetJS (xlsx) |
| Código de barras | JsBarcode (CODE128) |

---

## Arquitectura

La aplicación es un **SPA (Single Page Application)** completamente estática. No requiere servidor backend propio — toda la lógica corre en el navegador del cliente y se comunica directamente con Firebase.

```
Navegador del usuario
       │
       ├── React SPA (archivos estáticos: HTML + JS + CSS)
       │         Se sirve desde Apache en EC2
       │
       └── Firebase
               ├── Firestore  (base de datos NoSQL)
               └── Auth       (Google OAuth)
```

**Requisitos de hosting:**
- Servidor capaz de servir archivos estáticos (HTML/JS/CSS)
- HTTPS obligatorio (requerido por Firebase Authentication y Google OAuth)
- Soporte para SPA: redirigir todas las rutas a `index.html`

**No requiere:** Node.js, Python, PHP, ni ningún proceso de servidor backend.

---

## Autenticación y Roles

El acceso está restringido por una **whitelist** en Firestore (colección `admins`). Solo los emails registrados pueden ingresar.

| Rol | Permisos |
|---|---|
| `admin` | Acceso completo: importar estudiantes, cargar notas, gestionar ciclos |
| `secretary` | Acceso parcial: cargar notas, consultar listas, imprimir boletines y orden de mérito |

El login usa **Google OAuth** via Firebase — los usuarios ingresan con su cuenta Google. No se manejan contraseñas en la aplicación.

---

## Funcionalidades

- **Gestión de ciclos:** Sistema multi-año. El admin archiva el ciclo vigente y activa el nuevo al comenzar cada año. Los ciclos archivados quedan en modo solo lectura para consulta.
- **Importación de estudiantes:** Carga masiva desde archivo CSV con validación de campos requeridos.
- **Carátulas de examen:** Generación de PDF con código de barras (CODE128) por estudiante o por comisión.
- **Carga de notas:** Lectura mediante pistola lectora de código de barras. Escala 0–100 puntos.
- **Boletines:** PDF con dos ejemplares por página (original escuela / copia estudiante). Exportación individual, por comisión o masiva.
- **Orden de mérito:** Clasificación automática con reglas de ingreso (piso por materia, mínimo de exámenes rendidos, cupo de vacantes configurable). Exportación a Excel.

---

## Estructura de la Base de Datos (Firestore)

```
admins/                         # Whitelist de usuarios autorizados
  {docId}/
    email:    string
    role:     "admin" | "secretary"

cycles/                         # Ciclos lectivos
  {year}/                       # Ej: "2026"
    status:     "active" | "archived"
    createdAt:  string (ISO)
    archivedAt: string (ISO) | null

    students/                   # Sub-colección de estudiantes del ciclo
      {studentId}/              # Ej: "2026-001"
        id:        string       # igual al docId
        apellido:  string
        nombre:    string
        dni:       string
        comision:  string
        grades:    map          # Ej: { "M1-2026": 85, "L2-2026": "Aus" }
        createdAt: string (ISO)
        updatedAt: string (ISO)
```

Ver `FIREBASE_SETUP.md` para el setup completo: reglas de seguridad, Google OAuth y configuración de GitHub Secrets.

---

## Instalación local (desarrollo)

**Requisitos:** Node.js 18+ y npm.

```bash
# 1. Clonar el repositorio
git clone https://github.com/municipalidad-de-escobar/app.colegioubaescobar.gob.ar.git
cd app.colegioubaescobar.gob.ar

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Completar .env con las credenciales de Firebase (ver FIREBASE_SETUP.md)

# 4. Iniciar servidor de desarrollo
npm run dev
# La app queda disponible en http://localhost:5173
```

---

## Build para producción

```bash
npm run build
# Los archivos estáticos quedan en /dist
```

El deploy a producción es automático vía GitHub Actions al hacer push a `main`. Ver `DEPLOYMENT_SETUP.md`.

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

## Variables de entorno

Crear un archivo `.env` en la raíz con las credenciales del proyecto Firebase:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Obtener estos valores desde: **Firebase Console** → Configuración del proyecto → Tus apps → Configuración de la app web.

> Las credenciales de Firebase para web son públicas por diseño (se exponen al cliente). La seguridad se implementa mediante **Firestore Security Rules** y la whitelist en la colección `admins`.

---

## Estructura del proyecto

```
src/
├── components/
│   ├── auth/          # Login (Google OAuth via Firebase)
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
│   └── firebase.js    # Cliente Firebase (Auth + Firestore)
├── utils/
│   ├── authUtils.js   # Verificación de whitelist (Firestore)
│   └── csvUtils.js    # Parseo e importación CSV
public/
└── logo2.png          # Logo institucional
```

---

## Documentación adicional

- **Configuración de Firebase:** `FIREBASE_SETUP.md` — setup inicial, Firestore, Google OAuth, security rules, GitHub Secrets
- **Deploy a producción:** `DEPLOYMENT_SETUP.md` — EC2, Apache, SSH, GitHub Actions
- **Guía general del monorepo:** `../CLAUDE.md`
