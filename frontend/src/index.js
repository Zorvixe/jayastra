import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from "@react-oauth/google"
import App from './App.jsx'

// 🔥 paste your Google CLIENT ID here
const REACT_APP_GOOGLE_CLIENT_ID=process.env.REACT_APP_GOOGLE_CLIENT_ID
const REACT_APP_GOOGLE_CLIENT_SECRET=process.env.REACT_APP_GOOGLE_CLIENT_SECRET

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={REACT_APP_GOOGLE_CLIENT_ID} clientSecret={REACT_APP_GOOGLE_CLIENT_SECRET}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)
