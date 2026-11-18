ALTER TABLE `suscripciones`
    ADD COLUMN `ciclos_generados` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `pausada_desde` DATE NULL,
    ADD COLUMN `pausada_hasta` DATE NULL;

ALTER TABLE `entregas`
    ADD COLUMN `motivo_salto` VARCHAR(40) NULL,
    ADD COLUMN `armada_en` DATETIME(3) NULL,
    ADD COLUMN `enviada_en` DATETIME(3) NULL,
    ADD COLUMN `entregada_en` DATETIME(3) NULL;

ALTER TABLE `clientes`
    ADD COLUMN `pago_titular` VARCHAR(120) NULL,
    ADD COLUMN `pago_ultimos4` CHAR(4) NULL;

CREATE TABLE `cobros` (
    `id` CHAR(36) NOT NULL,
    `suscripcion_id` CHAR(36) NOT NULL,
    `entrega_id` CHAR(36) NULL,
    `ciclo` INTEGER NOT NULL,
    `monto` DECIMAL(10, 2) NOT NULL,
    `estado` VARCHAR(12) NOT NULL,
    `fecha` DATE NOT NULL,
    `motivo_fallo` VARCHAR(200) NULL,
    `creado_en` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cobros_entrega_unico`(`entrega_id`),
    UNIQUE INDEX `cobros_suscripcion_ciclo`(`suscripcion_id`, `ciclo`),
    INDEX `cobros_estado_fecha_idx`(`estado`, `fecha`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `pausas` (
    `id` CHAR(36) NOT NULL,
    `suscripcion_id` CHAR(36) NOT NULL,
    `desde` DATE NOT NULL,
    `hasta` DATE NOT NULL,
    `creado_en` DATETIME(3) NOT NULL,

    INDEX `pausas_suscripcion_idx`(`suscripcion_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `saltos` (
    `id` CHAR(36) NOT NULL,
    `suscripcion_id` CHAR(36) NOT NULL,
    `ciclo` INTEGER NOT NULL,
    `creado_en` DATETIME(3) NOT NULL,

    UNIQUE INDEX `saltos_suscripcion_ciclo`(`suscripcion_id`, `ciclo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `cambios_de_plan` (
    `id` CHAR(36) NOT NULL,
    `suscripcion_id` CHAR(36) NOT NULL,
    `plan_anterior_id` CHAR(36) NOT NULL,
    `plan_nuevo_id` CHAR(36) NOT NULL,
    `ciclo_aplica` INTEGER NOT NULL,
    `estado` VARCHAR(12) NOT NULL,
    `solicitado_en` DATETIME(3) NOT NULL,
    `resuelto_en` DATETIME(3) NULL,

    INDEX `cambios_suscripcion_idx`(`suscripcion_id`),
    INDEX `cambios_plan_anterior_idx`(`plan_anterior_id`),
    INDEX `cambios_plan_nuevo_idx`(`plan_nuevo_id`),
    INDEX `cambios_estado_idx`(`estado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `cobros` ADD CONSTRAINT `cobros_suscripcion_id_fkey` FOREIGN KEY (`suscripcion_id`) REFERENCES `suscripciones`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `cobros` ADD CONSTRAINT `cobros_entrega_id_fkey` FOREIGN KEY (`entrega_id`) REFERENCES `entregas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `pausas` ADD CONSTRAINT `pausas_suscripcion_id_fkey` FOREIGN KEY (`suscripcion_id`) REFERENCES `suscripciones`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `saltos` ADD CONSTRAINT `saltos_suscripcion_id_fkey` FOREIGN KEY (`suscripcion_id`) REFERENCES `suscripciones`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `cambios_de_plan` ADD CONSTRAINT `cambios_de_plan_suscripcion_id_fkey` FOREIGN KEY (`suscripcion_id`) REFERENCES `suscripciones`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `cambios_de_plan` ADD CONSTRAINT `cambios_de_plan_plan_anterior_id_fkey` FOREIGN KEY (`plan_anterior_id`) REFERENCES `planes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `cambios_de_plan` ADD CONSTRAINT `cambios_de_plan_plan_nuevo_id_fkey` FOREIGN KEY (`plan_nuevo_id`) REFERENCES `planes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
