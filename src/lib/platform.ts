import { Capacitor } from '@capacitor/core'

export type Platform = 'android' | 'electron' | 'web'

export function getPlatform(): Platform {
  if (Capacitor.isNativePlatform()) {
    return Capacitor.getPlatform() as Platform
  }
  if (window.namouDesktop) {
    return 'electron'
  }
  return 'web'
}

export function isMobile(): boolean {
  return getPlatform() === 'android' || window.innerWidth < 768
}

export function isDesktop(): boolean {
  return !isMobile()
}
