#!/usr/bin/env bash
set -euo pipefail

# XP Watch — pulls assignment + task commitments for this app's prereq course
# and project, flattens tiptap evidence, writes a dated markdown report.
#
# Course and project IDs are read from .env.local (preferred) or .env.
# Required vars: NEXT_PUBLIC_COURSE_ID, NEXT_PUBLIC_PROJECT_ID

REPO_ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$REPO_ROOT"

if [ -f .env.local ]; then
  set -a; . ./.env.local; set +a
elif [ -f .env ]; then
  set -a; . ./.env; set +a
fi

COURSE_ID="${NEXT_PUBLIC_COURSE_ID:-}"
PROJECT_ID="${NEXT_PUBLIC_PROJECT_ID:-}"

if [ -z "$COURSE_ID" ] || [ -z "$PROJECT_ID" ]; then
  echo "error: NEXT_PUBLIC_COURSE_ID and NEXT_PUBLIC_PROJECT_ID must be set (.env or .env.local)" >&2
  exit 1
fi

REPORT_DIR="$REPO_ROOT/docs/feedback/reports"
mkdir -p "$REPORT_DIR"

TIMESTAMP="$(date +%Y-%m-%d-%H%M)"
REPORT_PATH="$REPORT_DIR/$TIMESTAMP.md"

ASSIGNMENTS_JSON="$(andamio teacher assignments list --course "$COURSE_ID" -o json 2>/dev/null || echo '{"data":[]}')"
TASKS_JSON="$(andamio project manager commitments --project-id "$PROJECT_ID" -o json 2>/dev/null || echo '{"data":[]}')"

ASSIGNMENT_COUNT="$(echo "$ASSIGNMENTS_JSON" | jq '.data | length')"
TASK_COUNT="$(echo "$TASKS_JSON" | jq '.data | length')"

# Recursive tiptap text extractor. Adds newlines after paragraph/listItem/heading
# boundaries so list structure survives the flattening.
TIPTAP_FILTER='
def extract:
  if type == "object" then
    ( if .type == "text" then (.text // "")
      elif .content then (.content | map(extract) | add // "")
      else ""
      end
    ) + (if .type == "paragraph" or .type == "listItem" or .type == "heading" then "\n" else "" end)
  elif type == "array" then
    (map(extract) | add // "")
  else ""
  end;
extract
'

{
  echo "# XP Watch Report — $TIMESTAMP"
  echo
  echo "- Assignment commitments: $ASSIGNMENT_COUNT"
  echo "- Task commitments: $TASK_COUNT"
  echo
  echo "---"
  echo
  echo "## Assignment Commitments"
  echo

  if [ "$ASSIGNMENT_COUNT" -eq 0 ]; then
    echo "_None._"
    echo
  else
    echo "$ASSIGNMENTS_JSON" | jq -c '.data[]' | while read -r entry; do
      alias=$(echo "$entry" | jq -r '.student_alias // "unknown"')
      status=$(echo "$entry" | jq -r '.content.commitment_status // "unknown"')
      module=$(echo "$entry" | jq -r '.course_module_code // "?"')
      slt=$(echo "$entry" | jq -r '.slt_hash // ""' | cut -c1-12)
      evidence=$(echo "$entry" | jq -r ".content.evidence | $TIPTAP_FILTER")

      echo "### $alias · module $module · $status"
      echo "_slt ${slt}…_"
      echo
      echo "$evidence" | sed 's/^/> /'
      echo
      echo "---"
      echo
    done
  fi

  echo "## Task Commitments"
  echo

  if [ "$TASK_COUNT" -eq 0 ]; then
    echo "_None._"
    echo
  else
    echo "$TASKS_JSON" | jq -c '.data[]' | while read -r entry; do
      alias=$(echo "$entry" | jq -r '.contributor_alias // .student_alias // "unknown"')
      status=$(echo "$entry" | jq -r '.content.commitment_status // .commitment_status // "unknown"')
      task_idx=$(echo "$entry" | jq -r '.task_index // .content.task_index // "?"')
      evidence=$(echo "$entry" | jq -r ".content.evidence // .evidence | $TIPTAP_FILTER")

      echo "### $alias · task $task_idx · $status"
      echo
      echo "$evidence" | sed 's/^/> /'
      echo
      echo "---"
      echo
    done
  fi

  echo
  echo "_Next: \`/ce:brainstorm\` against this file to draft issues._"
} > "$REPORT_PATH"

echo "$REPORT_PATH"
