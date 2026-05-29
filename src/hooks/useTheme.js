import { useEffect } from 'react'

export const THEMES = {
  SELECTOR: 'theme-selector',
  BOLETINES: 'theme-boletines',
  CURSO_INGRESO: 'theme-curso-ingreso',
}

export function useTheme(theme = THEMES.SELECTOR) {
  useEffect(() => {
    // Remove all theme classes
    Object.values(THEMES).forEach(t => {
      document.body.classList.remove(t)
    })

    // Add new theme
    document.body.classList.add(theme)

    return () => {
      document.body.classList.remove(theme)
    }
  }, [theme])
}
