CREATE TABLE `zonas_cobertura` (
    `ciudad` VARCHAR(80) NOT NULL,

    PRIMARY KEY (`ciudad`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `clientes` (
    `id` CHAR(36) NOT NULL,
    `nombre` VARCHAR(200) NOT NULL,
    `ciudad` VARCHAR(80) NOT NULL,
    `direccion` VARCHAR(300) NULL,
    `telefono` VARCHAR(20) NULL,
    `creado_en` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `productos` (
    `id` CHAR(36) NOT NULL,
    `nombre` VARCHAR(200) NOT NULL,
    `origen` VARCHAR(200) NOT NULL DEFAULT '',
    `gramaje` INTEGER NOT NULL,
    `precio_unitario` DECIMAL(10, 2) NOT NULL,
    `stock_disponible` INTEGER NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `planes` (
    `id` CHAR(36) NOT NULL,
    `nombre` VARCHAR(200) NOT NULL,
    `descripcion` VARCHAR(500) NOT NULL DEFAULT '',
    `producto_id` CHAR(36) NOT NULL,
    `bolsas_por_entrega` INTEGER NOT NULL,
    `precio_ciclo` DECIMAL(10, 2) NOT NULL,
    `frecuencia` VARCHAR(10) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `retirado_en` DATETIME(3) NULL,

    INDEX `planes_producto_idx`(`producto_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `suscripciones` (
    `id` CHAR(36) NOT NULL,
    `cliente_id` CHAR(36) NOT NULL,
    `plan_id` CHAR(36) NOT NULL,
    `estado` VARCHAR(12) NOT NULL,
    `fecha_inicio` DATE NOT NULL,
    `dia_entrega_preferido` TINYINT NOT NULL,
    `direccion_entrega` VARCHAR(300) NOT NULL,
    `ciudad` VARCHAR(80) NOT NULL,
    `cancelada_en` DATETIME(3) NULL,
    `omisiones_consecutivas` INTEGER NOT NULL DEFAULT 0,
    `creado_en` DATETIME(3) NOT NULL,

    INDEX `suscripciones_cliente_idx`(`cliente_id`),
    INDEX `suscripciones_plan_idx`(`plan_id`),
    INDEX `suscripciones_estado_idx`(`estado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `entregas` (
    `id` CHAR(36) NOT NULL,
    `suscripcion_id` CHAR(36) NOT NULL,
    `plan_id` CHAR(36) NOT NULL,
    `ciclo` INTEGER NOT NULL,
    `fecha_programada` DATE NOT NULL,
    `estado` VARCHAR(12) NOT NULL,
    `bolsas` INTEGER NOT NULL DEFAULT 0,
    `creado_en` DATETIME(3) NOT NULL,

    INDEX `entregas_plan_idx`(`plan_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `planes` ADD CONSTRAINT `planes_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `suscripciones` ADD CONSTRAINT `suscripciones_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `suscripciones` ADD CONSTRAINT `suscripciones_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `planes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `entregas` ADD CONSTRAINT `entregas_suscripcion_id_fkey` FOREIGN KEY (`suscripcion_id`) REFERENCES `suscripciones`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `entregas` ADD CONSTRAINT `entregas_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `planes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
