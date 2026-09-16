import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ProfileForm } from './features/accessControl/ProfileForm';
import { App } from './App';
import { RegisterForm } from './features/accessControl/RegisterForm';
import './styles.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    {window.location.pathname === '/register' ? <RegisterForm /> : window.location.pathname === '/profile' ? <ProfileForm /> : <App />}
  </StrictMode>,
);
