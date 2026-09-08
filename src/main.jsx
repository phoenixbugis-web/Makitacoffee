import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

import { AuthProvider } from './context/AuthContext';
import { BrandingProvider } from './context/BrandingContext';
import { SocketProvider } from './context/SocketContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <BrandingProvider>
        <SocketProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </SocketProvider>
      </BrandingProvider>
    </BrowserRouter>
  </React.StrictMode>
);
