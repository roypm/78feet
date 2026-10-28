# Convenciones de git

Reglas de trabajo del repo que no son ni de producto ni de implementación: cómo se escribe un commit.

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
