# Asset Movements UI

Interfaz de usuario para el sistema de gestión de activos y movimientos.

## Características

- Autenticación de usuarios (login/registro)
- Gestión de activos
- Interfaz moderna y responsiva
- Integración con React Query para manejo de estado y caché
- Protección de rutas
- Diseño con Tailwind CSS y componentes de Radix UI

## Requisitos

- Node.js 18 o superior
- npm o yarn

## Instalación

1. Clonar el repositorio:
```bash
git clone https://github.com/tu-usuario/asset-movements-ui.git
cd asset-movements-ui
```

2. Instalar dependencias:
```bash
npm install
# o
yarn install
```

3. Crear archivo de variables de entorno:
```bash
cp .env.example .env
```

4. Configurar la URL de la API en el archivo `.env`:
```
VITE_API_URL=http://localhost:3000
```

## Desarrollo

Para iniciar el servidor de desarrollo:

```bash
npm run dev
# o
yarn dev
```

La aplicación estará disponible en `http://localhost:5173`

## Construcción

Para crear una versión de producción:

```bash
npm run build
# o
yarn build
```

Los archivos de producción se generarán en el directorio `dist`

## Estructura del Proyecto

```
src/
  ├── components/     # Componentes reutilizables
  ├── contexts/      # Contextos de React
  ├── models/        # Interfaces y tipos
  ├── pages/         # Páginas de la aplicación
  ├── services/      # Servicios de API
  ├── styles/        # Estilos globales
  └── utils/         # Utilidades
```

## Tecnologías Utilizadas

- React
- TypeScript
- Vite
- React Query
- React Router
- Tailwind CSS
- Radix UI
- Axios

## Licencia

MIT