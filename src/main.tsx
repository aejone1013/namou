import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

const params = new URLSearchParams(window.location.search)
if (params.get('portableReset') === '1') {
  localStorage.removeItem('namou-storage')
}

const root = createRoot(document.getElementById('root')!)
void import('./App').then(({ default: App }) => {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
