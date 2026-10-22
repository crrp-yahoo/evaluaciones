# Plan de Implementación: Plataforma de Exámenes en Línea

Cada tarea es incremental y termina con código integrado y probado. Las referencias `_Requisitos_` apuntan a `requirements.md`.

## Fase 1: Fundamentos

- [x] 1. Configurar el monorepo y el entorno de desarrollo
  - Crear `backend/` (Node.js + TypeScript + Express) y `frontend/` (React + Vite + TypeScript)
  - Configurar ESLint, Prettier, Vitest/Jest y scripts npm
  - Crear `docker-compose.yml` con MariaDB, backend y frontend
  - Crear `.env.example` con `DATABASE_URL`, `JWT_SECRET`, `REFRESH_SECRET`, `CORS_ORIGINS`
  - _Requisitos: 11.7_

- [x] 2. Implementar el esquema de base de datos y migraciones
  - [x] 2.1 Definir el esquema (Prisma o migraciones SQL) con todas las tablas del diseño
    - `usuarios`, `refresh_tokens`, `cursos`, `inscripciones`, `preguntas`, `opciones`, `examenes`, `examen_preguntas`, `intentos`, `intento_preguntas`, `respuestas`, `eventos_integridad`, `auditoria`
    - Incluir `explicacion` en `preguntas` y `opciones`, y `modo` en `intentos`
    - _Requisitos: 4.3, 5.3, 7.1_
  - [x] 2.2 Crear script de datos semilla
    - Admin, un profesor, estudiantes, un curso, preguntas con explicaciones y un examen con `permite_practica`
    - _Requisitos: 11.7_

- [x] 3. Construir la infraestructura base del backend
  - Configuración de entorno validada con Zod, conexión a BD, logger (pino)
  - Middleware `errorHandler` con clase `AppError` y formato de error estándar
  - Middleware `validate(schema)` con Zod, `helmet`, CORS restringido, límite de body
  - Endpoint `/health`
  - _Requisitos: 11.1, 11.2, 11.6_

## Fase 2: Autenticación y roles

- [x] 4. Implementar autenticación JWT
  - [x] 4.1 Servicio de hashing con argon2 y utilidades JWT (access 15 min)
    - _Requisitos: 1.1, 1.6_
  - [x] 4.2 Endpoints `POST /auth/login`, `/auth/refresh`, `/auth/logout`, `GET /auth/me`
    - Refresh token aleatorio guardado hasheado, cookie `httpOnly`/`Secure`/`SameSite=Strict`, rotación y detección de reutilización
    - _Requisitos: 1.1, 1.2, 1.3, 1.4_
  - [x] 4.3 Rate limiting y bloqueo temporal en login
    - _Requisitos: 1.5_
  - [x] 4.4 Pruebas de integración de autenticación
    - Login válido/inválido, refresh, logout, bloqueo por intentos
    - _Requisitos: 1.1–1.5_

- [x] 5. Implementar control de acceso por roles
  - Middleware `autenticar` (verifica JWT) y `requerirRol(...roles)`
  - Helpers de autorización a nivel de objeto (profesor del curso, estudiante inscrito)
  - Pruebas: 401 sin token, 403 con rol incorrecto
  - _Requisitos: 2.1, 2.2, 2.3, 2.4_

- [x] 6. Implementar gestión de usuarios (admin) y auditoría
  - CRUD de usuarios, activar/desactivar, registro en `auditoria`
  - _Requisitos: 2.5_

## Fase 3: Cursos, preguntas y exámenes

- [x] 7. Implementar cursos e inscripciones
  - CRUD de cursos, inscribir/desinscribir estudiantes (sin duplicados), `GET /mis-cursos`
  - Pruebas de integración
  - _Requisitos: 3.1, 3.2, 3.3, 3.4_

- [x] 8. Implementar el banco de preguntas
  - [x] 8.1 Esquemas Zod por tipo de pregunta y validaciones (al menos una opción correcta en tipos cerrados)
    - _Requisitos: 4.1, 4.2_
  - [x] 8.2 CRUD de preguntas con explicación general y por opción; filtros por curso, tema, tipo y texto
    - _Requisitos: 4.3, 4.5, 4.6_
  - [x] 8.3 Versionado de preguntas usadas en intentos finalizados
    - _Requisitos: 4.4_
  - [x] 8.4 Sanitización de HTML en enunciados y explicaciones
    - _Requisitos: 11.1_
  - [x] 8.5 Pruebas de integración y de permisos por autor
    - _Requisitos: 4.6_

- [x] 9. Implementar la creación y configuración de exámenes
  - [x] 9.1 CRUD de exámenes con duración, ventana, intentos máximos, aleatorización, `permite_practica` y `mostrar_resultados`
    - _Requisitos: 5.1, 5.2, 5.3, 5.4_
  - [x] 9.2 Asignación y orden de preguntas (`PUT /examenes/:id/preguntas`)
    - _Requisitos: 5.1_
  - [x] 9.3 Publicación con validaciones y bloqueo de edición si hay intentos entregados
    - _Requisitos: 5.5, 5.6_
  - [x] 9.4 `GET /examenes/disponibles` para estudiantes
    - _Requisitos: 3.3, 3.4_

## Fase 4: Intentos, calificación y práctica

- [x] 10. Implementar el servicio de calificación
  - [x] 10.1 Función pura `calificarPregunta` para opción múltiple, selección múltiple (todo o nada y proporcional) y verdadero/falso
    - _Requisitos: 8.1, 8.2_
  - [x] 10.2 Cálculo de la nota final y estado `pendiente_revision` cuando hay preguntas abiertas
    - _Requisitos: 8.3, 8.5_
  - [x] 10.3 Pruebas unitarias exhaustivas de calificación
    - _Requisitos: 8.1, 8.2_

- [x] 11. Implementar serializadores seguros de preguntas
  - `PreguntaParaIntentoDTO` (sin `es_correcta` ni explicaciones) y `PreguntaConRetroalimentacionDTO`
  - Prueba unitaria que garantice que el primero nunca expone campos sensibles
  - _Requisitos: 6.4_

- [x] 12. Implementar el modo examen
  - [x] 12.1 `POST /examenes/:id/intentos` con `modo = 'examen'`
    - Validar inscripción, ventana, intentos máximos y reanudación; calcular `fin_limite` con hora del servidor; congelar `intento_preguntas`; aleatorización por semilla; guardar IP y user-agent; transacción con bloqueo
    - _Requisitos: 6.1, 6.2, 6.3, 10.1, 10.4_
  - [x] 12.2 `GET /intentos/:id` con preguntas sin respuestas correctas y `tiempoRestanteSeg`
    - _Requisitos: 6.4, 6.9_
  - [x] 12.3 `PUT /intentos/:id/respuestas` (autoguardado idempotente) con rechazo tras `fin_limite` + gracia
    - _Requisitos: 6.5, 6.6_
  - [x] 12.4 `POST /intentos/:id/entregar` con calificación automática
    - _Requisitos: 6.7, 8.1, 8.5_
  - [x] 12.5 Job programado para cerrar intentos vencidos (idempotente)
    - _Requisitos: 6.10_
  - [x] 12.6 Pruebas de integración
    - Límite de intentos con concurrencia, reanudación, rechazo tras vencimiento, que ninguna respuesta del API exponga `es_correcta`
    - _Requisitos: 6.1–6.7_

- [x] 13. Implementar el modo práctica con retroalimentación
  - [x] 13.1 `POST /examenes/:id/intentos` con `modo = 'practica'` (requiere `permite_practica`, sin límite de intentos ni de tiempo, opción `soloFalladas`)
    - _Requisitos: 7.1, 7.2, 7.8_
  - [x] 13.2 `POST /intentos/:id/preguntas/:preguntaId/responder`
    - Guardia obligatoria: 403 `MODO_EXAMEN_SIN_FEEDBACK` si el intento no es de práctica; devolver `{ correcta, respuestaCorrecta, explicacion, explicacionOpcion }`; manejar preguntas sin explicación y abiertas (respuesta modelo)
    - _Requisitos: 7.3, 7.4, 7.5, 7.6, 7.10_
  - [x] 13.3 Resumen al finalizar y `GET /practica/resumen` (estadísticas por tema, preguntas falladas)
    - _Requisitos: 7.7, 9.5_
  - [x] 13.4 Excluir intentos de práctica del conteo de intentos máximos y de los reportes oficiales
    - _Requisitos: 7.2, 7.9_
  - [x] 13.5 Pruebas de integración
    - **Caso crítico:** un intento de modo examen no puede obtener retroalimentación por `/responder`
    - _Requisitos: 7.3–7.6, 7.9_

- [x] 14. Implementar registro de eventos de integridad
  - `POST /intentos/:id/eventos` y almacenamiento en `eventos_integridad`
  - _Requisitos: 10.2, 10.3_

- [x] 15. Implementar resultados, revisión manual y reportes
  - [x] 15.1 `GET /intentos/:id/resultado` respetando `mostrar_resultados`
    - _Requisitos: 9.1_
  - [x] 15.2 Calificación manual de respuestas abiertas con comentario y recálculo
    - _Requisitos: 8.3, 8.4_
  - [x] 15.3 Reportes: resumen del examen, acierto por pregunta, detalle de eventos de integridad, exportación CSV
    - _Requisitos: 9.2, 9.3, 9.4, 10.3_
  - [x] 15.4 Pruebas de integración
    - _Requisitos: 8.4, 9.1–9.4_

## Fase 5: Frontend

- [x] 16. Configurar la base del frontend
  - React Router, TanStack Query, cliente HTTP con interceptor de refresh, Tailwind CSS, estructura de i18n (español)
  - _Requisitos: 11.4, 11.5_

- [x] 17. Implementar autenticación en el frontend
  - `AuthProvider` (access token en memoria), `ProtectedRoute` por rol, pantalla de login, layout por rol
  - Pruebas con React Testing Library
  - _Requisitos: 1.1–1.4, 2.2_

- [x] 18. Implementar vistas de administración y profesor
  - [x] 18.1 Gestión de usuarios (admin)
    - _Requisitos: 2.5_
  - [x] 18.2 Cursos e inscripciones
    - _Requisitos: 3.1, 3.2_
  - [x] 18.3 `QuestionEditor` por tipo, con campos de explicación general y por opción, y listado con filtros
    - _Requisitos: 4.1–4.5_
  - [x] 18.4 `ExamForm` y selector/ordenador de preguntas; publicación
    - _Requisitos: 5.1–5.6_

- [x] 19. Implementar la experiencia del estudiante en modo examen
  - [x] 19.1 Lista de exámenes disponibles y pantalla de elección *Practicar* / *Presentar examen*
    - _Requisitos: 3.3, 7.1_
  - [x] 19.2 `ExamRunner` con temporizador basado en tiempo del servidor, navegación entre preguntas y entrega
    - _Requisitos: 6.9, 6.7_
  - [x] 19.3 Autoguardado con debounce y cola local de reconexión
    - _Requisitos: 6.5, 6.8_
  - [x] 19.4 Detección de cambio de pestaña/pérdida de foco y envío de eventos
    - _Requisitos: 10.2_
  - [x] 19.5 Pruebas de componentes (temporizador, autoguardado, cola offline)

- [x] 20. Implementar la experiencia de modo práctica
  - [x] 20.1 `PracticeRunner`: una pregunta a la vez, botón **Comprobar**, `FeedbackPanel` (acierto/error, respuesta correcta, explicación) y **Siguiente**
    - _Requisitos: 7.3, 7.4, 7.5_
  - [x] 20.2 `PracticeSummary`: puntaje, preguntas falladas con explicaciones y botón "Repetir falladas"
    - _Requisitos: 7.7, 7.8_
  - [x] 20.3 Vista de estadísticas de práctica por tema
    - _Requisitos: 9.5_
  - [x] 20.4 Accesibilidad del feedback (`aria-live`, no depender solo del color)
    - _Requisitos: 11.4_

- [x] 21. Implementar resultados y reportes en el frontend
  - Resultado del estudiante según `mostrar_resultados`
  - Panel del profesor: tabla de calificaciones, gráficos (Recharts), acierto por pregunta, revisión manual de abiertas, eventos de integridad, botón de exportar CSV
  - _Requisitos: 8.4, 9.1–9.4, 10.3_

## Fase 6: Calidad y cierre

- [x] 22. Pruebas end-to-end con Playwright
  - Flujo completo: profesor crea pregunta con explicación → publica examen con práctica → estudiante practica y ve explicación → estudiante presenta examen con vencimiento de tiempo → profesor revisa resultados
  - _Requisitos: 6, 7, 8, 9_

- [x] 23. Pruebas de carga y endurecimiento de seguridad
  - Script k6 con 500 estudiantes iniciando y autoguardando; revisar índices de BD
  - Revisión de cabeceras, CORS, rate limits y autorización a nivel de objeto
  - _Requisitos: 11.1, 11.2, 11.3_

- [x] 24. Documentación y despliegue
  - README con instalación, variables de entorno, migraciones y semillas
  - Dockerfiles de producción y `docker-compose` final
  - _Requisitos: 11.7_
