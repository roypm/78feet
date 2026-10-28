# Design system

Colores, tipografía, espaciado, componentes y reglas de interfaz.

Salido del grilling de diseño (28/10/2026). Este documento es la versión vigente.

---

## 1. Stack de estilos

- **Web:** Tailwind CSS + shadcn/ui.
- **App:** NativeWind (Tailwind para React Native), con `lucide-react-native` para iconos.
- Un solo lenguaje de estilos entre web y app: las clases y tokens coinciden.

## 2. Modo

Claro + oscuro desde el día 1. Los tokens se definen con variables CSS y se consumen con `dark:` en NativeWind/Tailwind.

## 3. Color

### Primario (acento / acción)

- `--color-primary: #ff931d` (naranja cálido).
- Uso: botones principales, links, estados activos, badges importantes, iconos de acción.
- Siempre sobre fondo neutro. Nunca como fondo de pantalla completa (salvo hero o botón grande).

### Neutros (fondos, texto, bordes)

Escala de Tailwind (`gray`):

| Token | Claro | Oscuro |
|---|---|---|
| `--color-bg` | `gray-50` / `#FAFAFA` | `gray-950` / `#0A0A0A` |
| `--color-surface` | `#FFFFFF` | `gray-900` |
| `--color-border` | `gray-200` | `gray-800` |
| `--color-text` | `gray-900` | `gray-50` |
| `--color-text-muted` | `gray-500` | `gray-400` |

### Semánticos

- Éxito: `green-600` (`#16A34A`).
- Error: `red-600` (`#DC2626`).
- Advertencia: `amber-500` (`#F59E0B`).
- Info: `blue-600` (`#2563EB`).

Los semánticos se usan solo para feedback (toasts, badges de estado, mensajes), no como color de marca.

## 4. Tipografía

- System font stack en v1 (sin fuente custom): `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`.
- Escala de Tailwind: `text-xs` (12) … `text-4xl` (36). Base `text-base` (16px).
- Pesos: `font-normal` (400), `font-medium` (500), `font-semibold` (600), `font-bold` (700).
- Una fuente custom se agrega solo si la marca lo exige; requiere configuración en Expo (assets) y en Next.js.

## 5. Espaciado

Escala de Tailwind (base 4px): `1` = 4px, `2` = 8px, `3` = 12px, `4` = 16px, `6` = 24px, `8` = 32px.

- Padding de pantalla: `px-4` (16px) en móvil, `px-6` (24px) en web.
- Gap entre elementos de lista: `gap-3` (12px).
- Gap entre secciones: `gap-6` (24px).

## 6. Radios

- `rounded-sm`: 4px (inputs, badges).
- `rounded-md`: 8px (botones, cards pequeñas).
- `rounded-lg`: 12px (cards, modales).
- `rounded-full`: 9999px (avatares, pills).

## 7. Iconos

- Set: **Lucide** (`lucide-react` en web, `lucide-react-native` en app).
- Tamaño estándar: 20px (`size-5`) en líneas de texto, 24px (`size-6`) en botones y headers.
- Color: hereda del texto por defecto; primario solo para acciones destacadas.

## 8. Componentes base (web)

shadcn/ui con los tokens de arriba. Componentes que se usan en v1:

- `Button` (variantes: default/primary, secondary, outline, ghost, destructive).
- `Card`, `Badge`, `Input`, `Select`, `Dialog`, `Toast` (sonner).
- `Table` para listados de staff (socios, tarifas, impagos).

En app se portan los equivalentes con NativeWind (mismos tokens, mismos nombres de variante).

## 9. Fuera de alcance v1

Componentes individuales detallados, estados vacíos, copy fino, animaciones, ilustraciones, tipografía custom. Se agregan con la UI, no antes.
