import React, { useEffect, useState } from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { auth } from './components/firebase';
import { preloadReportsData } from './services/reportsPreloader';

// Componente de protección de rutas
const ProtectedRoute = ({ user, redirectPath = '/' }) => {
  if (!user) {
    return <Navigate to={redirectPath} replace />;
  }
  return <Outlet />;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setUser(user);
      setLoading(false);
      if (user) {
        preloadReportsData().catch(console.error);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="loading-screen">Cargando...</div>; // Agrega un spinner o mensaje
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        
        {/* Ruta protegida */}
        <Route element={<ProtectedRoute user={user} />}>
          <Route path="/dashboard/*" element={<Dashboard />} />
        </Route>

        {/* Ruta para páginas no encontradas */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;