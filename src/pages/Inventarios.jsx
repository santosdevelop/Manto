import React, { useState, useEffect, useMemo } from 'react';
import { db, storage } from '../components/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import '../components/styles/InventariosTable.css';
import { FaEdit, FaTrash, FaSearch, FaPlus, FaTimes, FaSpinner, FaBoxes, FaBoxOpen, FaFileExport, FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { toast } from 'react-toastify';

const Inventarios = () => {
  // Estados principales
  const [inventarios, setInventarios] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'nombre', direction: 'asc' });
  const [errors, setErrors] = useState({});

  // Estados para categorías
  const [categorias, setCategorias] = useState([]);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [mostrarInputCategoria, setMostrarInputCategoria] = useState(false);

  // Estados para importación
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState([]);
  const [mappingFields, setMappingFields] = useState({
    kardex: '',
    nombre: '',
    descripcion: '',
    categoria: '',
    cantidad: '',
    precioUnitario: '',
    proveedor: '',
    ubicacion: '',
    estado: '',
    fechaAdquisicion: ''
  });
  const [fileValidationErrors, setFileValidationErrors] = useState([]);

  const estados = ['disponible', 'en uso', 'en mantenimiento', 'dado de baja'];

  // Form state
  const [formData, setFormData] = useState({
    kardex: '',
    nombre: '',
    descripcion: '',
    categoria: '',
    cantidad: 0,
    precioUnitario: 0,
    proveedor: '',
    ubicacion: '',
    estado: 'disponible',
    fechaAdquisicion: new Date().toISOString().split('T')[0],
  });

  // Obtener inventarios y categorías
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [inventariosSnapshot, categoriasSnapshot] = await Promise.all([
          getDocs(collection(db, 'Inventarios')),
          getDocs(collection(db, 'Categorias'))
        ]);

        const items = inventariosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const cats = categoriasSnapshot.docs.map(doc => doc.data().nombre);

        setInventarios(items);
        setCategorias(cats);
      } catch (error) {
        showMessage('Error al cargar datos', 'error');
        console.error("Error fetching data: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Ordenar items
  const sortedItems = useMemo(() => {
    const sortableItems = [...inventarios];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key] || '';
        const bValue = b[sortConfig.key] || '';
        return (
          aValue.toString().localeCompare(bValue.toString(), undefined, { numeric: true }) * 
          (sortConfig.direction === 'asc' ? 1 : -1)
        );
      });
    }
    return sortableItems;
  }, [inventarios, sortConfig]);

  // Filtrar inventarios
  const filteredInventarios = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return sortedItems.filter(item =>
      (item.kardex?.toLowerCase().includes(term)) ||
      (item.nombre?.toLowerCase().includes(term)) ||
      (item.categoria?.toLowerCase().includes(term)) ||
      (item.ubicacion?.toLowerCase().includes(term)) ||
      (item.proveedor?.toLowerCase().includes(term))
    );
  }, [sortedItems, searchTerm]);

  // Paginación
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredInventarios.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredInventarios, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredInventarios.length / itemsPerPage);

  // Solicitar ordenamiento
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  // Mostrar icono de ordenamiento
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <FaSort />;
    return sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />;
  };

  // Mostrar mensajes
  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  // Manejar cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'cantidad' || name === 'precioUnitario' ? Number(value) : value,
    });
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };
// Función para verificar si el kardex ya existe
const verificarKardexUnico = async (kardex, idExcluir = null) => {
  const querySnapshot = await getDocs(collection(db, 'Inventarios'));
  return querySnapshot.docs.some(doc => {
    const data = doc.data();
    return data.kardex === kardex && doc.id !== idExcluir;
  });
};

  // Validar formulario
  const validateForm = async () => {
  const newErrors = {};
  
  // Validar kardex
  if (!formData.kardex?.trim()) {
    newErrors.kardex = 'Código Kardex es requerido';
  } else {
    const kardexExiste = await verificarKardexUnico(formData.kardex, currentItem?.id);
    if (kardexExiste) {
      newErrors.kardex = 'Este código Kardex ya está en uso';
    }
  }
  
  // Resto de validaciones...
  if (!formData.nombre?.trim()) newErrors.nombre = 'Nombre es requerido';
  if (formData.cantidad < 0) newErrors.cantidad = 'Cantidad no puede ser negativa';
  if (formData.precioUnitario < 0) newErrors.precioUnitario = 'Precio no puede ser negativo';
  if (!formData.categoria) newErrors.categoria = 'Categoría es requerida';
  if (!formData.estado) newErrors.estado = 'Estado es requerido';
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
// Función para eliminar categoría
// Mejorar función eliminarCategoria
const eliminarCategoria = async (categoria) => {
  if (!categoria) return;
  
  // Verificar si hay items usando esta categoría
  const itemsConCategoria = inventarios.filter(item => item.categoria === categoria);
  
  if (itemsConCategoria.length > 0) {
    const count = itemsConCategoria.length;
    showMessage(
      `No se puede eliminar: ${count} ${count === 1 ? 'item usa' : 'items usan'} esta categoría`,
      'error'
    );
    return;
  }
  
  if (window.confirm(`¿Estás seguro de eliminar la categoría "${categoria}"?`)) {
    try {
      // Obtener el documento de la categoría
      const categoriasSnapshot = await getDocs(collection(db, 'Categorias'));
      const categoriaDoc = categoriasSnapshot.docs.find(doc => 
        doc.data().nombre.toLowerCase() === categoria.toLowerCase()
      );
      
      if (categoriaDoc) {
        await deleteDoc(doc(db, 'Categorias', categoriaDoc.id));
        
        // Actualizar estado
        setCategorias(categorias.filter(cat => cat !== categoria));
        
        // Si la categoría eliminada estaba seleccionada, limpiarla
        if (formData.categoria === categoria) {
          setFormData({...formData, categoria: ''});
        }
        
        showMessage(`Categoría "${categoria}" eliminada correctamente`, 'success');
      } else {
        showMessage('No se encontró la categoría en la base de datos', 'error');
      }
    } catch (error) {
      console.error('Error al eliminar categoría:', error);
      showMessage(`Error al eliminar categoría: ${error.message}`, 'error');
    }
  }
};
  // Añadir nueva categoría
// Modificar la función agregarCategoria para mejor validación
const agregarCategoria = async () => {
  const categoriaNormalizada = nuevaCategoria.trim();
  
  if (!categoriaNormalizada) {
    showMessage('El nombre de la categoría no puede estar vacío', 'error');
    return;
  }
  
  // Validar formato (solo letras, números y espacios)
  if (!/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]+$/.test(categoriaNormalizada)) {
    showMessage('El nombre solo puede contener letras, números y espacios', 'error');
    return;
  }
  
  // Validar longitud
  if (categoriaNormalizada.length > 30) {
    showMessage('El nombre no puede exceder los 30 caracteres', 'error');
    return;
  }
  
  try {
    // Validar si ya existe (case insensitive)
    const existe = categorias.some(cat => 
      cat.toLowerCase() === categoriaNormalizada.toLowerCase()
    );
    
    if (existe) {
      showMessage('Esta categoría ya existe', 'error');
      return;
    }
    
    await addDoc(collection(db, 'Categorias'), {
      nombre: categoriaNormalizada,
      fechaCreacion: new Date().toISOString()
    });
    
    setCategorias([...categorias, categoriaNormalizada]);
    setFormData({...formData, categoria: categoriaNormalizada});
    setNuevaCategoria('');
    setMostrarInputCategoria(false);
    showMessage('Categoría añadida correctamente', 'success');
  } catch (error) {
    console.error('Error al añadir categoría:', error);
    showMessage('Error al añadir categoría', 'error');
  }
};
  // Abrir modal para editar/crear
  const handleOpenModal = (item = null) => {
    setErrors({});
    setCurrentItem(item);
    setFormData(item ? {
      kardex: item.kardex || '',
      nombre: item.nombre,
      descripcion: item.descripcion,
      categoria: item.categoria,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      proveedor: item.proveedor,
      ubicacion: item.ubicacion,
      estado: item.estado,
      fechaAdquisicion: item.fechaAdquisicion,
    } : {
      kardex: '',
      nombre: '',
      descripcion: '',
      categoria: '',
      cantidad: 0,
      precioUnitario: 0,
      proveedor: '',
      ubicacion: '',
      estado: 'disponible',
      fechaAdquisicion: new Date().toISOString().split('T')[0],
    });
    setOpenModal(true);
    setMostrarInputCategoria(false);
    setNuevaCategoria('');
  };

  // Cerrar modal
  const handleCloseModal = () => {
    setOpenModal(false);
    setErrors({});
    setMostrarInputCategoria(false);
    setNuevaCategoria('');
  };

  // Guardar item
  const handleSubmit = async (e) => {
  e.preventDefault();
  if (!(await validateForm())) return;
    
    setLoading(true);

    try {
      if (currentItem) {
        await updateDoc(doc(db, 'Inventarios', currentItem.id), formData);
        showMessage('Item actualizado correctamente', 'success');
      } else {
        await addDoc(collection(db, 'Inventarios'), formData);
        showMessage('Item agregado correctamente', 'success');
      }

      // Refrescar lista
      const querySnapshot = await getDocs(collection(db, 'Inventarios'));
      setInventarios(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setCurrentPage(1);
      handleCloseModal();
    } catch (error) {
      console.error('Error al guardar item:', error);
      showMessage(`Error al guardar item: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Eliminar item
  const handleDelete = async (id) => {
  const item = inventarios.find(item => item.id === id);
  if (!item) return;

  if (window.confirm(`¿Estás seguro de eliminar permanentemente "${item.nombre}" (Kardex: ${item.kardex || 'N/A'})?`)) {
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'Inventarios', id));
      
      // Mostrar mensaje con detalles del item eliminado
      showMessage(`"${item.nombre}" (${item.kardex || 'Sin kardex'}) eliminado correctamente`, 'success');
      
      // Actualizar estado
      setInventarios(prev => prev.filter(item => item.id !== id));
      
      // Ajustar paginación si es necesario
      if (paginatedItems.length === 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      }
    } catch (error) {
      console.error('Error al eliminar item:', error);
      showMessage(`Error al eliminar "${item.nombre}": ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }
};

  // Exportar a Excel (versión mejorada)
  const exportToExcel = () => {
    // Preparar datos para exportación con nombres de columnas amigables
    const dataToExport = filteredInventarios.map(item => ({
      'Código Kardex': item.kardex || '',
      'Nombre': item.nombre || '',
      'Descripción': item.descripcion || '',
      'Categoría': item.categoria || '',
      'Cantidad': item.cantidad || 0,
      'Precio Unitario': item.precioUnitario || 0,
      'Proveedor': item.proveedor || '',
      'Ubicación': item.ubicacion || '',
      'Estado': item.estado || '',
      'Fecha Adquisición': item.fechaAdquisicion || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario");
    
    // Generar nombre de archivo con fecha
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `inventario_${fecha}.xlsx`);
  };

  // Función para manejar la selección de archivo
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tamaño máximo de archivo (2MB)
    if (file.size > 2 * 1024 * 1024) {
      showMessage('El archivo es demasiado grande. Máximo 2MB.', 'error');
      return;
    }

    setSelectedFile(file);
    setImportProgress(0);
    setFileValidationErrors([]);

    try {
      const data = await readExcelFile(file);
      if (data.length > 0) {
        setFilePreview(data);
        
        // Auto-mapeo inteligente de campos
        const autoMappedFields = autoMapColumns(data[0]);
        setMappingFields(autoMappedFields);
        
        // Validar los datos
        validateImportData(data, autoMappedFields);
      }
    } catch (error) {
      showMessage(`Error al leer el archivo: ${error.message}`, 'error');
      console.error("Error reading file:", error);
      setSelectedFile(null);
      setFilePreview([]);
    }
  };

  // Función para leer el archivo Excel
  const readExcelFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  };

  // Auto-mapeo de columnas
  const autoMapColumns = (firstRow) => {
    const columns = Object.keys(firstRow);
    const fieldMappings = {
      kardex: ['kardex', 'codigo', 'id', 'sku'],
      nombre: ['nombre', 'name', 'item', 'producto'],
      descripcion: ['descripcion', 'description', 'detalles'],
      categoria: ['categoria', 'category', 'tipo', 'grupo'],
      cantidad: ['cantidad', 'quantity', 'qty', 'stock'],
      precioUnitario: ['precio', 'price', 'costo', 'cost'],
      proveedor: ['proveedor', 'supplier', 'vendor'],
      ubicacion: ['ubicacion', 'location', 'place', 'almacen'],
      estado: ['estado', 'status', 'condition'],
      fechaAdquisicion: ['fecha', 'date', 'adquisicion', 'adquisition']
    };

    const result = {};
    
    Object.entries(fieldMappings).forEach(([field, posiblesNombres]) => {
      const columnaEncontrada = columns.find(col => 
        posiblesNombres.some(nombre => 
          col.toLowerCase().includes(nombre.toLowerCase())
        )
      );
      if (columnaEncontrada) {
        result[field] = columnaEncontrada;
      } else {
        result[field] = '';
      }
    });

    return result;
  };

  // Función para validar los datos de importación
  const validateImportData = (data, mapping) => {
    const errors = [];
    const requiredFields = ['nombre', 'cantidad'];
    
    data.forEach((row, rowIndex) => {
      // Validar campos requeridos
      requiredFields.forEach(field => {
        if (mapping[field] && !row[mapping[field]]) {
          errors.push({
            row: rowIndex + 2,
            message: `${fieldToLabel(field)} es requerido`,
            field
          });
        }
      });

      // Validar tipos de datos
      if (mapping.cantidad) {
        const cantidad = row[mapping.cantidad];
        if (isNaN(cantidad)) {
          errors.push({
            row: rowIndex + 2,
            message: 'Cantidad debe ser un número',
            field: 'cantidad'
          });
        } else if (cantidad < 0) {
          errors.push({
            row: rowIndex + 2,
            message: 'Cantidad no puede ser negativa',
            field: 'cantidad'
          });
        }
      }
      
      if (mapping.precioUnitario && row[mapping.precioUnitario]) {
        const precio = row[mapping.precioUnitario];
        if (isNaN(precio)) {
          errors.push({
            row: rowIndex + 2,
            message: 'Precio debe ser un número',
            field: 'precioUnitario'
          });
        } else if (precio < 0) {
          errors.push({
            row: rowIndex + 2,
            message: 'Precio no puede ser negativo',
            field: 'precioUnitario'
          });
        }
      }
      
      if (mapping.estado && row[mapping.estado]) {
        const estadoValido = estados.includes(row[mapping.estado].toLowerCase());
        if (!estadoValido) {
          errors.push({
            row: rowIndex + 2,
            message: `Estado inválido. Debe ser uno de: ${estados.join(', ')}`,
            field: 'estado'
          });
        }
      }
    });
    
    setFileValidationErrors(errors);
    return errors.length === 0;
  };

  // Función optimizada para manejar la importación
  const handleImport = async () => {
    if (!selectedFile || filePreview.length === 0) return;
    
    // Validar nuevamente antes de importar
    const isValid = validateImportData(filePreview, mappingFields);
    if (!isValid && fileValidationErrors.length > 0) {
      showMessage('Corrija los errores antes de importar', 'error');
      return;
    }
    
    setImportLoading(true);
    setImportProgress(0);
    
    try {
      // 1. Procesar todos los datos primero en memoria
      const itemsToImport = filePreview.map(row => mapRowToItemData(row, mappingFields));
      
      // 2. Dividir en lotes para Firestore
      const batchSize = 500;
      const batchCount = Math.ceil(itemsToImport.length / batchSize);
      
      // Procesar en lotes
      for (let i = 0; i < batchCount; i++) {
        const batch = writeBatch(db);
        const start = i * batchSize;
        const end = Math.min(start + batchSize, itemsToImport.length);
        
        for (let j = start; j < end; j++) {
          const docRef = doc(collection(db, 'Inventarios'));
          batch.set(docRef, itemsToImport[j]);
        }
        
        await batch.commit();
        const progress = Math.round((end / itemsToImport.length) * 100);
        setImportProgress(progress);
      }
      
      // 3. Subir archivo a Storage (en segundo plano)
      const storageRef = ref(storage, `imports/inventario_${Date.now()}.xlsx`);
      const uploadTask = uploadBytesResumable(storageRef, selectedFile);
      
      // No esperamos por esta operación para no bloquear la UI
      uploadTask.then(async (snapshot) => {
        const downloadURL = await getDownloadURL(snapshot.ref);
        await addDoc(collection(db, 'ImportLogs'), {
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          downloadURL,
          importedItems: itemsToImport.length,
          importedBy: 'Usuario actual',
          importedAt: new Date().toISOString(),
          mapping: mappingFields
        });
      }).catch(error => {
        console.error("Error al subir archivo:", error);
      });
      
      // 4. Actualizar estado local con los nuevos items
      const newItems = itemsToImport.map((item, index) => ({
        ...item,
        id: `temp_${Date.now()}_${index}` // IDs temporales para el estado local
      }));
      
      setInventarios(prev => [...prev, ...newItems]);
      showMessage(`Importación completada: ${itemsToImport.length} items procesados`, 'success');
      
    } catch (error) {
      console.error("Error durante la importación:", error);
      showMessage(`Error durante la importación: ${error.message}`, 'error');
    } finally {
      setImportLoading(false);
      setImportModalOpen(false);
      setSelectedFile(null);
      setFilePreview([]);
      setFileValidationErrors([]);
    }
  };

  // Mapear fila de Excel a datos de item
  const mapRowToItemData = (row, mapping) => {
    const getValue = (field) => mapping[field] ? row[mapping[field]] : '';
    
    return {
      nombre: getValue('nombre') || '',
      descripcion: getValue('descripcion') || '',
      categoria: getValue('categoria') || '',
      cantidad: getValue('cantidad') ? Number(getValue('cantidad')) : 0,
      precioUnitario: getValue('precioUnitario') ? Number(getValue('precioUnitario')) : 0,
      proveedor: getValue('proveedor') || '',
      ubicacion: getValue('ubicacion') || '',
      estado: getValue('estado') ? getValue('estado').toLowerCase() : 'disponible',
      fechaAdquisicion: formatExcelDate(getValue('fechaAdquisicion')),
      kardex: getValue('kardex') || ''
    };
  };

  // Formatear fecha de Excel
  const formatExcelDate = (excelDate) => {
    if (!excelDate) return new Date().toISOString().split('T')[0];
    
    // Si es un número (formato de fecha de Excel)
    if (typeof excelDate === 'number') {
      const date = new Date((excelDate - (25567 + 2)) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    
    // Si ya es una cadena de fecha
    if (typeof excelDate === 'string') {
      // Intentar parsear diferentes formatos de fecha
      const dateFormats = [
        { regex: /(\d{4})-(\d{2})-(\d{2})/, parts: [1, 2, 3] }, // YYYY-MM-DD
        { regex: /(\d{2})\/(\d{2})\/(\d{4})/, parts: [3, 1, 2] }, // MM/DD/YYYY
        { regex: /(\d{2})\/(\d{2})\/(\d{4})/, parts: [3, 2, 1] }, // DD/MM/YYYY
        { regex: /(\d{4})\/(\d{2})\/(\d{2})/, parts: [1, 2, 3] }  // YYYY/MM/DD
      ];
      
      for (const format of dateFormats) {
        const match = excelDate.match(format.regex);
        if (match) {
          const year = match[format.parts[0]];
          const month = match[format.parts[1]].padStart(2, '0');
          const day = match[format.parts[2]].padStart(2, '0');
          const formattedDate = `${year}-${month}-${day}`;
          
          // Validar que la fecha sea correcta
          const date = new Date(formattedDate);
          if (!isNaN(date.getTime())) {
            return formattedDate;
          }
        }
      }
    }
    
    return new Date().toISOString().split('T')[0];
  };

  // Descargar plantilla
  const downloadTemplate = (e) => {
    e.preventDefault();
    
    const templateData = [{
      'Codigo_Kardex': 'KDX-001',
      'Nombre': 'Monitor LED 24"',
      'Descripcion': 'Monitor marca Samsung, resolución 1920x1080',
      'Categoria': 'Monitores',
      'Cantidad': 5,
      'Precio_Unitario': 599.99,
      'Proveedor': 'Distribuidora Tech S.A.',
      'Ubicacion': 'Almacén A, Estante 3',
      'Estado': 'disponible',
      'Fecha_Adquisicion': '2023-01-15'
    }];
    
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Plantilla");
    XLSX.writeFile(workbook, 'plantilla_inventario.xlsx');
  };

  // Convertir nombre de campo a etiqueta
  const fieldToLabel = (field) => {
    const labels = {
      kardex: 'Código Kardex',
      nombre: 'Nombre',
      descripcion: 'Descripción',
      categoria: 'Categoría',
      cantidad: 'Cantidad',
      precioUnitario: 'Precio Unitario',
      proveedor: 'Proveedor',
      ubicacion: 'Ubicación',
      estado: 'Estado',
      fechaAdquisicion: 'Fecha Adquisición'
    };
    return labels[field] || field;
  };

  return (
    <div className="inventario-table-container">
      <header className="table-header">
        <h1><FaBoxes /> Gestión de Inventarios</h1>
        <div className="header-controls">
          <div className="search-container">
            <FaSearch />
            <input
              type="text"
              placeholder="Buscar por Kardex, nombre, categoría..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="action-buttons">
            <button className="export-button" onClick={exportToExcel}>
              <FaFileExport /> Exportar
            </button>
            <button className="import-button" onClick={() => setImportModalOpen(true)}>
              <FaFileExport /> Importar
            </button>
            <button className="add-button" onClick={() => handleOpenModal()}>
              <FaPlus /> Nuevo Item
            </button>
          </div>
        </div>
      </header>

      {message.text && (
        <div className={`alert-message ${message.type}`}>
          {message.text}
          <button onClick={() => setMessage({ text: '', type: '' })}>
            <FaTimes />
          </button>
        </div>
      )}

      <div className="table-responsive">
        {loading ? (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>Cargando inventario...</p>
          </div>
        ) : filteredInventarios.length === 0 ? (
          <div className="empty-table">
            <FaBoxOpen size={40} />
            <p>No se encontraron items de inventario</p>
            {searchTerm && (
              <button 
                className="clear-search-button"
                onClick={() => setSearchTerm('')}
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <>
            <table className="elegant-table">
              <thead>
                <tr>
                  <th onClick={() => requestSort('kardex')}>
                    <div className="sortable-header">
                      Kardex {getSortIcon('kardex')}
                    </div>
                  </th>
                  <th onClick={() => requestSort('nombre')}>
                    <div className="sortable-header">
                      Nombre {getSortIcon('nombre')}
                    </div>
                  </th>
                  <th>Descripción</th>
                  <th onClick={() => requestSort('categoria')}>
                    <div className="sortable-header">
                      Categoría {getSortIcon('categoria')}
                    </div>
                  </th>
                  <th onClick={() => requestSort('cantidad')}>
                    <div className="sortable-header">
                      Cantidad {getSortIcon('cantidad')}
                    </div>
                  </th>
                  <th onClick={() => requestSort('precioUnitario')}>
                    <div className="sortable-header">
                      Precio {getSortIcon('precioUnitario')}
                    </div>
                  </th>
                  <th>Ubicación</th>
                  <th onClick={() => requestSort('estado')}>
                    <div className="sortable-header">
                      Estado {getSortIcon('estado')}
                    </div>
                  </th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((item) => (
                  <tr key={item.id}>
                    <td className="kardex-cell">{item.kardex || '-'}</td>
                    <td>
                      <div className="item-name">{item.nombre}</div>
                      {item.proveedor && <div className="item-supplier">{item.proveedor}</div>}
                    </td>
                    <td>{item.descripcion || '-'}</td>
                    <td>
                      <span className="category-tag">{item.categoria}</span>
                    </td>
                    <td className="quantity-cell">{item.cantidad}</td>
                    <td className="price-cell">S/{item.precioUnitario.toFixed(2)}</td>
                    <td>{item.ubicacion || '-'}</td>
                    <td>
                      <span className={`status-badge ${item.estado.replace(/\s+/g, '-')}`}>
                        {item.estado}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button 
                        className="edit-button"
                        onClick={() => handleOpenModal(item)}
                        title="Editar"
                        aria-label="Editar item"
                      >
                        <FaEdit />
                      </button>
                      <button 
                        className="delete-button"
                        onClick={() => handleDelete(item.id)}
                        title="Eliminar"
                        aria-label="Eliminar item"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredInventarios.length > itemsPerPage && (
              <div className="pagination-controls">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </button>
                <span>
                  Página {currentPage} de {totalPages} • 
                  Mostrando {paginatedItems.length} de {filteredInventarios.length} items
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {openModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h2>{currentItem ? 'Editar Item del Inventario' : 'Agregar Nuevo Item al Inventario'}</h2>
              <button className="close-button" onClick={handleCloseModal} aria-label="Cerrar modal">
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                {/* Columna 1 */}
                <div className="form-column">
                  <div className={`form-group ${errors.kardex ? 'has-error' : ''}`}>
                    <label htmlFor="kardex">Código Kardex*</label>
                    <input
                      type="text"
                      id="kardex"
                      name="kardex"
                      value={formData.kardex}
                      onChange={handleInputChange}
                      required
                      placeholder="KDX-0001"
                    />
                    {errors.kardex && <span className="error-message">{errors.kardex}</span>}
                  </div>

                  <div className={`form-group ${errors.nombre ? 'has-error' : ''}`}>
                    <label htmlFor="nombre">Nombre*</label>
                    <input
                      type="text"
                      id="nombre"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleInputChange}
                      required
                      placeholder="Ej: Monitor LED 24''"
                    />
                    {errors.nombre && <span className="error-message">{errors.nombre}</span>}
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="descripcion">Descripción</label>
                    <textarea
                      id="descripcion"
                      name="descripcion"
                      value={formData.descripcion}
                      onChange={handleInputChange}
                      rows="3"
                      placeholder="Ej: Monitor marca Samsung, resolución 1920x1080"
                    />
                  </div>
                  
                  <div className={`form-group ${errors.categoria ? 'has-error' : ''}`}>
  <label htmlFor="categoria">Categoría*</label>
  <div className="categoria-select-container">
    <select
      id="categoria"
      name="categoria"
      value={formData.categoria}
      onChange={handleInputChange}
      required
    >
      <option value="">Seleccione una categoría</option>
      {categorias.map((cat) => (
        <option key={cat} value={cat}>{cat}</option>
      ))}
    </select>
    <div className="category-actions">
      <button 
        type="button" 
        className="add-category-button"
        onClick={() => setMostrarInputCategoria(true)}
      >
        <FaPlus /> Nueva
      </button>
      {formData.categoria && categorias.includes(formData.categoria) && (
        <button 
          type="button"
          className="delete-category-button"
          onClick={() => eliminarCategoria(formData.categoria)}
          title={`Eliminar categoría ${formData.categoria}`}
        >
          <FaTrash />
        </button>
      )}
    </div>
  </div>
  {errors.categoria && <span className="error-message">{errors.categoria}</span>}
  
  {mostrarInputCategoria && (
    <div className="new-category-input">
      <input
        type="text"
        value={nuevaCategoria}
        onChange={(e) => setNuevaCategoria(e.target.value)}
        placeholder="Nombre de la nueva categoría"
      />
      <div className="new-category-actions">
        <button 
          type="button"
          className="cancel-button"
          onClick={() => {
            setMostrarInputCategoria(false);
            setNuevaCategoria('');
          }}
        >
          Cancelar
        </button>
        <button 
          type="button"
          className="confirm-button"
          onClick={agregarCategoria}
        >
          Añadir
        </button>
      </div>
    </div>
  )}
</div>
                </div>
                
                {/* Columna 2 */}
                <div className="form-column">
                  <div className={`form-group ${errors.estado ? 'has-error' : ''}`}>
                    <label htmlFor="estado">Estado*</label>
                    <select
                      id="estado"
                      name="estado"
                      value={formData.estado}
                      onChange={handleInputChange}
                      required
                    >
                      {estados.map((est) => (
                        <option key={est} value={est}>{est}</option>
                      ))}
                    </select>
                    {errors.estado && <span className="error-message">{errors.estado}</span>}
                  </div>
                  
                  <div className={`form-group ${errors.cantidad ? 'has-error' : ''}`}>
                    <label htmlFor="cantidad">Cantidad*</label>
                    <input
                      type="number"
                      id="cantidad"
                      name="cantidad"
                      value={formData.cantidad}
                      onChange={handleInputChange}
                      min="0"
                      required
                    />
                    {errors.cantidad && <span className="error-message">{errors.cantidad}</span>}
                  </div>
                  
                  <div className={`form-group ${errors.precioUnitario ? 'has-error' : ''}`}>
                    <label htmlFor="precioUnitario">Precio Unitario*</label>
                    <div className="input-with-icon">
                      <span>$</span>
                      <input
                        type="number"
                        id="precioUnitario"
                        name="precioUnitario"
                        value={formData.precioUnitario}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        required
                        placeholder="0.00"
                      />
                    </div>
                    {errors.precioUnitario && <span className="error-message">{errors.precioUnitario}</span>}
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="proveedor">Proveedor</label>
                    <input
                      type="text"
                      id="proveedor"
                      name="proveedor"
                      value={formData.proveedor}
                      onChange={handleInputChange}
                      placeholder="Ej: Distribuidora Tech S.A."
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="ubicacion">Ubicación</label>
                    <input
                      type="text"
                      id="ubicacion"
                      name="ubicacion"
                      value={formData.ubicacion}
                      onChange={handleInputChange}
                      placeholder="Ej: Almacén A, Estante 3"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="fechaAdquisicion">Fecha de Adquisición</label>
                    <input
                      type="date"
                      id="fechaAdquisicion"
                      name="fechaAdquisicion"
                      value={formData.fechaAdquisicion}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>
              
              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={handleCloseModal}
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="submit-button"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <FaSpinner className="spinner" /> Procesando...
                    </>
                  ) : currentItem ? (
                    'Actualizar Item'
                  ) : (
                    'Guardar Item'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {importModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog import-modal">
            <div className="modal-header">
              <h2>Importar desde Excel</h2>
              <button className="close-button" onClick={() => {
                setImportModalOpen(false);
                setSelectedFile(null);
                setFilePreview([]);
                setFileValidationErrors([]);
              }} aria-label="Cerrar modal">
                <FaTimes />
              </button>
            </div>
            
            <div className="import-steps">
              {!selectedFile ? (
                <div className="step-upload">
                  <label htmlFor="file-upload" className="file-upload-label">
                    <div className="upload-box">
                      <FaFileExport size={48} />
                      <p>Selecciona un archivo Excel (.xlsx)</p>
                      <p className="small-text">o arrástralo aquí</p>
                    </div>
                    <input
                      id="file-upload"
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <div className="import-instructions">
                    <h4>Instrucciones:</h4>
                    <ul>
                      <li>El archivo debe estar en formato Excel (.xlsx o .xls)</li>
                      <li>La primera fila debe contener los encabezados de columna</li>
                      <li>Las columnas pueden estar en cualquier orden</li>
                      <li>Se validarán los datos antes de importar</li>
                      <li>Tamaño máximo: 2MB</li>
                    </ul>
                    <p className="download-template">
                      <button onClick={downloadTemplate} className="template-link">
                        Descargar plantilla
                      </button>
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="file-selected">
                    <span>{selectedFile.name}</span>
                    <button onClick={() => {
                      setSelectedFile(null);
                      setFilePreview([]);
                      setFileValidationErrors([]);
                    }}>
                      <FaTimes />
                    </button>
                  </div>
                  
                  {filePreview.length > 0 && (
                    <div className="step-mapping">
                      <h3>Asignar columnas a campos</h3>
                      <div className="mapping-grid">
                        {Object.keys(mappingFields).map(field => (
                          <div key={field} className="mapping-row">
                            <label>{fieldToLabel(field)}</label>
                            <select
                              value={mappingFields[field]}
                              onChange={(e) => setMappingFields({
                                ...mappingFields,
                                [field]: e.target.value
                              })}
                            >
                              <option value="">Seleccionar columna</option>
                              {Object.keys(filePreview[0]).map(col => (
                                <option key={col} value={col}>{col}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                      
                      {fileValidationErrors.length > 0 && (
                        <div className="validation-errors">
                          <h4>Errores encontrados:</h4>
                          <ul>
                            {fileValidationErrors.slice(0, 5).map((error, idx) => (
                              <li key={idx}>
                                Fila {error.row}: {error.message}
                                {error.field && ` (Campo: ${error.field})`}
                              </li>
                            ))}
                            {fileValidationErrors.length > 5 && (
                              <li>... y {fileValidationErrors.length - 5} errores más</li>
                            )}
                          </ul>
                        </div>
                      )}
                      
                      <div className="preview-table-container">
                        <h4>Vista previa (primeras 5 filas)</h4>
                        <table className="preview-table">
                          <thead>
                            <tr>
                              {Object.keys(filePreview[0]).map(col => (
                                <th key={col}>{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {filePreview.slice(0, 5).map((row, idx) => (
                              <tr key={idx}>
                                {Object.values(row).map((val, i) => (
                                  <td key={i}>{val}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  
                  <div className="import-actions">
                    <button
                      type="button"
                      className="cancel-button"
                      onClick={() => {
                        setImportModalOpen(false);
                        setSelectedFile(null);
                        setFilePreview([]);
                        setFileValidationErrors([]);
                      }}
                      disabled={importLoading}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="confirm-button"
                      onClick={handleImport}
                      disabled={
                        importLoading || 
                        fileValidationErrors.length > 0 ||
                        !mappingFields.nombre || 
                        !mappingFields.cantidad
                      }
                    >
                      {importLoading ? (
                        <>
                          <FaSpinner className="spinner" /> 
                          Importando... {importProgress}%
                        </>
                      ) : 'Confirmar Importación'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default Inventarios;