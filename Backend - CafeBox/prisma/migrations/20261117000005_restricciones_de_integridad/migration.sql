ALTER TABLE `productos`
    ADD CONSTRAINT `productos_stock_no_negativo` CHECK (`stock_disponible` >= 0),
    ADD CONSTRAINT `productos_gramaje_positivo` CHECK (`gramaje` > 0),
    ADD CONSTRAINT `productos_precio_positivo` CHECK (`precio_unitario` > 0);

ALTER TABLE `planes`
    ADD CONSTRAINT `planes_bolsas_positivas` CHECK (`bolsas_por_entrega` > 0),
    ADD CONSTRAINT `planes_precio_positivo` CHECK (`precio_ciclo` > 0),
    ADD CONSTRAINT `planes_frecuencia_valida`
        CHECK (`frecuencia` IN ('SEMANAL', 'QUINCENAL', 'MENSUAL'));

ALTER TABLE `suscripciones`
    ADD CONSTRAINT `suscripciones_estado_valido`
        CHECK (`estado` IN ('ACTIVA', 'PAUSADA', 'SUSPENDIDA', 'CANCELADA')),
    ADD CONSTRAINT `suscripciones_dia_valido`
        CHECK (`dia_entrega_preferido` BETWEEN 1 AND 7),
    ADD CONSTRAINT `suscripciones_ciclos_no_negativos` CHECK (`ciclos_generados` >= 0),
    ADD CONSTRAINT `suscripciones_omisiones_no_negativas` CHECK (`omisiones_consecutivas` >= 0),
    ADD CONSTRAINT `suscripciones_pausa_coherente`
        CHECK ((`pausada_desde` IS NULL AND `pausada_hasta` IS NULL)
               OR (`pausada_desde` IS NOT NULL AND `pausada_hasta` IS NOT NULL
                   AND `pausada_hasta` > `pausada_desde`));

ALTER TABLE `entregas`
    ADD CONSTRAINT `entregas_ciclo_positivo` CHECK (`ciclo` > 0),
    ADD CONSTRAINT `entregas_bolsas_no_negativas` CHECK (`bolsas` >= 0),
    ADD CONSTRAINT `entregas_estado_valido`
        CHECK (`estado` IN ('PROGRAMADA', 'SALTADA', 'ARMADA', 'ENVIADA', 'ENTREGADA'));

ALTER TABLE `cobros`
    ADD CONSTRAINT `cobros_ciclo_positivo` CHECK (`ciclo` > 0),
    ADD CONSTRAINT `cobros_monto_no_negativo` CHECK (`monto` >= 0),
    ADD CONSTRAINT `cobros_estado_valido`
        CHECK (`estado` IN ('PENDIENTE', 'COBRADO', 'FALLIDO', 'CANCELADO'));

ALTER TABLE `pausas`
    ADD CONSTRAINT `pausas_rango_valido` CHECK (`hasta` > `desde`);

ALTER TABLE `saltos`
    ADD CONSTRAINT `saltos_ciclo_positivo` CHECK (`ciclo` > 0);

ALTER TABLE `cambios_de_plan`
    ADD CONSTRAINT `cambios_ciclo_positivo` CHECK (`ciclo_aplica` > 0),
    ADD CONSTRAINT `cambios_estado_valido`
        CHECK (`estado` IN ('SOLICITADO', 'CONFIRMADO', 'RECHAZADO')),
    ADD CONSTRAINT `cambios_de_plan_distinto`
        CHECK (`plan_anterior_id` <> `plan_nuevo_id`);

ALTER TABLE `usuarios`
    ADD CONSTRAINT `usuarios_rol_valido` CHECK (`rol` IN ('ADMIN', 'CLIENTE')),
    ADD CONSTRAINT `usuarios_admin_sin_cliente`
        CHECK ((`rol` = 'ADMIN' AND `cliente_id` IS NULL)
               OR (`rol` = 'CLIENTE' AND `cliente_id` IS NOT NULL));

ALTER TABLE `clientes`
    ADD CONSTRAINT `clientes_nombre_no_vacio` CHECK (CHAR_LENGTH(TRIM(`nombre`)) > 0),
    ADD CONSTRAINT `clientes_ciudad_no_vacia` CHECK (CHAR_LENGTH(TRIM(`ciudad`)) > 0),
    ADD CONSTRAINT `clientes_ultimos4_valido`
        CHECK (`pago_ultimos4` IS NULL OR `pago_ultimos4` REGEXP '^[0-9]{4}$');
