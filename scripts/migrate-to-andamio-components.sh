#!/bin/bash

# Script to migrate all component imports from ~/components/ui/ to ~/components/andamio/
# This updates pages and custom components to use Andamio wrappers

echo "🔄 Migrating component imports to Andamio wrappers..."
echo ""

# Find all files that import from ~/components/ui/ (excluding the wrapper files themselves)
FILES=$(grep -r "from \"~/components/ui/" src/app src/components/auth src/components/courses src/components/layout src/components/learner src/components/editor --include="*.tsx" --include="*.ts" -l 2>/dev/null | grep -v "/components/ui/" | grep -v "/components/andamio/")

COUNT=0

for FILE in $FILES; do
  # Replace imports
  sed -i '' 's|from "~/components/ui/|from "~/components/andamio/andamio-|g' "$FILE"

  echo "✓ Updated $(basename $FILE)"
  ((COUNT++))
done

echo ""
echo "✨ Successfully updated $COUNT files!"
echo ""
echo "📝 Next steps:"
echo "1. Run 'npm run typecheck' to verify changes"
echo "2. Review changed files for any manual adjustments needed"
echo "3. Test the application"
