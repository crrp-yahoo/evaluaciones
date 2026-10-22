-- CreateTable
CREATE TABLE `usuarios` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(120) NOT NULL,
    `email` VARCHAR(190) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `rol` ENUM('admin', 'profesor', 'estudiante') NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `usuarios_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `usuario_id` BIGINT NOT NULL,
    `token_hash` CHAR(64) NOT NULL,
    `expira_en` DATETIME(3) NOT NULL,
    `revocado` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `refresh_tokens_token_hash_key`(`token_hash`),
    INDEX `refresh_tokens_usuario_id_idx`(`usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cursos` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(150) NOT NULL,
    `profesor_id` BIGINT NOT NULL,

    INDEX `cursos_profesor_id_idx`(`profesor_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inscripciones` (
    `curso_id` BIGINT NOT NULL,
    `estudiante_id` BIGINT NOT NULL,

    PRIMARY KEY (`curso_id`, `estudiante_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `preguntas` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `curso_id` BIGINT NOT NULL,
    `autor_id` BIGINT NOT NULL,
    `tipo` ENUM('opcion_multiple', 'seleccion_multiple', 'verdadero_falso', 'abierta') NOT NULL,
    `enunciado` TEXT NOT NULL,
    `puntaje` DECIMAL(6, 2) NOT NULL DEFAULT 1,
    `explicacion` TEXT NULL,
    `respuesta_modelo` TEXT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `tema` VARCHAR(100) NULL,

    INDEX `preguntas_curso_id_idx`(`curso_id`),
    INDEX `preguntas_autor_id_idx`(`autor_id`),
    INDEX `preguntas_tipo_idx`(`tipo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `preguntas_historial` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `pregunta_id` BIGINT NOT NULL,
    `version` INTEGER NOT NULL,
    `contenido` JSON NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `preguntas_historial_pregunta_id_version_key`(`pregunta_id`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `opciones` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `pregunta_id` BIGINT NOT NULL,
    `texto` TEXT NOT NULL,
    `es_correcta` BOOLEAN NOT NULL DEFAULT false,
    `explicacion` TEXT NULL,
    `orden` INTEGER NOT NULL DEFAULT 0,

    INDEX `opciones_pregunta_id_idx`(`pregunta_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `examenes` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `curso_id` BIGINT NOT NULL,
    `titulo` VARCHAR(200) NOT NULL,
    `instrucciones` TEXT NULL,
    `duracion_min` INTEGER NOT NULL,
    `fecha_inicio` DATETIME(3) NOT NULL,
    `fecha_fin` DATETIME(3) NOT NULL,
    `intentos_max` INTEGER NOT NULL DEFAULT 1,
    `aleatorizar` BOOLEAN NOT NULL DEFAULT false,
    `permite_practica` BOOLEAN NOT NULL DEFAULT false,
    `mostrar_resultados` ENUM('nunca', 'al_entregar', 'al_cerrar_examen') NOT NULL DEFAULT 'al_entregar',
    `estado` ENUM('borrador', 'publicado', 'cerrado') NOT NULL DEFAULT 'borrador',

    INDEX `examenes_curso_id_idx`(`curso_id`),
    INDEX `examenes_estado_idx`(`estado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `examen_preguntas` (
    `examen_id` BIGINT NOT NULL,
    `pregunta_id` BIGINT NOT NULL,
    `orden` INTEGER NOT NULL,
    `puntaje` DECIMAL(6, 2) NULL,

    PRIMARY KEY (`examen_id`, `pregunta_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `intentos` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `examen_id` BIGINT NOT NULL,
    `estudiante_id` BIGINT NOT NULL,
    `modo` ENUM('examen', 'practica') NOT NULL,
    `estado` ENUM('en_curso', 'entregado', 'pendiente_revision', 'calificado') NOT NULL DEFAULT 'en_curso',
    `inicio` DATETIME(3) NOT NULL,
    `fin_limite` DATETIME(3) NULL,
    `entregado_en` DATETIME(3) NULL,
    `calificacion` DECIMAL(6, 2) NULL,
    `orden_semilla` INTEGER NOT NULL,
    `ip` VARCHAR(45) NULL,
    `user_agent` VARCHAR(255) NULL,

    INDEX `intentos_examen_id_estudiante_id_modo_idx`(`examen_id`, `estudiante_id`, `modo`),
    INDEX `intentos_estado_fin_limite_idx`(`estado`, `fin_limite`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `intento_preguntas` (
    `intento_id` BIGINT NOT NULL,
    `pregunta_id` BIGINT NOT NULL,
    `version` INTEGER NOT NULL,
    `orden` INTEGER NOT NULL,

    PRIMARY KEY (`intento_id`, `pregunta_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `respuestas` (
    `intento_id` BIGINT NOT NULL,
    `pregunta_id` BIGINT NOT NULL,
    `opciones_elegidas` JSON NULL,
    `texto` TEXT NULL,
    `es_correcta` BOOLEAN NULL,
    `puntaje_obtenido` DECIMAL(6, 2) NULL,
    `comentario_profesor` TEXT NULL,
    `actualizado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`intento_id`, `pregunta_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `eventos_integridad` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `intento_id` BIGINT NOT NULL,
    `tipo` ENUM('perdida_foco', 'cambio_pestana', 'salida_pantalla_completa', 'pegado') NOT NULL,
    `ocurrido_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `eventos_integridad_intento_id_idx`(`intento_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auditoria` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `usuario_id` BIGINT NULL,
    `accion` VARCHAR(100) NOT NULL,
    `detalle` JSON NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cursos` ADD CONSTRAINT `cursos_profesor_id_fkey` FOREIGN KEY (`profesor_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inscripciones` ADD CONSTRAINT `inscripciones_curso_id_fkey` FOREIGN KEY (`curso_id`) REFERENCES `cursos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inscripciones` ADD CONSTRAINT `inscripciones_estudiante_id_fkey` FOREIGN KEY (`estudiante_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `preguntas` ADD CONSTRAINT `preguntas_curso_id_fkey` FOREIGN KEY (`curso_id`) REFERENCES `cursos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `preguntas` ADD CONSTRAINT `preguntas_autor_id_fkey` FOREIGN KEY (`autor_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `preguntas_historial` ADD CONSTRAINT `preguntas_historial_pregunta_id_fkey` FOREIGN KEY (`pregunta_id`) REFERENCES `preguntas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `opciones` ADD CONSTRAINT `opciones_pregunta_id_fkey` FOREIGN KEY (`pregunta_id`) REFERENCES `preguntas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `examenes` ADD CONSTRAINT `examenes_curso_id_fkey` FOREIGN KEY (`curso_id`) REFERENCES `cursos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `examen_preguntas` ADD CONSTRAINT `examen_preguntas_examen_id_fkey` FOREIGN KEY (`examen_id`) REFERENCES `examenes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `examen_preguntas` ADD CONSTRAINT `examen_preguntas_pregunta_id_fkey` FOREIGN KEY (`pregunta_id`) REFERENCES `preguntas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `intentos` ADD CONSTRAINT `intentos_examen_id_fkey` FOREIGN KEY (`examen_id`) REFERENCES `examenes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `intentos` ADD CONSTRAINT `intentos_estudiante_id_fkey` FOREIGN KEY (`estudiante_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `intento_preguntas` ADD CONSTRAINT `intento_preguntas_intento_id_fkey` FOREIGN KEY (`intento_id`) REFERENCES `intentos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `respuestas` ADD CONSTRAINT `respuestas_intento_id_fkey` FOREIGN KEY (`intento_id`) REFERENCES `intentos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `eventos_integridad` ADD CONSTRAINT `eventos_integridad_intento_id_fkey` FOREIGN KEY (`intento_id`) REFERENCES `intentos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
