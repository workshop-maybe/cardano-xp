#!/bin/bash

# Script to fix import names to use Andamio prefix
# This renames the imported components to match the Andamio exports

echo "🔧 Fixing component import names..."
echo ""

# Find all files that import from ~/components/andamio/
FILES=$(grep -r "from \"~/components/andamio/" src/app src/components/auth src/components/courses src/components/layout src/components/learner src/components/editor --include="*.tsx" --include="*.ts" -l 2>/dev/null | grep -v "/components/ui/" | grep -v "/components/andamio/")

COUNT=0

for FILE in $FILES; do
  # Replace Card components
  sed -i '' 's/import { Card,/import { AndamioCard,/g' "$FILE"
  sed -i '' 's/, Card,/, AndamioCard,/g' "$FILE"
  sed -i '' 's/, Card /, AndamioCard /g' "$FILE"
  sed -i '' 's/{ Card }/{ AndamioCard }/g' "$FILE"
  sed -i '' 's/CardHeader/AndamioCardHeader/g' "$FILE"
  sed -i '' 's/CardFooter/AndamioCardFooter/g' "$FILE"
  sed -i '' 's/CardTitle/AndamioCardTitle/g' "$FILE"
  sed -i '' 's/CardDescription/AndamioCardDescription/g' "$FILE"
  sed -i '' 's/CardContent/AndamioCardContent/g' "$FILE"

  # Replace other common components
  sed -i '' 's/import { Button/import { AndamioButton/g' "$FILE"
  sed -i '' 's/import { Badge/import { AndamioBadge/g' "$FILE"
  sed -i '' 's/import { Alert,/import { AndamioAlert,/g' "$FILE"
  sed -i '' 's/, Alert,/, AndamioAlert,/g' "$FILE"
  sed -i '' 's/AlertDescription/AndamioAlertDescription/g' "$FILE"
  sed -i '' 's/AlertTitle/AndamioAlertTitle/g' "$FILE"

  # Replace usage in JSX (not just imports)
  sed -i '' 's/<Card/<AndamioCard/g' "$FILE"
  sed -i '' 's/<\/Card>/<\/AndamioCard>/g' "$FILE"
  sed -i '' 's/<Button/<AndamioButton/g' "$FILE"
  sed -i '' 's/<\/Button>/<\/AndamioButton>/g' "$FILE"
  sed -i '' 's/<Badge/<AndamioBadge/g' "$FILE"
  sed -i '' 's/<\/Badge>/<\/AndamioBadge>/g' "$FILE"
  sed -i '' 's/<Alert /<AndamioAlert /g' "$FILE"
  sed -i '' 's/<\/Alert>/<\/AndamioAlert>/g' "$FILE"

  echo "✓ Fixed $(basename $FILE)"
  ((COUNT++))
done

echo ""
echo "✨ Successfully fixed $COUNT files!"
