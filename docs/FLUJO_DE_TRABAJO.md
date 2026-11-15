# Flujo de trabajo con Git y GitHub

## Ramas

| Rama | Uso |
|---|---|
| `main` | Código estable e integrado. Solo recibe cambios mediante *pull request* con el pipeline en verde. |
| `feature/<descripcion>` | Una rama por funcionalidad o historia (p. ej. `feature/sprint2-actualizacion-consulta`). |
| `fix/<descripcion>` | Correcciones puntuales. |

## Ciclo de una funcionalidad

```bash
git switch main && git pull                      # partir de main actualizado
git switch -c feature/mi-funcionalidad           # rama nueva
# ... cambios pequeños, un commit por paso lógico ...
npm test && npm run typecheck                    # validar antes de subir
git push -u origin feature/mi-funcionalidad
gh pr create --base main --fill                  # o desde la página del repositorio
# El pipeline corre solo. Otro integrante revisa y aprueba.
# Se integra con "Create a merge commit" para conservar el historial de la rama.
```

## Mensajes de commit

Formato *Conventional Commits* en español: `tipo(alcance): qué cambia`.

| Tipo | Cuándo |
|---|---|
| `feat` | Funcionalidad nueva (`feat(actualizacion): reprogramar cita`) |
| `fix` | Corrección de un error |
| `refactor` | Reorganizar código sin cambiar su comportamiento |
| `test` | Pruebas nuevas o corregidas |
| `docs` | Documentación |
| `ci` / `chore` | Pipeline, configuración, dependencias |

## Protección de `main` (configurar en GitHub)

*Settings → Branches → Add branch ruleset* (o *Branch protection rule*) para `main`:
- Require a pull request before merging (1 aprobación).
- Require status checks to pass: `calidad` y `base-de-datos`.

## Etiquetas

Cada sprint cerrado se marca con una etiqueta: `v1.1.0-sprint1`, `v1.2.0-sprint2`.
