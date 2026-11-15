#!/usr/bin/env bash
# BarberControl | Publica el repositorio en GitHub y abre el pull request (Linux/macOS/Git Bash)
# Uso: ./scripts/publicar-en-github.sh [nombre-del-repo]
set -euo pipefail
REPO="${1:-barbercontrol}"
RAMA="feature/sprint2-actualizacion-consulta"

gh auth status >/dev/null 2>&1 || gh auth login --web --git-protocol https
USUARIO=$(gh api user --jq .login); ID=$(gh api user --jq .id)
git config user.email "$ID+$USUARIO@users.noreply.github.com"

gh repo create "$REPO" --public --source . --remote origin \
  --description "BarberControl - Sistema web de citas para BarberControl Studio (TecNM Delicias)"
git push -u origin main --tags
git push -u origin "$RAMA"
gh pr create --base main --head "$RAMA" \
  --title "Sprint 2: actualización y consulta de citas + pruebas de BD en CI" \
  --body-file docs/PULL_REQUEST_SPRINT2.md

echo "Repositorio: https://github.com/$USUARIO/$REPO"
echo "Cuando el pipeline esté en verde, integra el PR con 'Create a merge commit'."
