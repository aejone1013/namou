import type { CSSProperties } from 'react'

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export function canvasRectStyle(size: { width: number; height: number }): CSSProperties {
  return { width: size.width, height: size.height }
}

export function floorGridStyle(step: number, mode: 'edit' | 'view'): CSSProperties {
  if (mode === 'edit') {
    return {
      backgroundImage: [
        'radial-gradient(circle, rgba(139,111,71,0.18) 1px, transparent 1px)',
        'linear-gradient(to right, rgba(139,111,71,0.06) 1px, transparent 1px)',
        'linear-gradient(to bottom, rgba(139,111,71,0.06) 1px, transparent 1px)',
      ].join(','),
      backgroundSize: `${step * 2}px ${step * 2}px, ${step}px ${step}px, ${step}px ${step}px`,
      backgroundPosition: '0 0, 0 0, 0 0',
    }
  }

  return {
    backgroundImage: [
      'radial-gradient(120% 80% at 50% 10%, rgba(255,255,255,0.55), rgba(255,255,255,0) 70%)',
      'linear-gradient(to bottom, rgba(58,49,40,0.02), rgba(58,49,40,0.04))',
    ].join(','),
  }
}

export function absoluteRectStyle(rect: Rect, options?: { zIndex?: number; pointerEvents?: CSSProperties['pointerEvents'] }): CSSProperties {
  return {
    left: rect.x,
    top: rect.y,
    width: rect.width,
    height: rect.height,
    ...(options?.zIndex !== undefined ? { zIndex: options.zIndex } : {}),
    ...(options?.pointerEvents ? { pointerEvents: options.pointerEvents } : {}),
  }
}

export function expandedRectStyle(rect: Rect, expand: number, zIndex?: number): CSSProperties {
  return {
    left: rect.x - expand,
    top: rect.y - expand,
    width: rect.width + expand * 2,
    height: rect.height + expand * 2,
    ...(zIndex !== undefined ? { zIndex } : {}),
  }
}
