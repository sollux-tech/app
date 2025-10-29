"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes";
import { type ThemeProviderProps } from "next-themes/dist/types";
import { useSession } from '@/components/SessionContextProvider'; // Importar useSession

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const { profile, isLoading: isLoadingProfile } = useSession();
  const { setTheme } = useNextTheme();

  // Efeito para garantir que o tema do perfil seja aplicado e persistido no localStorage
  React.useEffect(() => {
    if (!isLoadingProfile && profile?.theme) {
      const storedTheme = localStorage.getItem(props.storageKey || 'theme');
      if (storedTheme !== profile.theme) {
        console.log("ThemeProvider: Applying profile theme to localStorage and next-themes:", profile.theme);
        setTheme(profile.theme);
      }
    }
  }, [profile?.theme, isLoadingProfile, setTheme, props.storageKey]);

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

export const useTheme = useNextTheme;