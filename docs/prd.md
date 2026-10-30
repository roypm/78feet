# PRD — gestión de un box de CrossFit

Qué se construye, para quién y qué debe hacer.

Las decisiones de producto salieron de una sesión de grilling (27/10/2026) antes de escribir código.
El registro original de esa sesión está en
[`grilling-results/convenciones-producto.md`](./grilling-results/convenciones-producto.md) y no se edita.
Este documento es la versión vigente: si algo no coincide, manda este.

Cómo se construye (arquitectura, modelo de datos, API) está en [`trd.md`](./trd.md).

---

## 1. Contexto

- Un box de CrossFit, **una sola empresa y una sola sede**. Varias sedes: fuera de alcance v1.
- Dos grillas en el calendario:
  - **Dirigida**: clase con tipo, imagen y aforo. El coach, si lo hay, es del hueco.
  - **Open**: la otra grilla. También es un tipo con imagen y aforo, sin plan de entrenamiento. El coach del hueco sigue siendo opcional.
- El box es lo bastante grande para **dos sesiones a la vez**: una en la grilla **Dirigida** y otra en **Open**. En cada grilla no puede haber dos huecos solapados; entre grillas sí pueden coincidir en hora.

## 2. Personas y permisos

| Acción | Socio | Coach | Admin |
|---|---|---|---|
| Ver calendario, plazas y roster | sí | sí | sí |
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
| Ajustar cupo semanal individual para la semana en curso | — | sí | sí |
| Registrar pago del periodo de facturación | — | sí | sí |
| Resetear contraseña de un socio | — | sí | sí |
| Cancelar / modificar una clase puntual (excepción) | — | sí | sí |
| Catálogo de tarifas y precios | — | — | sí |
| Plantilla semanal y aforos por defecto | — | — | sí |
| Catálogo de tipos de clase (nombre, imagen, grilla) | — | — | sí |
| Definir horario semanal y excepciones de apertura | — | — | sí |
| Crear, activar/desactivar cuentas de staff, consultar perfiles y editar datos de contacto | — | — | sí |
| Dar de baja o reactivar a un socio | — | — | sí |

Reglas:

- **Los roles no se acumulan.** Un coach que además entrena tiene **dos cuentas**: una `coach` (staff, no reserva) y una `socio`.
- **No hay auto-registro.** Toda cuenta la crea el staff.
- La cuenta `coach` no puede reservar; la cuenta `socio` no puede administrar.

## 3. Acceso

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
| **Cupo semanal** | mensual, trimestral, semestral o anual | € / periodo | N dirigidas + M opens por semana | El cupo se renueva solo cada semana. No vence. |
| **Cupo semanal** | sin cobro (`0 €`) | 0 € | ej. 3 dirigidas + 0 opens | Prueba: misma mecánica de reservas, sin estado de pago periódico. |
| **Bono** | pago único | pago único | X clases | Saldo que se consume hasta agotarse. Sin caducidad. |

El catálogo de tarifas lo administra **solo el admin**. Los cupos salen de la tarifa, con una excepción operativa: coach y admin pueden ajustar por separado el cupo semanal de dirigidas y opens de un socio para la semana en curso.

El catálogo implementado ofrece «Cupo semanal», «Cupo mensual» y «Bono». **Diferencia pendiente:** el motor actualmente calcula ambos tipos de cupo periódico con límites semanales (`dirigidas/semana` y `opens/semana`); «Cupo mensual» todavía no tiene contador ni renovación mensual distintos. No debe interpretarse como un cupo mensual funcional hasta definir e implementar esa regla.

### 4.2 Cupo semanal (tarifas mensuales)

- La semana es **natural, de lunes a domingo** (zona `Europe/Madrid`).
- El cupo se cuenta **contra la semana a la que pertenece la clase**, no contra la semana en que se reserva. Reservar el martes la clase del lunes siguiente consume cupo de la semana siguiente.
- Dirigidas y opens son **contadores separados**.
- El cupo **no se acumula**: lo que no se usa, se pierde.
- Con el calendario abierto a 4 semanas, un socio puede comprometer su cupo de varias semanas a la vez. Es aceptado: quien reserva temprano gana.

### 4.3 Saldo de bono (desborde del cupo)

- El cupo semanal **se consume primero**. Cuando se agota, la reserva sale del **saldo de bono**, tanto para dirigidas como para opens.
- El saldo es **único**: "te quedan 4 clases" sirve para cualquier tipo de sesión.
- **Cualquier socio puede llevar saldo de bono**, no solo el que empezó con bono: es la misma mecánica para vender "5 clases extra" a un mensual.
- El saldo **no caduca**.
- El staff **recarga** el saldo cuando el socio paga.
- En la ficha del socio, coach y admin pueden ajustar por separado el cupo semanal de dirigidas y opens para la semana en curso.
- Al cambiar de tarifa, **el saldo se conserva** y sigue funcionando como desborde.
- Un socio **solo bono** no tiene límite semanal: puede gastar el saldo cuando quiera.
- En su pantalla de tarifa, el socio ve tres números: `2 dirigidas + 2 opens + 4 bono`.

### 4.4 Cambio de tarifa

- Se aplica **de inmediato**, en el mismo usuario. No se crea un socio nuevo.
- **Cualquier cambio de tarifa cancela todas las reservas futuras del socio**, devolviendo el cupo o el saldo. Aplica también al subir de tarifa.
- El staff avisa al socio antes de hacer el cambio; el socio se vuelve a apuntar con la tarifa nueva.
- Motivo: sin esta regla, un socio reserva con la tarifa alta y se pasa a la baja conservando las plazas.

### 4.5 Estado de pago

- El sistema **no cobra**. El pago se hace fuera (efectivo, Bizum, transferencia, TPV).
- La membresía **no vence sola**: sigue activa hasta que alguien la cancele o la cambie a mano. No hay fecha de renovación ni corte automático por impago.
- El estado de pago es **por periodo natural de la tarifa**: mes calendario, trimestre (ene–mar, abr–jun, jul–sep, oct–dic), semestre (ene–jun / jul–dic) o año. Cada periodo nuevo aparece como `pendiente` hasta que el staff lo marque.
- El socio ve **solo el periodo en curso**, como un semáforo discreto, sin importes.
- El staff ve la lista de **impagos del periodo** (herramienta de cobranza) y, al registrar un pago, el periodo sugerido según la tarifa.
- Tarifas **sin cobro** y socios **solo bono** no tienen semáforo periódico; los bonos se registran como pago único al comprar o recargar saldo.

## 5. Calendario

### 5.1 Tipos de clase

- El admin crea un **tipo de clase** (Endurance, Sweet, Crossfit, Tone, Especial, los que hagan falta). Cada tipo tiene **nombre**, **imagen obligatoria** y **grilla**: dirigida u open. El coach no crea tipos ni sube imágenes.
- La imagen llega ya encuadrada y no se recorta. Una clase de 2 h usa **la misma imagen**, más alta.
- El tipo nace en una grilla y **no cambia de grilla**. Si hace falta la otra, se crea otro tipo.
- El nombre escrito lo usan el staff, el detalle de la clase y Mis reservas. En el bloque del calendario no se pinta: ahí está la imagen.
- Cambiar la **imagen** de un tipo no cancela reservas.
- No se borra un tipo que tenga clases de hoy en adelante, ni uno que tenga entrenamientos en la biblioteca. Las instancias pasadas siguen apuntando al tipo, para conservar nombre e imagen.
- El admin lo mantiene desde el panel de staff. El bloque del calendario es la imagen del tipo y la ocupación.

### 5.2 Plantilla y semanas

- La **plantilla semanal** coloca tipos en el horario: día, hora de inicio y fin, tipo de clase, coach (opcional) y aforo. No se vuelve a elegir la grilla: sale del tipo.
- El **coach es del hueco**, no del tipo. El mismo tipo a las 9:00 y a las 18:00 puede tener coaches distintos.
- De la plantilla salen **instancias con fecha concreta**. Todo se reserva contra una instancia, nunca contra la plantilla.
- El calendario es **rodante y automático**: la semana en curso y las tres siguientes, de lunes a domingo. Cierra el domingo de esa cuarta semana. **No hay botón de publicar** y el admin no tiene tarea semanal.
- El admin define el **horario habitual por día** con uno o varios tramos abiertos; un día sin tramos está cerrado. El valor inicial es `07:00–21:00` todos los días. Puede añadir una **excepción por fecha** con tramos distintos o dejarla sin tramos para cerrar ese día. La excepción sustituye el horario semanal solo para esa fecha.
- Los cambios de horario rigen **inmediatamente**, desde que se guardan. El sistema rechaza cualquier cambio que deje plantillas o clases futuras programadas fuera de apertura; el staff debe ajustar o cancelar esos elementos. Las reservas no se cancelan automáticamente.
- No se puede crear ni editar una plantilla o clase puntual fuera de apertura. Cada clase debe quedar dentro de un único tramo. La materialización omite las ocurrencias recurrentes que caigan en una fecha cerrada por excepción.
- Los cierres completos y las pausas entre tramos se distinguen con un tramado discreto y la etiqueta «Cerrado» cuando haya espacio. En Plantilla, la zona cerrada no permite añadir clases.
- El eje de calendario es compartido entre Dirigidas y Open y entre semanas: parte de la apertura más temprana y el cierre más tardío de la configuración, y se extiende lo justo si una clase excepcional cae fuera.
- **No hay ventana por socio**: si la clase está en el calendario y no empezó, se puede reservar. No hay límite de "solo 7 días vista".
- El socio elige la grilla **Dirigidas** u **Open**. El bloque es la imagen del tipo. Centrado abajo, encima de la imagen, va la ocupación `apuntados/aforo`. Si está apuntado o la clase está cancelada, esa palabra va con el cupo, sin el nombre y sin hacer el bloque más alto. La hora la marca el eje, no el bloque.
- En el detalle se ven la imagen, el nombre del tipo y el coach (si hay). Si la clase tiene entrenamiento, el plan va debajo (§5.5).
- El roster de una clase es visible para cualquier socio logueado, con el formato **"Marta G."** (nombre + inicial del apellido).

### 5.3 Excepciones (una semana concreta)

- No se toca la plantilla: se actúa sobre la instancia. Se puede **cancelar** la clase, **cambiar hora, coach o aforo**, **cambiar el tipo** (uno que ya exista) o **añadir una clase extra** eligiendo un tipo. El coach puede hacerlo; no puede crear el tipo.
- Cambiar el **tipo** de un hueco con gente cancela las reservas y devuelve el cupo.
- Cambiar la **hora** de una clase con gente: las reservas **viajan con la clase** (siempre dentro del mismo día).
- Cambiar de **día**: no se puede mover. Se cancela la clase y se crea una nueva; la gente se vuelve a apuntar.
- Cancelar una clase: se liberan todas sus reservas y se devuelve el cupo o el saldo automáticamente.
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

- La **biblioteca** guarda entrenamientos reutilizables. Cada uno tiene **nombre** (obligatorio, puede repetirse) y un solo **tipo de clase dirigido**. Un tipo open no tiene entrenamientos.
- El texto es una lista ordenada de **fases**. Cada fase tiene nombre (obligatorio, puede repetirse) y una lista ordenada de **bloques**. Un bloque es texto plano y conserva los saltos de línea: un movimiento por línea, y también se puede escribir «AMRAP 12» o «EMOM 10». No hay cronómetro, negrita, viñetas, fotos ni enlaces. No se guarda un entrenamiento sin fases, una fase sin bloques ni un bloque vacío.
- No hay borrador, ni versiones, ni duplicar, ni búsqueda por el texto. Al guardar, el socio ve ese texto. Editarlo cambia lo que ven todas las clases que lo señalan, pasadas y futuras; si hay clases vinculadas, el staff confirma el impacto antes de guardar.
- Cualquier socio que haya entrado ve toda la biblioteca. No hace falta haber reservado. La lista va por el último editado, en una sola lista, sin páginas. El filtro abre en **Todos** y ofrece cada tipo dirigido que tenga al menos un entrenamiento. La ficha muestra nombre, tipo, fases y bloques. Sin imagen, sin fecha y sin autor.
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
4. tiene **cupo semanal o saldo de bono** disponible para esa semana.

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

Pagos online, notificaciones (email o push), control de asistencia o no-show, lista de espera, reportes con métricas o exportaciones, multi-sede, auto-registro, historial de asistencia, multi-idioma (solo español), reservas para terceros, búsqueda por el texto de la biblioteca, versiones o copia de un entrenamiento, cronómetro.

Consecuencias aceptadas:

- Sin notificaciones, quien no mire la app se entera de una clase cancelada en la puerta.
- Sin control de asistencia, el sistema no sabe quién vino: el roster es solo la lista de apuntados. El historial enseña las reservas pasadas, no la asistencia.
- Un visitante de clase suelta que paga en el mostrador no reserva; si hay hueco, entra. La app puede decir "completo" mientras físicamente sobra una plaza.

## 9. Pantallas

Las pantallas del socio y del staff están en [`app-flow.md`](./app-flow.md).

## 10. Reglas duras

| # | Regla |
|---|---|
| 1 | Una sola empresa, una sola sede en v1. |
| 2 | Una tarifa activa por socio, más un saldo de bono opcional. |
| 3 | El cupo semanal se cuenta contra la semana de la clase, lunes a domingo. |
| 4 | El cupo semanal se consume antes que el saldo de bono. |
| 5 | El cupo no se acumula; el saldo de bono no caduca. |
| 6 | No hay ventana de reserva: todo lo del calendario a 4 semanas es reservable. |
| 7 | No pueden solaparse dos sesiones de la **misma** grilla (dos dirigidas o dos opens). Una dirigida y un open sí pueden coincidir en hora. |
| 8 | Un socio no puede tener dos reservas solapadas. |
| 9 | Cancelación del socio hasta 2 h antes; después el botón se deshabilita. |
| 10 | El staff puede cancelar siempre y decide si devuelve cupo. |
| 11 | La membresía no vence; el estado de pago sigue el periodo de facturación configurado (mensual, trimestral, semestral o anual) y es informativo. |
| 12 | Sin pagos online, sin notificaciones, sin asistencia, sin lista de espera. |
| 13 | El roster se muestra como "Nombre I.". |
| 14 | El staff controla las credenciales; las contraseñas se guardan hasheadas. |
| 15 | El área de socio es solo para socios; el staff trabaja en la web. La app móvil de socios sigue pendiente en la hoja de ruta. |
| 16 | Cualquier cambio de tarifa cancela las reservas futuras del socio. |
| 17 | Un cambio de plantilla rige desde el lunes siguiente; la semana en curso no se toca. |
| 18 | El aforo nunca queda por debajo de las reservas: si se baja, se cancelan todas las reservas de esa clase. |
| 19 | El bloque del calendario es la imagen del tipo y la ocupación `apuntados/aforo`. El nombre no se pinta en el bloque. |
| 20 | Cambiar la imagen de un tipo no cancela reservas. Cambiar el tipo de un hueco sí. |
| 21 | Un tipo con clases de hoy en adelante no se borra. |
| 22 | El horario de apertura se define por día y puede tener varios tramos. Las excepciones por fecha sustituyen el horario de ese día. Los cambios rigen al guardar y se rechazan si dejan clases programadas fuera de apertura. |
| 23 | El historial del socio lista las reservas cuya clase ya empezó, agrupadas por mes. No registra asistencia. |
| 24 | La biblioteca guarda entrenamientos reutilizables de tipos dirigidos, en fases y bloques de texto plano. Open no tiene. |
| 25 | Editar un entrenamiento cambia el texto vivo en todas las clases que lo señalan. No hay versiones. |
| 26 | Asociar o borrar un entrenamiento no toca las reservas. |
| 27 | Un tipo con entrenamientos en la biblioteca no se borra. |
