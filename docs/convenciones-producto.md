# Convenciones de producto — gestión de un box de CrossFit

Acordado en sesión de grilling (27/10/2026). Este documento define **qué ve y qué puede hacer cada persona**.
Las decisiones de implementación están en [`convenciones-tecnicas.md`](./convenciones-tecnicas.md).

---

## 1. Contexto

- Un box de CrossFit, **una sola empresa y una sola sede**. Varias sedes: fuera de alcance v1.
- Dos tipos de sesión en el calendario:
  - **Dirigida**: clase con coach, plan y aforo.
  - **Open**: 1 h de entrenamiento libre, con aforo, sin coach y sin plan.
- El box tiene un solo espacio de entrenamiento: **no puede haber dos sesiones solapadas en el horario**.

## 2. Personas y permisos

| Acción | Socio | Coach | Admin |
|---|---|---|---|
| Ver calendario, plazas y roster | sí | sí | sí |
| Reservar para sí mismo | sí | — | — |
| Cancelar su propia reserva | sí (hasta 2 h antes) | — | — |
| Crear reserva a nombre de un socio | — | sí | sí |
| Cancelar reserva de un socio (y elegir si devuelve cupo) | — | sí | sí |
| Alta y edición de socios | — | sí | sí |
| Asignar tarifa y saldo de bono | — | sí | sí |
| Marcar pago del mes | — | sí | sí |
| Resetear contraseña de un socio | — | sí | sí |
| Cancelar / modificar una clase puntual (excepción) | — | sí | sí |
| Catálogo de tarifas y precios | — | — | sí |
| Plantilla semanal y aforos por defecto | — | — | sí |
| Crear / desactivar cuentas de staff | — | — | sí |
| Dar de baja a un socio | — | — | sí |

Reglas:

- **Los roles no se acumulan.** Un coach que además entrena tiene **dos cuentas**: una `coach` (staff, no reserva) y una `socio`.
- **No hay auto-registro.** Toda cuenta la crea el staff.
- La cuenta `coach` no puede reservar; la cuenta `socio` no puede administrar.

## 3. Acceso

- Los **socios** entran con **DNI + contraseña**. Los **staff** entran con **usuario + contraseña** (el coach que entrena tiene dos cuentas con el mismo DNI, así que el identificador del staff es un usuario elegido por el admin).
- El staff **fija la contraseña** en el alta y la **resetea** cuando haga falta. El socio no la cambia desde la app.
- **No hay recuperación automática**: no se envían emails. El que se olvida espera a que el staff se la resetee.
- Las contraseñas se guardan hasheadas. Nadie puede verlas desde ningún panel; si se pierde, se resetea.

## 4. Tarifas

### 4.1 Tipos de tarifa

| Tipo | Precio | Cupo | Comportamiento |
|---|---|---|---|
| **Mensual** | € / mes | N dirigidas + M opens por semana | El cupo se renueva solo cada semana. No vence. |
| **Bono** | pago único | X clases | Saldo que se consume hasta agotarse. Sin caducidad. |
| **Prueba** | 0 € | ej. 3 dirigidas + 0 opens | Es una fila más del catálogo, no un tipo especial de usuario. |

El catálogo de tarifas lo administra **solo el admin**. Los cupos salen de la tarifa: no se editan por socio.

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
- Al cambiar de tarifa, **el saldo se conserva** y sigue funcionando como desborde.
- Un socio **solo bono** no tiene límite semanal: puede gastar el saldo cuando quiera.
- En la app el socio ve tres números: `2 dirigidas + 2 opens + 4 bono`.

### 4.4 Cambio de tarifa

- Se aplica **de inmediato**, en el mismo usuario. No se crea un socio nuevo.
- **Cualquier cambio de tarifa cancela todas las reservas futuras del socio**, devolviendo el cupo o el saldo. Aplica también al subir de tarifa.
- El staff avisa al socio antes de hacer el cambio; el socio se vuelve a apuntar con la tarifa nueva.
- Motivo: sin esta regla, un socio reserva con la tarifa alta y se pasa a la baja conservando las plazas.

### 4.5 Estado de pago

- El sistema **no cobra**. El pago se hace fuera (efectivo, Bizum, transferencia, TPV).
- La membresía **no vence sola**: sigue activa hasta que alguien la cancele o la cambie a mano. No hay fecha de renovación ni corte automático por impago.
- El estado de pago es **por mes calendario**: `pagado` o `pendiente`. El día 1 el mes nuevo aparece como `pendiente` hasta que el staff lo marque.
- El socio ve **solo el mes en curso**, como un semáforo discreto, sin importes.
- El staff ve la lista de **impagos del mes** (herramienta de cobranza).
- Los bonos se registran como pago único; un socio solo bono no tiene estado mensual.

## 5. Calendario

### 5.1 Plantilla y semanas

- La **plantilla semanal** es la base permanente del box: día, hora de inicio y fin, título, tipo (dirigida/open), coach y aforo por defecto.
- De la plantilla salen **instancias con fecha concreta**. Todo se reserva contra una instancia, nunca contra la plantilla.
- El calendario es **rodante y automático**: siempre muestra desde hoy hasta 4 semanas hacia adelante. **No hay botón de publicar** y el admin no tiene tarea semanal.
- **No hay ventana por socio**: si la clase está en el calendario y no empezó, se puede reservar. No hay límite de "solo 7 días vista".
- El roster de una clase es visible para cualquier socio logueado, con el formato **"Marta G."** (nombre + inicial del apellido).

### 5.2 Excepciones (una semana concreta)

- No se toca la plantilla: se actúa sobre la instancia. Se puede **cancelar** la clase, **cambiar hora, coach o aforo**, o **añadir una clase extra/especial** que no está en la plantilla.
- Cambiar la **hora** de una clase con gente: las reservas **viajan con la clase** (siempre dentro del mismo día).
- Cambiar de **día**: no se puede mover. Se cancela la clase y se crea una nueva; la gente se vuelve a apuntar.
- Cancelar una clase: se liberan todas sus reservas y se devuelve el cupo o el saldo automáticamente.
- Bajar el aforo por debajo de las reservas: se cancelan **todas** las reservas de esa clase —no se elige a quién echar— y se devuelve el cupo o el saldo.

### 5.3 Cambios en la plantilla permanente

- Rigen **desde el lunes siguiente**. La semana en curso nunca se toca.
- En las semanas afectadas, por cada clase con reservas:
  - clase **idéntica** (misma fecha, hora de inicio y fin, tipo y título) → las reservas **se quedan**;
  - si cambia **cualquiera** de esos datos, o la clase desaparece → se **cancelan** las reservas y se devuelve el cupo o el saldo, aunque el cambio sea solo de hora;
  - si el cambio produce una clase idéntica en el mismo hueco, las reservas **se mudan** a la nueva en lugar de cancelarse.
- Cambiar el **coach** o **subir el aforo** no cancela reservas.
- Bajar el aforo por debajo de las reservas cancela todas las reservas de esa clase, con la misma regla que en las excepciones.
- Las **excepciones mandan**: una instancia con excepción no se sobrescribe con el cambio de plantilla.
- Los avisos son por el grupo de WhatsApp; la app no notifica.

## 6. Reservar

Un socio puede reservar una instancia si:

1. la instancia está programada y **no empezó**;
2. **quedan plazas**;
3. no tiene **otra reserva solapada** en el tiempo (no puede estar en dos sesiones a la vez);
4. tiene **cupo semanal o saldo de bono** disponible para esa semana.

- **No hay lista de espera**: si está llena, no hay más opción.
- El staff puede **crear reservas a nombre de un socio** (teléfono, mostrador), con las mismas reglas de cupo.
- No se reserva para terceros desde la app del socio.

## 7. Cancelar

- **Socio**: puede cancelar hasta **2 horas antes** del inicio y el cupo vuelve. Pasadas las 2 horas **el botón está deshabilitado**: no existe "cancelación tardía" ni estado de no-show.
- **Staff**: puede cancelar en cualquier momento, incluso dentro de las 2 horas, y **decide** si el cupo o el saldo vuelve o se pierde.
- Si el box cancela la clase, el cupo vuelve siempre.

## 8. Lo que el sistema no hace (v1)

Pagos online, notificaciones (email o push), control de asistencia o no-show, lista de espera, reportes con métricas o exportaciones, multi-sede, auto-registro, historial de asistencia, multi-idioma (solo español), reservas para terceros.

Consecuencias aceptadas:

- Sin notificaciones, quien no mire la app se entera de una clase cancelada en la puerta.
- Sin control de asistencia, el sistema no sabe quién vino: el roster es solo la lista de apuntados.
- Un visitante de clase suelta que paga en el mostrador no reserva; si hay hueco, entra. La app puede decir "completo" mientras físicamente sobra una plaza.

## 9. Pantallas del socio (app Android/iOS)

1. **Calendario**: semana visible con navegación, plazas libres por clase, distinción dirigida/open.
2. **Detalle de clase**: hora, coach, plazas, roster ("Marta G."), botón reservar o cancelar (deshabilitado dentro de las 2 h).
3. **Mis reservas**: próximas reservas con opción de cancelar.
4. **Mi tarifa**: nombre y precio de la tarifa, `dirigidas usadas/límite`, `opens usados/límite`, saldo de bono.
5. **Estado de pago**: semáforo del mes en curso.
6. **Mi cuenta**: datos personales en solo lectura; cualquier cambio lo hace el staff. Sin cambio de contraseña.

## 10. Pantallas del staff (web, también usable desde el móvil)

1. **Hoy**: clases del día con roster.
2. **Semana**: ocupación por clase en formato `9/12`.
3. **Plantilla semanal**: alta y edición de bloques dirigida/open, con validación de solapamientos.
4. **Excepciones**: cancelar o modificar una instancia concreta.
5. **Socios**: alta, edición, asignar tarifa, cargar saldo de bono, resetear contraseña, dar de baja.
6. **Tarifas**: catálogo (nombre, precio, dirigidas/semana, opens/semana, clases del bono).
7. **Impagos del mes**: listado de socios mensuales sin pago registrado.
8. **Reservas**: crear o cancelar a nombre de un socio, eligiendo si el cupo vuelve.

## 11. Reglas duras

| # | Regla |
|---|---|
| 1 | Una sola empresa, una sola sede en v1. |
| 2 | Una tarifa activa por socio, más un saldo de bono opcional. |
| 3 | El cupo semanal se cuenta contra la semana de la clase, lunes a domingo. |
| 4 | El cupo semanal se consume antes que el saldo de bono. |
| 5 | El cupo no se acumula; el saldo de bono no caduca. |
| 6 | No hay ventana de reserva: todo lo del calendario a 4 semanas es reservable. |
| 7 | No hay dos sesiones solapadas en el horario del box. |
| 8 | Un socio no puede tener dos reservas solapadas. |
| 9 | Cancelación del socio hasta 2 h antes; después el botón se deshabilita. |
| 10 | El staff puede cancelar siempre y decide si devuelve cupo. |
| 11 | La membresía no vence; el pago es un estado mensual informativo. |
| 12 | Sin pagos online, sin notificaciones, sin asistencia, sin lista de espera. |
| 13 | El roster se muestra como "Nombre I.". |
| 14 | El staff controla las credenciales; las contraseñas se guardan hasheadas. |
| 15 | La app es solo para socios; el staff trabaja en la web. |
| 16 | Cualquier cambio de tarifa cancela las reservas futuras del socio. |
| 17 | Un cambio de plantilla rige desde el lunes siguiente; la semana en curso no se toca. |
| 18 | El aforo nunca queda por debajo de las reservas: si se baja, se cancelan todas las reservas de esa clase. |
