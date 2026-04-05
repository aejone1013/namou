import { useEffect } from 'react'

export function useViewportHeightVar() {
  useEffect(() => {
    const updateViewportHeight = () => {
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight
      document.documentElement.style.setProperty('--app-height', `${viewportHeight * 0.01}px`)
    }

    updateViewportHeight()

    const visualViewport = window.visualViewport
    window.addEventListener('resize', updateViewportHeight)
    visualViewport?.addEventListener('resize', updateViewportHeight)
    visualViewport?.addEventListener('scroll', updateViewportHeight)

    return () => {
      window.removeEventListener('resize', updateViewportHeight)
      visualViewport?.removeEventListener('resize', updateViewportHeight)
      visualViewport?.removeEventListener('scroll', updateViewportHeight)
    }
  }, [])
}
