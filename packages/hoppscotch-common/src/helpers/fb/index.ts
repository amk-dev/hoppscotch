import { initializeApp } from "firebase/app"
import { platform } from "~/platform"
import { initAnalytics } from "./analytics"
import { initCollections } from "./collections"

const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_DATABASE_URL,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
  measurementId: import.meta.env.VITE_MEASUREMENT_ID,
}

let initialized = false

export function initializeFirebase() {
  if (!initialized) {
    try {
      initializeApp(firebaseConfig)

      platform.auth.performAuthInit()
      platform.settings.initSettings()
      initCollections()
      platform.history.initHistory()
      platform.environments.initEnvironments()
      initAnalytics()

      initialized = true
    } catch (e) {
      // initializeApp throws exception if we reinitialize
      initialized = true
    }
  }
}
