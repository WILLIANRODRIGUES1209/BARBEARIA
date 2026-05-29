import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
<<<<<<< HEAD
import { registerSW } from 'virtual:pwa-register';

// Register service worker
if ('serviceWorker' in navigator) {
  registerSW({ immediate: true });
}
=======
>>>>>>> f67eaa8a2ae6d296261c137d544b1b6f6bcb6798

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
