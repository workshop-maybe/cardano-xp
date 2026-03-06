#!/bin/bash

# Script to generate Andamio wrapper components for all shadcn components
# Usage: ./scripts/generate-andamio-wrappers.sh

COMPONENTS_DIR="src/components/andamio"
UI_DIR="src/components/ui"

# Get all shadcn components
COMPONENTS=$(ls $UI_DIR/*.tsx | xargs -n 1 basename | sed 's/\.tsx$//')

echo "Generating Andamio wrapper components..."

for COMPONENT in $COMPONENTS; do
  # Convert kebab-case to PascalCase
  COMPONENT_NAME=$(echo "$COMPONENT" | sed -r 's/(^|-)([a-z])/\U\2/g')
  ANDAMIO_NAME="Andamio${COMPONENT_NAME}"

  # Create wrapper file
  cat > "$COMPONENTS_DIR/andamio-$COMPONENT.tsx" << EOF
/**
 * Andamio wrapper for shadcn/ui ${COMPONENT_NAME}
 *
 * This is a thin wrapper around the base shadcn component that allows
 * for Andamio-specific customizations without modifying the original.
 *
 * Usage:
 * import { ${ANDAMIO_NAME} } from "~/components/andamio/andamio-${COMPONENT}";
 */

import * as React from "react";
import * as Base from "~/components/ui/${COMPONENT}";
import { cn } from "~/lib/utils";

// Re-export everything from base component
export * from "~/components/ui/${COMPONENT}";

// Type alias for easier importing
export type ${ANDAMIO_NAME}Props = React.ComponentProps<typeof Base.${COMPONENT_NAME}>;

/**
 * Andamio-styled ${COMPONENT_NAME}
 *
 * Wraps shadcn's ${COMPONENT_NAME} with Andamio-specific defaults.
 * All original props are supported.
 */
export const ${ANDAMIO_NAME} = React.forwardRef<
  React.ElementRef<typeof Base.${COMPONENT_NAME}>,
  ${ANDAMIO_NAME}Props
>(({ className, ...props }, ref) => {
  return (
    <Base.${COMPONENT_NAME}
      ref={ref}
      className={cn(
        // Add Andamio-specific defaults here
        className
      )}
      {...props}
    />
  );
});

${ANDAMIO_NAME}.displayName = "${ANDAMIO_NAME}";
EOF

  echo "  ✓ Created andamio-$COMPONENT.tsx"
done

echo ""
echo "✨ All wrapper components created!"
echo "Next: Manually enhance components that need Andamio-specific features"
