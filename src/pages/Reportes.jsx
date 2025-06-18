import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { db } from '../components/firebase';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import '../components/Reportes.css';
import { getCachedReportsData } from '../services/reportsPreloader';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const parseFecha = (fecha) => {
  if (!fecha) return null;
  try {
    if (typeof fecha === 'string') {
      const [day, month, year] = fecha.split(',')[0].split(' de ');
      const months = {
        'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3,
        'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7,
        'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
      };
      return new Date(year, months[month.toLowerCase()], day);
    }
    return fecha.toDate ? fecha.toDate() : null;
  } catch (e) {
    console.error("Error parsing date:", fecha, e);
    return null;
  }
};

const Reportes = () => {
  const [tiposData, setTiposData] = useState(null);
  const [mesData, setMesData] = useState(null);
  const [weeklyData, setWeeklyData] = useState(null);
  const [galpones, setGalpones] = useState([]);
  const [selectedGalpon, setSelectedGalpon] = useState('todos');
  const [loading, setLoading] = useState(true);
  const [partialLoading, setPartialLoading] = useState(false);
  const [error, setError] = useState(null);
  const galponesCache = useRef(null);

  const doughnutOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { 
        position: 'bottom',
        labels: {
          padding: 20,
          font: {
            size: 14
          }
        }
      }
    }
  }), []);

  const barOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: { 
      x: { 
        stacked: true,
        grid: {
          display: false
        }
      }, 
      y: { 
        stacked: true, 
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      } 
    },
    plugins: { 
      legend: { 
        position: 'bottom',
        labels: {
          padding: 20,
          font: {
            size: 14
          }
        }
      } 
    }
  }), []);

  const weeklyOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: { 
      x: { 
        stacked: false,
        grid: {
          display: false
        }
      }, 
      y: { 
        stacked: false, 
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      } 
    },
    plugins: { 
      legend: { 
        position: 'bottom',
        labels: {
          padding: 20,
          font: {
            size: 14
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.raw}`;
          }
        }
      }
    }
  }), []);

  const processTiposData = (mantenimientos) => {
    const conteoTipos = {
      preventivo: 0, correctivo: 0, predictivo: 0, otros: 0
    };

    mantenimientos.forEach(mant => {
      const tipo = mant.tipo?.toLowerCase() || 'otros';
      if (tipo.includes('preventivo')) conteoTipos.preventivo++;
      else if (tipo.includes('correctivo')) conteoTipos.correctivo++;
      else if (tipo.includes('predictivo')) conteoTipos.predictivo++;
      else conteoTipos.otros++;
    });

    setTiposData({
      labels: ['Preventivo', 'Correctivo', 'Predictivo', 'Otros'],
      datasets: [{
        data: Object.values(conteoTipos),
        backgroundColor: ['#1e5631', '#4CCD99', '#A4DE02', '#FFC107'],
        borderColor: ['#1e5631', '#4CCD99', '#A4DE02', '#FFC107'],
        borderWidth: 1,
      }]
    });
  };

  const processMesData = (mantenimientos) => {
    const conteoMeses = {
      preventivo: Array(12).fill(0),
      correctivo: Array(12).fill(0),
      predictivo: Array(12).fill(0),
      otros: Array(12).fill(0)
    };

    mantenimientos.forEach(mant => {
      const tipo = mant.tipo?.toLowerCase() || 'otros';
      const fecha = parseFecha(mant.fecha);
      if (fecha && !isNaN(fecha.getMonth())) {
        const mes = fecha.getMonth();
        if (tipo.includes('preventivo')) conteoMeses.preventivo[mes]++;
        else if (tipo.includes('correctivo')) conteoMeses.correctivo[mes]++;
        else if (tipo.includes('predictivo')) conteoMeses.predictivo[mes]++;
        else conteoMeses.otros[mes]++;
      }
    });

    setMesData({
      labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
      datasets: [
        { label: 'Preventivos', data: conteoMeses.preventivo, backgroundColor: '#1e5631' },
        { label: 'Correctivos', data: conteoMeses.correctivo, backgroundColor: '#4CCD99' },
        { label: 'Predictivos', data: conteoMeses.predictivo, backgroundColor: '#A4DE02' },
        { label: 'Otros', data: conteoMeses.otros, backgroundColor: '#FFC107' }
      ]
    });
  };

  const processWeeklyData = (mantenimientos) => {
    const conteoSemanal = {
      preventivo: Array(7).fill(0),
      correctivo: Array(7).fill(0),
      predictivo: Array(7).fill(0),
      otros: Array(7).fill(0)
    };

    mantenimientos.forEach(mant => {
      const tipo = mant.tipo?.toLowerCase() || 'otros';
      const fecha = parseFecha(mant.fecha);
      if (fecha && !isNaN(fecha.getDay())) {
        const diaSemana = fecha.getDay();
        if (tipo.includes('preventivo')) conteoSemanal.preventivo[diaSemana]++;
        else if (tipo.includes('correctivo')) conteoSemanal.correctivo[diaSemana]++;
        else if (tipo.includes('predictivo')) conteoSemanal.predictivo[diaSemana]++;
        else conteoSemanal.otros[diaSemana]++;
      }
    });

    setWeeklyData({
      labels: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
      datasets: [
        { 
          label: 'Preventivos', 
          data: conteoSemanal.preventivo, 
          backgroundColor: '#1e5631',
          borderColor: '#1a4d29',
          borderWidth: 1
        },
        { 
          label: 'Correctivos', 
          data: conteoSemanal.correctivo, 
          backgroundColor: '#4CCD99',
          borderColor: '#3dbd8d',
          borderWidth: 1
        },
        { 
          label: 'Predictivos', 
          data: conteoSemanal.predictivo, 
          backgroundColor: '#A4DE02',
          borderColor: '#8fcb01',
          borderWidth: 1
        },
        { 
          label: 'Otros', 
          data: conteoSemanal.otros, 
          backgroundColor: '#FFC107',
          borderColor: '#e6ac00',
          borderWidth: 1
        }
      ]
    });
  };

  const fetchGalpones = async () => {
    if (galponesCache.current) {
      return galponesCache.current;
    }

    try {
      const galponesRef = collection(db, 'galpones');
      const querySnapshot = await getDocs(galponesRef);
      
      const galponesList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        nombre: doc.data().nombre || `Galpón ${doc.id}`,
        ...doc.data()
      }));
      
      galponesCache.current = galponesList;
      setGalpones(galponesList);
      
      return galponesList;
    } catch (error) {
      console.error("Error al obtener los galpones:", error);
      setError("Error al cargar la lista de galpones");
      return [];
    }
  };

  const fetchMantenimientos = async (galponId = null) => {
    try {
      setPartialLoading(true);
      
      let mantenimientos = [];
      
      if (galponId && galponId !== 'todos') {
        const q = query(collection(db, `galpones/${galponId}/mantenimientos`), limit(500));
        const snapshot = await getDocs(q);
        mantenimientos = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          galponId,
          ...doc.data() 
        }));
      } else {
        const galponesList = await fetchGalpones();
        
        if (galponesList.length > 0) {
          const mantenimientosPromises = galponesList.map(async (galpon) => {
            const q = query(collection(db, `galpones/${galpon.id}/mantenimientos`), limit(500));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ 
              id: doc.id, 
              galponId: galpon.id,
              galponNombre: galpon.nombre,
              ...doc.data() 
            }));
          });
          
          mantenimientos = (await Promise.all(mantenimientosPromises)).flat();
        }
      }
      
      return mantenimientos;
    } catch (error) {
      console.error("Error al obtener mantenimientos:", error);
      throw error;
    } finally {
      setPartialLoading(false);
    }
  };

  const handleGalponChange = async (e) => {
    const galponId = e.target.value;
    setSelectedGalpon(galponId);
    
    try {
      const mantenimientos = await fetchMantenimientos(galponId);
      
      if (mantenimientos.length === 0) {
        setTiposData(null);
        setMesData(null);
        setWeeklyData(null);
        return;
      }
      
      processTiposData(mantenimientos);
      processMesData(mantenimientos);
      processWeeklyData(mantenimientos);
    } catch (error) {
      console.error("Error al procesar datos:", error);
      setError("Error al cargar los datos del galpón seleccionado");
    }
  };

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Cargar galpones primero
        await fetchGalpones();
        
        // Luego cargar mantenimientos
        const cachedData = getCachedReportsData();
        let datos = cachedData;

        if (!datos || datos.length === 0) {
          datos = await fetchMantenimientos();
        }

        if (!datos || datos.length === 0) {
          setError("No se encontraron mantenimientos");
          return;
        }

        processTiposData(datos);
        processMesData(datos);
        processWeeklyData(datos);
      } catch (err) {
        console.error("Error:", err);
        setError("Error al cargar los datos");
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  if (loading) return <div className="loading">Cargando datos...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="reportes-container">
      <h2>Reportes de Mantenimiento</h2>
      
      <div className="galpon-selector-container">
        <div className="galpon-selector">
          <label htmlFor="galpon-select">Seleccionar Galpón:</label>
          <select 
            id="galpon-select"
            value={selectedGalpon} 
            onChange={handleGalponChange}
            disabled={partialLoading || galpones.length === 0}
          >
            <option value="todos">Todos los Galpones</option>
            {galpones.map(galpon => (
              <option key={galpon.id} value={galpon.id}>
                {galpon.nombre}
              </option>
            ))}
          </select>
        </div>
        {partialLoading && <div className="loading-indicator">Cargando datos...</div>}
      </div>

      <div className="graficos-container">
        <div className="grafico-card">
          <h3>Distribución de Tipos</h3>
          {tiposData ? (
            <div className="chart-container">
              <Doughnut data={tiposData} options={doughnutOptions} />
            </div>
          ) : (
            <p>No hay datos disponibles</p>
          )}
        </div>

        <div className="grafico-card">
          <h3>Mantenimientos por Mes</h3>
          {mesData ? (
            <div className="chart-container">
              <Bar data={mesData} options={barOptions} />
            </div>
          ) : (
            <p>No hay datos mensuales disponibles</p>
          )}
        </div>

        <div className="grafico-card">
          <h3>Mantenimientos por Día de la Semana</h3>
          {weeklyData ? (
            <div className="chart-container">
              <Bar data={weeklyData} options={weeklyOptions} />
            </div>
          ) : (
            <p>No hay datos semanales disponibles</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reportes;