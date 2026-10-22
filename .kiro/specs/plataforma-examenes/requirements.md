# Documento de Requisitos: Plataforma de Exámenes en Línea

## Introducción

Aplicación web para crear, administrar y presentar exámenes en línea. Soporta tres roles (administrador, profesor, estudiante) y dos modos de uso para los estudiantes: **modo examen** (evaluación oficial, sin retroalimentación durante el intento) y **modo práctica** (retroalimentación inmediata con respuesta correcta y explicación).

**Stack:** React (Vite) · Node.js (Express) · MariaDB · Autenticación JWT.

## Glosario

- **Sistema**: la plataforma de exámenes en línea (frontend + backend).
- **Intento**: una sesión de un estudiante resolviendo un examen, en modo `examen` o `practica`.
- **Modo examen**: intento oficial con límite de tiempo y sin revelar respuestas correctas durante el intento.
- **Modo práctica**: intento no oficial con retroalimentación inmediata por pregunta.
- **Banco de preguntas**: conjunto de preguntas reutilizables creadas por profesores.

---

## Requisitos

### Requisito 1: Autenticación y sesiones

**Historia de usuario:** Como usuario, quiero iniciar sesión de forma segura para acceder a las funciones de mi rol.

#### Criterios de aceptación

1. WHEN un usuario envía credenciales válidas THEN el Sistema SHALL devolver un access token JWT de 15 minutos y establecer un refresh token en una cookie `httpOnly`, `Secure` y `SameSite=Strict`.
2. WHEN un usuario envía credenciales inválidas THEN el Sistema SHALL responder 401 con un mensaje genérico que no revele si el email existe.
3. WHEN el access token expira y existe un refresh token válido THEN el Sistema SHALL emitir un nuevo access token y rotar el refresh token.
4. WHEN un usuario cierra sesión THEN el Sistema SHALL invalidar el refresh token en el servidor.
5. WHEN se superan 5 intentos de login fallidos en 15 minutos desde una misma IP o cuenta THEN el Sistema SHALL bloquear temporalmente nuevos intentos y responder 429.
6. El Sistema SHALL almacenar las contraseñas únicamente como hash (argon2 o bcrypt).

### Requisito 2: Control de acceso por roles

**Historia de usuario:** Como administrador, quiero que cada rol solo acceda a lo que le corresponde para proteger la información.

#### Criterios de aceptación

1. El Sistema SHALL soportar los roles `admin`, `profesor` y `estudiante`.
2. WHEN un usuario intenta acceder a un recurso fuera de los permisos de su rol THEN el Sistema SHALL responder 403.
3. WHEN una petición no incluye un access token válido THEN el Sistema SHALL responder 401.
4. WHEN un profesor accede a preguntas, exámenes o resultados THEN el Sistema SHALL limitar el acceso a los de sus propios cursos.
5. WHEN un administrador crea, edita o desactiva usuarios THEN el Sistema SHALL aplicar el cambio y registrarlo en un log de auditoría.

### Requisito 3: Cursos e inscripciones

**Historia de usuario:** Como profesor, quiero agrupar estudiantes en cursos para asignarles exámenes.

#### Criterios de aceptación

1. WHEN un profesor o administrador crea un curso THEN el Sistema SHALL asociarlo al profesor responsable.
2. WHEN se inscribe un estudiante a un curso THEN el Sistema SHALL impedir inscripciones duplicadas.
3. WHEN un estudiante consulta sus cursos THEN el Sistema SHALL mostrar únicamente aquellos en los que está inscrito.
4. IF un estudiante no está inscrito en el curso de un examen THEN el Sistema SHALL denegarle el acceso a ese examen.

### Requisito 4: Banco de preguntas

**Historia de usuario:** Como profesor, quiero crear y mantener preguntas con su explicación para reutilizarlas en varios exámenes y en el modo práctica.

#### Criterios de aceptación

1. El Sistema SHALL soportar los tipos de pregunta: opción múltiple (una respuesta), selección múltiple (varias respuestas), verdadero/falso y respuesta abierta.
2. WHEN un profesor crea una pregunta THEN el Sistema SHALL requerir enunciado, tipo y puntaje, y para tipos cerrados al menos una opción correcta.
3. WHEN un profesor crea o edita una pregunta THEN el Sistema SHALL permitir registrar una **explicación** general y, opcionalmente, una explicación por cada opción.
4. WHEN una pregunta ya fue usada en intentos finalizados THEN el Sistema SHALL conservar una copia inmutable del contenido usado en esos intentos (versionado) para no alterar resultados históricos.
5. WHEN un profesor filtra el banco THEN el Sistema SHALL permitir filtrar por curso, tema/etiqueta, tipo y texto.
6. IF una pregunta pertenece a otro profesor THEN el Sistema SHALL impedir su edición.

### Requisito 5: Creación y configuración de exámenes

**Historia de usuario:** Como profesor, quiero configurar exámenes con reglas claras para evaluar a mis estudiantes.

#### Criterios de aceptación

1. WHEN un profesor crea un examen THEN el Sistema SHALL permitir definir curso, título, instrucciones, duración en minutos, ventana de disponibilidad (inicio/fin), número máximo de intentos y selección de preguntas con su orden.
2. El Sistema SHALL permitir activar la aleatorización del orden de preguntas y de opciones.
3. El Sistema SHALL permitir indicar si el examen está habilitado para **modo práctica** (`permite_practica`).
4. El Sistema SHALL permitir configurar si, tras entregar, el estudiante ve su resultado, las respuestas correctas y las explicaciones (`mostrar_resultados`: `nunca`, `al_entregar`, `al_cerrar_examen`).
5. IF un examen ya tiene intentos oficiales entregados THEN el Sistema SHALL impedir cambios en sus preguntas y puntajes.
6. WHEN un profesor publica un examen THEN el Sistema SHALL validar que tenga al menos una pregunta y fechas coherentes.

### Requisito 6: Presentación de examen (modo examen)

**Historia de usuario:** Como estudiante, quiero presentar un examen con tiempo límite y que mis respuestas no se pierdan.

#### Criterios de aceptación

1. WHEN un estudiante inicia un examen dentro de su ventana de disponibilidad THEN el Sistema SHALL crear un intento con `fin_limite = ahora_servidor + duración` (limitado por el cierre de la ventana).
2. IF el estudiante ya agotó el número máximo de intentos THEN el Sistema SHALL rechazar el inicio con un error descriptivo.
3. IF existe un intento en curso del mismo examen THEN el Sistema SHALL reanudarlo en lugar de crear uno nuevo.
4. WHILE un intento en modo examen está en curso THEN el Sistema SHALL NOT enviar al cliente ningún dato que revele la respuesta correcta (`es_correcta`, explicaciones).
5. WHEN el cliente envía respuestas (autoguardado) THEN el Sistema SHALL persistirlas de forma idempotente.
6. IF se recibe una respuesta después de `fin_limite` (con tolerancia de gracia de hasta 5 segundos) THEN el Sistema SHALL rechazarla.
7. WHEN el estudiante entrega o vence `fin_limite` THEN el Sistema SHALL cerrar el intento, calificarlo automáticamente y registrar `entregado_en`.
8. IF el cliente pierde conexión THEN el Frontend SHALL conservar las respuestas localmente y reenviarlas al reconectar mientras el intento siga vigente.
9. El Frontend SHALL mostrar un temporizador sincronizado con el tiempo restante calculado por el servidor.
10. IF un intento vence sin que el cliente lo entregue THEN el Sistema SHALL cerrarlo mediante un proceso programado.

### Requisito 7: Modo práctica con retroalimentación

**Historia de usuario:** Como estudiante, quiero practicar y recibir la respuesta correcta y una explicación cuando me equivoque para aprender de mis errores.

#### Criterios de aceptación

1. WHEN un estudiante inicia una práctica de un examen con `permite_practica` activo THEN el Sistema SHALL crear un intento con `modo = 'practica'`.
2. El Sistema SHALL permitir intentos de práctica ilimitados, sin temporizador estricto y sin afectar la calificación oficial.
3. WHEN el estudiante responde una pregunta en práctica THEN el Sistema SHALL devolver inmediatamente si fue correcta, la respuesta correcta y la explicación.
4. IF la respuesta es incorrecta THEN el Sistema SHALL mostrar la respuesta correcta y la explicación asociada (y la explicación de la opción elegida, si existe).
5. IF la pregunta no tiene explicación THEN el Sistema SHALL mostrar solo la respuesta correcta.
6. IF un intento es de modo `examen` THEN el Sistema SHALL responder 403 a cualquier solicitud de retroalimentación inmediata, validando el modo siempre en el servidor.
7. WHEN el estudiante finaliza una práctica THEN el Sistema SHALL mostrar un resumen con puntaje, preguntas falladas y explicaciones.
8. El Sistema SHALL permitir iniciar una práctica solo con las preguntas falladas anteriormente.
9. Los intentos de práctica SHALL excluirse de los reportes de calificaciones oficiales y del conteo de intentos máximos.
10. Respuestas abiertas en práctica SHALL mostrar una respuesta modelo o criterio del profesor, sin calificación automática.

### Requisito 8: Calificación

**Historia de usuario:** Como profesor, quiero calificación automática de preguntas cerradas y manual de las abiertas.

#### Criterios de aceptación

1. WHEN se entrega un intento THEN el Sistema SHALL calificar automáticamente opción múltiple, selección múltiple y verdadero/falso.
2. WHEN una pregunta es de selección múltiple THEN el Sistema SHALL aplicar la regla de puntaje configurada (todo o nada, o proporcional).
3. WHEN existen respuestas abiertas THEN el Sistema SHALL marcar el intento como `pendiente_revision` hasta que el profesor las califique.
4. WHEN el profesor califica manualmente THEN el Sistema SHALL permitir asignar puntaje y comentario, y recalcular la calificación final.
5. El Sistema SHALL calcular la nota en el servidor y NOT confiar en ningún valor de calificación enviado por el cliente.

### Requisito 9: Resultados y reportes

**Historia de usuario:** Como estudiante y profesor, quiero ver resultados y estadísticas para dar seguimiento al aprendizaje.

#### Criterios de aceptación

1. WHEN un estudiante consulta un resultado THEN el Sistema SHALL respetar la configuración `mostrar_resultados` del examen.
2. WHEN un profesor consulta un examen THEN el Sistema SHALL mostrar calificaciones por estudiante, promedio, máximo, mínimo y distribución.
3. El Sistema SHALL mostrar el porcentaje de acierto por pregunta para identificar preguntas problemáticas.
4. El Sistema SHALL permitir exportar calificaciones a CSV.
5. El Sistema SHALL mostrar al estudiante estadísticas de práctica por tema.

### Requisito 10: Integridad académica

**Historia de usuario:** Como profesor, quiero herramientas básicas para reducir el fraude en los exámenes.

#### Criterios de aceptación

1. WHERE la aleatorización está activa THEN el Sistema SHALL generar y persistir un orden distinto de preguntas y opciones por intento.
2. WHEN el estudiante cambia de pestaña o pierde el foco durante un examen THEN el Frontend SHALL notificar el evento y el Sistema SHALL registrarlo con marca de tiempo.
3. WHEN un profesor revisa un intento THEN el Sistema SHALL mostrar el conteo y detalle de eventos sospechosos.
4. El Sistema SHALL registrar IP y user-agent al iniciar cada intento.

### Requisito 11: Requisitos no funcionales

#### Criterios de aceptación

1. El Sistema SHALL usar consultas parametrizadas y validar toda entrada con esquemas (Zod).
2. El Sistema SHALL configurar CORS restringido a orígenes autorizados y cabeceras de seguridad (helmet).
3. El Sistema SHALL soportar al menos 500 estudiantes iniciando un examen simultáneamente con tiempos de respuesta del endpoint de autoguardado por debajo de 500 ms (p95).
4. El Sistema SHALL ofrecer una interfaz responsiva utilizable en móvil y escritorio.
5. El Sistema SHALL tener la interfaz en español con estructura preparada para internacionalización.
6. El Sistema SHALL registrar errores de forma estructurada sin exponer detalles internos al cliente.
7. El Sistema SHALL contar con migraciones de base de datos versionadas y datos semilla para desarrollo.
