import React from 'react';
import { Link } from 'react-router-dom';

const Unauthorized = () => {
  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h1>Acceso no autorizado</h1>
      <p>No tienes permiso para acceder a esta página.</p>
      <Link to="/dashboard/inventarios">Volver al inicio</Link>
    </div>
  );
};

export default Unauthorized;