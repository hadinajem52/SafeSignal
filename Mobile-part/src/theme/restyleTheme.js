import { createTheme } from '@shopify/restyle';
import { spacing, borderRadius } from '../../../constants/spacing';
import { typography } from '../../../constants/typography';

const baseSpacing = {
  none: 0,
  xs: spacing.xs,
  sm: spacing.sm,
  md: spacing.md,
  lg: spacing.lg,
  xl: spacing.xl,
  xxl: spacing.xxl,
  xxxl: spacing.xxxl,
};

const baseBorderRadii = {
  none: 0,
  sm: borderRadius.sm,
  md: borderRadius.md,
  lg: borderRadius.lg,
  xl: borderRadius.xl,
  pill: borderRadius.pill,
};

const baseTextVariants = {
  defaults: {
    color: 'text',
  },
  h1: typography.h1,
  h2: typography.h2,
  h3: typography.h3,
  h4: typography.h4,
  h5: typography.h5,
  bodyLarge: typography.bodyLarge,
  body: typography.body,
  bodySmall: typography.bodySmall,
  label: typography.label,
  caption: typography.caption,
  small: typography.small,
  button: typography.button,
  buttonSmall: typography.buttonSmall,
};

export const buildRestyleTheme = (colors) =>
  createTheme({
    colors,
    spacing: baseSpacing,
    borderRadii: baseBorderRadii,
    textVariants: baseTextVariants,
    breakpoints: {
      phone: 0,
      tablet: 768,
    },
  });
