# PRD — gestión de los boxes de una empresa de CrossFit

Qué se construye, para quién y qué debe hacer.

Las decisiones de producto salieron de una sesión de grilling (27/10/2026) antes de escribir código.
El registro original de esa sesión está en
[`grilling-results/convenciones-producto.md`](./grilling-results/convenciones-producto.md) y no se edita.
Este documento es la versión vigente: si algo no coincide, manda este.

Cómo se construye (arquitectura, modelo de datos, API) está en [`trd.md`](./trd.md).

---

## 1. Contexto

- **Una sola empresa.** Un box es una sede de esa empresa y puede haber más de una. Lo que ya existía queda como el primer box, con el nombre Box 1 y el horario que tenía.
- Tarifas, biblioteca, tipos de clase y equipo son de la empresa. El horario de apertura, los cierres y las pausas por fecha, la plantilla semanal y las clases son de cada box.
- Dos grillas en el calendario de cada box:
  - **Dirigida**: clase con tipo, aforo e imagen opcional. El coach, si lo hay, es del hueco.
  - **Open**: la otra grilla. También es un tipo con aforo e imagen opcional, sin plan de entrenamiento. El coach del hueco sigue siendo opcional.
- Dentro de un box caben **dos sesiones a la vez**: una en la grilla **Dirigida** y otra en **Open**. En cada grilla no puede haber dos huecos solapados; entre grillas sí pueden coincidir en hora. Entre boxes, las clases pueden coincidir en hora. Una clase tiene que caer dentro del horario de su propio box.
- El box elegido va en la dirección de la página. Semana, Plantilla, Hoy y Horario, si no traen box, abren la **sede por defecto** de la cuenta (Mi perfil). El calendario del socio abre su sede por defecto. Elegir otra sede en el selector **no** cambia ese ajuste; solo se modifica en Mi perfil. Cambiar Dirigidas u Open no cambia la preferencia.
- El admin **crea sedes y renombra** cada box desde el módulo **Sedes** del panel (nombres únicos). Una sede nueva nace con plantilla vacía y horario 07:00–21:00; no se borra en v1.
- Cada socio tiene un box de pago y uno de preferencia. Nacen los dos con el box del alta; si no se cambia, es el primero. El staff ve y cambia el de pago en el alta y en la ficha. Eso no cancela reservas ni reescribe pagos. La preferencia la cambia el socio solo en Mi perfil (tema y sede por defecto); elegir otra sede en el calendario o en el selector del staff no la modifica.
- El cupo sigue siendo de la empresa: reservar en otro box gasta el mismo cupo. Una persona no puede tener dos reservas a la misma hora, aunque sean boxes distintos.
- Excepciones lista las de todos los boxes y dice cuál es. Añadir una clase extra pide el box. Publicar la plantilla afecta solo al box que está en pantalla.

## 2. Personas y permisos

| Acción | Socio | Coach | Admin |
|---|---|---|---|
| Ver calendario, plazas y roster | sí | sí | sí |
| Ver, subir, reemplazar y quitar la propia foto de perfil | sí | sí | sí |
| Cambiar el tema propio (sistema, claro u oscuro) | sí | sí | sí |
| Ver la biblioteca de entrenamientos | sí | sí | sí |
| Ver el historial de sus reservas | sí | — | — |
| Crear, editar y borrar entrenamientos | — | sí | sí |
| Asociar un entrenamiento a una clase | — | sí | sí |
| Reservar para sí mismo | sí | — | — |
| Cancelar su propia reserva | sí (hasta 2 h antes) | — | — |
| Crear reserva a nombre de un socio | — | sí | sí |
| Cancelar reserva de un socio (y elegir si devuelve cupo) | — | sí | sí |
| Alta y edición de socios | — | sí | sí |
| Asignar tarifa y saldo de bono | — | sí | sí |
| Ajustar cupo individual del periodo en curso | — | sí | sí |
| Registrar pago del periodo de facturación | — | sí | sí |
| Resetear contraseña de un socio | — | sí | sí |
| Cancelar / modificar una clase puntual (excepción) | — | sí | sí |
| Catálogo de tarifas y precios | — | — | sí |
| Plantilla semanal y aforos por defecto | — | — | sí |
| Catálogo de tipos de clase (nombre, imagen opcional, grilla) | — | — | sí |
| Definir horario semanal y excepciones de apertura | — | — | sí |
| Consultar el perfil propio de staff | — | sí | sí |
| Crear, activar/desactivar cuentas de staff, consultar perfiles ajenos y editar sus datos de contacto | — | — | sí |
| Dar de baja o reactivar a un socio | — | — | sí |

Reglas:

- **Los roles no se acumulan.** Un coach que además entrena tiene **dos cuentas**: una `coach` (staff, no reserva) y una `socio`.
- **No hay auto-registro.** Toda cuenta la crea el staff.
- La cuenta `coach` no puede reservar; la cuenta `socio` no puede administrar.

Cada cuenta nueva sigue el tema del sistema por defecto. Puede elegir Sistema, Claro u Oscuro desde el menú o Mi perfil. La preferencia se guarda en su perfil y se mantiene entre dispositivos; en Sistema, cada dispositivo aplica su propia preferencia del sistema operativo. El login también sigue el sistema hasta conocer la preferencia de la cuenta. Las preferencias existentes se conservan. El personal cambia únicamente su propia preferencia.

## 3. Acceso

**Decisión para el refactor:** cada cuenta tendrá correo real obligatorio, conservado como dato de cuenta. El acceso seguirá siendo DNI + contraseña para socios y usuario + contraseña para staff. No se enviarán ni recibirán correos: sin verificación, enlaces de acceso ni recuperación por email. El staff mantiene el control de altas y resets. Una persona socio y staff conserva dos cuentas con roles y contraseñas independientes; puede usar el mismo correo real en ambas. No se fusionan por correo ni se acumulan permisos. La dirección se guarda sin marcarla verificada; al no verificar no se demuestra propiedad del buzón. Su implementación se ejecutará según [el plan de refactor](../PLAN-REFACTOR.md); el código actual todavía permite correo opcional.

- Los **socios** entran con **DNI + contraseña**. Los **staff** entran con **usuario + contraseña** (el coach que entrena tiene dos cuentas con el mismo DNI, así que el identificador del staff es un usuario elegido por el admin).
- El staff **fija la contraseña** en el alta y la **resetea** cuando haga falta. El socio no la cambia desde la app.
- Al crear una cuenta de staff, el admin debe indicar el DNI de la persona. El DNI puede coincidir con el de su cuenta de socio; el acceso del staff sigue usando un usuario elegido por el admin.
- **No hay recuperación automática**: no se envían emails. El que se olvida espera a que el staff se la resetee.
- Las contraseñas se guardan hasheadas. Nadie puede verlas desde ningún panel; si se pierde, se resetea.

## 4. Tarifas

### 4.1 Tipos de tarifa

Cada fila del catálogo combina **dos ejes** independientes:

| Consumo | Facturación | Precio | Cupo | Comportamiento |
|---|---|---|---|---|
| **Cupo semanal** | mensual, trimestral, semestral o anual | € / periodo | N dirigidas + M opens por semana (número, cero o Ilimitadas, por separado) | El cupo se renueva solo cada semana. No vence. |
| **Cupo mensual** | mensual, trimestral, semestral o anual | € / periodo | N dirigidas + M opens por mes natural (número, cero o Ilimitadas, por separado) | El cupo se renueva el día 1. No vence. |
| **Cupo semanal o mensual** | sin cobro (`0 €`) | 0 € | ej. 3 dirigidas + 0 opens por periodo | Prueba: misma mecánica de reservas, sin estado de pago periódico. |
| **Bono** | pago único | pago único | X clases | Saldo que se consume hasta agotarse. Sin caducidad. |

El catálogo de tarifas lo administra **solo el admin**. El ciclo de consumo (semana o mes natural) es independiente del ciclo de facturación. Coach y admin pueden ajustar por separado dirigidas y opens del periodo de consumo en curso, solo en un cupo que tiene tope. Un cupo ilimitado no se ajusta. El bono no tiene opción de ilimitado.

### 4.2 Cupo semanal (tarifas mensuales)

- La semana es **natural, de lunes a domingo** (zona `Europe/Madrid`).
- El cupo se cuenta **contra la semana a la que pertenece la clase**, no contra la semana en que se reserva. Reservar el martes la clase del lunes siguiente consume cupo de la semana siguiente.
- Dirigidas y opens son **contadores separados**. Cada uno admite un número, cero o Ilimitadas. Cero significa que ese cupo no entra. Ilimitadas no pide número: quien reserva no choca con ese tope (siguen valiendo plazas, solape y el otro cupo si tiene tope).
- El cupo **no se acumula**: lo que no se usa, se pierde.
- Con el calendario abierto a 4 semanas, un socio puede comprometer su cupo de varias semanas a la vez. Es aceptado: quien reserva temprano gana.

### 4.3 Cupo mensual

- El periodo es el **mes natural**, del día 1 al último día del mes, en la zona `Europe/Madrid`.
- Se cuenta contra el **mes de la clase**, no el mes en que se hace la reserva.
- Dirigidas y opens son contadores separados; el cupo no usado no pasa al mes siguiente. Cada uno admite un número, cero o Ilimitadas, con las mismas reglas que el cupo semanal.
- Reservar con antelación una clase de otro mes compromete el cupo de ese mes.
- Un alta o cambio a una tarifa mensual a mitad de mes da el cupo mensual completo, sin prorrateo. Las reservas con pool de cupo que ya cuenten en ese mes se consideran consumidas frente al nuevo límite; las reservas futuras se cancelan al cambiar de tarifa según §4.5.
- Coach y admin pueden ajustar por separado el cupo de dirigidas y opens del mes en curso. Los ajustes no se trasladan al mes siguiente.

### 4.4 Saldo de bono (desborde del cupo)

- El cupo del periodo (semanal o mensual) **se consume primero**. Cuando se agota, la reserva sale del **saldo de bono**, tanto para dirigidas como para opens.
- El saldo es **único**: "te quedan 4 clases" sirve para cualquier tipo de sesión.
- **Cualquier socio puede llevar saldo de bono**, no solo el que empezó con bono: es la misma mecánica para vender "5 clases extra" a un mensual.
- El saldo **no caduca**.
- El staff **recarga** el saldo cuando el socio paga.
- En la ficha del socio, coach y admin pueden ajustar por separado el cupo de dirigidas y opens del periodo en curso, solo si ese cupo tiene tope. En Mi tarifa y en la ficha, un cupo ilimitado se lee con las usadas y la palabra Ilimitadas; uno que es cero se lee como cero.
- Al cambiar de tarifa, **el saldo se conserva** y sigue funcionando como desborde.
- Un socio **solo bono** no tiene límite periódico: puede gastar el saldo cuando quiera.
- En su pantalla de tarifa, el socio ve tres números: `2 dirigidas + 2 opens + 4 bono`.

### 4.5 Cambio de tarifa

- Se aplica **de inmediato**, en el mismo usuario. No se crea un socio nuevo.
- **Cualquier cambio de tarifa cancela todas las reservas futuras del socio**, devolviendo el cupo o el saldo. Aplica también al subir de tarifa.
- Si la nueva tarifa tiene cupo semanal o mensual, recibe el límite completo del periodo actual, sin prorrateo. En el mes de un cambio, las reservas con cupo ya consumidas en ese mes cuentan frente al nuevo límite.
- El staff avisa al socio antes de hacer el cambio; el socio se vuelve a apuntar con la tarifa nueva.
- Motivo: sin esta regla, un socio reserva con la tarifa alta y se pasa a la baja conservando las plazas.

### 4.6 Estado de pago

- El sistema **no cobra**. El pago se hace fuera (efectivo, Bizum, transferencia, TPV).
- La membresía **no vence sola**: sigue activa hasta que alguien la cancele o la cambie a mano. No hay fecha de renovación ni corte automático por impago.
- El estado de pago es **por periodo natural de la tarifa**: mes calendario, trimestre (ene–mar, abr–jun, jul–sep, oct–dic), semestre (ene–jun / jul–dic) o año. Cada periodo nuevo aparece como `pendiente` hasta que el staff lo marque.
- El socio ve **solo el periodo en curso**, como un semáforo discreto, sin importes.
- El staff ve la lista de **impagos del periodo** (herramienta de cobranza) y, al registrar un pago, el periodo sugerido según la tarifa.
- Tarifas **sin cobro** y socios **solo bono** no tienen semáforo periódico; los bonos se registran como pago único al comprar o recargar saldo.

## 5. Calendario

### 5.1 Tipos de clase

- El admin crea un **tipo de clase** (Endurance, Sweet, Crossfit, Tone, Especial, los que hagan falta). Cada tipo tiene **nombre**, **grilla** (dirigida u open) e **imagen opcional**. El coach no crea tipos ni sube imágenes.
- La imagen, si hay, llega ya encuadrada y no se recorta. Una clase de 2 h usa **la misma imagen**, más alta.
- El tipo nace en una grilla y **no cambia de grilla**. Si hace falta la otra, se crea otro tipo.
- El nombre escrito lo usan el staff, el detalle de la clase y Mis reservas. En el bloque del calendario, con foto no se pinta: ahí está la imagen. Sin foto, el bloque es una superficie neutra (sin foto de relleno) y enseña el nombre del tipo y el aforo.
- Cambiar la **imagen** de un tipo no cancela reservas.
- No se borra un tipo que tenga clases de hoy en adelante, ni uno que tenga entrenamientos en la biblioteca. Las instancias pasadas siguen apuntando al tipo, para conservar nombre e imagen.
- El admin lo mantiene desde el panel de staff. El bloque del calendario es la imagen del tipo y la ocupación, o el nombre y el aforo si no hay imagen.
- En la tabla de Tipos y las cards de Excepciones, el hueco de la foto queda en un recuadro neutro si no hay imagen. El nombre sigue al lado.

### 5.2 Plantilla y semanas

- La **plantilla semanal** coloca tipos en el horario: día, hora de inicio y fin, tipo de clase, coach (opcional) y aforo. No se vuelve a elegir la grilla: sale del tipo.
- Desde un hueco existente se puede **duplicar** otro del mismo box y día: abre el alta con tipo, hora, aforo y coach copiados, sin guardar sola; al confirmar entra en el borrador de ese box. La misma hora sigue bloqueada por solape.
- El **coach es del hueco**, no del tipo. El mismo tipo a las 9:00 y a las 18:00 puede tener coaches distintos.
- De la plantilla salen **instancias con fecha concreta**. Todo se reserva contra una instancia, nunca contra la plantilla.
- El calendario es **rodante y automático**: la semana en curso y las tres siguientes, de lunes a domingo. Cierra el domingo de esa cuarta semana. **No hay botón de publicar** y el admin no tiene tarea semanal.
- El admin define el **horario habitual por día** con uno o varios tramos abiertos; un día sin tramos está cerrado. El valor inicial es `07:00–21:00` todos los días. Puede añadir una **excepción por fecha** con tramos distintos o dejarla sin tramos para cerrar ese día. La excepción sustituye el horario semanal solo para esa fecha.
- Los cambios de horario rigen **inmediatamente**, desde que se guardan. El sistema rechaza cualquier cambio que deje plantillas o clases futuras programadas fuera de apertura; el staff debe ajustar o cancelar esos elementos. Las reservas no se cancelan automáticamente.
- No se puede crear ni editar una plantilla o clase puntual fuera de apertura. Cada clase debe quedar dentro de un único tramo. La materialización omite las ocurrencias recurrentes que caigan en una fecha cerrada por excepción.
- Los cierres completos y las pausas entre tramos se distinguen con un tramado discreto y la etiqueta «Cerrado» cuando haya espacio. En Plantilla, la zona cerrada no permite añadir clases.
- El eje de calendario es compartido entre Dirigidas y Open y entre semanas: parte de la apertura más temprana y el cierre más tardío de la configuración, y se extiende lo justo si una clase excepcional cae fuera.
- **No hay ventana por socio**: si la clase está en el calendario y no empezó, se puede reservar. No hay límite de "solo 7 días vista".
- El socio elige la grilla **Dirigidas** u **Open**. Con foto, el bloque es la imagen del tipo y la ocupación `apuntados/aforo`, sin el nombre. Sin foto, el bloque es una superficie neutra con el nombre del tipo y el aforo. Si está apuntado o la clase está cancelada, esa palabra va con el cupo, sin hacer el bloque más alto. La hora la marca el eje, no el bloque.
- En el detalle se ven el nombre del tipo, el coach (si hay) y la imagen si el tipo la tiene. Si la clase tiene entrenamiento, el plan va debajo (§5.5).
- El roster de una clase es visible para cualquier socio logueado, con foto de perfil cuando existe y el formato **"Marta G."** (nombre + inicial del apellido). Sin foto se muestran las iniciales del nombre; la imagen fallida también vuelve a ese estado.
- Socios, coaches y admins pueden subir, reemplazar o quitar su propia foto desde «Mi perfil». La foto es opcional. Se aceptan JPEG, PNG y WebP de hasta 5 MB; al mostrarse se recorta al centro en un avatar circular, sin modificar el original.
- La foto de un coach asignado aparece junto a su nombre en el detalle de clase. El admin tiene foto de perfil como cualquier cuenta staff y su avatar aparece en Equipo; puede aparecer como coach si se lo asigna a una clase.

### 5.3 Excepciones (una semana concreta)

- El listado de Excepciones muestra cada fila con el estado (**Extra**, **Modificada** o **Cancelada**) junto al nombre del tipo; debajo, box, día, hora, aforo y coach si lo hay. Una cancelada se distingue con el anillo que ya tenía.
- No se toca la plantilla: se actúa sobre la instancia. Se puede **cancelar** la clase, **cambiar hora, coach o aforo**, **cambiar el tipo** (uno que ya exista) o **añadir una clase extra** eligiendo un tipo. El coach puede hacerlo; no puede crear el tipo.
- Cambiar el **tipo** de un hueco con gente cancela las reservas y devuelve el cupo.
- Cambiar la **hora** de una clase con gente: las reservas **viajan con la clase** (siempre dentro del mismo día).
- Cambiar de **día**: no se puede mover. Se cancela la clase y se crea una nueva; la gente se vuelve a apuntar.
- Cancelar una clase: se liberan todas sus reservas y se devuelve el cupo o el saldo automáticamente.
- Una clase extra futura se puede quitar desde su detalle. Si nunca tuvo reservas, se elimina; si tiene historial, queda cancelada y la ficha se conserva. Las reservas activas se cancelan y se devuelve el cupo o saldo.
- Una instancia futura modificada de una plantilla activa se puede **restaurar desde la plantilla** si todavía corresponde al día de la semana de esa plantilla. Se aplican sus valores actuales de hora, tipo, coach y aforo, y se quita la marca de excepción. Si cambia el tipo o el aforo no permite mantener las reservas, se cancelan todas y se devuelve el cupo o saldo; si cambia solo la hora, las reservas se mantienen. Las reservas ya canceladas no se reactivan.
- Una clase cancelada se puede recuperar mientras todavía no haya empezado. Vuelve a aceptar reservas, pero las reservas que se cancelaron no se restauran automáticamente.
- Bajar el aforo por debajo de las reservas: se cancelan **todas** las reservas de esa clase —no se elige a quién echar— y se devuelve el cupo o el saldo.
- Desde la clase, el coach o el admin asocian o quitan un entrenamiento del mismo tipo (§5.5). Si el tipo de la clase cambia y el entrenamiento ya no coincide, se suelta. Las reservas siguen la regla de cambiar el tipo.

### 5.4 Cambios en la plantilla permanente

- Rigen **desde el lunes siguiente**. La semana en curso nunca se toca.
- En las semanas afectadas, por cada clase con reservas:
  - clase **idéntica** (misma fecha, hora de inicio y fin, y mismo tipo de clase) → las reservas **se quedan**;
  - si cambia **cualquiera** de esos datos, o la clase desaparece → se **cancelan** las reservas y se devuelve el cupo o el saldo, aunque el cambio sea solo de hora;
  - si el cambio produce una clase idéntica en el mismo hueco, las reservas **se mudan** a la nueva en lugar de cancelarse.
- Cambiar el **coach**, **subir el aforo** o **cambiar solo la imagen** del tipo no cancela reservas.
- Bajar el aforo por debajo de las reservas cancela todas las reservas de esa clase, con la misma regla que en las excepciones.
- Las **excepciones mandan**: una instancia con excepción no se sobrescribe con el cambio de plantilla.
- Si las reservas se mudan a otra clase, el entrenamiento la sigue solo cuando esa clase no tiene uno. La clase cancelada conserva el suyo (§5.5).
- Los avisos son por el grupo de WhatsApp; la app no notifica.

### 5.5 Biblioteca de entrenamientos

- La **biblioteca** guarda entrenamientos reutilizables. Cada uno tiene **nombre** y un solo **tipo de clase dirigido**. Un tipo open no tiene entrenamientos. El nombre se puede dejar vacío: al guardar queda la fecha de ese guardado en Europe/Madrid, día, mes corto y año (`3 nov 2026`). Si ese nombre ya existe, se añade ` · 2`, ` · 3`, y así. Quien quiera otro nombre lo escribe. Al editar, borrar el nombre y guardar vuelve a asignar la fecha de ese guardado.
- Al guardar, otro entrenamiento no puede tener el mismo nombre, sin distinguir mayúsculas ni espacios de más. El aviso sale bajo el campo. Los repetidos que ya existan se quedan hasta que se editen.
- El texto es una lista ordenada de **fases**. Cada fase tiene nombre (obligatorio, puede repetirse) y una lista ordenada de **bloques**. Un bloque es texto plano y conserva los saltos de línea: un movimiento por línea, y también se puede escribir «AMRAP 12» o «EMOM 10». No hay cronómetro, negrita, viñetas, fotos ni enlaces. No se guarda un entrenamiento sin fases, una fase sin bloques ni un bloque vacío. Se pueden quitar todas las fases: vuelven «Empezar en blanco» y «Usar estructura habitual»; el nombre y el tipo se conservan. Guardar sigue exigiendo al menos una fase con sus indicaciones.
- No hay borrador, ni versiones, ni duplicar, ni búsqueda por el texto. Al guardar, el socio ve ese texto. Editarlo cambia lo que ven todas las clases que lo señalan, pasadas y futuras; si hay clases vinculadas, el staff confirma el impacto antes de guardar.
- En el panel staff, el buscador de Biblioteca filtra por nombre o tipo dentro de la página cargada, sin buscar en el contenido de fases o bloques; conserva el filtro de tipo y la paginación.
- Cualquier socio que haya entrado ve toda la biblioteca. No hace falta haber reservado. La lista va por el último editado, en una lista paginada de 25 resultados. El filtro abre en **Todos** y ofrece cada tipo dirigido que tenga al menos un entrenamiento. La ficha muestra nombre, tipo, fases y bloques. Sin imagen, sin fecha y sin autor.
- El coach y el admin crean, editan y borran cualquier entrenamiento. No hay dueño. Al crear, el tipo se elige entre todos los tipos dirigidos, también los que aún no tienen ninguno. El alta y la edición están en el panel de staff. El módulo del socio es solo lectura.
- Una clase tiene como máximo un entrenamiento, del mismo tipo, o ninguno. Varias clases pueden señalar el mismo. El coach y el admin lo asocian o lo quitan desde la clase, pasada o futura. En el detalle, debajo de la imagen, la hora, el coach, las plazas, el roster y el botón, se ve el nombre del entrenamiento y luego las fases. El nombre abre la ficha. Si no hay entrenamiento, esa parte no aparece. El bloque del calendario no cambia. Una clase cancelada sigue mostrando el plan.
- Borrar un entrenamiento, o cambiarlo de tipo si eso lo suelta de alguna clase, pide confirmación y dice cuántas clases se quedan sin plan. Las reservas no se tocan.
- Un tipo con entrenamientos no se borra. Si se queda sin ellos, se puede borrar cuando tampoco tenga clases de hoy en adelante.
- Si un cambio de plantilla mueve las reservas a otra clase y esa clase no tiene entrenamiento, pasa a señalar el mismo. Si ya tiene uno, se queda con el suyo. La clase cancelada conserva el suyo. Si al aplicar el cambio el tipo ya no coincide, el entrenamiento se suelta.

## 6. Reservar

Un socio puede reservar una instancia si:

1. la instancia está programada y **no empezó**;
2. **quedan plazas**;
3. no tiene **otra reserva solapada** en el tiempo (no puede estar en dos sesiones a la vez);
4. tiene **cupo del periodo de consumo o saldo de bono** disponible para el mes o semana de la clase.

- **No hay lista de espera**: si está llena, no hay más opción.
- El staff puede **crear reservas a nombre de un socio** (teléfono, mostrador), con las mismas reglas de cupo, **desde el detalle de la clase** (Semana, Hoy o Excepciones). No hay pantalla aparte de «Reservas» en el panel.
- No se reserva para terceros desde la app del socio.
- El socio consulta el **historial** de las reservas cuya clase ya empezó. Va agrupado por mes, el mes más reciente primero.
- Una reserva cancelada, o una clase cancelada por el box, sigue en el historial y se marca. No registra si el socio asistió.

## 7. Cancelar

- **Socio**: puede cancelar hasta **2 horas antes** del inicio y el cupo vuelve. Pasadas las 2 horas **el botón está deshabilitado**: no existe "cancelación tardía" ni estado de no-show.
- **Staff**: puede cancelar en cualquier momento, incluso dentro de las 2 horas, y **decide** si el cupo o el saldo vuelve o se pierde.
- Si el box cancela la clase, el cupo vuelve siempre.

## 8. Lo que el sistema no hace (v1)

Pagos online, notificaciones (email o push), control de asistencia o no-show, lista de espera, reportes con métricas o exportaciones, varias empresas, auto-registro, historial de asistencia, multi-idioma (solo español), reservas para terceros, búsqueda por el texto de la biblioteca, versiones o copia de un entrenamiento, cronómetro. Borrar un box.

Consecuencias aceptadas:

- Sin notificaciones, quien no mire la app se entera de una clase cancelada en la puerta.
- Sin control de asistencia, el sistema no sabe quién vino: el roster es solo la lista de apuntados. El historial enseña las reservas pasadas, no la asistencia.
- Un visitante de clase suelta que paga en el mostrador no reserva; si hay hueco, entra. La app puede decir "completo" mientras físicamente sobra una plaza.

## 9. Pantallas

Las pantallas del socio y del staff están en [`app-flow.md`](./app-flow.md).

## 10. Reglas duras

| # | Regla |
|---|---|
| 1 | Una sola empresa. Puede haber más de un box. Tarifas, biblioteca, tipos de clase y equipo son de la empresa. Horario, cierres, plantilla y clases son de cada box. |
| 2 | Una tarifa activa por socio, más un saldo de bono opcional. |
| 3 | El cupo se cuenta por la fecha de la clase: semana natural para tarifa semanal y mes natural para tarifa mensual. |
| 4 | Dirigidas y opens tienen contadores separados; cada uno puede ser número, cero o Ilimitadas. El cupo del periodo se consume antes que el saldo de bono. Un cupo ilimitado no bloquea la reserva. |
| 5 | El cupo no se acumula; el saldo de bono no caduca. |
| 6 | No hay ventana de reserva: todo lo del calendario a 4 semanas es reservable. |
| 7 | Dentro de un box no pueden solaparse dos sesiones de la **misma** grilla (dos dirigidas o dos opens). Una dirigida y un open sí pueden coincidir en hora. Entre boxes, las clases pueden coincidir en hora. |
| 8 | Un socio no puede tener dos reservas solapadas, aunque las clases sean de boxes distintos. El cupo sigue siendo de la empresa. |
| 9 | Cancelación del socio hasta 2 h antes; después el botón se deshabilita. |
| 10 | El staff puede cancelar siempre y decide si devuelve cupo. |
| 11 | La membresía no vence; el estado de pago sigue el periodo de facturación configurado (mensual, trimestral, semestral o anual) y es informativo. |
| 12 | Sin pagos online, sin notificaciones, sin asistencia, sin lista de espera. |
| 13 | El roster se muestra como "Nombre I.". |
| 14 | El staff controla las credenciales; las contraseñas se guardan hasheadas. |
| 15 | Web y app nativa para socio, coach y admin; mismos permisos por cuenta. La web actual está implementada; Expo empieza tras recuperar la web en R6. |
| 16 | Cualquier cambio de tarifa cancela las reservas futuras del socio. |
| 17 | Un cambio de plantilla rige desde el lunes siguiente; la semana en curso no se toca. |
| 18 | El aforo nunca queda por debajo de las reservas: si se baja, se cancelan todas las reservas de esa clase. |
| 19 | El bloque del calendario, con foto, es la imagen del tipo y la ocupación `apuntados/aforo` sin el nombre. Sin foto, superficie neutra con el nombre del tipo y el aforo. |
| 20 | Cambiar la imagen de un tipo no cancela reservas. Cambiar el tipo de un hueco sí. |
| 21 | Un tipo con clases de hoy en adelante no se borra. |
| 22 | El horario de apertura es de cada box: se define por día y puede tener varios tramos. Las excepciones por fecha sustituyen el horario de ese día en ese box. Los cambios rigen al guardar y se rechazan si dejan fuera la plantilla o las clases futuras de ese box. Otro box no entra en la comprobación. |
| 23 | El historial del socio lista las reservas cuya clase ya empezó, agrupadas por mes. No registra asistencia. |
| 24 | La biblioteca guarda entrenamientos reutilizables de tipos dirigidos, en fases y bloques de texto plano. Open no tiene. El nombre guardado es único; si se deja vacío, es la fecha del guardado. |
| 25 | Editar un entrenamiento cambia el texto vivo en todas las clases que lo señalan. No hay versiones. |
| 26 | Asociar o borrar un entrenamiento no toca las reservas. |
| 27 | Un tipo con entrenamientos en la biblioteca no se borra. |

### Paginación de listados

Socios (activos y bajas), Impagos y Biblioteca (staff y socio) muestran 25 resultados por página. Socios, Equipo, Impagos, Cobros registrados y ambas Bibliotecas agrupan filtros y ordenación en un panel común; el buscador se mantiene fuera. La ordenación afecta a todos los resultados filtrados antes de paginar. La navegación permite anterior/siguiente y muestra rango, total y página actual. Cambiar un filtro vuelve a la primera página. Una página eliminada o fuera de rango muestra la última disponible.

### URLs de filtros

Los filtros por sede y tipo de clase usan identificadores legibles y estables (slugs), asignados al crear el registro y conservados al renombrarlo. Las fichas de socios, equipo, entrenamientos y clases conservan UUID. En listados que ofrecen «Todos», la ruta base corresponde a Todos; Socios usa `estado=activos` o `estado=baja`. Los calendarios siguen abriendo la sede por defecto.
