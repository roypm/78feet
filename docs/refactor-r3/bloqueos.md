# Coordinación de transacciones R3

Todas las operaciones se ejecutan con READ COMMITTED y relectura después del bloqueo. Los índices parciales siguen siendo la última garantía de unicidad. Los casos de uso no reciben transacciones con bloqueos previos ajenos a este protocolo.

| Operación | Orden y alcance | Razón |
|---|---|---|
| Reservar/cancelar | Clase → socio → reserva | Última plaza y consumo compartido entre clases/sedes; relectura tras esperar |
| Tarifa/baja | Socio → tarifa (share al asignar) → membresía/reservas | No se adquieren clases después del socio. Cancelar reservas modifica solo booking, nunca class_instance. Una reserva que esperaba relee estado/membresía |
| Crédito/ajuste | Socio → consumo agregado → escritura | Correcciones concurrentes no dejan saldo/cupo negativo; tarifa se resuelve dentro del bloqueo |
| Extra/edición/restauración | Sede → clase → socios afectados ordenados → reservas | La sede coordina horario/solapes; clase bloquea nuevas reservas antes de contar y cancelar |
| Publicar plantilla | Sede → todas las clases futuras de esa sede en UUID → todos sus socios en UUID → plantilla/instancias/reservas | Se bloquea todo el conjunto antes de propagar cualquiera de los cambios, para evitar ciclos multiclase y con reservas |
| Materializar | Una transacción por sede, sede → consultas → inserciones | Coordina cierres y publicación; conflicto de índice parcial template/date explícito; no sobrescribe instancias existentes |
| Biblioteca | Advisory transaccional 78004/1 → sedes ordenadas → clases vinculadas ordenadas → entrenamiento/fases/bloques | Nombres normalizados únicos y asignación/desvinculación coordinadas. Evita tomar entrenamiento antes de clases cuyo FK puede apuntarle |
| Perfil/contacto/reset | Cuenta de negocio → identidad/credencial/sesiones de su ámbito | Reset y baja borran sesiones de la cuenta elegida. R4 aplica el mismo bloqueo en login y resuelve cuenta/rol en cada petición; ver sus pruebas HTTP |
| Cobro/sede de pago | Socio → pago | La sede histórica se captura en la transacción. Un cobro no modifica cupo, bono ni posibilidad de reservar |
| Catálogo | Fila catálogo; índice único para slugs | Cambiar nombre conserva slug. La asignación de tarifa toma share; el catálogo no toma cuentas o clases después de bloquear tarifa/tipo |

El bloqueo de sede usa FOR NO KEY UPDATE: serializa cambios de horario/plantilla y permite los KEY SHARE de las FK al cambiar preferencia o sede de pago, evitando el ciclo sede → socio / socio → sede. Las lecturas no hacen FOR UPDATE. El calendario agrega ocupación en SQL; consumo agrega por socio y periodo y saldo histórico en SQL. Las páginas filtran/ordenan antes de LIMIT/OFFSET, con desempate ID. Las opciones tienen operaciones separadas de las páginas.

La comparación de catálogos reconstruye las 19 migraciones originales en `r3_reference` dentro de una transacción que termina siempre en rollback. Solo se permite ejecutar el runner en PostgreSQL local `feet_test`. Compara columnas, FK y acciones, PK, checks, índices y predicados. Diferencias explícitas: identidad Better Auth en lugar de email/login/hash/tokenVersion en negocio, y UUID generados por PostgreSQL en lugar del cliente Prisma.

El corte R4 ya retiró los consumidores Prisma y la auth anterior. Next presenta la web y lee por Fastify; API/worker usan exclusivamente estos casos de uso y Drizzle. Las migraciones Prisma se conservan solo como referencia del catálogo histórico. [Verificación R4](../refactor-r4/verificacion.md).
