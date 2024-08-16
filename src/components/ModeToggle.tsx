'use client'

import { useState, useEffect } from 'react'
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group'
import { SunIcon, MoonIcon, LaptopIcon } from '@radix-ui/react-icons'

export function ModeToggle() {
  const [theme, setThemeState] = useState<'theme-light' | 'dark' | 'system'>(
    'theme-light'
  )

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark')
    setThemeState(isDarkMode ? 'dark' : 'theme-light')
  }, [])

  useEffect(() => {
    const isDark =
      theme === 'dark' ||
      (theme === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList[isDark ? 'add' : 'remove']('dark')
  }, [theme])

  return (
    <ToggleGroup
      type="single"
      value={theme}
      className="rounded-2xl border border-solid"
      onValueChange={(latestTheme) =>
        setThemeState(latestTheme as typeof theme)
      }
    >
      <ToggleGroupItem value="system" className="!px-0 !h-8 !w-8 !rounded-full">
        <LaptopIcon className="!w-4 !h-4" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="theme-light"
        className="!px-0 !h-8 !w-8 !rounded-full"
      >
        <SunIcon className="!w-4 !h-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="dark" className="!px-0 !h-8 !w-8 !rounded-full">
        <MoonIcon className="!w-4 !h-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
