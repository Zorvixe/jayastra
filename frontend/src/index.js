import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from "@react-oauth/google"
import App from './App.jsx'

// 🔥 paste your Google CLIENT ID here
const REACT_APP_GOOGLE_CLIENT_ID = "425076340097-rahjuls1r3lfgdkijroi7vg36iai34fa.apps.googleusercontent.com"
const REACT_APP_GOOGLE_CLIENT_SECRET = "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"

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={REACT_APP_GOOGLE_CLIENT_ID} clientSecret={REACT_APP_GOOGLE_CLIENT_SECRET}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)
