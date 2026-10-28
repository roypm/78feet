# App flow

Pantallas de la aplicación, cómo se conectan y los pasos que sigue el usuario en cada acción.

Las pantallas salieron del grilling de producto (27/10/2026). El registro original está en
[`grilling-results/convenciones-producto.md`](./grilling-results/convenciones-producto.md) (secciones 9 y 10).
Este documento es la versión vigente.

---

## 1. Navegación

- **App (socios):** Expo Router con cuatro pestañas — Calendario, Mis reservas, Mi tarifa, Cuenta
  (TRD §7). El detalle de clase se abre desde el calendario.
- **Web (staff):** panel responsive, escritorio primero.
- **Navegación:** "Estado de pago" vive dentro de "Mi tarifa" (semáforo discreto, sin importes).

## 2. Pantallas del socio (app Android/iOS)

1. **Calendario**: semana visible con navegación, plazas libres por clase, distinción dirigida/open.
2. **Detalle de clase**: hora, coach, plazas, roster ("Marta G."), botón reservar o cancelar (deshabilitado dentro de las 2 h).
3. **Mis reservas**: próximas reservas con opción de cancelar.
4. **Mi tarifa**: nombre y precio de la tarifa, `dirigidas usadas/límite`, `opens usados/límite`, saldo de bono.
5. **Estado de pago**: semáforo del mes en curso.
6. **Mi cuenta**: datos personales en solo lectura; cualquier cambio lo hace el staff. Sin cambio de contraseña.

## 3. Pantallas del staff (web, también usable desde el móvil)

1. **Hoy**: clases del día con roster.
2. **Semana**: ocupación por clase en formato `9/12`.
3. **Plantilla semanal**: alta y edición de bloques dirigida/open, con validación de solapamientos.
4. **Excepciones**: cancelar o modificar una instancia concreta.
5. **Socios**: alta, edición, asignar tarifa, cargar saldo de bono, resetear contraseña, dar de baja.
6. **Tarifas**: catálogo (nombre, precio, dirigidas/semana, opens/semana, clases del bono).
7. **Impagos del mes**: listado de socios mensuales sin pago registrado.
8. **Reservas**: crear o cancelar a nombre de un socio, eligiendo si el cupo vuelve.

## 4. Flujos principales

### Reservar (socio)

1. Calendario → toca una clase → Detalle de clase.
2. Ve hora, coach, plazas (`X/Y`), roster ("Marta G.") y botón "Reservar".
3. Toca "Reservar" → botón muestra spinner (pantalla no bloqueada).
4. OK → toast "Reserva confirmada" + vuelve al Calendario (plazas actualizadas). La reserva aparece en "Mis reservas".
5. Error → toast con el motivo (`FULL` → "Clase completa", `QUOTA_EXHAUSTED` → "Sin cupo disponible", `OVERLAP` → "Ya tenés otra reserva a esa hora", `NO_MEMBERSHIP` → "Sin membresía activa"); se queda en el detalle.

Sin modal de confirmación, sin lista de espera, sin actualización en tiempo real.

### Cancelar (socio)

1. Entrada desde "Mis reservas" o desde "Detalle de clase" (si está apuntado).
2. Botón "Cancelar" habilitado solo si faltan >2 h; si no, deshabilitado con "Cancelación cerrada".
3. Tocar "Cancelar" → confirmación "¿Cancelar esta reserva? El cupo vuelve." → confirmar → toast "Reserva cancelada" → desaparece de "Mis reservas".
4. Si la clase fue cancelada por el box: la reserva figura "Cancelada por el box", sin botón.

### Cambiar tarifa (staff)

1. Socios → ficha del socio → "Cambiar tarifa" → seleccionar nueva tarifa.
2. Advertencia: "Este cambio cancela todas las reservas futuras del socio (N reservas) y devuelve el cupo/saldo. El socio se vuelve a apuntar con la tarifa nueva."
3. Confirmar → cierra la membresía vigente, crea la nueva, cancela las reservas futuras con `quota_returned = true`, conserva el saldo de bono.
4. Toast "Tarifa cambiada. N reservas canceladas."
5. El socio ve en su app la nueva tarifa, cupo y saldo; sus reservas futuras desaparecen de "Mis reservas".

El aviso al socio es previo y humano (PRD). Si N = 0, la advertencia se muestra igual.
