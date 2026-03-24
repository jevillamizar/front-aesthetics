import React, { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../../lib/utils';
import { motion, HTMLMotionProps } from 'framer-motion';
export interface ButtonProps extends
  React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
  {
    className,
    variant = 'primary',
    size = 'default',
    asChild = false,
    ...props
  },
  ref) =>
  {
    const Comp = asChild ? Slot : 'button';
    const baseStyles =
    'inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
    const variants = {
      primary:
      'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-md hover:shadow-lg transition-all duration-300',
      secondary: 'bg-[var(--secondary,#F5F5F3)] text-[var(--text-muted,#6B6B6B)] hover:brightness-95',
      outline:
      'border border-[var(--primary)] bg-transparent text-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary),transparent_90%)]',
      ghost: 'hover:bg-[color-mix(in_srgb,var(--primary),transparent_90%)] text-[#6B6B6B] hover:text-[var(--primary)]'
    };
    const sizes = {
      default: 'h-11 px-8 py-2',
      sm: 'h-9 rounded-full px-4',
      lg: 'h-14 rounded-full px-10 text-base',
      icon: 'h-10 w-10'
    };
    return (
      <Comp
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        {...props} />);


  }
);
Button.displayName = 'Button';
export { Button };