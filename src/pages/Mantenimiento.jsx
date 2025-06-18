import React from 'react';
import { useGalpones } from '../hooks/useGalpones';
import GalponCard from '../components/GalponCard';
import { CardSkeleton } from '../components/ui/Skeleton';
import '../components/Mantenimiento.css';

const Mantenimiento = () => {
  const { galpones, loading, error, refreshGalpones } = useGalpones();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [sortConfig, setSortConfig] = React.useState({ key: 'nombre', direction: 'asc' });

  // Filter and sort galpones
  const filteredGalpones = React.useMemo(() => {
    let result = galpones.filter(galpon =>
      galpon.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      galpon.ubicacion.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sorting logic
    if (sortConfig.key) {
      result.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [galpones, searchTerm, sortConfig]);

  // Request sort function
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Export to PDF with better formatting
  const exportToPDF = () => {
    import('jspdf').then(({ jsPDF }) => {
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(18);
      doc.setTextColor(0, 100, 0); // Dark green
      doc.text('Listado de Galpones - Mantenimiento', 10, 15);
      
      // Subtitle
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generado el ${new Date().toLocaleDateString()}`, 10, 22);
      
      // Table headers
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFillColor(200, 230, 200); // Light green background
      doc.rect(10, 30, 190, 10, 'F');
      doc.text('Nombre', 15, 36);
      doc.text('Ubicación', 70, 36);
      doc.text('Estado', 130, 36);
      doc.text('Último Mant.', 160, 36);
      
      // Table content
      doc.setFontSize(10);
      filteredGalpones.forEach((galpon, i) => {
        const y = 45 + (i * 10);
        if (i % 2 === 0) {
          doc.setFillColor(240, 248, 240); // Very light green for alternate rows
          doc.rect(10, y - 5, 190, 10, 'F');
        }
        doc.text(galpon.nombre, 15, y);
        doc.text(galpon.ubicacion, 70, y);
        doc.text(galpon.estado || 'N/A', 130, y);
        doc.text(galpon.ultimoMantenimiento || 'N/A', 160, y);
      });
      
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Total de galpones: ${filteredGalpones.length}`, 10, 285);
      
      doc.save(`galpones_mantenimiento_${new Date().toISOString().slice(0, 10)}.pdf`);
    });
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Nombre', 'Ubicación', 'Estado', 'Último Mantenimiento'];
    const csvContent = [
      headers.join(','),
      ...filteredGalpones.map(galpon => 
        `"${galpon.nombre}","${galpon.ubicacion}","${galpon.estado || 'N/A'}","${galpon.ultimoMantenimiento || 'N/A'}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `galpones_mantenimiento_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (error) {
    return (
      <div className="error-container">
        <div className="error-icon">⚠️</div>
        <h3>Error al cargar los galpones</h3>
        <p>{error}</p>
        <button
          className="retry-button"
          onClick={refreshGalpones}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="maintenance-container">
      {/* Header with title and search */}
      <div className="maintenance-header">
        <div className="title-section">
          <h1 className="maintenance-title">
            <span className="icon">🏗️</span> Gestión de Mantenimientos
          </h1>
          <p className="subtitle">Administración y seguimiento de galpones</p>
        </div>

        <div className="search-export-container">
          <div className="search-wrapper">
            <input
              type="text"
              placeholder="Buscar galpón por nombre o ubicación..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="search-icon">🔍</span>
            {searchTerm && (
              <button 
                className="clear-search"
                onClick={() => setSearchTerm('')}
                title="Limpiar búsqueda"
              >
                ×
              </button>
            )}
          </div>

          <div className="export-buttons">
            <button onClick={exportToCSV} className="export-button csv">
              📊 Exportar CSV
            </button>
            <button onClick={exportToPDF} className="export-button pdf">
              📄 Exportar PDF
            </button>
          </div>
        </div>
      </div>

      {/* Stats and sorting */}
      <div className="controls-container">
        {!loading && (
          <div className="stats-container">
            <div className="stat-card total">
              <span className="stat-number">{galpones.length}</span>
              <span className="stat-label">Galpones Totales</span>
            </div>
            <div className="stat-card filtered">
              <span className="stat-number">{filteredGalpones.length}</span>
              <span className="stat-label">Resultados</span>
            </div>
            <div className="stat-card needs-maintenance">
              <span className="stat-number">
                {galpones.filter(g => g.estado === 'Necesita mantenimiento').length}
              </span>
              <span className="stat-label">Requieren Mantenimiento</span>
            </div>
          </div>
        )}

        <div className="sort-options">
          <span>Ordenar por:</span>
          <button 
            className={`sort-button ${sortConfig.key === 'nombre' ? 'active' : ''}`}
            onClick={() => requestSort('nombre')}
          >
            Nombre {sortConfig.key === 'nombre' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
          </button>
          <button 
            className={`sort-button ${sortConfig.key === 'ubicacion' ? 'active' : ''}`}
            onClick={() => requestSort('ubicacion')}
          >
            Ubicación {sortConfig.key === 'ubicacion' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
          </button>
          <button 
            className={`sort-button ${sortConfig.key === 'ultimoMantenimiento' ? 'active' : ''}`}
            onClick={() => requestSort('ultimoMantenimiento')}
          >
            Último Mant. {sortConfig.key === 'ultimoMantenimiento' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="galpones-grid">
          {[...Array(6)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Galpones list */}
      {!loading && (
        <div className="galpones-container">
          {filteredGalpones.length > 0 ? (
            <div className="galpones-grid">
              {filteredGalpones.map(galpon => (
                <GalponCard
                  key={galpon.id}
                  galpon={galpon}
                  className="galpon-item"
                  onUpdate={refreshGalpones}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <img
                src="/empty-state.svg"
                alt="No hay resultados"
                className="empty-image"
              />
              <h3>No se encontraron galpones</h3>
              <p>Intenta con otro término de búsqueda o ajusta los filtros</p>
              <button
                className="clear-button"
                onClick={() => {
                  setSearchTerm('');
                  setSortConfig({ key: 'nombre', direction: 'asc' });
                }}
              >
                Limpiar búsqueda
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Mantenimiento;