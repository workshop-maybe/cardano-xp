#!/usr/bin/env node

import { writeFileSync } from 'fs';
import { join } from 'path';

// Component configurations
const components = [
  { name: 'accordion', hasMultipleExports: true },
  { name: 'alert', hasMultipleExports: true },
  { name: 'alert-dialog', hasMultipleExports: true },
  { name: 'aspect-ratio', hasMultipleExports: false },
  { name: 'avatar', hasMultipleExports: true },
  { name: 'badge', hasMultipleExports: false, hasVariants: true },
  { name: 'breadcrumb', hasMultipleExports: true },
  { name: 'button', hasMultipleExports: false, hasVariants: true },
  { name: 'calendar', hasMultipleExports: false },
  { name: 'card', hasMultipleExports: true },
  { name: 'carousel', hasMultipleExports: true },
  { name: 'chart', hasMultipleExports: true },
  { name: 'checkbox', hasMultipleExports: false },
  { name: 'collapsible', hasMultipleExports: true },
  { name: 'command', hasMultipleExports: true },
  { name: 'confirm-dialog', hasMultipleExports: true },
  { name: 'context-menu', hasMultipleExports: true },
  { name: 'dialog', hasMultipleExports: true },
  { name: 'drawer', hasMultipleExports: true },
  { name: 'dropdown-menu', hasMultipleExports: true },
  { name: 'form', hasMultipleExports: true },
  { name: 'hover-card', hasMultipleExports: true },
  { name: 'input', hasMultipleExports: false },
  { name: 'input-otp', hasMultipleExports: true },
  { name: 'label', hasMultipleExports: false },
  { name: 'menubar', hasMultipleExports: true },
  { name: 'navigation-menu', hasMultipleExports: true },
  { name: 'pagination', hasMultipleExports: true },
  { name: 'popover', hasMultipleExports: true },
  { name: 'progress', hasMultipleExports: false },
  { name: 'radio-group', hasMultipleExports: false },
  { name: 'resizable', hasMultipleExports: true },
  { name: 'scroll-area', hasMultipleExports: false },
  { name: 'select', hasMultipleExports: true },
  { name: 'separator', hasMultipleExports: false },
  { name: 'sheet', hasMultipleExports: true },
  { name: 'skeleton', hasMultipleExports: false },
  { name: 'slider', hasMultipleExports: false },
  { name: 'sonner', hasMultipleExports: false },
  { name: 'switch', hasMultipleExports: false },
  { name: 'table', hasMultipleExports: true },
  { name: 'tabs', hasMultipleExports: true },
  { name: 'textarea', hasMultipleExports: false },
  { name: 'toggle', hasMultipleExports: false, hasVariants: true },
  { name: 'toggle-group', hasMultipleExports: true },
  { name: 'tooltip', hasMultipleExports: true },
];

// Convert kebab-case to PascalCase
function toPascalCase(str) {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

// Generate wrapper content
function generateWrapper(component) {
  const pascalName = toPascalCase(component.name);
  const andamioName = `Andamio${pascalName}`;

  return `/**
 * Andamio wrapper for shadcn/ui ${pascalName}
 *
 * This is a wrapper around the base shadcn component that allows
 * for Andamio-specific customizations without modifying the original.
 *
 * Usage:
 * import { ${andamioName} } from "~/components/andamio";
 *
 * Future (after extraction to @andamio/ui):
 * import { ${andamioName} } from "@andamio/ui";
 */

// Re-export everything from the base component
export * from "~/components/ui/${component.name}";

// This file serves as a placeholder for future Andamio-specific
// customizations to the ${pascalName} component.
//
// To customize:
// 1. Import the base component(s)
// 2. Create wrapper component(s) with Andamio defaults
// 3. Export the customized version(s)
//
// Example pattern (when customization is needed):
//
// import * as React from "react";
// import { ${pascalName} } from "~/components/ui/${component.name}";
// import { cn } from "~/lib/utils";
//
// export const ${andamioName} = React.forwardRef<
//   React.ElementRef<typeof ${pascalName}>,
//   React.ComponentPropsWithoutRef<typeof ${pascalName}>
// >(({ className, ...props }, ref) => {
//   return (
//     <${pascalName}
//       ref={ref}
//       className={cn(
//         // Add Andamio-specific default classes here
//         className
//       )}
//       {...props}
//     />
//   );
// });
//
// ${andamioName}.displayName = "${andamioName}";
`;
}

// Generate all wrapper files
const outputDir = 'src/components/andamio';

console.log('🚀 Generating Andamio wrapper components...\n');

components.forEach(component => {
  const content = generateWrapper(component);
  const filename = `andamio-${component.name}.tsx`;
  const filepath = join(outputDir, filename);

  writeFileSync(filepath, content);
  console.log(`✓ Created ${filename}`);
});

console.log(`\n✨ Successfully created ${components.length} wrapper components!`);
console.log('\n📝 Next steps:');
console.log('1. Customize high-priority components (button, badge, card, etc.)');
console.log('2. Add Andamio-specific variants and defaults');
console.log('3. Update existing code to use Andamio components');
console.log('4. Test all components with the chaos theme 😈');
