set -euo pipefail

# Atualização INCREMENTAL do souzas.js:
#   - entradas existentes são preservadas exatamente como estão, na mesma ordem
#     (nunca reatribui autor nem reordena o que já foi registrado)
#   - entradas de imagens que não existem mais são removidas
#   - imagens novas entram sempre no FIM da lista, em ordem de adição no git

declare -A known
kept_lines=""

if [ -f souzas.js ]; then
  while IFS= read -r line; do
    file=$(sed -n 's/.*file: "\([^"]*\)".*/\1/p' <<<"$line")
    [ -z "$file" ] && continue
    # git ls-files em vez de [ -e ]: é case-sensitive mesmo em filesystem
    # case-insensitive (Windows/mac), senão entradas de arquivos renomeados
    # para minúsculo sobrevivem e duplicam.
    if git ls-files --error-unmatch "assets/images/$file" >/dev/null 2>&1; then
      kept_lines+="$line"$'\n'
      known["$file"]=1
    fi
  done < souzas.js
fi

entries=""
shopt -s nullglob nocaseglob
for f in assets/images/*.{jpg,jpeg,png,gif}; do
  base=$(basename "$f")
  if [ -n "${known[$base]:-}" ]; then
    continue
  fi
  # --follow rastreia renames: o commit de adição é o do arquivo original,
  # não o do rename — senão quem renomeia vira "autor" de tudo.
  commit=$(git log --follow --diff-filter=A --format=%H -- "$f" | tail -1)
  if [ -z "$commit" ]; then
    continue
  fi
  ts=$(git show -s --format=%ct "$commit")
  # A API resolve o autor do commit para a conta atual: login pode mudar com
  # rename, mas o id é imutável — por isso guardamos os dois.
  author=$(gh api "repos/$GITHUB_REPOSITORY/commits/$commit" --jq '"\(.author.login // "")|\(.author.id // "")"' 2>/dev/null || true)
  login=${author%%|*}
  id=${author##*|}
  if [ -z "$login" ]; then
    login=$(git show -s --format=%an "$commit")
    id=""
  fi
  entries+="$ts|$base|$login|$id"$'\n'
done
shopt -u nullglob nocaseglob

{
  echo "const SOUZAS = ["
  printf '%s' "$kept_lines"
  printf '%s' "$entries" | sort -t'|' -k1,1n | while IFS='|' read -r ts file login id; do
    if [ -n "$id" ]; then
      echo "  { file: \"$file\", author: \"$login\", authorId: $id },"
    else
      echo "  { file: \"$file\", author: \"$login\" },"
    fi
  done
  echo "];"
} > souzas.js

echo "souzas.js gerado:"
cat souzas.js
