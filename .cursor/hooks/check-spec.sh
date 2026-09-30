#!/bin/bash
# Hook afterFileEdit: valida specs de Playwright tras cada edicion del agente.
# - Bloquea patrones prohibidos (waitForTimeout, test.only).
# - Comprueba que el spec compila con `playwright test --list`.
# Devuelve additional_context para que el agente corrija en el mismo turno.

input=$(cat)
file=$(echo "$input" | jq -r '.file_path // empty')

# Solo specs de Playwright.
case "$file" in
  */tests/*.spec.ts) ;;
  *) exit 0 ;;
esac

[ -f "$file" ] || exit 0

problems=()

if grep -nE 'waitForTimeout\s*\(' "$file" >/dev/null; then
  problems+=("Uso de waitForTimeout (prohibido, usar expect con auto-wait): $(grep -nE 'waitForTimeout\s*\(' "$file" | head -3 | tr '\n' ' ')")
fi

if grep -nE '\btest\.only\s*\(|\bdescribe\.only\s*\(' "$file" >/dev/null; then
  problems+=("test.only/describe.only presente: $(grep -nE '\.only\s*\(' "$file" | head -3 | tr '\n' ' ')")
fi

if grep -nE 'networkidle' "$file" >/dev/null; then
  problems+=("waitForLoadState('networkidle') es frágil; preferir expect sobre el elemento esperado.")
fi

# Compilacion: --list transpila y carga el spec sin ejecutarlo.
list_out=$(cd "$(dirname "$file")/.." && npx playwright test --list "$file" 2>&1)
if [ $? -ne 0 ]; then
  problems+=("El spec no compila/carga. Salida de 'playwright test --list': $(echo "$list_out" | grep -vE '^\s*$' | tail -15 | tr '\n' ' | ')")
fi

if [ ${#problems[@]} -eq 0 ]; then
  exit 0
fi

msg="check-spec.sh encontró problemas en $(basename "$file"):"
for p in "${problems[@]}"; do
  msg="$msg
- $p"
done
msg="$msg
Corrige estos puntos antes de dar el test por terminado (ver AGENTS.md)."

jq -n --arg ctx "$msg" '{additional_context: $ctx}'
exit 0
