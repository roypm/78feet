# Auditoría de controles de formulario web

Auditoría inicial: 31/10/2026. Alcance: todo el frontend implementado en `apps/web`, tanto socio como staff y login. El inventario inicial se realizó sin cambios de interfaz ni instalación de componentes; los seguimientos siguientes registran la implementación posterior.

**Seguimiento — desplegables implementados:** los 17 casos inventariados se han migrado a `FormSelect`, una composición del `Select` local. Ya no quedan `<select>` nativos visibles en el frontend. El inventario original se conserva más abajo; sus números de línea corresponden al momento de la auditoría.

Verificación de esta sección: composición compartida y formularios reales de Plantilla y Tarifas montados con datos de prueba en Chromium, sin escrituras al backend. Se comprobaron selección con teclado, etiquetas, `FormData`, opciones vacías, validación obligatoria, bloqueo durante envío, dependencias consumo/facturación, nombres largos y claro/oscuro a 375 px. La interacción táctil en un teléfono físico queda pendiente.

**Seguimiento — fechas y horas implementadas:** las dos fechas y las diez horas se han migrado a `DatePicker` y `TimePicker`. Ya no quedan inputs nativos de fecha/hora visibles. Se añadieron `Calendar` (React DayPicker), `Popover` e `InputGroup` mediante shadcn; los componentes anteriores se conservaron.

Verificación de esta sección: pruebas de fechas imposibles/bisiestas, formato y minutos; Chromium con los formularios reales de Plantilla, Clase extra y Horario del box montados con datos de prueba y guardados simulados. Se comprobaron escritura, selección por teclado, fecha mínima inclusiva, fechas duplicadas, valores vacíos/obligatorios, reset, bloqueo durante envío, valores `YYYY-MM-DD`/`HH:mm`, claro/oscuro a 320 y 375 px, movimiento reducido y ausencia de errores de consola. La prueba táctil en teléfono físico sigue pendiente.

**Mejora del selector de hora:** el panel muestra directamente dos columnas numéricas de cinco filas, sin menús anidados. Tiene 208 px de ancho, scroll fino e independiente, selección primaria y confirmación con «Aplicar hora». Verificado en Chromium con flechas, Tab, Inicio/Fin, saltos de cinco valores, rueda y gesto táctil simulado, además de aplicar/descartar y su integración en Plantilla. Se conservan las 24 horas, los 60 minutos y la escritura directa.

**Seguimiento — cantidades e importes implementados:** los siete inputs numéricos del inventario se han sustituido por seis usos de `QuantityField` y uno de `MoneyField`. Registrar pago utiliza también `MoneyField`, eliminando su conversión monetaria independiente. No quedan inputs `type="number"` visibles. Se mantienen los mínimos, nombres de `FormData` y confirmaciones existentes. Ambos importes aceptan coma/punto y hasta dos decimales sin separadores de miles; se convierten exactamente a céntimos, sin redondear importes de mayor precisión.

Verificación de esta sección: pruebas unitarias de enteros seguros, céntimos, coma/punto, vacíos, negativos y exceso de precisión; Chromium con los formularios reales de Plantilla, Tarifas, Registrar pago, Clase extra y Editar clase montados con datos de prueba y API simulada. Se comprobaron mínimos, botones y flechas, ausencia de cambios al girar la rueda, bloqueo durante envío, reset, conservación de valores ante errores y confirmación al reducir aforo con reservas. Las vistas de 320/375 px en claro/oscuro conservan botones de 44 px, texto de 16 px y no desbordan. La prueba en un teléfono físico sigue pendiente.

**Seguimiento — subida de imagen implementada:** el selector de archivo de Tipos de clase utiliza `ImageUploadField`, con botón propio, nombre/tamaño, vista previa local y descarte de la selección. El input nativo permanece oculto visualmente para abrir el selector del sistema y enviar el archivo original como `image`; la API y su formato multipart se conservan. Al editar se muestra la imagen actual y, sin reemplazo, se conserva. Los formatos JPEG/PNG/WebP y el máximo de 5 MB se comparten con la validación del servidor.

Verificación de esta sección: Chromium con el formulario real de Tipos de clase y API simulada. Se comprobaron apertura mediante teclado, imagen obligatoria al crear, edición sin reemplazo, reemplazo/descartado, bytes enviados en `FormData`, JPEG/PNG/WebP, límite exacto de 5 MB, archivos demasiado grandes/vacíos/corruptos/no admitidos, bloqueo al guardar, conservación tras error y limpieza de URLs temporales al cambiar, resetear o cerrar. Nombres largos con Unicode y vistas de 320/375 px en claro/oscuro no desbordan y mantienen botones de 44 px; la miniatura no recorta la imagen. La prueba en teléfono físico sigue pendiente.

**Seguimiento — búsquedas implementadas:** `MemberListSearch` (Socios e Impagos) y `MemberPicker` (añadir un socio a una clase) utilizan el mismo `SearchInput`. Se sustituyen los adornos del navegador por lupa y borrado propios, conservando el tipo semántico `search`, el filtrado existente y las etiquetas. Borrar y las acciones de limpiar de los estados vacíos devuelven el foco al campo; no cambian el socio seleccionado. Escape limpia el texto antes de cerrar un diálogo. Se ha eliminado `controlClass`, que ya no tenía consumidores.

**Seguimiento — login actualizado:** los campos de acceso utilizan `Field` e `Input`, y la pantalla se integra en una tarjeta con la marca de 78feet. Se mantienen los nombres de envío, autocomplete, tema claro, errores y flujo de autenticación.

Verificación de esta sección: Chromium con los componentes reales de Socios, Impagos, selector de socio y diálogo de apuntar a clase, con API simulada para el guardado. Se comprobaron nombres/acentos/mayúsculas, DNI, email, teléfono, tarifa y periodo según los campos admitidos por cada consumidor; Unicode, espacios, texto largo, resultados vacíos y ausencia de nuevas peticiones de búsqueda. Se verificaron ref/foco, borrado sin envío de formulario, Escape con y sin texto, Escape durante composición, bloqueo, solo lectura y conservación de la selección al apuntar. Claro/oscuro a 320/375 px sin desbordamiento, inputs de 16 px y borrado de 44 × 44 px. La prueba táctil en teléfono físico sigue pendiente.

**Mejora de ubicación y ancho de búsqueda:** se revisaron todos los consumidores. El ancho excesivo afectaba a Socios (activos/bajas) e Impagos. Sus buscadores tienen ahora un máximo de 28 rem en escritorio y se adaptan al ancho disponible en móvil. Socios activos reúne búsqueda y alta en una fila sobre la tabla, con alta junto al buscador (12 px de separación) y apilado cuando no caben. La tabla conserva su ancho y el buscador del diálogo de añadir socio mantiene el ancho del formulario. Chromium con barra lateral y los componentes reales de tablas/alta/selector, en claro y oscuro a 320, 375, 640, 768, 1024, 1440 y 2048 px: sin desbordamiento, filtros y foco conservados, alta funcional y selección de socio conservada al borrar.

**Ampliación a Biblioteca staff y Equipo:** ambos listados incorporan `SearchInput` y comparten `ListSearchToolbar` con Socios: máximo de 28 rem, acciones de alta junto al campo con 12 px de separación y apilado en móvil. Biblioteca filtra por nombre o tipo dentro de la página cargada, conserva las pestañas y la paginación y aplica el mismo resultado a tarjetas y filas; no busca en las fases ni bloques. Equipo filtra las cuentas cargadas por nombre, usuario, teléfono, correo o rol. Ambos distinguen una lista vacía de una búsqueda sin coincidencias; limpiar devuelve el foco al campo. La normalización de acentos y mayúsculas se comparte con Socios e Impagos en `lib/ui/search.ts`.

Verificación de esta ampliación: Chromium con los componentes reales, altas y confirmación de Equipo; API simulada para la desactivación, sin escrituras a datos reales. Búsqueda por todos los campos admitidos, acentos, mayúsculas, Unicode, campos opcionales ausentes, espacios y texto largo; limpiar, Escape, foco, navegación por teclado, protección de cuenta propia y bloqueo durante desactivación. Claro/oscuro a 320, 375, 640, 768 y 2048 px sin desbordamiento de página, con botones contiguos en escritorio y apilados en móvil. También se comprobó la regresión de Socios, Impagos y el selector de socio en claro/oscuro a 375 y 2048 px, manteniendo búsqueda, alta contigua y selección. La prueba táctil en teléfono físico sigue pendiente.

Revisión estática de los 112 archivos TSX/JSX de `apps` y `packages`, comprobada mediante el parser de TypeScript, búsquedas de controles, inspección de los primitives locales y de los estilos globales. Se revisaron también los consumidores de los componentes compartidos. Las cifras cuentan **declaraciones en código**, no elementos simultáneos en pantalla: horarios, excepciones y otros campos se repiten según los datos. No se ha realizado una comprobación visual en navegadores; la forma concreta de los controles nativos depende del navegador y del sistema operativo.

## Inventario inicial

Hay **37 declaraciones en cinco tipos de control que conservan UI nativa**, aunque su caja exterior tiene estilos del proyecto. Además, hay **dos buscadores con posibles adornos nativos** y **dos campos del login con estilos propios que conviene unificar**, pero que no están sin estilizar.

| Tipo | Declaraciones | Qué sigue siendo nativo | Componente para la sustitución |
|---|---:|---|---|
| Desplegable `select` | 17 | Flecha, menú de opciones y selección del sistema | Reutilizar el `Select` local; ya existe, pero ningún formulario lo utiliza |
| Fecha `Input type="date"` | 2 | Segmentos, indicador y calendario del navegador/sistema | Crear `DatePicker`; no existe un selector de fecha propio |
| Hora `Input type="time"` | 10 | Segmentos y selector de hora del navegador/sistema | Crear `TimePicker`; no existe un selector de hora propio |
| Número `Input type="number"` | 7 | Flechas de incremento/decremento, cuando el navegador las muestra | Crear un campo numérico compartido con controles propios; separar cantidades de importes |
| Archivo `Input type="file"` | 1 | Control de selección, texto de archivo y diálogo del sistema | Crear `ImageUploadField` con botón y estado visual propios |
| Búsqueda `Input type="search"` | 2 | Posible botón de borrar/adornos internos según navegador | Unificar en `SearchInput` basado en `Input`, con borrado propio si se quiere controlar su aspecto |
| Texto y contraseña del login | 2 | No son controles sin estilos; duplican la presentación fuera de `Input` | Reutilizar `Input` y el patrón de campos común |

Los nombres de componentes nuevos son propuestas para la siguiente fase, no componentes instalados ni una elección de librerías.

## 1. Desplegables: 17

Todos son `<select>` con `controlClass`. Esa clase define tamaño, borde, radio y tipografía, pero no reemplaza la flecha ni el desplegable nativo. La caja parece de la app; al abrirla aparece la UI del navegador/sistema.

| Pantalla o flujo | Campo | Ubicación |
|---|---|---|
| Tipos de clase → crear | Grilla: Dirigida / Open | [class-types-panel.tsx:126](../apps/web/components/staff/class-types-panel.tsx#L126) |
| Excepciones → añadir clase extra | Tipo de clase | [extra-class-form.tsx:73](../apps/web/components/staff/extra-class-form.tsx#L73) |
| Excepciones → añadir clase extra | Coach, incluido «Sin coach» | [extra-class-form.tsx:82](../apps/web/components/staff/extra-class-form.tsx#L82) |
| Detalle de clase → editar | Tipo de clase | [instance-form.tsx:48](../apps/web/components/staff/instance-form.tsx#L48) |
| Detalle de clase → editar | Coach, incluido «Sin coach» | [instance-form.tsx:57](../apps/web/components/staff/instance-form.tsx#L57) |
| Detalle de clase → editar | Entrenamiento, incluido «Ninguno» | [instance-form.tsx:70](../apps/web/components/staff/instance-form.tsx#L70) |
| Registrar pago, desde ficha de socio o Impagos | Método de pago | [mark-paid-button.tsx:119](../apps/web/components/staff/mark-paid-button.tsx#L119) |
| Alta de socio, formulario compartido | Tarifa | [member-forms.tsx:133](../apps/web/components/staff/member-forms.tsx#L133) |
| Ficha de socio → cambiar tarifa | Nueva tarifa | [member-profile.tsx:364](../apps/web/components/staff/member-profile.tsx#L364) |
| Ficha de socio → gestión de bono | Pack del catálogo | [member-quota-gestion.tsx:240](../apps/web/components/staff/member-quota-gestion.tsx#L240) |
| Equipo → añadir cuenta | Rol: Coach / Admin | [staff-form.tsx:73](../apps/web/components/staff/staff-form.tsx#L73) |
| Tarifas → crear | Modelo de consumo | [tariffs-panel.tsx:131](../apps/web/components/staff/tariffs-panel.tsx#L131) |
| Tarifas → crear | Periodicidad de facturación | [tariffs-panel.tsx:189](../apps/web/components/staff/tariffs-panel.tsx#L189) |
| Plantilla → crear/editar hueco | Día de la semana | [template-schedule/editor.tsx:56](../apps/web/components/staff/template-schedule/editor.tsx#L56) |
| Plantilla → crear/editar hueco | Tipo de clase | [template-schedule/editor.tsx:63](../apps/web/components/staff/template-schedule/editor.tsx#L63) |
| Plantilla → crear/editar hueco | Coach, incluido «Sin coach» | [template-schedule/editor.tsx:74](../apps/web/components/staff/template-schedule/editor.tsx#L74) |
| Biblioteca staff → crear/editar entrenamiento | Tipo de clase | [training-form.tsx:232](../apps/web/components/staff/training-form.tsx#L232) |

**Disponible:** [components/ui/select.tsx](../apps/web/components/ui/select.tsx) ya compone Base UI con trigger, iconos Lucide, menú, selección, scroll y tokens del proyecto. No hace falta crear otro desplegable desde cero. Puede componerse una envoltura de formulario para no repetir esa estructura 17 veces.

En la migración habrá que conservar `name`/`FormData`, valores iniciales, cambios controlados, obligatoriedad, bloqueo durante envío, estados vacíos y las opciones sin coach/sin entrenamiento. Conviene revisar las etiquetas accesibles al cambiar el control.

## 2. Fechas: 2

| Pantalla o flujo | Campo | Ubicación |
|---|---|---|
| Excepciones → añadir clase extra | Fecha de la clase | [extra-class-form.tsx:64](../apps/web/components/staff/extra-class-form.tsx#L64) |
| Horario del box → excepciones por fecha | Fecha de la excepción; se repite por excepción | [hours-form.tsx:197](../apps/web/components/staff/hours-form.tsx#L197) |

Ambos usan el `Input` local: el borde está integrado, pero el calendario no. No existen primitives locales `Calendar`, `Popover` ni un `DatePicker`. Se necesita componer o incorporar las piezas necesarias para un calendario propio, manteniendo entrada por teclado, fecha mínima donde se aplica y el valor de fecha sin introducir cambios de zona horaria.

La navegación por semanas del calendario de socio/staff usa enlaces propios en [week-nav.tsx](../apps/web/components/member/calendar-board/week-nav.tsx), no un input de fecha nativo. No entra en esta sustitución.

## 3. Horas: 10

| Pantalla o flujo | Campo | Ubicación |
|---|---|---|
| Excepciones → añadir clase extra | Inicio | [extra-class-form.tsx:67](../apps/web/components/staff/extra-class-form.tsx#L67) |
| Excepciones → añadir clase extra | Fin | [extra-class-form.tsx:70](../apps/web/components/staff/extra-class-form.tsx#L70) |
| Detalle de clase → editar | Inicio | [instance-form.tsx:42](../apps/web/components/staff/instance-form.tsx#L42) |
| Detalle de clase → editar | Fin | [instance-form.tsx:45](../apps/web/components/staff/instance-form.tsx#L45) |
| Plantilla → crear/editar hueco | Inicio | [template-schedule/editor.tsx:68](../apps/web/components/staff/template-schedule/editor.tsx#L68) |
| Plantilla → crear/editar hueco | Fin | [template-schedule/editor.tsx:71](../apps/web/components/staff/template-schedule/editor.tsx#L71) |
| Horario habitual del box | Apertura, por día/tramo | [hours-form.tsx:118](../apps/web/components/staff/hours-form.tsx#L118) |
| Horario habitual del box | Cierre, por día/tramo | [hours-form.tsx:133](../apps/web/components/staff/hours-form.tsx#L133) |
| Horario excepcional del box | Apertura, por fecha/tramo | [hours-form.tsx:248](../apps/web/components/staff/hours-form.tsx#L248) |
| Horario excepcional del box | Cierre, por fecha/tramo | [hours-form.tsx:264](../apps/web/components/staff/hours-form.tsx#L264) |

No existe un `TimePicker` propio. El `Select` existente puede servir para componer opciones de hora/minuto, pero falta definir y construir el control compartido. Conservar formato `HH:mm`, escritura y navegación con teclado, obligatoriedad y validaciones actuales; no imponer una nueva granularidad de minutos por una decisión visual.

## 4. Números: 7

| Pantalla o flujo | Campo | Ubicación |
|---|---|---|
| Excepciones → añadir clase extra | Aforo | [extra-class-form.tsx:92](../apps/web/components/staff/extra-class-form.tsx#L92) |
| Detalle de clase → editar | Aforo | [instance-form.tsx:67](../apps/web/components/staff/instance-form.tsx#L67) |
| Plantilla → crear/editar hueco | Aforo | [template-schedule/editor.tsx:80](../apps/web/components/staff/template-schedule/editor.tsx#L80) |
| Tarifas → crear/editar | Dirigidas por semana | [tariffs-panel.tsx:151](../apps/web/components/staff/tariffs-panel.tsx#L151) |
| Tarifas → crear/editar | Opens por semana | [tariffs-panel.tsx:161](../apps/web/components/staff/tariffs-panel.tsx#L161) |
| Tarifas → crear/editar bono | Clases del bono | [tariffs-panel.tsx:173](../apps/web/components/staff/tariffs-panel.tsx#L173) |
| Tarifas → crear/editar | Precio en euros | [tariffs-panel.tsx:204](../apps/web/components/staff/tariffs-panel.tsx#L204) |

El `Input` compartido no reemplaza las flechas nativas. Para las seis cantidades enteras se puede componer un `NumberField` con `Input` y botones propios. Para el precio conviene un campo de importe, conservando mínimo cero y precisión de céntimos. No existe ninguno de esos componentes compartidos.

**Caso distinto:** el importe de registrar pago en [mark-paid-button.tsx:109](../apps/web/components/staff/mark-paid-button.tsx#L109) ya es un `Input` de texto con `inputMode="decimal"`; no muestra las flechas de `type="number"`. Conviene unificarlo con el futuro campo monetario, pero no sumarlo a los siete controles numéricos nativos.

Los ajustes de cupo/saldo en `member-quota-gestion.tsx` ya usan botones propios: no son inputs numéricos nativos.

## 5. Archivo/imagen: 1

| Pantalla o flujo | Campo | Ubicación |
|---|---|---|
| Tipos de clase → crear/editar | Imagen de la clase | [class-types-panel.tsx:133](../apps/web/components/staff/class-types-panel.tsx#L133) |

El `Input` aplica algunos estilos `file:*` al botón, por lo que no es un control totalmente sin tratar. Aun así, mantiene la presentación y el texto de selección propios del navegador. Falta un campo de imagen que componga botón propio, nombre del archivo, estado vacío/seleccionado y, si corresponde, previsualización. Mantener JPEG/PNG/WebP y obligatoriedad al crear.

El input de archivo puede quedar oculto y seguir abriendo el diálogo del sistema desde el botón accesible. Ese diálogo es una función del sistema operativo; el componente propio controla lo que se ve dentro de la app.

## 6. Búsquedas: 2 declaraciones compartidas

| Componente | Dónde se utiliza | Ubicación |
|---|---|---|
| `MemberListSearch` | Listados de Socios e Impagos | [member-list-search.tsx:19](../apps/web/components/staff/member-list-search.tsx#L19) |
| `MemberPicker` | Añadir socio al roster de una clase | [member-picker.tsx:31](../apps/web/components/staff/member-picker.tsx#L31) |

La caja ya usa `Input`. No hay un botón propio de borrado dentro del campo ni reglas locales específicas para sus adornos nativos. La presencia/aspecto de la «x» y otros adornos necesita comprobarse por navegador; no es un defecto visual confirmado mediante captura. Si se busca control visual completo, crear `SearchInput` compartido con borrado accesible.

La lista de resultados de `MemberPicker` está construida con botones y estilos de la app; no es un `<select>` nativo. Una revisión de su interacción de teclado sería un trabajo aparte.

## 7. Login: 2 campos para unificar

| Campo | Ubicación |
|---|---|
| Usuario o DNI | [login-form.tsx:49](../apps/web/app/login/login-form.tsx#L49) |
| Contraseña | [login-form.tsx:58](../apps/web/app/login/login-form.tsx#L58) |

Ambos son `<input>` directos con clases explícitas: ya tienen fondo, borde, radio, tipografía y foco. No deben describirse como inputs por defecto sin diseño. Sí se separan del primitive común en altura, radio y anillo de foco. Sustituir su presentación por el `Input` existente permitiría mantenerlos alineados con el resto, conservando autocomplete y semántica de acceso.

## 8. Elementos revisados que no necesitan reemplazo por apariencia nativa

- Texto, email, teléfono y contraseñas de los formularios staff: usan [Input](../apps/web/components/ui/input.tsx). El HTML semántico no implica que su aspecto sea el predeterminado del navegador.
- Texto largo de los bloques de entrenamiento: usa [Textarea](../apps/web/components/ui/textarea.tsx), consumido en [training-form.tsx:331](../apps/web/components/staff/training-form.tsx#L331). Ya tiene estilos propios. El tirador de redimensionado puede seguir siendo nativo; comprobarlo si se quiere controlar también ese detalle.
- Estado de cuentas de Equipo y tarifas: usan [Switch](../apps/web/components/ui/switch.tsx) con presentación propia de Base UI, no checkbox nativo visible.
- Filtros, pestañas y navegación por semanas/días: enlaces y botones con estilos propios.
- `periodStart` en [mark-paid-button.tsx:104](../apps/web/components/staff/mark-paid-button.tsx#L104): `input type="hidden"`, sin presentación visible; conservarlo.
- No se encontraron controles visibles `checkbox`, `radio`, `range`, `color`, `datetime-local`, `month`, `week`, `datalist` o `select multiple` en el frontend actual.
- No se encontraron llamadas a `window.confirm`, `window.alert` ni `window.prompt` en el frontend revisado.
- El área de socio no declara inputs visibles adicionales; comparte el acceso por login. Expo sigue pendiente y no tiene frontend que auditar en este repositorio.

## 9. Detalles transversales para la fase de sustitución

1. **Validación visual:** los formularios usan `required`, `min`, `minLength`, etc., y no declaran `noValidate`. Pueden mostrar mensajes de validación nativos al enviar datos inválidos. Si el objetivo incluye eliminar esos globos, habrá que añadir errores de campo propios preservando las reglas actuales; cambiar el selector por sí solo no resuelve todos los mensajes del navegador.
2. **Etiquetas:** el [Field local](../apps/web/components/staff/field.tsx) muestra un `Label` sin asociarlo automáticamente mediante `htmlFor`/`id` y no envuelve el control. Hay campos con `aria-label` explícito, pero conviene resolver la asociación sistemática al componer los nuevos controles.
3. **Tema y estados:** utilizar los tokens vigentes de [design-system.md](./design-system.md), foco naranja, claro/oscuro, estados deshabilitado e inválido, y tamaño legible en móvil. `controlClass` no ofrece todos los estados de los primitives.

## Orden propuesto

1. Migrar los 17 desplegables al `Select` ya disponible: mayor alcance sin construir otro primitive.
2. Crear los controles compartidos de hora y fecha y sustituir sus 12 declaraciones.
3. Crear campos de cantidad e importe y sustituir los siete numéricos; unificar el importe de registrar pago.
4. Crear el campo visual de imagen.
5. Unificar búsquedas y login, y resolver los detalles transversales de etiquetas y validación al integrar cada formulario.

Esta auditoría no modifica las decisiones de producto, el design system ni la hoja de ruta. La implementación queda para la siguiente fase.
