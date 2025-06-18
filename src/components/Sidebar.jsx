import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Sidebar.css';
import {
  Home, FileText, Users, Bot, Settings, HelpCircle, LogOut, Menu
} from 'lucide-react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

export default function Sidebar({ sidebarOpen, setSidebarOpen }) {
  const [userData, setUserData] = useState({ nombre: '', imagen: '', rol: '' });
  const [showModal, setShowModal] = useState(false);
  const [uid, setUid] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const db = getFirestore();

    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth <= 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUid(user.uid);
        const refUser = doc(db, 'usuarios', user.uid);
        const snap = await getDoc(refUser);
        if (snap.exists()) {
          const data = snap.data();
          setUserData({
            nombre: data.nombre || 'Usuario',
            imagen: data.imagen || '',
            rol: data.rol || 'almacen' // Valor por defecto si no existe el rol
          });
        }
      }
    });

    return () => {
      unsubscribe();
      window.removeEventListener('resize', checkMobile);
    };
  }, [setSidebarOpen]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleImageClick = () => {
    setShowModal(true);
    setSuccessMessage('');
  };

  const handleLinkSave = async () => {
    if (uid && userData.imagen) {
      try {
        const db = getFirestore();
        const refUser = doc(db, 'usuarios', uid);
        await setDoc(refUser, { imagen: userData.imagen }, { merge: true });
        setSuccessMessage('Imagen actualizada correctamente');
        setTimeout(() => setShowModal(false), 1500);
      } catch (error) {
        console.error('Error al guardar link de imagen:', error);
      }
    }
  };

  // Función para verificar si el usuario tiene acceso a una opción
  const hasAccess = (requiredRoles) => {
    if (!userData.rol) return false;
    return requiredRoles.includes(userData.rol);
  };

  return (
    <>
      <button 
        className={`hamburger-btn ${sidebarOpen ? 'open' : ''}`}
        onClick={toggleSidebar}
      >
        <Menu size={24} />
      </button>

      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="profile-section">
          <div className="profile-image" onClick={handleImageClick}>
            <img
              src={userData.imagen || '/default-user.png'}
              alt="Usuario"
              className="profile-img"
            />
          </div>
          {sidebarOpen && (
            <>
              <div className="profile-name">{userData.nombre}</div>
              <div className="profile-role">{userData.rol}</div>
            </>
          )}
        </div>

        <hr className="separator" />

        <div className="section-title">{sidebarOpen ? 'Principal' : ''}</div>
        
        {/* Inventarios - Accesible para todos */}
        <Link to="/dashboard/inventarios" className="menu-item" onClick={() => isMobile && setSidebarOpen(false)}>
          <Home size={18} className="menu-icon" /> 
          {sidebarOpen && <span className="menu-text">Inventarios</span>}
        </Link>

        {/* Reportes - Solo admin y tecnico */}
        {hasAccess(['admin', 'tecnico']) && (
          <Link to="/dashboard/reportes" className="menu-item" onClick={() => isMobile && setSidebarOpen(false)}>
            <FileText size={18} className="menu-icon" /> 
            {sidebarOpen && <span className="menu-text">Reportes</span>}
          </Link>
        )}

        {/* Usuarios - Solo admin */}
        {hasAccess(['admin']) && (
          <Link to="/dashboard/usuarios" className="menu-item" onClick={() => isMobile && setSidebarOpen(false)}>
            <Users size={18} className="menu-icon" /> 
            {sidebarOpen && <span className="menu-text">Usuarios</span>}
          </Link>
        )}

        {/* Chatbot - Solo admin y tecnico */}
        {hasAccess(['admin', 'tecnico']) && (
          <Link to="/dashboard/chatbot" className="menu-item" onClick={() => isMobile && setSidebarOpen(false)}>
            <Bot size={18} className="menu-icon" /> 
            {sidebarOpen && <span className="menu-text">Chatbot</span>}
          </Link>
        )}

        {/* Mantenimiento - Solo admin y tecnico */}
        {hasAccess(['admin', 'tecnico']) && (
          <Link to="/dashboard/mantenimiento" className="menu-item" onClick={() => isMobile && setSidebarOpen(false)}>
            <Settings size={18} className="menu-icon" /> 
            {sidebarOpen && <span className="menu-text">Mantenimiento</span>}
          </Link>
        )}

        <hr className="separator" />

        <div className="section-title">{sidebarOpen ? 'Otros' : ''}</div>
        
        {/* Soporte - Solo admin y tecnico */}
        {hasAccess(['admin', 'tecnico']) && (
          <Link to="/dashboard/soporte" className="menu-item" onClick={() => isMobile && setSidebarOpen(false)}>
            <HelpCircle size={18} className="menu-icon" /> 
            {sidebarOpen && <span className="menu-text">Soporte</span>}
          </Link>
        )}

        {/* Salir - Visible para todos */}
        <Link to="/login" className="menu-item logout" onClick={() => isMobile && setSidebarOpen(false)}>
          <LogOut size={18} className="menu-icon" /> 
          {sidebarOpen && <span className="menu-text">Salir</span>}
        </Link>
      </div>

      {isMobile && sidebarOpen && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Coloca el enlace de tu imagen</h3>
            <input
              type="text"
              placeholder="https://ejemplo.com/mi-foto.jpg"
              value={userData.imagen}
              onChange={(e) =>
                setUserData((prev) => ({ ...prev, imagen: e.target.value }))
              }
              className="modal-input"
            />
            <div className="modal-buttons">
              <button 
                onClick={handleLinkSave} 
                disabled={!userData.imagen}
                className="modal-btn confirm"
              >
                Aceptar
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="modal-btn cancel"
              >
                Cancelar
              </button>
            </div>
            {successMessage && (
              <p className="success-message">{successMessage}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}