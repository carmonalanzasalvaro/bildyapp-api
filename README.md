# BildyApp API

API REST de BildyApp para autenticación, usuarios, clientes, proyectos y albaranes.

## Requisitos

- Node.js 22
- npm 10 o superior
- MongoDB

## Variables de entorno

1. Copia el archivo de ejemplo:

   ```bash
   cp .env.example .env
   ```

2. Ajusta como mínimo estas variables:

   - `PORT`
   - `NODE_ENV`
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `JWT_EXPIRES_IN`
   - `MAILTRAP_HOST`, `MAILTRAP_PORT`, `MAILTRAP_USER`, `MAILTRAP_PASS`
   - `SLACK_WEBHOOK_URL`
   - Variables de almacenamiento `STORAGE_*` o sus alias `S3_*`, `AWS_*`, `R2_*`

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

La API arranca por defecto en `http://localhost:3000`.

## Documentación Swagger

- UI: `http://localhost:3000/api-docs`
- JSON OpenAPI: `http://localhost:3000/api-docs.json`

También tienes ejemplos listos para usar en `api.http`.

## Scripts útiles

```bash
npm test
npm run test:coverage
npm run lint
```

## Docker Compose

Levanta la API junto con MongoDB:

```bash
docker compose up --build
```

Servicios expuestos:

- API: `http://localhost:3000`
- MongoDB: `mongodb://localhost:27017`

## Health check

El endpoint `GET /health` devuelve:

- `status`
- `db`
- `uptime`
- `timestamp`

## Cobertura y pruebas

- `npm test` ejecuta toda la suite.
- `npm run test:coverage` genera cobertura en `coverage/`.
- `tests/docs-health.test.js` cubre Swagger y health.
