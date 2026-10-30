# App flow

Pantallas de la aplicación, cómo se conectan y los pasos que sigue el usuario en cada acción.

Las pantallas salieron del grilling de producto (27/10/2026). El registro original está en
[`grilling-results/convenciones-producto.md`](./grilling-results/convenciones-producto.md) (secciones 9 y 10).
Este documento es la versión vigente.

---

## 1. Navegación

- **Web (socios, implementada):** sidebar con Calendario, Reservas, Historial, Biblioteca, Tarifa y Cuenta.
- **Web (staff, implementada):** panel responsive, escritorio primero.
- **App móvil (pendiente):** la hoja de ruta mantiene Expo como siguiente llesca. El flujo de socio descrito aquí sirve como referencia funcional; la navegación prevista es de seis pestañas — Calendario, Mis reservas, Historial, Biblioteca, Mi tarifa y Cuenta —, con el detalle abierto desde Calendario o Biblioteca.
- **Navegación:** "Estado de pago" vive dentro de "Mi tarifa" (semáforo discreto, sin importes).
- **Entrada web:** `/` lleva al calendario del socio o a Hoy del staff según el rol; sin sesión, lleva a `/login`. Si alguien con sesión abre `/login`, vuelve a su inicio correspondiente.
- **Acceso y páginas inexistentes:** las pantallas de socio y staff requieren sesión y rol autorizado. Los 404 conservan el contexto del área cuando sea posible y ofrecen una ruta de vuelta.

## 2. Pantallas del socio (web implementada; referencia para la app móvil pendiente)

1. **Calendario**: semana visible con navegación. El horizonte son cuatro semanas completas de lunes a domingo (la actual y las tres siguientes). Anterior y Siguiente las recorren, y entre ellos hay un selector para saltar a cualquiera. Bajo el título, un selector Dirigidas / Open. El eje de reloj es compartido entre grillas y semanas; parte de la apertura más temprana y el cierre más tardío configurados, y se amplía si una clase excepcional queda fuera. Las pausas y los cierres se muestran como zonas cerradas. Línea principal en cada hora en punto y línea secundaria en los cuartos (:15, :30, :45). El bloque ocupa su duración (2 h mide el doble que 1 h); uno de menos de 1 h no baja de esa altura. La franja la marca el eje; el tipo lo marca el selector. «Apuntado» y «Cancelada» caben dentro sin estirar el bloque. El bloque es la imagen del tipo y `4/12` centrado abajo, sin nombre.
2. **Detalle de clase**: hora, coach, plazas, roster ("Marta G."), botón reservar o cancelar (deshabilitado dentro de las 2 h). Con el catálogo, también la imagen y el nombre del tipo. Si la clase tiene entrenamiento, debajo va el nombre (abre la ficha) y las fases con sus bloques. Si no tiene, esa parte no aparece. Una clase cancelada sigue mostrando el plan. El bloque del calendario no lleva el texto.
3. **Mis reservas**: próximas reservas con opción de cancelar.
4. **Historial**: reservas cuya clase ya empezó, agrupadas por mes (el más reciente arriba). Cada una muestra nombre, día, hora de inicio y fin, dirigida u open, coach si lo hay, y si se canceló. No dice si el socio asistió.
5. **Biblioteca**: entrenamientos de tipos dirigidos. Al entrar, el filtro está en Todos; además lista cada tipo dirigido que tenga al menos uno. La lista va por el último editado, sin páginas. Cada ficha muestra el nombre y el tipo, sin imagen, fecha ni autor. Al abrirla se leen las fases y los bloques en orden. Solo lectura.
6. **Mi tarifa**: nombre y precio de la tarifa, `dirigidas usadas/límite`, `opens usados/límite`, saldo de bono y estado de pago del periodo en curso (si la tarifa lo tiene).
7. **Mi cuenta**: datos personales en solo lectura; cualquier cambio lo hace el staff. Sin cambio de contraseña.

## 3. Pantallas del staff (web, también usable desde el móvil)

1. **Hoy**: clases del día con roster. Tocá una para el detalle.
2. **Semana**: cabecera con **Dirigidas / Open** y texto explicativo; selector de semana encima de la grilla (como Plantilla). Misma densidad de columnas y bloques que la plantilla; ocupación `9/12`. Tocá un bloque para ir al **detalle de la clase**: roster, excepciones sobre la instancia, **añadir socio** y **quitar socio** (con o sin devolver cupo).
3. **Plantilla semanal**: selector **Dirigidas / Open** en la cabecera (como Semana). Cada vista muestra su grilla de lunes a domingo con el mismo eje horario que Semana; cada bloque indica tipo, hora, aforo y coach. En móvil se elige además el día. Al tocar un espacio libre se añade un hueco al borrador; al tocar uno existente se edita o quita. **Aplicar plantilla** confirma y publica desde el lunes siguiente (ambas plantillas en un solo borrador); **Cancelar cambio** descarta el borrador y vuelve al último estado aplicado.
4. **Tipos de clase**: el admin mantiene el catálogo de nombre, imagen obligatoria y grilla (dirigida u open). Un tipo no cambia de grilla.
5. **Excepciones**: listado en rejilla compacta (como Tipos de clase) de anomalías desde hoy — clases extra (sin plantilla), instancias de plantilla modificadas o canceladas. Tocá una fila para ir al detalle (mismas acciones de roster que en Semana). Botón para añadir clase extra en cualquier fecha futura (también fuera del horizonte de Semana). No sustituye a Semana ni a Hoy.
6. **Socios**: tabla y perfil; alta y edición, asignar tarifa, ajustar cupo semanal de dirigidas/opens para la semana actual, cargar o corregir saldo de bono, registrar pagos, resetear contraseña, dar de baja y reactivar.
7. **Equipo**: tabla de cuentas de coach y admin con teléfono y correo. Tocar la fila abre el perfil; el switch de Estado permite activar/desactivar (desactivar pide confirmación). El admin indica DNI al crear la cuenta y puede editar nombre, teléfono y correo desde el perfil; teléfono y correo son opcionales.
8. **Tarifas**: catálogo (nombre, precio, dirigidas/semana, opens/semana, clases del bono).
9. **Impagos**: listado de socios con pago pendiente en su periodo de facturación.
10. **Horario del box**: el admin define uno o más tramos habituales para cada día y añade excepciones por fecha. Un día sin tramos está cerrado. Guardar aplica el cambio inmediatamente; si deja plantillas o clases programadas fuera de apertura, se muestran los conflictos y no se guarda hasta que se ajusten o cancelen desde Plantilla, Semana o Excepciones. Los cierres y las pausas se marcan con un tramado «Cerrado»; en Plantilla no se pueden tocar para añadir clases.
11. **Biblioteca**: listado filtrable por tipo dirigido. En el panel staff, cada fila muestra nombre, tipo y un resumen con los nombres de las fases. Al abrir, el staff lee la ficha y puede editar o borrar. La edición permite añadir, quitar y reordenar fases y bloques con vista previa. Si hay clases vinculadas, guardar pide confirmar el impacto; borrar, o cambiar el tipo si eso suelta clases, también pide confirmación. El socio conserva el listado y la ficha en solo lectura. El entrenamiento se asigna desde la ficha de cada clase, no desde la Biblioteca.

## 4. Flujos principales

### Reservar (socio)

1. Calendario → toca una clase → Detalle de clase.
2. Ve hora, coach, plazas (`X/Y`), roster ("Marta G.") y botón "Reservar".
3. Toca "Reservar" → botón muestra spinner (pantalla no bloqueada).
4. OK → toast "Reserva confirmada" + vuelve al Calendario (plazas actualizadas). La reserva aparece en "Mis reservas".
5. Error → toast con el motivo (`FULL` → "Clase completa", `QUOTA_EXHAUSTED` → "Sin cupo disponible", `OVERLAP` → "Ya tenés otra reserva a esa hora", `NO_MEMBERSHIP` → "Sin membresía activa"); se queda en el detalle.

Sin confirmación al reservar, sin lista de espera, sin actualización en tiempo real.

### Cancelar (socio)

1. Entrada desde "Mis reservas" o desde "Detalle de clase" (si está apuntado).
2. Botón "Cancelar" habilitado solo si faltan >2 h; si no, deshabilitado con "Cancelación cerrada".
3. Tocar "Cancelar" → diálogo "¿Cancelar esta reserva? El cupo vuelve." → confirmar → toast "Reserva cancelada" → vuelve a "Mis reservas" y desaparece de próximas reservas.
4. Si la clase fue cancelada por el box: la reserva figura "Cancelada por el box", sin botón.

### Cambiar tarifa (staff)

1. Socios → ficha del socio → "Cambiar tarifa" → seleccionar nueva tarifa.
2. Advertencia: "Este cambio cancela todas las reservas futuras del socio (N reservas) y devuelve el cupo/saldo. El socio se vuelve a apuntar con la tarifa nueva."
3. Confirmar → cierra la membresía vigente, crea la nueva, cancela las reservas futuras con `quota_returned = true`, conserva el saldo de bono.
4. Toast "Tarifa cambiada. N reservas canceladas."
5. El socio ve en su cuenta la nueva tarifa, cupo y saldo; sus reservas futuras desaparecen de "Mis reservas".

El aviso al socio es previo y humano (PRD). Si N = 0, la advertencia se muestra igual.

### Leer un entrenamiento (socio)

1. Biblioteca → el filtro abre en Todos.
2. Puede quedar en Todos o elegir un tipo dirigido que tenga entrenamientos.
3. Toca una ficha → ve el nombre, el tipo, las fases y los bloques. No puede editar.

Desde el detalle de una clase, el nombre del entrenamiento abre la misma ficha.

### Asociar un entrenamiento (staff)

1. Excepciones → la clase, pasada o futura.
2. Elige un entrenamiento del mismo tipo, o ninguno.
3. La clase queda señalando esa ficha. Las reservas no cambian.
4. El socio lo ve en el detalle, debajo de la hora, el coach, las plazas, el roster y el botón.

### Apuntar o quitar socio (staff)

1. **Semana** (o **Hoy** si es hoy, o **Excepciones** si la fecha cae fuera del horizonte de Semana) → tocá la clase.
2. En el detalle, **Añadir socio** abre el selector de socios activos (mismas reglas de cupo y plazas que al reservar como socio).
3. En la tabla de apuntados, **Quitar y devolver** o **Sin devolver** (el staff decide si el cupo o el saldo vuelve; PRD §7).
4. Toast de confirmación y la grilla de Semana refleja la nueva ocupación al volver.

La ruta `/staff/reservas` redirige a Semana; no hay módulo aparte.

Las confirmaciones de acciones con impacto usan diálogos propios del sistema visual. No se usan confirmaciones nativas del navegador (`window.confirm`, `alert` o `prompt`). Al cancelar una reserva, el socio confirma en un diálogo y vuelve a "Mis reservas".
