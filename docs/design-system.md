# Design system

Colores, tipografía, espaciado, componentes y reglas de interfaz.

La identidad visual salió del grilling de diseño (28/10/2026). Este documento es la fuente visual vigente. Las referencias a Expo describen una implementación futura: hoy la interfaz de socio y staff disponible está en `apps/web`; Expo sigue pendiente en la hoja de ruta.

---

## 1. Stack y tema

- **Web implementada:** Tailwind CSS 4, tokens CSS y componentes locales basados en shadcn/ui y Base UI. Iconos Lucide.
- **App Expo pendiente:** NativeWind y `lucide-react-native` consumirán estos mismos valores cuando se implemente la app móvil.
- Claro y oscuro se siguen automáticamente con `prefers-color-scheme`. No hay selector manual de tema.
- Los valores de marca se declaran en `apps/web/app/globals.css`; las clases consumen los alias semánticos de Tailwind/shadcn (`bg-background`, `bg-card`, `text-foreground`, `border-border`, `bg-primary`).

## 2. Color

### Primario

- Naranja cálido: `#ff931d` (`--primary` y `--color-primary`).
- Texto del primario: `#111827` (`--primary-foreground`).
- Uso: acción principal, enlaces, selección activa y énfasis. No usarlo como fondo de pantalla completa.

### Superficies y texto

| Rol | Claro | Oscuro | Alias principal |
|---|---|---|---|
| Menú lateral | `#E4EBF3` | `#0E1620` | `--sidebar` |
| Lienzo | `#F4F1EB` | `#1C2838` | `--background`, `--color-bg` |
| Cabecera de módulo | `#FFFFFF` | `#2C3E54` | `--header`, `--color-header` |
| Cards y superficies | `#FFFFFF` | `#3A516C` | `--card`, `--color-surface` |
| Bordes | `#DDD6CC` | `#4A5E78` | `--border`, `--color-border` |
| Texto principal | `#111827` | `#F9FAFB` | `--foreground`, `--color-text` |
| Texto secundario | `#6B7280` | `#B6C2CE` | `--muted-foreground`, `--color-text-muted` |
| Superficie secundaria | `#EBE6DE` | `#31445C` | `--secondary`, `--muted` |

El menú es frío, el lienzo claro es cálido, la cabecera separa el título del contenido y las cards forman la superficie elevada.

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
- Las cabeceras de módulo usan una banda de superficie propia; título, filtros y acción se ajustan en varias líneas si falta ancho.
- Los listados largos ocupan el ancho disponible. Las fichas de lectura limitan su ancho para facilitar la lectura; tablas y calendario pueden usar todo el espacio.
- Separación típica de listas: `gap-3`; entre secciones: `gap-6`. El cuerpo de módulos densos usa `pt-2` y `gap-3` para aprovechar la altura.
- El shell ocupa el alto visible (`100svh`) y el contenido de cada módulo gestiona su propio scroll. En web táctil se respetan safe areas y los inputs mantienen 16 px para evitar zoom automático en iOS.

## 5. Radios e interacción

- `rounded-sm`: 4 px; `rounded-md`: 8 px; `rounded-lg`: 12 px; `rounded-full`: pill o círculo.
- Los botones tienen foco visible, estado deshabilitado y respuesta de pulsación sutil (`scale(0.97)`, transición de 150 ms).
- Hover solo debe aportar información adicional en dispositivos con puntero; no debe ser el único indicador de interacción.
- No añadir animaciones decorativas de entrada, cascadas ni movimiento que retrase tareas.

## 6. Iconos

- Web: Lucide (`lucide-react`).
- Tamaños generales: 20 px (`size-5`) en línea y 24 px (`size-6`) en cabeceras o acciones destacadas. Los iconos dentro de primitives Button/Input siguen el tamaño del componente.
- El icono hereda el color del texto; primario solo para acciones destacadas.
- Expo usará `lucide-react-native` cuando la app esté implementada.

## 7. Componentes y patrones web

- Primitives locales: `Button`, `Card`, `Badge`, `Input`, `Select`, `Switch`, `Table`, `Dialog`, `Sheet`, `Tooltip` y `Textarea`.
- Botones: `default`, `outline`, `secondary`, `ghost`, `destructive` y `link`; tamaño compacto por defecto. Las acciones táctiles relevantes pueden subir a `min-h-11`.
- Los listados del staff usan tablas. En pantallas estrechas se ocultan columnas secundarias y se integra ese dato en la celda principal o se permite scroll horizontal; el estado y las acciones conservan una columna estable.
- Formularios de módulo usan `Field` y `FormDialog` para etiqueta, descripción, contenido y acciones consistentes.
- Confirmaciones de impacto usan el `ConfirmDialog` propio, con explicación concreta, botón de cancelar y acción confirmada. No usar `window.confirm`, `alert` ni `prompt` del navegador.
- Feedback asíncrono usa un único `Toaster` Sonner en el layout raíz, ligado al tema del sistema, con iconos para éxito, error, aviso, información y carga.
- La app Expo queda fuera de este inventario hasta que se construya; no se afirma que los primitives web ya estén portados.

## 8. Fuera de alcance visual de v1

Fuente custom, ilustraciones, motion decorativo, analítica visual y tematización manual. Los estados vacíos, errores y textos de cada módulo se definen al diseñar su flujo; deben seguir los componentes y tokens anteriores.

### Navegación de listas

Las listas paginadas comparten `ListPagination`: rango y total a la izquierda; Anterior, página actual y Siguiente a la derecha. El pie se envuelve en pantallas estrechas, usa botones outline con altura táctil mínima de 44 px y estados deshabilitados en los extremos.

### Estados de interfaz

- `EmptyState` compone el primitive `Empty`: título, descripción y una acción útil cuando existe. La variante compacta se usa dentro de secciones, formularios y calendarios. Distinguir lista vacía, filtro sin resultados y falta de configuración. Los enlaces de administración dependen del rol.
- `LoadingState` usa `Skeleton` con estructura de lista, tabla, calendario, ficha, formulario, entrenamiento o clase. Tiene un único estado accesible de carga; los placeholders son decorativos. Se conservan las fronteras de `Suspense` de cada módulo.
- `PendingButton` reserva espacio para las dos etiquetas, muestra spinner y expone `aria-busy`. `useActionFeedback` evita peticiones duplicadas y mantiene el estado pendiente durante la navegación o el refresco posterior. Los formularios bloquean sus campos durante el envío y conservan los valores ante errores.
- `NavigationLink` conserva el comportamiento de Next Link y muestra una indicación local si la navegación tarda. La selección de filtros sigue correspondiendo al contenido mostrado hasta completar el cambio.
- El hover usa `pointer-hover:` (`hover: hover` y `pointer: fine`); siempre hay foco visible y respuesta táctil. Las filas informativas no aparentan navegación. `prefers-reduced-motion` desactiva el pulso de skeletons, el giro de spinners y las animaciones de overlays sin ocultar las etiquetas de estado.
- `ResourceImage` reserva la geometría mediante las clases del módulo y usa la imagen local de respaldo si falla la original. Los errores de carga tienen una pantalla de recuperación; no se presentan como listas vacías.
- Tailwind se procesa con `@tailwindcss/postcss` tanto en desarrollo como en el build con webpack.
