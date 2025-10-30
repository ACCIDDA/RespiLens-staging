import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider, localStorageColorSchemeManager } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import '@mantine/dates/styles.css'
import '@mantine/spotlight/styles.css'
import '@mantine/carousel/styles.css'
import App from './App.jsx'
import { theme } from './theme/mantine.js'

const colorSchemeManager = localStorageColorSchemeManager({
  key: 'respilens-color-scheme',
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MantineProvider
      theme={theme}
      colorSchemeManager={colorSchemeManager}
      defaultColorScheme="light"
    >
      <Notifications />
      <App />
    </MantineProvider>
  </StrictMode>,
)
