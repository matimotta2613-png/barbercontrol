# =====================================================================
# BarberControl | Publica el repositorio en GitHub y abre el pull request
# Requisitos: Git y GitHub CLI (https://cli.github.com) instalados.
# Uso (PowerShell, dentro de la carpeta barbercontrol-app):
#   powershell -ExecutionPolicy Bypass -File scripts\publicar-en-github.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\publicar-en-github.ps1 -Repo otro-nombre
# =====================================================================
param([string]$Repo = "barbercontrol")
$Rama = "feature/sprint2-actualizacion-consulta"

# 1. Iniciar sesión en GitHub (solo la primera vez abre el navegador)
gh auth status *> $null
if ($LASTEXITCODE -ne 0) { gh auth login --web --git-protocol https }
function Exigir($paso) { if ($LASTEXITCODE -ne 0) { Write-Host "Falló: $paso" -ForegroundColor Red; exit 1 } }

# 2. Firmar los commits con TU cuenta (cambia el correo si quieres usar otro)
$Usuario = gh api user --jq .login
$Id = gh api user --jq .id
git config user.email "$Id+$Usuario@users.noreply.github.com"

# 3. Crear el repositorio público y conectarlo como "origin"
gh repo create $Repo --public --source . --remote origin `
  --description "BarberControl - Sistema web de citas para BarberControl Studio (TecNM Delicias)"
Exigir "crear el repositorio"

# 4. Subir main (con su etiqueta) y la rama de la funcionalidad
git push -u origin main --tags; Exigir "subir main"
git push -u origin $Rama;        Exigir "subir la rama"

# 5. Abrir el pull request de integración (el pipeline arranca solo)
gh pr create --base main --head $Rama `
  --title "Sprint 2: actualización y consulta de citas + pruebas de BD en CI" `
  --body-file docs/PULL_REQUEST_SPRINT2.md
Exigir "abrir el pull request"

Write-Host ""
Write-Host "Listo. Repositorio: https://github.com/$Usuario/$Repo"
Write-Host "Pull request:       https://github.com/$Usuario/$Repo/pulls"
Write-Host "Pipeline:           https://github.com/$Usuario/$Repo/actions"
Write-Host "Cuando el pipeline esté en verde, integra el PR con 'Create a merge commit'."
