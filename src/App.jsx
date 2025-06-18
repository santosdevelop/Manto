import React, { useEffect } from 'react';
import './App.css';

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

import { auth } from './components/firebase'; // Asegúrate de que esta ruta sea correcta
import { preloadReportsData } from './services/reportsPreloader';

function App() {
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        // Precargar datos cuando el usuario inicia sesión
        preloadReportsData().catch(console.error);
      }
    });

    // Limpiar el listener cuando el componente se desmonta
    return () => unsubscribe();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard/*" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
