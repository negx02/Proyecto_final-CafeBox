CREATE TABLE `usuarios` (
    `id` CHAR(36) NOT NULL,
    `correo` VARCHAR(255) NOT NULL,
    `contrasena_hash` VARCHAR(100) NOT NULL,
    `rol` VARCHAR(10) NOT NULL,
    `cliente_id` CHAR(36) NULL,
    `creado_en` DATETIME(3) NOT NULL,

    UNIQUE INDEX `usuarios_correo_unico`(`correo`),
    UNIQUE INDEX `usuarios_cliente_unico`(`cliente_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
