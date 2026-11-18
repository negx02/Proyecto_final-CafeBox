CREATE UNIQUE INDEX `entregas_suscripcion_ciclo` ON `entregas`(`suscripcion_id`, `ciclo`);

CREATE INDEX `entregas_fecha_estado_idx` ON `entregas`(`fecha_programada`, `estado`);
