import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { 
  collection, 
  getDocs, 
  getFirestore, 
  doc, 
  updateDoc, 
  increment,
  getDoc,
  query,
  where,
  writeBatch
} from 'firebase/firestore';
import { 
  FaUser, 
  FaSearch, 
  FaUsers, 
  FaUserCheck, 
  FaUserTimes, 
  FaTimes, 
  FaTools, 
  FaHardHat, 
  FaArrowUp, 
  FaPlus, 
  FaEdit, 
  FaTrash,
  FaCheck,
  FaUserShield,
  FaUserCog
} from 'react-icons/fa';
import '../components/Usuarios.css';

const Usuarios = () => {
  // Estados principales
  const [usuarios, setUsuarios] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingUser, setUpdatingUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userTools, setUserTools] = useState([]);
  const [userEpps, setUserEpps] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showFirmaModal, setShowFirmaModal] = useState(false);
  
  // Estados para el modal de asignación de EPP
  const [showAsignarEppModal, setShowAsignarEppModal] = useState(false);
  const [eppsDisponibles, setEppsDisponibles] = useState([]);
  const [selectedEpp, setSelectedEpp] = useState(null);
  const [motivoAsignacion, setMotivoAsignacion] = useState('');
  const [asignandoEpp, setAsignandoEpp] = useState(false);

  // Estados para cambiar rol
  const [showChangeRoleModal, setShowChangeRoleModal] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [changingRole, setChangingRole] = useState(false);

  const rolesDisponibles = ['Administrador', 'Moderador', 'Técnico', 'Usuario'];

  const db = getFirestore();
  const detailsRef = useRef(null);

  // Scroll suave a los detalles
  const scrollToDetails = useCallback(() => {
    detailsRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
  }, []);

  // Color por rol
  const getRoleColor = useCallback((rol) => {
  console.log(`Evaluando color para el rol: ${rol}`); // <- Cambio de prueba
  switch (rol?.toLowerCase()) {
    case 'administrador': return 'role-admin';
    case 'moderador': return 'role-moderator';
    case 'técnico':
    case 'tecnico': return 'role-technician';
    default: return 'role-user';
  }
}, []);

  // Obtener usuarios desde Firestore
  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        setLoading(true);
        const usuariosRef = collection(db, 'usuarios');
        const usuariosSnap = await getDocs(usuariosRef);
        
        const usuariosData = usuariosSnap.docs.map(doc => ({
          id: doc.id,
          nombre: doc.data().nombre || '',
          email: doc.data().email || '',
          rol: doc.data().rol || 'Usuario',
          activo: doc.data().activo !== false
        }));
        
        setUsuarios(usuariosData);
      } catch (error) {
        console.error("Error al cargar usuarios:", error);
        alert("Error al cargar usuarios");
      } finally {
        setLoading(false);
      }
    };

    fetchUsuarios();
  }, [db]);

  // Mostrar botón "Volver arriba"
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Cargar detalles del usuario (herramientas y EPPs)
  const loadUserDetails = useCallback(async (userId) => {
    setLoadingDetails(true);
    try {
      // Usar batch para múltiples consultas
      const batch = writeBatch(db);
      
      // Consulta para herramientas
      const toolsQuery = query(
        collection(db, 'inventario'),
        where('categoria', '==', 'Herramientas'),
        where('asignadoA', '==', userId)
      );
      
      // Consulta para EPPs
      const eppQuery = query(
        collection(db, 'inventario'),
        where('categoria', '==', 'EPP'),
        where('asignadoA', '==', userId)
      );
      
      const [toolsSnap, eppSnap] = await Promise.all([
        getDocs(toolsQuery),
        getDocs(eppQuery)
      ]);
      
      const toolsData = toolsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fechaAsignacion: doc.data().fechaAsignacion?.toDate() || null,
        fechaDevolucion: doc.data().fechaDevolucion?.toDate() || null
      }));
      
      const eppData = eppSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fechaAsignacion: doc.data().fechaAsignacion?.toDate() || null,
        fechaDevolucion: doc.data().fechaDevolucion?.toDate() || null,
        fechaRenovacion: doc.data().fechaRenovacion?.toDate() || null
      }));
      
      setUserTools(toolsData);
      setUserEpps(eppData);
    } catch (error) {
      console.error("Error al cargar detalles:", error);
      alert("Error al cargar herramientas y EPPs");
    } finally {
      setLoadingDetails(false);
    }
  }, [db]);

  // Manejar selección de usuario
  const handleUserClick = useCallback((usuario) => {
    setSelectedUser(usuario);
    loadUserDetails(usuario.id);
    setTimeout(scrollToDetails, 100);
  }, [loadUserDetails, scrollToDetails]);

  // Cambiar estado del usuario
  const toggleUserStatus = useCallback(async (userId) => {
    setUpdatingUser(userId);
    try {
      const usuarioRef = doc(db, 'usuarios', userId);
      const usuario = usuarios.find(u => u.id === userId);
      
      await updateDoc(usuarioRef, { 
        activo: !usuario.activo 
      });
      
      setUsuarios(usuarios.map(user => 
        user.id === userId ? { ...user, activo: !user.activo } : user
      ));
      
      // Si el usuario seleccionado cambió de estado, actualizar el estado local
      if (selectedUser?.id === userId) {
        setSelectedUser(prev => ({ ...prev, activo: !prev.activo }));
      }
    } catch (error) {
      console.error("Error al actualizar usuario:", error);
      alert("Error al cambiar estado del usuario");
    } finally {
      setUpdatingUser(null);
    }
  }, [db, usuarios, selectedUser]);

  // Cambiar rol del usuario
  const handleChangeRole = async () => {
    if (!newRole || !selectedUser) return;
    
    setChangingRole(true);
    try {
      const usuarioRef = doc(db, 'usuarios', selectedUser.id);
      
      await updateDoc(usuarioRef, { 
        rol: newRole 
      });
      
      // Actualizar en la lista de usuarios
      setUsuarios(usuarios.map(user => 
        user.id === selectedUser.id ? { ...user, rol: newRole } : user
      ));
      
      // Actualizar el usuario seleccionado
      setSelectedUser(prev => ({ ...prev, rol: newRole }));
      
      setShowChangeRoleModal(false);
      setNewRole('');
      alert('Rol actualizado correctamente');
    } catch (error) {
      console.error("Error al cambiar rol:", error);
      alert("Error al cambiar rol del usuario");
    } finally {
      setChangingRole(false);
    }
  };

  // Solicitar firma
  const handleSolicitarFirma = useCallback((eppId) => {
    if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
      window.location.href = `tuapp://firma?eppId=${eppId}&userId=${selectedUser.id}`;
    } else {
      setShowFirmaModal(true);
    }
  }, [selectedUser]);

  // Devolver EPP
  const handleDevolverEpp = useCallback(async (eppId) => {
    if (!window.confirm('¿Estás seguro de devolver este EPP?')) return;
    
    try {
      const eppRef = doc(db, 'inventario', eppId);
      
      await updateDoc(eppRef, {
        cantidad: increment(1),
        estado: 'disponible',
        asignadoA: null,
        fechaDevolucion: new Date().toISOString(),
        motivoCambio: motivoAsignacion || 'Devolución'
      });
      
      setUserEpps(prevEpps => prevEpps.filter(e => e.id !== eppId));
      alert('EPP devuelto correctamente');
    } catch (error) {
      console.error('Error al devolver EPP:', error);
      alert('Error al devolver EPP');
    }
  }, [db, motivoAsignacion]);

  // Cargar EPPs disponibles para asignar
const cargarEppsDisponibles = useCallback(async () => {
  try {
    // Cambiar a la colección correcta (ajusta según tu Firestore)
    const inventarioRef = collection(db, 'Inventario'); // o 'Categorias' según tu estructura
    
    const q = query(
      inventarioRef, 
      where('categoria', '==', 'EPP'), // Asegúrate que este campo existe
      where('estado', '==', 'disponible'),
      where('cantidad', '>', 0)
    );
    
    const querySnapshot = await getDocs(q);
    const eppsData = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      kardex: doc.data().kardex || 'N/A',
      descripcion: doc.data().descripcion || 'Sin descripción',
      cantidad: Number(doc.data().cantidad) || 0
    }));
    
    setEppsDisponibles(eppsData.filter(epp => epp.cantidad > 0));
  } catch (error) {
    console.error("Error al cargar EPPs disponibles:", error);
    alert("Error al cargar EPPs disponibles");
    setEppsDisponibles([]); // Asegurarse de que el estado se limpia en caso de error
  }
}, [db]);

  // Abrir modal para asignar EPP
  const abrirModalAsignarEpp = useCallback(async () => {
    try {
      await cargarEppsDisponibles();
      setShowAsignarEppModal(true);
    } catch (error) {
      console.error("Error al abrir modal de asignación:", error);
    }
  }, [cargarEppsDisponibles]);

  // Asignar EPP seleccionado
  const confirmarAsignacionEpp = useCallback(async () => {
    if (!selectedEpp || !selectedUser) {
      alert('Por favor selecciona un EPP');
      return;
    }

    setAsignandoEpp(true);
    
    try {
      const eppRef = doc(db, 'inventario', selectedEpp.id);
      
      await updateDoc(eppRef, {
        cantidad: increment(-1),
        estado: 'en uso',
        asignadoA: selectedUser.id,
        fechaAsignacion: new Date().toISOString(),
        motivoCambio: motivoAsignacion || 'Asignación inicial',
        usuarioAsignacion: selectedUser.nombre
      });
      
      // Obtener los datos actualizados
      const eppSnapshot = await getDoc(eppRef);
      const eppData = eppSnapshot.data();
      
      // Actualizar lista local
      setUserEpps(prevEpps => [
        ...prevEpps,
        {
          id: selectedEpp.id,
          ...eppData,
          fechaAsignacion: new Date().toISOString()
        }
      ]);
      
      // Cerrar modal y resetear valores
      setShowAsignarEppModal(false);
      setSelectedEpp(null);
      setMotivoAsignacion('');
      
      alert('EPP asignado correctamente');
    } catch (error) {
      console.error('Error al asignar EPP:', error);
      alert('Error al asignar EPP');
    } finally {
      setAsignandoEpp(false);
    }
  }, [db, selectedEpp, selectedUser, motivoAsignacion]);

  // Filtrar usuarios
const usuariosFiltrados = useMemo(() => {
  return usuarios.filter(usuario =>
    usuario.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    usuario.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    usuario.rol.toLowerCase().includes(searchTerm.toLowerCase())
  );
}, [usuarios, searchTerm]);

  if (loading) {
    return (
      <div className="main-content-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content-container">
      <div className="content-wrapper">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">
            <FaUsers className="title-icon" />
            Usuarios
          </h1>
          <p className="page-subtitle">Administra los usuarios del sistema</p>
        </div>

        {/* Barra de búsqueda */}
        <div className="search-section">
          <div className="search-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Buscar usuarios por nombre, email o rol..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Estadísticas */}
        <div className="stats-grid">
          <div className="stat-card total">
            <div className="stat-icon">
              <FaUsers />
            </div>
            <div className="stat-info">
              <span className="stat-label">Total Usuarios</span>
              <span className="stat-value">{usuarios.length}</span>
            </div>
          </div>
          
          <div className="stat-card active">
            <div className="stat-icon">
              <FaUserCheck />
            </div>
            <div className="stat-info">
              <span className="stat-label">Usuarios Activos</span>
              <span className="stat-value">
                {usuarios.filter(user => user.activo).length}
              </span>
            </div>
          </div>
          
          <div className="stat-card inactive">
            <div className="stat-icon">
              <FaUserTimes />
            </div>
            <div className="stat-info">
              <span className="stat-label">Usuarios Inactivos</span>
              <span className="stat-value">
                {usuarios.filter(user => !user.activo).length}
              </span>
            </div>
          </div>
        </div>

        {/* Tabla de usuarios */}
        <div className="users-table-container">
          <div className="table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Correo Electrónico</th>
                  <th>Estado</th>
                  <th>Rol</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.length > 0 ? (
                  usuariosFiltrados.map((usuario) => (
                    <tr 
                      key={usuario.id} 
                      className={`table-row ${selectedUser?.id === usuario.id ? 'selected' : ''}`}
                      onClick={() => handleUserClick(usuario)}
                    >
                      <td>
                        <div className="user-info">
                          <div className="user-avatar">
                            <FaUser />
                          </div>
                          <div className="user-details">
                            <span className="user-name">
                              {usuario.nombre}
                            </span>
                          </div>
                        </div>
                      </td>
                      
                      <td>
                        <span className="user-email">
                          {usuario.email}
                        </span>
                      </td>
                      
                      <td>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleUserStatus(usuario.id);
                          }}
                          disabled={updatingUser === usuario.id}
                          className={`status-button ${
                            usuario.activo ? 'status-active' : 'status-inactive'
                          } ${updatingUser === usuario.id ? 'updating' : ''}`}
                        >
                          {updatingUser === usuario.id ? (
                            'Actualizando...'
                          ) : (
                            usuario.activo ? 'Activo' : 'Inactivo'
                          )}
                        </button>
                      </td>
                      
                      <td>
                        <span className={`role-badge ${getRoleColor(usuario.rol)}`}>
                          {usuario.rol}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="no-results">
                      <div className="empty-state">
                        <FaUsers className="empty-icon" />
                        <p>No se encontraron usuarios</p>
                        {searchTerm && (
                          <small>Intenta con usuarios existentes</small>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel de detalles del usuario */}
        {selectedUser && (
          <div className="user-detail-panel" ref={detailsRef}>
            <div className="panel-header">
              <h3>Detalles del Usuario</h3>
              <button 
                className="close-panel"
                onClick={() => setSelectedUser(null)}
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="user-info-summary">
              <div className="user-avatar large">
                <FaUser />
              </div>
              <div className="user-details">
                <h4>{selectedUser.nombre}</h4>
                <p>{selectedUser.email}</p>
                <div className="user-actions">
                  <span className={`role-badge ${getRoleColor(selectedUser.rol)}`}>
                    {selectedUser.rol}
                  </span>
                  <button
                    className="change-role-button"
                    onClick={() => {
                      setNewRole(selectedUser.rol);
                      setShowChangeRoleModal(true);
                    }}
                  >
                    <FaUserCog /> Cambiar Rol
                  </button>
                  <button
                    className={`status-button ${selectedUser.activo ? 'status-active' : 'status-inactive'}`}
                    onClick={() => toggleUserStatus(selectedUser.id)}
                    disabled={updatingUser === selectedUser.id}
                  >
                    {updatingUser === selectedUser.id ? (
                      'Actualizando...'
                    ) : (
                      selectedUser.activo ? 'Activo' : 'Inactivo'
                    )}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Sección de EPPs */}
            <div className="detail-section">
  <div className="section-header">
    <FaHardHat className="section-icon" />
    <h4>EPPs Asignados</h4>
    {userEpps.length === 0 && (
      <button 
        className="add-epp-button"
        onClick={abrirModalAsignarEpp}
        disabled={loadingDetails || !selectedUser.activo}
      >
        <FaPlus /> Asignar Primer EPP
      </button>
    )}
  </div>
  
  {loadingDetails ? (
    <div className="loading-details">
      <div className="small-spinner"></div>
      <p>Cargando EPPs...</p>
    </div>
  ) : userEpps.length > 0 ? (
    <>
      <div className="table-responsive">
        {/* Tabla de EPPs */}
      </div>
      <button 
        className="add-epp-button bottom-button"
        onClick={abrirModalAsignarEpp}
        disabled={!selectedUser.activo}
      >
        <FaPlus /> Asignar Otro EPP
      </button>
    </>
  ) : (
    <div className="no-items">
      <p>No se han asignado EPPs a este usuario</p>
    </div>
  )}
</div>
            
            {/* Sección de Herramientas */}
            <div className="detail-section">
              <div className="section-header">
                <FaTools className="section-icon" />
                <h4>Herramientas Asignadas</h4>
              </div>
              
              {loadingDetails ? (
                <div className="loading-details">
                  <div className="small-spinner"></div>
                  <p>Cargando herramientas...</p>
                </div>
              ) : userTools.length > 0 ? (
                <table className="tools-table">
                  <thead>
                    <tr>
                      <th>Kardex</th>
                      <th>Nombre</th>
                      <th>Descripción</th>
                      <th>Fecha Asignación</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userTools.map(tool => (
                      <tr key={tool.id}>
                        <td>{tool.kardex || 'N/A'}</td>
                        <td>{tool.nombre}</td>
                        <td>{tool.descripcion || '-'}</td>
                        <td>
                          {tool.fechaAsignacion ? 
                            new Date(tool.fechaAsignacion).toLocaleDateString('es-ES') : 
                            'N/A'
                          }
                        </td>
                        <td>
                          <span className={`status-badge ${tool.estado?.replace(/\s+/g, '-') || ''}`}>
                            {tool.estado || 'N/A'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="no-items">
                  <p>No se han asignado herramientas a este usuario</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer de tabla */}
        {usuariosFiltrados.length > 0 && !selectedUser && (
          <div className="table-footer">
            <p>
              Mostrando {usuariosFiltrados.length} de {usuarios.length} usuarios
              {searchTerm && ` (filtrado por "${searchTerm}")`}
            </p>
          </div>
        )}
      </div>

      {/* Botón "Volver arriba" */}
      {showBackToTop && (
        <button 
          className="back-to-top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Volver arriba"
        >
          <FaArrowUp />
        </button>
      )}

      {/* Modal para firma */}
      {showFirmaModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Registrar Firma</h3>
              <button onClick={() => setShowFirmaModal(false)}>
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              <p>Por favor, solicite al usuario que firme en la aplicación móvil.</p>
              <p>La firma se sincronizará automáticamente cuando esté completa.</p>
            </div>
            <div className="modal-footer">
              <button 
                className="modal-button"
                onClick={() => setShowFirmaModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para cambiar rol */}
      {showChangeRoleModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Cambiar Rol de Usuario</h3>
              <button 
                onClick={() => {
                  setShowChangeRoleModal(false);
                  setNewRole('');
                }}
                disabled={changingRole}
              >
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Nuevo Rol:</label>
                <select 
                  className="form-select"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  disabled={changingRole}
                >
                  {rolesDisponibles.map(rol => (
                    <option key={rol} value={rol}>{rol}</option>
                  ))}
                </select>
              </div>
              
              {selectedUser && (
                <div className="user-info-confirm">
                  <p>Usuario: <strong>{selectedUser.nombre}</strong></p>
                  <p>Rol actual: <span className={`role-badge ${getRoleColor(selectedUser.rol)}`}>
                    {selectedUser.rol}
                  </span></p>
                  <p>Nuevo rol: <span className={`role-badge ${getRoleColor(newRole)}`}>
                    {newRole}
                  </span></p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button 
                className="modal-button secondary"
                onClick={() => {
                  setShowChangeRoleModal(false);
                  setNewRole('');
                }}
                disabled={changingRole}
              >
                Cancelar
              </button>
              <button 
                className="modal-button primary"
                onClick={handleChangeRole}
                disabled={!newRole || changingRole || newRole === selectedUser?.rol}
              >
                {changingRole ? (
                  'Actualizando...'
                ) : (
                  <>
                    <FaUserShield /> Confirmar Cambio
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para asignar EPP */}
      {showAsignarEppModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Asignar Nuevo EPP</h3>
              <button 
                onClick={() => {
                  setShowAsignarEppModal(false);
                  setSelectedEpp(null);
                  setMotivoAsignacion('');
                }}
                disabled={asignandoEpp}
              >
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Seleccionar EPP:</label>
                <select 
                  className="form-select"
                  value={selectedEpp?.id || ''}
                  onChange={(e) => {
                    const eppId = e.target.value;
                    const epp = eppsDisponibles.find(e => e.id === eppId);
                    setSelectedEpp(epp);
                  }}
                  disabled={asignandoEpp}
                >
                  <option value="">Selecciona un EPP</option>
                  {eppsDisponibles.map(epp => (
                    <option key={epp.id} value={epp.id}>
                      {epp.nombre} (Kardex: {epp.kardex || 'N/A'}, Disponibles: {epp.cantidad})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Motivo de asignación:</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej: Reposición por desgaste"
                  value={motivoAsignacion}
                  onChange={(e) => setMotivoAsignacion(e.target.value)}
                  disabled={asignandoEpp}
                />
              </div>

              {selectedEpp && (
                <div className="epp-selected-info">
                  <h4>EPP seleccionado:</h4>
                  <p><strong>Nombre:</strong> {selectedEpp.nombre}</p>
                  <p><strong>Kardex:</strong> {selectedEpp.kardex || 'N/A'}</p>
                  <p><strong>Cantidad disponible:</strong> {selectedEpp.cantidad}</p>
                  <p><strong>Descripción:</strong> {selectedEpp.descripcion || 'N/A'}</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button 
                className="modal-button secondary"
                onClick={() => {
                  setShowAsignarEppModal(false);
                  setSelectedEpp(null);
                  setMotivoAsignacion('');
                }}
                disabled={asignandoEpp}
              >
                Cancelar
              </button>
              <button 
                className="modal-button primary"
                onClick={confirmarAsignacionEpp}
                disabled={!selectedEpp || asignandoEpp}
              >
                {asignandoEpp ? (
                  'Asignando...'
                ) : (
                  <>
                    <FaCheck /> Confirmar Asignación
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Usuarios;