# Checklist de endurecimiento de seguridad (Req 11.1, 11.2, 11.3)

Revisión final antes de producción.

## Autenticación y sesiones
- [x] Contraseñas con **argon2id** (`modules/auth/password.ts`).
- [x] Access token JWT de 15 min; refresh opaco **hasheado (SHA-256)**, rotado en cada uso.
- [x] Detección de reutilización de refresh → revoca todas las sesiones del usuario.
- [x] Cookie de refresh `httpOnly` · `Secure` (en producción) · `SameSite=Strict`.
- [x] Rate limit en login: 5 intentos / 15 min → 429.
- [ ] Protección CSRF específica para `/auth/refresh` (pendiente; `SameSite=Strict` mitiga la mayoría de casos).

## Autorización
- [x] `autenticar` (JWT) + `requerirRol` en cada router.
- [x] Autorización a nivel de objeto: profesor dueño del curso, estudiante inscrito, dueño del intento.
- [x] **El modo examen nunca expone `esCorrecta`/explicaciones** (serializador seguro + prueba unitaria).
- [x] `/responder` devuelve 403 `MODO_EXAMEN_SIN_FEEDBACK` para intentos de examen.

## Entrada y datos
- [x] Validación con **Zod** en body/query/params de todos los endpoints.
- [x] Consultas parametrizadas vía Prisma (sin SQL concatenado).
- [x] Sanitización de HTML en enunciados y explicaciones (`sanitize-html`).
- [x] Límite de tamaño de body (`express.json({ limit: '1mb' })`).

## Cabeceras y red
- [x] `helmet` activo.
- [x] CORS por lista blanca (`CORS_ORIGINS`).
- [x] `trust proxy` para IP real tras el reverse proxy.

## Rendimiento (Req 11.3)
- [ ] Ejecutar `k6 run pruebas-carga/autoguardado.k6.js` con 500 VUs y validar p95 < 500 ms.
- [x] Índices en la BD para las consultas calientes:
  - `intentos(examen_id, estudiante_id, modo)` y `intentos(estado, fin_limite)` (job de cierre).
  - `respuestas` con PK compuesta `(intento_id, pregunta_id)` → upsert de autoguardado O(1).

## Operación
- [x] `/health` verifica la conexión a la BD.
- [x] Logs estructurados (pino) sin exponer detalles internos al cliente.
- [x] Zona horaria UTC en servidor y MariaDB.
- [x] Migraciones versionadas y datos semilla.
