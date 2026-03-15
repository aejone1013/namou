import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import './index.css'

const params = new URLSearchParams(window.location.search)
if (params.get('portableReset') === '1') {
  localStorage.removeItem('namou-storage')
}

// Android 뒤로가기 버튼 처리
if (Capacitor.isNativePlatform()) {
  void import('@capacitor/app').then(({ App: CapApp }) => {
    void CapApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back()
      } else {
        void CapApp.minimizeApp()
      }
    })
  })
}

const root = createRoot(document.getElementById('root')!)
void import('./App').then(({ default: App }) => {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
