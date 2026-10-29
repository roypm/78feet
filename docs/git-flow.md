# Convenciones de git

Reglas de trabajo del repo que no son ni de producto ni de implementación: qué puede entrar en un commit, cómo se parte y cómo se escribe el mensaje.

## Mensajes de commit

Formato: `<emoji> <tipo>: <resumen en imperativo>`, en español, sin punto final.

```
✨ feat: calcular cupo semanal
🐛 fix: saldo de bono mal descontado
```

El tipo sigue la convención de [`convenciones-tecnicas.md`](./grilling-results/convenciones-tecnicas.md) §12; el emoji
va delante y sale de esta tabla:

| Tipo | Emoji | Ejemplo |
|---|---|---|
| `feat` | ✨ | `✨ feat: reservar clase` |
| `fix` | 🐛 | `🐛 fix: cupo semanal mal contado` |
| `docs` | 📝 | `📝 docs: excepciones de plantilla` |
| `refactor` | ♻️ | `♻️ refactor: extraer cálculo de pack_balance` |
| `test` | ✅ | `✅ test: cancelación con devolución` |
| `perf` | ⚡ | `⚡ perf: índice en booking` |
| `style` | 💄 | `💄 style: formato del roster` |
| `build` | 📦 | `📦 build: bump prisma` |
| `ci` | 👷 | `👷 ci: cron de materialize` |
| `chore` | 🔧 | `🔧 chore: gitignore` |
| `revert` | ⏪ | `⏪ revert: mover reservas a sucesor` |

Sin commit ni push sin pedido explícito.

## Antes de cada commit

Antes de `git add` y de cada commit, revisar `git status` y `git diff`. Esto es obligatorio: lo que entra en el commit puede acabar en GitHub.

No commitear ni pushear:

- **Secretos.** `.env`, `.env.local`, contraseñas, tokens, claves privadas, connection strings, `DATABASE_URL` con credenciales, `JWT_SECRET`, `ADMIN_PASSWORD`, `CRON_SECRET`.
- **Lo que no es del repo.** `node_modules`, `.next`, builds, logs, caché, archivos locales del editor, datos reales de socios.

`.env.example` sí puede entrar, con los valores vacíos y solo los nombres de las variables. `.neon` guarda el proyecto y la rama, no la contraseña de la base.

Si un secreto ya está en un commit, no se pushea. Hay que sacarlo del historial y rotar esa clave.

## Commits que se puedan revisar

Un cambio grande se parte en varios commits. Cada uno es una pieza que se lee sola: una llesca, un arreglo, un doc. Así el diff se revisa mejor y, si más adelante hay un error, se encuentra el commit que lo metió.

No hace falta un commit por archivo. Hace falta que un mismo commit no mezcle esqueleto, dominio, sesión y docs.
