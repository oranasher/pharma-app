'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider, useTheme as useNextThemes } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes/dist/types';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

// Correctly re-export the official hook from the next-themes library
export const useTheme = useNextThemes;
