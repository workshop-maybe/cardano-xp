/**
 * Andamio wrapper for shadcn/ui Button
 *
 * XP-branded button with pill shape and outlined style:
 * - rounded-full with thick secondary border
 * - No fill, blue text
 * - Loading state support
 * - Icon support
 *
 * Usage:
 * import { AndamioButton } from "~/components/andamio";
 */

import * as React from "react";
import { cn } from "~/lib/utils";
import { LoadingIcon } from "~/components/icons";

/**
 * XP button base styles - pill shape
 */
const xpButtonBase =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-display font-semibold tracking-wide transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-secondary/50";

const xpButtonSizes = {
  sm: "h-7 px-4 text-xs",
  default: "h-9 px-6 text-sm",
  lg: "h-11 px-8 text-base",
  "icon-sm": "h-8 w-8 p-0",
  icon: "h-9 w-9 p-0",
} as const;

const xpButtonVariants = {
  default: "border-2 border-secondary bg-transparent text-secondary hover:bg-secondary/10",
  secondary: "border-2 border-secondary bg-secondary text-secondary-foreground hover:bg-secondary/90",
  outline: "border-2 border-border bg-transparent text-foreground hover:bg-foreground/5",
  ghost: "border-0 text-muted-foreground hover:text-foreground hover:bg-foreground/5",
  destructive: "border-2 border-destructive bg-transparent text-destructive hover:bg-destructive/10",
  link: "border-0 text-secondary underline-offset-4 hover:underline",
} as const;

/**
 * Standard icon sizes for buttons based on button size variant.
 */
export const BUTTON_ICON_SIZES = {
  sm: "h-3.5 w-3.5",
  default: "h-4 w-4",
  lg: "h-5 w-5",
} as const;

export interface AndamioButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Button size variant
   */
  size?: keyof typeof xpButtonSizes;
  /**
   * Button style variant
   */
  variant?: keyof typeof xpButtonVariants;
  /**
   * Show loading spinner and disable button
   */
  isLoading?: boolean;
  /**
   * Icon to display before children
   */
  leftIcon?: React.ReactNode;
  /**
   * Icon to display after children
   */
  rightIcon?: React.ReactNode;
  /**
   * Render as child element (for composition with Link, etc.)
   */
  asChild?: boolean;
}

export const AndamioButton = React.forwardRef<
  HTMLButtonElement,
  AndamioButtonProps
>(
  (
    {
      className,
      children,
      size = "default",
      variant = "default",
      isLoading,
      leftIcon,
      rightIcon,
      disabled,
      asChild = false,
      ...props
    },
    ref
  ) => {
    const buttonClassName = cn(
      xpButtonBase,
      xpButtonSizes[size],
      xpButtonVariants[variant],
      className
    );

    // When asChild, clone the child element with merged className
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<{ className?: string }>, {
        className: cn(buttonClassName, (children.props as { className?: string }).className),
      });
    }

    const content = isLoading ? (
      <>
        <LoadingIcon className="h-4 w-4 animate-spin" />
        Loading...
      </>
    ) : (
      <>
        {leftIcon}
        {children}
        {rightIcon}
      </>
    );

    return (
      <button
        ref={ref}
        className={buttonClassName}
        disabled={isLoading || disabled}
        {...props}
      >
        {content}
      </button>
    );
  }
);

AndamioButton.displayName = "AndamioButton";
