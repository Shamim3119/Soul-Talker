import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App.jsx';

import { ThemeProvider } from './context/ThemeContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { NavigationProvider } from './context/NavigationContext.jsx';

import './index.css';

createRoot(document.getElementById('root')).render(
    <BrowserRouter>
        <ThemeProvider>
            <AuthProvider>
                <NavigationProvider>
                    <App />
                </NavigationProvider>
            </AuthProvider>
        </ThemeProvider>
    </BrowserRouter>
);