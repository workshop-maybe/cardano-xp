#!/bin/bash

# Script to fix single-component names to use Andamio prefix
echo "🔧 Fixing single-component import names..."
echo ""

COUNT=0

# Process files one directory at a time to avoid argument list too long
for DIR in "src/app" "src/components"; do
  find "$DIR" -name "*.tsx" -type f | while read -r FILE; do
    # Skip ui and andamio directories
    if [[ "$FILE" == *"/components/ui/"* ]] || [[ "$FILE" == *"/components/andamio/"* ]]; then
      continue
    fi

    CHANGED=0

    # Input
    if grep -q "from \"~/components/andamio/andamio-input\"" "$FILE"; then
      sed -i '' 's/{ Input }/{ AndamioInput }/g' "$FILE"
      sed -i '' 's/{ Input,/{ AndamioInput,/g' "$FILE"
      sed -i '' 's/, Input,/, AndamioInput,/g' "$FILE"
      sed -i '' 's/, Input }/, AndamioInput }/g' "$FILE"
      sed -i '' 's/<Input/<AndamioInput/g' "$FILE"
      CHANGED=1
    fi

    # Label
    if grep -q "from \"~/components/andamio/andamio-label\"" "$FILE"; then
      sed -i '' 's/{ Label }/{ AndamioLabel }/g' "$FILE"
      sed -i '' 's/{ Label,/{ AndamioLabel,/g' "$FILE"
      sed -i '' 's/, Label,/, AndamioLabel,/g' "$FILE"
      sed -i '' 's/, Label }/, AndamioLabel }/g' "$FILE"
      sed -i '' 's/<Label/<AndamioLabel/g' "$FILE"
      CHANGED=1
    fi

    # Textarea
    if grep -q "from \"~/components/andamio/andamio-textarea\"" "$FILE"; then
      sed -i '' 's/{ Textarea }/{ AndamioTextarea }/g' "$FILE"
      sed -i '' 's/{ Textarea,/{ AndamioTextarea,/g' "$FILE"
      sed -i '' 's/, Textarea,/, AndamioTextarea,/g' "$FILE"
      sed -i '' 's/, Textarea }/, AndamioTextarea }/g' "$FILE"
      sed -i '' 's/<Textarea/<AndamioTextarea/g' "$FILE"
      CHANGED=1
    fi

    # Skeleton
    if grep -q "from \"~/components/andamio/andamio-skeleton\"" "$FILE"; then
      sed -i '' 's/{ Skeleton }/{ AndamioSkeleton }/g' "$FILE"
      sed -i '' 's/{ Skeleton,/{ AndamioSkeleton,/g' "$FILE"
      sed -i '' 's/, Skeleton,/, AndamioSkeleton,/g' "$FILE"
      sed -i '' 's/, Skeleton }/, AndamioSkeleton }/g' "$FILE"
      sed -i '' 's/<Skeleton/<AndamioSkeleton/g' "$FILE"
      sed -i '' 's/<\/Skeleton>/<\/AndamioSkeleton>/g' "$FILE"
      CHANGED=1
    fi

    # Checkbox
    if grep -q "from \"~/components/andamio/andamio-checkbox\"" "$FILE"; then
      sed -i '' 's/{ Checkbox }/{ AndamioCheckbox }/g' "$FILE"
      sed -i '' 's/{ Checkbox,/{ AndamioCheckbox,/g' "$FILE"
      sed -i '' 's/, Checkbox,/, AndamioCheckbox,/g' "$FILE"
      sed -i '' 's/, Checkbox }/, AndamioCheckbox }/g' "$FILE"
      sed -i '' 's/<Checkbox/<AndamioCheckbox/g' "$FILE"
      CHANGED=1
    fi

    # Switch
    if grep -q "from \"~/components/andamio/andamio-switch\"" "$FILE"; then
      sed -i '' 's/{ Switch }/{ AndamioSwitch }/g' "$FILE"
      sed -i '' 's/{ Switch,/{ AndamioSwitch,/g' "$FILE"
      sed -i '' 's/, Switch,/, AndamioSwitch,/g' "$FILE"
      sed -i '' 's/, Switch }/, AndamioSwitch }/g' "$FILE"
      sed -i '' 's/<Switch/<AndamioSwitch/g' "$FILE"
      CHANGED=1
    fi

    # Progress
    if grep -q "from \"~/components/andamio/andamio-progress\"" "$FILE"; then
      sed -i '' 's/{ Progress }/{ AndamioProgress }/g' "$FILE"
      sed -i '' 's/{ Progress,/{ AndamioProgress,/g' "$FILE"
      sed -i '' 's/, Progress,/, AndamioProgress,/g' "$FILE"
      sed -i '' 's/, Progress }/, AndamioProgress }/g' "$FILE"
      sed -i '' 's/<Progress/<AndamioProgress/g' "$FILE"
      CHANGED=1
    fi

    # Separator
    if grep -q "from \"~/components/andamio/andamio-separator\"" "$FILE"; then
      sed -i '' 's/{ Separator }/{ AndamioSeparator }/g' "$FILE"
      sed -i '' 's/{ Separator,/{ AndamioSeparator,/g' "$FILE"
      sed -i '' 's/, Separator,/, AndamioSeparator,/g' "$FILE"
      sed -i '' 's/, Separator }/, AndamioSeparator }/g' "$FILE"
      sed -i '' 's/<Separator/<AndamioSeparator/g' "$FILE"
      CHANGED=1
    fi

    # Toggle
    if grep -q "from \"~/components/andamio/andamio-toggle\"" "$FILE"; then
      sed -i '' 's/{ Toggle }/{ AndamioToggle }/g' "$FILE"
      sed -i '' 's/{ Toggle,/{ AndamioToggle,/g' "$FILE"
      sed -i '' 's/, Toggle,/, AndamioToggle,/g' "$FILE"
      sed -i '' 's/, Toggle }/, AndamioToggle }/g' "$FILE"
      sed -i '' 's/<Toggle/<AndamioToggle/g' "$FILE"
      sed -i '' 's/toggleVariants/andamioToggleVariants/g' "$FILE"
      CHANGED=1
    fi

    if [ $CHANGED -eq 1 ]; then
      echo "✓ Fixed $(basename $FILE)"
      ((COUNT++))
    fi
  done
done

echo ""
echo "✨ Successfully fixed $COUNT files!"
