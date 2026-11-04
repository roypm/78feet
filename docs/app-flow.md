# App flow

Pantallas de la aplicación, cómo se conectan y los pasos que sigue el usuario en cada acción.

Las pantallas salieron del grilling de producto (27/10/2026). El registro original está en
[`grilling-results/convenciones-producto.md`](./grilling-results/convenciones-producto.md) (secciones 9 y 10).
Este documento es la versión vigente.

---

## 1. Navegación

- **Web (socios, implementada):** marca con enlace al Calendario y botón visible para plegar; perfil con foto o iniciales; secciones Entrenamiento (Calendario, Mis reservas, Biblioteca) y Mi cuenta (Historial, Mi tarifa).
- **Web (staff, implementada):** marca con enlace a Hoy y control de plegado; perfil con nombre, foto y rol; Actividad (Hoy, Semana, Excepciones, Biblioteca), Gestión (Socios, Impagos, Equipo) y Configuración del box (Plantilla, Tipos de clase, Horario del box, Tarifas). Se aplican los permisos de cada enlace.
- **Controles comunes:** pie con tema y Cerrar sesión; el plegado se recuerda por navegador y los iconos conservan ayudas. En móvil, el botón de cabecera abre el panel y navegar lo cierra. En los detalles de clase del staff se mantiene seleccionada la vista de origen; al entrar directamente se selecciona Semana. Las pantallas del staff que cuelgan de otra (ficha de socio y pagos, perfil de equipo, ficha y alta/edición de entrenamiento, detalle de clase) muestran migas encima del título; la sección es enlace y la página actual no. Los listados, Hoy, Semana, Plantilla, Horario y la app del socio no llevan miga.
- Alta de socio y nueva cuenta de equipo siguen en diálogo sobre el listado: no hay ruta anidada ni miga «Nuevo socio» / «Nueva cuenta».
- **Apariencia:** las cuentas nuevas empiezan en Sistema; también se puede elegir Claro u Oscuro desde el menú o Mi perfil. La preferencia se guarda en el perfil y se recupera desde la primera carga al volver a entrar. Sistema sigue el sistema operativo del dispositivo; Claro y Oscuro lo anulan. La pantalla de acceso sin sesión sigue el sistema, así que no cambia al entrar en una cuenta que también usa Sistema. Las preferencias existentes se conservan.
- **App móvil (pendiente):** la hoja de ruta mantiene Expo como siguiente llesca. El flujo de socio descrito aquí sirve como referencia funcional; la navegación prevista es de seis pestañas — Calendario, Mis reservas, Historial, Biblioteca, Mi tarifa y Cuenta —, con el detalle abierto desde Calendario o Biblioteca.
- **Navegación:** "Estado de pago" vive dentro de "Mi tarifa" (semáforo discreto, sin importes).
- **Entrada web:** `/` lleva al calendario del socio o a Hoy del staff según el rol; sin sesión, lleva a `/login`. Si alguien con sesión abre `/login`, vuelve a su inicio correspondiente.
- **Acceso y páginas inexistentes:** las pantallas de socio y staff requieren sesión y rol autorizado. Los 404 conservan el contexto del área cuando sea posible y ofrecen una ruta de vuelta.

## 2. Pantallas del socio (web implementada; referencia para la app móvil pendiente)

1. **Calendario**: semana visible con navegación. El horizonte son cuatro semanas completas de lunes a domingo (la actual y las tres siguientes). Anterior y Siguiente las recorren, y entre ellos hay un selector para saltar a cualquiera. Arriba, el box; debajo, Dirigidas / Open. Sin box en la URL abre el de preferencia. Elegir otro lo guarda para la próxima entrada. El eje de reloj es el de ese box; parte de su apertura más temprana y su cierre más tardío, y se amplía si una clase excepcional queda fuera. Las pausas y los cierres se muestran como zonas cerradas. Línea principal en cada hora en punto y línea secundaria en los cuartos (:15, :30, :45). El bloque ocupa su duración (2 h mide el doble que 1 h); uno de menos de 1 h no baja de esa altura. La franja la marca el eje; el tipo lo marca el selector. «Apuntado» y «Cancelada» caben dentro sin estirar el bloque. Con foto, el bloque es la imagen del tipo y `4/12` centrado abajo, sin nombre. Sin foto, superficie neutra con el nombre del tipo y el aforo.
2. **Detalle de clase**: hora, foto y nombre del coach (si hay), plazas, roster con avatar y nombre abreviado ("Marta G."), botón reservar o cancelar (deshabilitado dentro de las 2 h). Sin foto se muestran iniciales. Con el catálogo, también la imagen y el nombre del tipo. Si la clase tiene entrenamiento, debajo va el nombre (abre la ficha) y las fases con sus bloques. Si no tiene, esa parte no aparece. Una clase cancelada sigue mostrando el plan. El bloque del calendario no lleva el texto.
3. **Mis reservas**: próximas reservas, de cualquier box, con el nombre del box junto a la hora y opción de cancelar. No se esconden al cambiar la preferencia. El historial tampoco.
4. **Historial**: reservas cuya clase ya empezó, agrupadas por mes (el más reciente arriba). Cada una muestra nombre, día, hora de inicio y fin, dirigida u open, coach si lo hay, y si se canceló. No dice si el socio asistió.
5. **Biblioteca**: entrenamientos de tipos dirigidos. Al entrar, el filtro está en Todos; además lista cada tipo dirigido que tenga al menos uno. La lista va por el último editado, sin páginas. Cada ficha muestra el nombre y el tipo, sin imagen, fecha ni autor. Al abrirla se leen las fases y los bloques en orden. Solo lectura.
6. **Mi tarifa**: nombre y precio de la tarifa, rango del periodo de consumo en curso, `dirigidas usadas/límite`, `opens usados/límite` (un cupo ilimitado se lee `usadas/Ilimitadas`; el cero se lee como cero), saldo de bono y estado de pago del periodo de facturación (si la tarifa lo tiene). Consumo y facturación pueden tener ciclos distintos.
7. **Mi perfil**: datos personales en solo lectura; la persona puede subir, reemplazar o quitar su foto. La foto aparece también junto a su nombre en la barra lateral. El resto de los cambios los hace el staff; no hay cambio de contraseña. El acceso al perfil y el cierre de sesión están separados de los módulos principales en la barra lateral.

## 3. Pantallas del staff (web, también usable desde el móvil)

1. **Hoy**: selector de box y, debajo, Dirigidas y Open de ese box (las dos en pantalla ancha y una en pantalla estrecha). Tocá una para el detalle.
2. **Semana**: arriba el box, debajo **Dirigidas / Open**, y el selector de semana encima de la grilla. Se ve una sola grilla, la del box de la URL; si no viene box, el primero. Misma densidad de columnas y bloques que la plantilla; ocupación `9/12`. Tocá un bloque para ir al **detalle de la clase**: el box junto a la hora, roster con fotos y nombres, foto del coach asignado, excepciones sobre la instancia, **añadir socio** y **quitar socio** (con o sin devolver cupo).
3. **Plantilla semanal**: arriba el box, debajo **Dirigidas / Open**. Cada vista muestra la grilla de ese box, de lunes a domingo, con el mismo eje horario que Semana; la cajita muestra aforo (y el nombre del tipo si no hay foto), no el coach. El coach sigue en el formulario, en el detalle y en el nombre accesible al enfocar. En móvil se elige además el día. Al tocar un espacio libre se añade un hueco al borrador; al tocar uno existente se edita o quita. **Aplicar plantilla** confirma y publica desde el lunes siguiente solo el box en pantalla; **Cancelar cambio** descarta el borrador de esa grilla.
4. **Tipos de clase**: el admin mantiene el catálogo de nombre, grilla (dirigida u open) e imagen opcional. Un tipo no cambia de grilla. Sin foto, el hueco de la card es un recuadro neutro; el nombre sigue al lado.
5. **Excepciones**: listado, sin filtrar por box, de anomalías desde hoy — clases extra (sin plantilla), instancias de plantilla modificadas o canceladas. La card dice el box. Sin foto, el hueco de la card es un recuadro neutro. Tocá una fila para ir al detalle (mismas acciones de roster que en Semana). Desde el detalle se puede quitar una clase extra futura: si no tiene reservas registradas se elimina; si tiene historial, se cancela, se devuelven los cupos de las reservas activas y se conserva la ficha. Una instancia modificada de una plantilla activa puede restaurarse desde sus valores actuales si sigue correspondiendo a ese día; el diálogo explica el impacto sobre reservas y cupos. Una clase cancelada se puede recuperar, pero sus reservas no vuelven solas. Botón para añadir clase extra en cualquier fecha futura (también fuera del horizonte de Semana); el formulario pide el box. No sustituye a Semana ni a Hoy.
6. **Socios**: tabla y perfil; alta y edición, asignar tarifa, ajustar dirigidas/opens del periodo de consumo en curso (semana o mes, según la tarifa; solo un cupo con tope), cargar o corregir saldo de bono, registrar pagos, resetear contraseña, dar de baja y reactivar. El alta trae el primer box como pago y preferencia, y el staff puede cambiar el de pago antes de guardar. La tabla muestra el box de pago y no se filtra. Encima se lee cuántos socios activos pagan en cada box. En la ficha el staff cambia el de pago; no cancela reservas ni reescribe pagos. La ficha muestra el rango ajustado. Un cupo ilimitado se lee con las usadas y la palabra Ilimitadas.
7. **Equipo**: tabla de cuentas de coach y admin con avatar, teléfono y correo. El buscador filtra las cuentas cargadas por nombre, usuario, teléfono, correo o rol; «Añadir cuenta» queda junto al campo. Tocar la fila abre el perfil con avatar; el switch de Estado permite activar/desactivar (desactivar pide confirmación). El admin indica DNI al crear la cuenta y puede editar nombre, teléfono y correo desde el perfil; teléfono y correo son opcionales.
8. **Mi perfil (staff)**: coach y admin consultan su nombre, DNI, datos de contacto, usuario de acceso y rol; también pueden subir, reemplazar o quitar su foto. El resto de los cambios se solicitan a un admin.
9. **Tarifas**: catálogo (nombre, precio, dirigidas y opens por semana o por mes según el consumo — número, cero o Ilimitadas por separado; el bono no tiene esa opción —, clases del bono).
10. **Impagos**: listado de socios con pago pendiente en su periodo de facturación. Abre con todos y se puede dejar en un solo box de pago.
11. **Horario del box**: selector de box, sin grilla. El admin añade y renombra ahí; dos boxes no pueden llamarse igual. Un box nuevo nace con la plantilla vacía y abierto de 07:00 a 21:00. El admin define uno o más tramos habituales para cada día de ese box y añade excepciones por fecha. Un día sin tramos está cerrado. Guardar aplica el cambio inmediatamente a ese box; si deja su plantilla o sus clases programadas fuera de apertura, se muestran los conflictos y no se guarda hasta que se ajusten o cancelen desde Plantilla, Semana o Excepciones. Los cierres y las pausas se marcan con un tramado «Cerrado»; en Plantilla no se pueden tocar para añadir clases.
12. **Biblioteca**: listado filtrable por tipo dirigido. En el panel staff, el buscador filtra por nombre o tipo dentro de la página actual, con «Nuevo entrenamiento» junto al campo; cada fila muestra nombre, tipo y un resumen con los nombres de las fases. Al abrir, el staff lee la ficha y puede editar o borrar. Cada entrada en Nuevo entrenamiento abre el formulario vacío; editar uno ya guardado sigue cargando ese entrenamiento. El nombre se puede dejar vacío (al guardar queda la fecha de Madrid, única). La edición permite añadir, quitar (hasta ninguna: vuelven los dos botones de cómo empezar) y reordenar fases y bloques con vista previa. Guardar exige al menos una fase. Si el nombre ya existe, el aviso sale bajo el campo. Cancelar y Guardar quedan fijos al pie; el último campo sube entero por encima de esa barra. Si hay clases vinculadas, guardar pide confirmar el impacto; borrar, o cambiar el tipo si eso suelta clases, también pide confirmación. El socio conserva el listado y la ficha en solo lectura. El entrenamiento se asigna desde la ficha de cada clase, no desde la Biblioteca.

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

## Paginación de listados

Socios, Impagos y Biblioteca (staff y socio) usan `?pagina=N`; los enlaces conservan el filtro de estado o tipo. Cambiar de filtro comienza en la primera página. El pie muestra rango y total, página actual y controles Anterior/Siguiente con los extremos deshabilitados. Una lista vacía mantiene su mensaje habitual.

## Feedback de interfaz

Las pantallas de datos muestran skeletons durante la carga inicial. Las navegaciones lentas entre filtros, semanas, páginas y fichas muestran feedback en el enlace o fila activados; los filtros activos siguen representando los datos visibles hasta completar la navegación. Guardar, reservar, cancelar y gestionar saldo muestran un estado pendiente hasta completar la petición y la actualización de pantalla, sin permitir envíos duplicados desde el mismo control.

Los vacíos ofrecen el siguiente paso que corresponda: calendario sin reservas, limpiar búsqueda o filtro, crear datos iniciales si el rol lo permite o pedir la configuración al admin. Socios, Impagos y Biblioteca staff buscan dentro de la página actual y lo indican cuando no hay coincidencias. Un día cerrado, un saldo cero y la ausencia de un coach son estados válidos. Los fallos de carga ofrecen recuperación y se distinguen de una lista vacía.
