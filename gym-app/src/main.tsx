import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import './styles/index.css';
import App from './App';

registerSW({ immediate: true });

// Solo Safari de iPhone/iPad define navigator.standalone: ahí se deja libre la franja difuminada de arriba.
if ('standalone' in navigator) document.documentElement.dataset.ios = '';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
