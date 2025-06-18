import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { Routes, Route } from 'react-router-dom';
import Inventarios from '../pages/Inventarios';
import Reportes from '../pages/Reportes';
import Usuarios from '../pages/Usuarios';
import Chatbot from '../pages/Chatbot';
import Mantenimiento from '../pages/Mantenimiento';
import Soporte from '../pages/Soporte';
import './Dashboard.css';

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="dashboard-container">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <Routes>
          <Route path="inventarios" element={<Inventarios />} />
          <Route path="reportes" element={<Reportes />} />
          <Route path="usuarios" element={<Usuarios />} />
          <Route path="chatbot" element={<Chatbot />} />
          <Route path="mantenimiento" element={<Mantenimiento />} />
          <Route path="soporte" element={<Soporte />} />
        </Routes>
      </div>
    </div>
  );
};

export default Dashboard; 



