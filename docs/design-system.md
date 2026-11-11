# Design system

Colores, tipografía, espaciado, componentes y reglas de interfaz.

La identidad visual salió del grilling de diseño (28/10/2026). Este documento es la fuente visual vigente. Las referencias a Expo describen una implementación futura: hoy la interfaz de socio y staff disponible está en `apps/web`; Expo sigue pendiente en la hoja de ruta.

---

## 1. Stack y tema

- **Web implementada:** Tailwind CSS 4, tokens CSS y componentes locales basados en shadcn/ui y Base UI. Iconos Lucide.
- **App Expo pendiente:** NativeWind y `lucide-react-native` consumirán estos mismos valores cuando se implemente la app móvil.
- La preferencia de tema se guarda en el perfil de cada cuenta: **Sistema por defecto**, con opciones Sistema, Claro y Oscuro. Sistema sigue la preferencia del dispositivo; Claro y Oscuro son anulaciones explícitas. CSS aplica Sistema desde la carga inicial y responde a cambios del sistema. Se cambia desde el pie del menú lateral o desde Apariencia en Mi perfil. Si falla el guardado se conserva el tema anterior.
- Los valores de marca se declaran en `apps/web/app/globals.css`; las clases consumen los alias semánticos de Tailwind/shadcn (`bg-background`, `bg-card`, `text-foreground`, `border-border`, `bg-primary`).

## 2. Color

### Primario

- Naranja cálido: `#ff931d` (`--primary` y `--color-primary`).
- Texto del primario: `#111827` (`--primary-foreground`).
- Uso: acción principal, enlaces, selección activa y énfasis. No usarlo como fondo de pantalla completa.

### Superficies y texto

Paleta neutra alineada con las capturas de la app móvil legacy (`assets/brand/reference/app-screenshot-*.png`). Mismos alias semánticos; solo cambian los hex en `globals.css`.

| Rol | Claro | Oscuro | Alias principal |
|---|---|---|---|
| Menú lateral | `#E0E0E0` | `#202020` | `--sidebar` |
| Lienzo | `#D8D8D8` | `#303030` | `--background`, `--color-bg` |
| Cabecera de módulo | `#FFFFFF` | `#262626` | `--header`, `--color-header` |
| Cards y superficies | `#FFFFFF` | `#484848` | `--card`, `--color-surface` |
| Bordes | `#C8C8C8` | `#595959` | `--border`, `--color-border` |
| Texto principal | `#191919` | `#F8F8F8` | `--foreground`, `--color-text` |
| Texto secundario | `#707070` | `#C8C8C8` | `--muted-foreground`, `--color-text-muted` |
| Superficie secundaria | `#E0E0E0` (secondary/accent) · `#F8E8D8` (muted) | `#404040` | `--secondary`, `--muted` |

Grises neutros en claro y oscuro; la cabecera de módulo separa el título del contenido y las cards forman la superficie elevada sobre el lienzo.

### Feedback semántico

- Éxito: `#16A34A` (`--success`).
- Error/destructivo: `#DC2626` (`--color-error`, `--destructive`).
- Advertencia: `#F59E0B` (`--warning`).
- No hay un token informativo azul propio; no se usa como color de marca.

Los colores semánticos se reservan para feedback, badges y estados. No sustituyen al primario.

## 3. Tipografía

- System font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` (`--font-sans`).
- Base de lectura: `text-base` (16 px); se usa la escala Tailwind de `text-xs` a `text-4xl`.
- Pesos habituales: `font-normal` (400), `font-medium` (500), `font-semibold` (600) y `font-bold` (700).
- Sin fuente custom en v1.

## 4. Espaciado y layout

Escala de Tailwind con base de 4 px: `1` = 4, `2` = 8, `3` = 12, `4` = 16, `6` = 24 y `8` = 32 px.

- Padding lateral habitual: `px-4` en pantallas estrechas y `md:px-6` en escritorio.
- Las cabeceras de módulo usan una banda de superficie propia. En calendarios y Horario, sede y Dirigidas/Open (si aplica) van en una fila junto al título y se desplazan en horizontal si no caben; con más de tres sedes, la sede es un desplegable. En listados, los filtros van en la barra del cuerpo, no en el título. Título y acción se ajustan en varias líneas si falta ancho. En el panel staff, las pantallas que cuelgan de otra muestran migas en el hueco encima del título (`StaffCrumbs`): la sección es un enlace, la página actual no. Hoy, Semana, Plantilla, Horario, los listados y la app del socio no llevan miga. El detalle de una clase usa Hoy, Semana o Excepciones según desde dónde se abrió; una entrada directa usa Semana. La miga no repite el box.
- Los listados largos ocupan el ancho disponible. Las fichas de lectura limitan su ancho para facilitar la lectura; tablas y calendario pueden usar todo el espacio.
- Separación típica de listas: `gap-3`; entre secciones: `gap-6`. El cuerpo de módulos densos usa `pt-2` y `gap-3` para aprovechar la altura.
- El shell ocupa el alto visible (`100dvh`) y el contenido de cada módulo gestiona su propio scroll. En web táctil se respetan safe areas y los inputs mantienen 16 px para evitar zoom automático en iOS. En el alta y la edición de un entrenamiento, Cancelar y Guardar se quedan al pie del módulo; el texto del formulario se desplaza en el hueco de encima y el último campo puede quedar entero por encima de la barra.

## 5. Radios e interacción

- `rounded-sm`: 4 px; `rounded-md`: 8 px; `rounded-lg`: 12 px; `rounded-full`: pill o círculo.
- Los botones tienen foco visible, estado deshabilitado y respuesta de pulsación sutil (`scale(0.97)`, transición de 150 ms). Los chips de filtro y los segmentos (sede, Dirigidas/Open, semana) marcan la opción activa con color, no con un peso tipográfico distinto, para que el control no cambie de ancho al seleccionar. En grupos cortos, `SegmentSlideList` desliza una pastilla `bg-card` hacia el ítem activo o el hover (solo puntero), sin glare; con `prefers-reduced-motion` vuelve al fondo estático por chip.
- Hover solo debe aportar información adicional en dispositivos con puntero; no debe ser el único indicador de interacción.
- No añadir animaciones decorativas de entrada, cascadas ni movimiento que retrase tareas.

## 6. Iconos

- Web: Lucide (`lucide-react`).
- Tamaños generales: 20 px (`size-5`) en línea y 24 px (`size-6`) en cabeceras o acciones destacadas. Los iconos dentro de primitives Button/Input siguen el tamaño del componente.
- El icono hereda el color del texto; primario solo para acciones destacadas.
- Expo usará `lucide-react-native` cuando la app esté implementada.

## 7. Componentes y patrones web

- Primitives locales: `Button`, `Card`, `Badge`, `Input`, `InputGroup`, `Select`, `Switch`, `Calendar`, `Popover`, `Table`, `Dialog`, `Sheet`, `Tooltip` y `Textarea`.
- `ProfileAvatar` muestra una imagen en círculo con `object-cover`; sin imagen o si falla, muestra iniciales. Se usa en la navegación, perfiles, listas de equipo y socios, y rosters de clases. Las fotos se sirven desde una ruta autenticada con caché privada corta y se editan en el perfil propio. El editor acepta JPEG/PNG/WebP de hasta 5 MB y permite elegir, previsualizar, guardar, reemplazar, descartar o quitar.
- Botones: `default`, `outline`, `secondary`, `ghost`, `destructive` y `link`; tamaño compacto por defecto. Las acciones táctiles relevantes pueden subir a `min-h-11`.
- Los listados del staff usan tablas. En pantallas estrechas se ocultan columnas secundarias y se integra ese dato en la celda principal o se permite scroll horizontal; el estado y las acciones conservan una columna estable. En Socios, la columna Tarifa conserva su ancho: nombre de la tarifa activa truncado, nombre completo al posar el puntero; si es un plan y hay saldo de bono, segunda línea «Bono · N». Si la tarifa activa ya es un bono, solo el nombre.
- Formularios de módulo usan `Field` y `FormDialog` para etiqueta, descripción, contenido y acciones consistentes. Texto y correo usan `FormInput`, texto largo `FormTextarea` y desplegables `FormSelect`. Un campo incompleto o inválido avisa bajo el control, con `aria-invalid` y el mismo copy que fecha, hora, cantidad, importe e imagen. El globo nativo del navegador no se abre. El toast queda para el fallo del servidor. En Biblioteca, un nombre repetido avisa bajo el campo. El acceso (`/login`) usa el mismo aviso bajo el campo; el rechazo de credenciales sigue en el propio formulario.
- En Equipo, Socios, fichas, Mi perfil del staff y la cuenta del socio, un dato opcional vacío (teléfono, correo, DNI) se lee «—». No se usa «Sin indicar».
- Los desplegables de formulario usan `FormSelect`, que compone el `Select` local de Base UI y asocia la etiqueta al control. Conserva los valores de `FormData`, las opciones vacías y el bloqueo durante el envío. El menú usa los tokens del tema, ajusta los nombres largos y permite seleccionar con teclado; no usar `<select>` nativos visibles.
- Los menús de `Select` tienen una altura máxima de 16 rem, reducida si queda menos espacio en la ventana. Las opciones se desplazan dentro de la lista, con scrollbar y sin propagar el scroll a la página; al abrir se mantiene visible la selección actual.
- Fecha y hora usan `DatePicker` y `TimePicker`: entrada escrita y selector propio en `Popover`, con etiqueta asociada, errores de campo y bloqueo durante el envío. Las fechas se muestran como `DD/MM/AAAA`, con calendario en español y semana desde el lunes, y se envían como `YYYY-MM-DD` sin conversión UTC. Las horas usan `HH:mm` de 00:00 a 23:59 y permiten cualquier minuto. Ambos aceptan escritura numérica sin separadores y `Alt` + `↓` abre el selector. No usar inputs nativos de fecha/hora visibles.
- `TimePicker` muestra horas y minutos en dos columnas dentro de un único panel de 13 rem, sin desplegables anidados. Cada columna usa `TimeColumn` con RadioGroup de Base UI: cinco valores visibles (menos si falta altura), scroll independiente fino y discreto, selección primaria y centrada al abrir. Flechas cambian el valor; Inicio/Fin y RePág/AvPág permiten recorrer los extremos o saltar cinco valores. Elegir números prepara el cambio; «Aplicar hora» lo confirma y cerrar el panel lo descarta. Las filas miden 44 px en móvil y 36 px en escritorio.
- Cantidades enteras usan `QuantityField`: escritura directa, botones −/+ propios y flechas arriba/abajo en pasos de uno. Se conservan los mínimos de cada campo; el botón − se desactiva al alcanzarlos, sin atenuar el campo editable. Vacíos, decimales y valores inválidos muestran un error de campo; no se convierten en cero ni se corrigen silenciosamente. En Tarifas, cada cupo de un plan semanal o mensual elige Número o Ilimitadas; con Ilimitadas no se pide el número. El bono no tiene esa opción. Un cupo ilimitado se lee «Ilimitadas»; en Mi tarifa y en la ficha, con las usadas: `3/Ilimitadas`. El cero se sigue leyendo como cero.
- Importes usan `MoneyField` tanto en Tarifas como en Registrar pago: entrada decimal con sufijo €, coma o punto, sin separadores de miles y hasta dos decimales. Al salir se muestran dos decimales con coma; `FormData` conserva los nombres actuales y envía el importe con punto, convertido a céntimos mediante el parser compartido sin redondeo de coma flotante. Se acepta cero, pero no importes negativos, exceso de precisión o valores superiores a 2.147.483.647 céntimos (21.474.836,47 €), el máximo del campo persistido. Los dos controles se componen con `InputGroup`, mantienen foco y errores accesibles, bloqueo durante envío y botones de al menos 44 px en móvil. No usar inputs `type="number"` visibles.
- La imagen del tipo de clase usa `ImageUploadField`: botón propio, miniatura completa sin recorte, nombre del archivo y tamaño. JPEG/PNG/WebP, máximo 5 MB; el tipo y el límite se comparten con el servidor. El input de archivo queda oculto visualmente y conserva `name="image"` y `FormData`. La vista previa es local y solo se sube al guardar. Al editar se muestra la imagen actual; «Descartar» elimina la selección nueva y conserva la anterior. La imagen no es obligatoria al crear ni al editar. Archivos no admitidos, demasiado grandes o que no se puedan previsualizar muestran un error de campo. Elegir, descartar y el input se bloquean durante el envío; un fallo al guardar conserva la selección. El reset y el cierre liberan las URLs temporales. Sin foto, el bloque del calendario y de la plantilla es una superficie `bg-muted` con el nombre del tipo y el aforo, sin imagen de relleno. En Plantilla, la cajita no pinta el nombre del coach; el lector de pantalla lo oye al enfocar. En las cards de Tipos y de Excepciones, el hueco de la foto es un recuadro neutro del mismo tamaño.
- Los buscadores usan `SearchInput`, compuesto con `InputGroup`: lupa decorativa, campo semántico de búsqueda y un único botón propio de borrar, ocultando los adornos nativos del navegador. Tiene 44 px de alto y el botón de borrar conserva un área de 44 × 44 px. El valor sigue controlado por cada consumidor; se conservan etiquetas accesibles, placeholders y filtrado inmediato. Borrar devuelve el foco al campo sin enviar formularios ni cambiar la selección de un socio; Escape limpia si hay texto y, vacío, permite cerrar el diálogo. Durante composición de texto no se intercepta Escape. Tanto el campo como el borrado respetan el estado deshabilitado; en solo lectura el borrado no está disponible. El filtrado es local, sin nuevas peticiones al servidor: Socios, Impagos y Biblioteca staff buscan en la página actual; Equipo, en las cuentas cargadas.
- El listado de **Excepciones** (staff) usa filas compactas en grid (`gap-3`, dos columnas en `lg`): miniatura 48 px (`ClassTypeThumb`, neutro sin foto), título en una línea con el tipo y el estado en muted (`Nombre · Extra`, `Modificada` o `Cancelada`), y una sola segunda línea con box, día, hora, aforo en plazas y coach unidos por ` · `. Las canceladas conservan `ring-2 ring-destructive/60` y miniatura atenuada; no hay pastillas de estado, fila de coach con avatar ni línea Dirigida/Open. Toda la fila es enlace (`NavigationLink` superpuesto).
- En Socios (activos y bajas), Impagos, Biblioteca staff y Equipo, el buscador queda alineado al inicio de la tabla, con ancho completo en móvil y máximo de 28 rem en escritorio. `ListSearchToolbar` reúne búsqueda, filtros de la lista (estado, tipo o box de pago) y alta: búsqueda a la izquierda, filtros a su lado y alta al final, separados por 12 px; se apilan cuando no caben. Socios usa Activos / Dados de baja; Biblioteca, el tipo (chips hasta tres, desplegable a partir de cuatro). Las tablas mantienen todo el ancho disponible. En listas vacías el alta sigue accesible; si faltan tarifas activas en Socios, el aviso conserva su bloque propio. Esta restricción de ancho es de los listados: el buscador de «Añadir socio» ocupa el ancho de su campo dentro del diálogo.
- Confirmaciones de impacto usan el `ConfirmDialog` propio, con explicación concreta, botón de cancelar y acción confirmada. No usar `window.confirm`, `alert` ni `prompt` del navegador.
- Feedback asíncrono usa un único `Toaster` Sonner en el layout raíz, ligado al tema del perfil, con iconos para éxito, error, aviso, información y carga.
- La app Expo queda fuera de este inventario hasta que se construya; no se afirma que los primitives web ya estén portados.

## 8. Fuera de alcance visual de v1

Fuente custom, ilustraciones, motion decorativo y analítica visual. Los estados vacíos, errores y textos de cada módulo se definen al diseñar su flujo; deben seguir los componentes y tokens anteriores.

### Navegación de listas

Las listas paginadas comparten `ListPagination`: rango y total a la izquierda; Anterior, página actual y Siguiente a la derecha. El pie se envuelve en pantallas estrechas, usa botones outline con altura táctil mínima de 44 px y estados deshabilitados en los extremos.

### Estados de interfaz

- `EmptyState` compone el primitive `Empty`: título, descripción y una acción útil cuando existe. La variante compacta se usa dentro de secciones, formularios y calendarios. En listados staff, el vacío de módulo usa `layout="panel"` o `ListEmptyBlock`: la card ocupa el ancho del listado (responsive); título y descripción van centrados con `max-w-md`. Distinguir lista vacía, filtro sin resultados y falta de configuración. Los enlaces de administración dependen del rol.
- `LoadingState` usa `Skeleton` con estructura de lista, tabla, calendario, ficha, formulario, entrenamiento o clase. Tiene un único estado accesible de carga; los placeholders son decorativos. Se conservan las fronteras de `Suspense` de cada módulo.
- `PendingButton` reserva espacio para las dos etiquetas, muestra spinner y expone `aria-busy`. `useActionFeedback` evita peticiones duplicadas y mantiene el estado pendiente durante la navegación o el refresco posterior. Los formularios bloquean sus campos durante el envío y conservan los valores ante errores.
- `NavigationLink` conserva el comportamiento de Next Link y muestra una indicación local si la navegación tarda. La selección de filtros sigue correspondiendo al contenido mostrado hasta completar el cambio.
- El hover usa `pointer-hover:` (`hover: hover` y `pointer: fine`); siempre hay foco visible y respuesta táctil. Las filas informativas no aparentan navegación. `prefers-reduced-motion` desactiva el pulso de skeletons, el giro de spinners y las animaciones de overlays sin ocultar las etiquetas de estado.
- `ResourceImage` reserva la geometría mediante las clases del módulo y usa la imagen local de respaldo si falla la original. Los errores de carga tienen una pantalla de recuperación; no se presentan como listas vacías.
- Tailwind se procesa con `@tailwindcss/postcss` tanto en desarrollo como en el build con webpack.

### Menú lateral

- Marca **77 FEET** con logotipo (`/brand/mark-full-color.png` en sidebar expandido; `/brand/mark-icon-square.png` en modo iconos), enlace al inicio del rol y `aria-label` «77 FEET, ir al inicio». Fuentes en `assets/brand/logo/`; copias web con fondo transparente en `apps/web/public/brand/`. A su lado, botón visible para contraer o expandir; sigue accesible en modo de iconos. El perfil queda separado de la marca y de la navegación, con avatar, nombre y rol.
- Staff: Actividad (Hoy, Semana, Excepciones, Biblioteca), Gestión (Socios, Impagos y Equipo), Configuración del box (Sedes, Plantilla, Tipos de clase, Horario del box y Tarifas). Solo se muestran enlaces autorizados y las secciones vacías se omiten. En Mi perfil, **Sede por defecto** (si hay más de una) usa radios como Apariencia; el listado conserva el orden canónico de sedes (no salta al guardar). Solo se guarda desde ahí, no al cambiar el selector de box.
- Socios: Entrenamiento (Calendario, Mis reservas, Biblioteca) y Mi cuenta (Historial, Mi tarifa). Mi perfil permanece junto al avatar.
- Pie fijo con cambio de tema y Cerrar sesión en una línea. El contenido central del menú tiene scroll si falta altura; cabecera y pie permanecen accesibles. En móvil se abre como panel y se cierra al navegar o usar Escape.
- El menú recuerda su estado expandido por navegador. El enlace activo expone `aria-current`; los controles tienen etiquetas en español, foco visible y ayudas al plegarse. Los detalles de clase del staff conservan la sección de origen (Hoy, Semana o Excepciones); una entrada directa usa Semana.
