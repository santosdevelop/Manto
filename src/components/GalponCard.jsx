import React, { useState, useCallback } from 'react';
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { FaUser, FaInfoCircle, FaTimes, FaCalendarAlt, FaTools, FaClipboardList } from 'react-icons/fa';
import './GalponCard.css';

const GalponCard = ({ galpon }) => {
  const [detalles, setDetalles] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const obtenerDetalles = useCallback(async () => {
    if (mostrarModal) {
      setMostrarModal(false);
      return;
    }

    setCargando(true);
    setError(null);
    const db = getFirestore();

    try {
      const mantenimientosRef = collection(db, `galpones/${galpon.id}/mantenimientos`);
      const q = query(mantenimientosRef, orderBy('fecha', 'desc'));
      const mantenimientosSnap = await getDocs(q);
      
      const mantenimientos = mantenimientosSnap.docs.map(doc => {
        const data = doc.data();
        const fecha = data.fecha?.seconds ? new Date(data.fecha.seconds * 1000) : null;
        
        return {
          id: doc.id,
          ...data,
          fecha,
          tecnico: data.tecnicoNombre || 'Técnico no especificado',
          descripcion: data.descripcion || 'Sin descripción',
          tipo: (data.tipo || 'pendiente').toLowerCase(),
          estado: (data.estado || 'completado').toLowerCase()
        };
      });

      // Get unique technicians and count maintenance types
      const tecnicos = [...new Set(mantenimientos.map(m => m.tecnico))];
      const conteoMantenimientos = mantenimientos.reduce((acc, m) => {
        acc[m.tipo] = (acc[m.tipo] || 0) + 1;
        return acc;
      }, {});

      setDetalles({ 
        mantenimientos,
        tecnicos,
        conteoMantenimientos,
        ultimoMantenimiento: mantenimientos[0]?.fecha || null
      });
      
      setMostrarModal(true);
    } catch (err) {
      console.error("Error al obtener detalles:", err);
      setError("No se pudieron cargar los detalles. Intente nuevamente.");
    } finally {
      setCargando(false);
    }
  }, [galpon.id, mostrarModal]);

  const cerrarModal = useCallback(() => {
    setMostrarModal(false);
  }, []);

  const formatDate = (date) => {
    if (!date) return '--/--/----';
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusBadge = (tipo, estado) => {
    const baseClass = 'galpon-maintenance-badge';
    const statusClass = estado === 'pendiente' ? 'galpon-badge-pendiente' :
      tipo === 'preventivo' ? 'galpon-badge-preventivo' : 
      tipo === 'correctivo' ? 'galpon-badge-correctivo' : 'galpon-badge-otro';
    
    return `${baseClass} ${statusClass}`;
  };

  return (
    <>
      <div className="galpon-card">
        <div className="galpon-header">
          <h2 className="galpon-title">{galpon.nombre}</h2>
          <div className="galpon-meta-container">
            <p className="galpon-meta">
              <span className="galpon-meta-icon">📍</span> 
              <span className="galpon-meta-text">{galpon.ubicacion}</span>
            </p>
            <p className="galpon-meta">
              <span className="galpon-meta-icon">🐥</span> 
              <span className="galpon-meta-text">Edad: {galpon.edad || 'N/A'} años</span>
            </p>
            {galpon.capacidad && (
              <p className="galpon-meta">
                <span className="galpon-meta-icon">🧺</span> 
                <span className="galpon-meta-text">Capacidad: {galpon.capacidad}</span>
              </p>
            )}
          </div>
        </div>

        <div className="galpon-footer">
          <button
            onClick={obtenerDetalles}
            className={`galpon-details-button ${cargando ? 'loading' : ''}`}
            disabled={cargando}
            aria-label={cargando ? "Cargando detalles" : "Ver detalles de mantenimiento"}
          >
            {cargando ? (
              <>
                <span className="galpon-spinner"></span>
                Cargando...
              </>
            ) : (
              <>
                <FaClipboardList className="galpon-button-icon" />
                Ver Historial
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal de detalles */}
      {mostrarModal && (
        <div className="galpon-modal-overlay" onClick={cerrarModal}>
          <div className="galpon-modal-container" onClick={e => e.stopPropagation()}>
            <div className="galpon-modal-header">
              <h2>
                <FaTools className="galpon-modal-title-icon" />
                Mantenimientos - {galpon.nombre}
              </h2>
              <button 
                onClick={cerrarModal} 
                className="galpon-modal-close-button"
                aria-label="Cerrar modal"
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="galpon-modal-content">
              {error ? (
                <div className="galpon-error-state">
                  <FaInfoCircle />
                  <span>{error}</span>
                  <button 
                    onClick={obtenerDetalles} 
                    className="galpon-retry-button"
                  >
                    Reintentar
                  </button>
                </div>
              ) : (
                <>
                  {detalles?.conteoMantenimientos && (
                    <div className="galpon-stats-container">
                      <div className="galpon-stat-card">
                        <span className="galpon-stat-number">
                          {detalles.mantenimientos.length}
                        </span>
                        <span className="galpon-stat-label">Total</span>
                      </div>
                      <div className="galpon-stat-card">
                        <span className="galpon-stat-number">
                          {detalles.conteoMantenimientos.preventivo || 0}
                        </span>
                        <span className="galpon-stat-label">Preventivos</span>
                      </div>
                      <div className="galpon-stat-card">
                        <span className="galpon-stat-number">
                          {detalles.conteoMantenimientos.correctivo || 0}
                        </span>
                        <span className="galpon-stat-label">Correctivos</span>
                      </div>
                      <div className="galpon-stat-card">
                        <span className="galpon-stat-number">
                          {detalles.conteoMantenimientos.pendiente || 0}
                        </span>
                        <span className="galpon-stat-label">Pendientes</span>
                      </div>
                    </div>
                  )}

                  <div className="galpon-table-container">
                    <h3 className="galpon-table-title">
                      <FaClipboardList className="galpon-table-title-icon" />
                      Historial de Mantenimientos
                    </h3>
                    <div className="galpon-table-scroll-container">
                      <table className="galpon-maintenance-table">
                        <thead>
                          <tr>
                            <th>Tipo/Estado</th>
                            <th>Descripción</th>
                            <th>
                              <FaCalendarAlt className="galpon-table-header-icon" />
                              Fecha
                            </th>
                            <th>
                              <FaUser className="galpon-table-header-icon" />
                              Técnico
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {detalles?.mantenimientos.length > 0 ? (
                            detalles.mantenimientos.map((m) => (
                              <tr key={m.id}>
                                <td className="galpon-type-cell">
                                  <span className={getStatusBadge(m.tipo, m.estado)}>
                                    {m.tipo}
                                    {m.estado === 'pendiente' && ' (pendiente)'}
                                  </span>
                                </td>
                                <td className="galpon-description-cell">
                                  {m.descripcion}
                                </td>
                                <td className="galpon-date-cell">
                                  {formatDate(m.fecha)}
                                </td>
                                <td className="galpon-technician-cell">
                                  <FaUser className="galpon-technician-icon" />
                                  <span>{m.tecnico}</span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="4">
                                <div className="galpon-empty-state">
                                  <FaInfoCircle />
                                  <span>No hay registros de mantenimiento</span>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="galpon-technicians-section">
                    <h3 className="galpon-section-title">
                      <FaUser className="galpon-section-icon" /> 
                      Técnicos que han intervenido ({detalles?.tecnicos.length || 0})
                    </h3>
                    <div className="galpon-technicians-list">
                      {detalles?.tecnicos.length > 0 ? (
                        detalles.tecnicos.map((nombre) => (
                          <span key={nombre} className="galpon-technician-tag">
                            <FaUser className="galpon-technician-tag-icon" />
                            {nombre}
                          </span>
                        ))
                      ) : (
                        <div className="galpon-empty-state">
                          <FaInfoCircle />
                          <span>No hay técnicos registrados</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="galpon-modal-footer">
              <div className="galpon-modal-footer-info">
                {detalles?.ultimoMantenimiento && (
                  <p className="galpon-last-maintenance">
                    Último mantenimiento: {formatDate(detalles.ultimoMantenimiento)}
                  </p>
                )}
              </div>
              <button 
                onClick={cerrarModal} 
                className="galpon-modal-close-btn"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default React.memo(GalponCard);