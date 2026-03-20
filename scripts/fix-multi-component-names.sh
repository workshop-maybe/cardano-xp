#!/bin/bash

# Script to fix multi-component names to use Andamio prefix
echo "🔧 Fixing multi-component import names..."
echo ""

COUNT=0

# Process files one directory at a time
for DIR in "src/app" "src/components"; do
  find "$DIR" -name "*.tsx" -type f | while read -r FILE; do
    # Skip ui and andamio directories
    if [[ "$FILE" == *"/components/ui/"* ]] || [[ "$FILE" == *"/components/andamio/"* ]]; then
      continue
    fi

    CHANGED=0

    # Table components
    if grep -q "from \"~/components/andamio/andamio-table\"" "$FILE"; then
      sed -i '' 's/{ Table,/{ AndamioTable,/g' "$FILE"
      sed -i '' 's/{ Table }/{ AndamioTable }/g' "$FILE"
      sed -i '' 's/, Table,/, AndamioTable,/g' "$FILE"
      sed -i '' 's/, Table }/, AndamioTable }/g' "$FILE"
      sed -i '' 's/TableHeader/AndamioTableHeader/g' "$FILE"
      sed -i '' 's/TableBody/AndamioTableBody/g' "$FILE"
      sed -i '' 's/TableFooter/AndamioTableFooter/g' "$FILE"
      sed -i '' 's/TableHead/AndamioTableHead/g' "$FILE"
      sed -i '' 's/TableRow/AndamioTableRow/g' "$FILE"
      sed -i '' 's/TableCell/AndamioTableCell/g' "$FILE"
      sed -i '' 's/TableCaption/AndamioTableCaption/g' "$FILE"
      CHANGED=1
    fi

    # Dialog components
    if grep -q "from \"~/components/andamio/andamio-dialog\"" "$FILE"; then
      sed -i '' 's/{ Dialog,/{ AndamioDialog,/g' "$FILE"
      sed -i '' 's/{ Dialog }/{ AndamioDialog }/g' "$FILE"
      sed -i '' 's/, Dialog,/, AndamioDialog,/g' "$FILE"
      sed -i '' 's/, Dialog }/, AndamioDialog }/g' "$FILE"
      sed -i '' 's/DialogClose/AndamioDialogClose/g' "$FILE"
      sed -i '' 's/DialogContent/AndamioDialogContent/g' "$FILE"
      sed -i '' 's/DialogDescription/AndamioDialogDescription/g' "$FILE"
      sed -i '' 's/DialogFooter/AndamioDialogFooter/g' "$FILE"
      sed -i '' 's/DialogHeader/AndamioDialogHeader/g' "$FILE"
      sed -i '' 's/DialogOverlay/AndamioDialogOverlay/g' "$FILE"
      sed -i '' 's/DialogPortal/AndamioDialogPortal/g' "$FILE"
      sed -i '' 's/DialogTitle/AndamioDialogTitle/g' "$FILE"
      sed -i '' 's/DialogTrigger/AndamioDialogTrigger/g' "$FILE"
      CHANGED=1
    fi

    # Tabs components
    if grep -q "from \"~/components/andamio/andamio-tabs\"" "$FILE"; then
      sed -i '' 's/{ Tabs,/{ AndamioTabs,/g' "$FILE"
      sed -i '' 's/{ Tabs }/{ AndamioTabs }/g' "$FILE"
      sed -i '' 's/, Tabs,/, AndamioTabs,/g' "$FILE"
      sed -i '' 's/, Tabs }/, AndamioTabs }/g' "$FILE"
      sed -i '' 's/TabsList/AndamioTabsList/g' "$FILE"
      sed -i '' 's/TabsTrigger/AndamioTabsTrigger/g' "$FILE"
      sed -i '' 's/TabsContent/AndamioTabsContent/g' "$FILE"
      CHANGED=1
    fi

    # Select components
    if grep -q "from \"~/components/andamio/andamio-select\"" "$FILE"; then
      sed -i '' 's/Select,/AndamioSelect,/g' "$FILE"
      sed -i '' 's/{ Select }/{ AndamioSelect }/g' "$FILE"
      sed -i '' 's/, Select}/, AndamioSelect}/g' "$FILE"
      sed -i '' 's/, Select }/, AndamioSelect }/g' "$FILE"
      sed -i '' 's/SelectContent/AndamioSelectContent/g' "$FILE"
      sed -i '' 's/SelectGroup/AndamioSelectGroup/g' "$FILE"
      sed -i '' 's/SelectItem/AndamioSelectItem/g' "$FILE"
      sed -i '' 's/SelectLabel/AndamioSelectLabel/g' "$FILE"
      sed -i '' 's/SelectScrollDownButton/AndamioSelectScrollDownButton/g' "$FILE"
      sed -i '' 's/SelectScrollUpButton/AndamioSelectScrollUpButton/g' "$FILE"
      sed -i '' 's/SelectSeparator/AndamioSelectSeparator/g' "$FILE"
      sed -i '' 's/SelectTrigger/AndamioSelectTrigger/g' "$FILE"
      sed -i '' 's/SelectValue/AndamioSelectValue/g' "$FILE"
      CHANGED=1
    fi

    if [ $CHANGED -eq 1 ]; then
      echo "✓ Fixed $(basename $FILE)"
      ((COUNT++))
    fi
  done
done

echo ""
echo "✨ Finished fixing multi-component names!"
