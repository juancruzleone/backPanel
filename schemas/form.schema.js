export function getDetectorFormFields() {
    return [
      { name: 'tipoDetector', type: 'select', options: ['Humo convencional', 'Humo inteligente', 'Temperatura convencional', 'Temperatura inteligente', 'Gas', 'Llama', 'Barrera de detección de humo'], label: 'Tipo de detector', required: true },
      { name: 'estado', type: 'select', options: ['Operativo', 'No operativo'], label: 'Estado', required: true },
      { name: 'libre', type: 'select', options: ['Cumple', 'No cumple', 'No aplica'], label: 'Libre', required: true },
      { name: 'limpieza', type: 'select', options: ['Cumple', 'No cumple', 'No aplica'], label: 'Limpieza', required: true },
      { name: 'prueba', type: 'select', options: ['Responde', 'No responde'], label: 'Prueba', required: true },
      { name: 'observaciones', type: 'textarea', label: 'Observaciones', required: false }
    ];
  }
  
  export function getExtintorFormFields() {
    return [
      { name: 'claseAgente', type: 'select', options: ['ABC', 'BC', 'CO2', 'K'], label: 'Clase de agente extintor', required: true },
      { name: 'tipoExtintor', type: 'select', options: ['Portátil', 'Carro'], label: 'Tipo de extintor', required: true },
      { name: 'presion', type: 'select', options: ['Cumple', 'No cumple', 'No aplica'], label: 'Presión', required: true },
      { name: 'estadoManguera', type: 'select', options: ['Cumple', 'No cumple', 'No aplica'], label: 'Estado de manguera', required: true },
      { name: 'estadoManometro', type: 'select', options: ['Cumple', 'No cumple', 'No aplica'], label: 'Estado de manómetro', required: true },
      { name: 'estadoPintura', type: 'select', options: ['Cumple', 'No cumple', 'No aplica'], label: 'Estado de pintura', required: true },
      { name: 'selloGarantia', type: 'select', options: ['Cumple', 'No cumple', 'No aplica'], label: 'Sello de garantía', required: true },
      { name: 'calcosIdentificacion', type: 'select', options: ['Cumple', 'No cumple', 'No aplica'], label: 'Calcos de identificación', required: true },
      { name: 'senalizacion', type: 'select', options: ['Cumple', 'No cumple', 'No aplica'], label: 'Señalización', required: true },
      { name: 'observaciones', type: 'textarea', label: 'Observaciones', required: false }
    ];
  }
  
  export function getMangueraFormFields() {
    return [
      { name: 'diametroValvula', type: 'select', options: ['2 1/2"', '2"', '1 3/4"'], label: 'Diámetro de válvula', required: true },
      { name: 'tipoSalida', type: 'select', options: ['IRAM', 'Storz'], label: 'Tipo de salida', required: true },
      { name: 'diametroManguera', type: 'select', options: ['2 1/2"', '2"', '1 3/4"'], label: 'Diámetro de manguera', required: true },
      { name: 'gabinete', type: 'select', options: ['Cumple', 'No cumple', 'Deteriorado', 'Obstruido', 'No aplica'], label: 'Gabinete', required: true },
      { name: 'puerta', type: 'select', options: ['Cumple', 'No cumple', 'Deteriorada', 'No aplica'], label: 'Puerta', required: true },
      { name: 'vidrioProteccion', type: 'select', options: ['Cumple', 'No cumple', 'Deteriorado', 'No aplica'], label: 'Vidrio/Protección', required: true },
      { name: 'libre', type: 'select', options: ['Cumple', 'No cumple', 'No aplica'], label: 'Libre', required: true },
      { name: 'senalizacion', type: 'select', options: ['Cumple', 'No cumple', 'Deteriorada', 'No aplica'], label: 'Señalización', required: true },
      { name: 'limpieza', type: 'select', options: ['Cumple', 'No cumple', 'No aplica'], label: 'Limpieza', required: true },
      { name: 'manguera', type: 'select', options: ['Cumple', 'No cumple', 'Deteriorada', 'No aplica'], label: 'Manguera', required: true },
      { name: 'tuerca', type: 'select', options: ['Cumple', 'No cumple', 'Deteriorada', 'No aplica'], label: 'Tuerca', required: true },
      { name: 'tapa', type: 'select', options: ['Cumple', 'No cumple', 'Deteriorada', 'No aplica'], label: 'Tapa', required: true },
      { name: 'cadena', type: 'select', options: ['Cumple', 'No cumple', 'Deteriorada', 'No aplica'], label: 'Cadena', required: true },
      { name: 'llaveAjuste', type: 'select', options: ['Cumple', 'No cumple', 'No aplica'], label: 'Llave de ajuste', required: true },
      { name: 'juntasLanza', type: 'select', options: ['Cumple', 'No cumple', 'Deteriorada', 'No aplica'], label: 'Juntas de lanza', required: true },
      { name: 'boquilla', type: 'select', options: ['Cumple', 'No cumple', 'Deteriorada', 'No aplica'], label: 'Boquilla', required: true },
      { name: 'verificacionFugas', type: 'select', options: ['Sin fugas', 'Con fugas', 'No aplica'], label: 'Verificación de fugas', required: true },
      { name: 'pruebaBoquilla', type: 'select', options: ['Cumple', 'No cumple', 'No aplica'], label: 'Prueba boquilla paso de chorro a niebla', required: true },
      { name: 'verificacionRosca', type: 'select', options: ['Cumple', 'No cumple', 'No aplica'], label: 'Verificación de rosca', required: true },
      { name: 'accionamientoValvula', type: 'select', options: ['Cumple', 'No cumple', 'No aplica'], label: 'Accionamiento de válvula', required: true },
      { name: 'observaciones', type: 'textarea', label: 'Observaciones', required: false }
    ];
  }
  
  export function getCentralFormFields() {
    return [
      { name: 'tipoCentral', type: 'select', options: ['Detección convencional', 'Detección inteligente', 'Detección/extinción convencional', 'Detección/extinción inteligente'], label: 'Tipo de central de incendio', required: true },
      { name: 'estado', type: 'select', options: ['Operativa', 'No operativa'], label: 'Estado', required: true },
      { name: 'libre', type: 'select', options: ['Cumple', 'No cumple', 'No aplica'], label: 'Libre', required: true },
      { name: 'limpieza', type: 'select', options: ['Cumple', 'No cumple', 'No aplica'], label: 'Limpieza', required: true },
      { name: 'estadoComponentes', type: 'select', options: ['Cumple', 'No cumple'], label: 'Estado de componentes', required: true },
      { name: 'controlFusible', type: 'select', options: ['Cumple', 'No cumple', 'No aplica'], label: 'Control de fusible', required: true },
      { name: 'controlInterfaces', type: 'select', options: ['Cumple', 'No cumple', 'No aplica'], label: 'Control de interfaces', required: true },
      { name: 'controlAlimentacion', type: 'select', options: ['Cumple', 'No cumple', 'No aplica'], label: 'Control de alimentación primaria 220VCA', required: true },
      { name: 'controlPuestaTierra', type: 'select', options: ['Cumple', 'No cumple', 'No aplica'], label: 'Control de puesta a tierra', required: true },
      { name: 'indicadoresLuminosos', type: 'select', options: ['Cumple', 'No cumple', 'No aplica'], label: 'Indicadores luminosos', required: true },
      { name: 'controlIndicadoresSonoros', type: 'select', options: ['Cumple', 'No cumple', 'No aplica'], label: 'Control de indicadores sonoros', required: true },
      { name: 'controlSenalesFalla', type: 'select', options: ['Cumple', 'No cumple', 'No aplica'], label: 'Control de señales de falla', required: true },
      { name: 'controlConexionesPlacas', type: 'select', options: ['Cumple', 'No cumple', 'No aplica'], label: 'Control de conexiones de placas', required: true },
      { name: 'controlTensionBaterias', type: 'select', options: ['Cumple', 'No cumple', 'No aplica'], label: 'Control de tensión de baterías', required: true },
      { name: 'controlCargadorBaterias', type: 'select', options: ['Cumple', 'No cumple', 'No aplica'], label: 'Control de cargador de baterías', required: true },
      { name: 'pruebaDescargaBaterias', type: 'select', options: ['Cumple', 'No cumple', 'No aplica'], label: 'Prueba de descarga de baterías', required: true },
      { name: 'pruebaDispositivosDeteccion', type: 'select', options: ['Cumple', 'No cumple', 'No aplica'], label: 'Prueba de dispositivos de detección automática de incendio', required: true },
      { name: 'pruebaAvisadoresManuales', type: 'select', options: ['Cumple', 'No cumple', 'No aplica'], label: 'Prueba de avisadores manuales de incendio', required: true },
      { name: 'pruebaSirenas', type: 'select', options: ['Cumple', 'No cumple', 'No aplica'], label: 'Prueba de sirenas de incendio', required: true },
      { name: 'pruebaSolenoideDisparo', type: 'select', options: ['Cumple', 'No cumple', 'No aplica'], label: 'Prueba de solenoide de disparo de extinción', required: true },
      { name: 'limpiezaRotativaDispositivos', type: 'select', options: ['Realizada', 'No realizada', 'No aplica'], label: 'Limpieza rotativa de dispositivos de detección automática de incendio', required: true },
      { name: 'inspeccionVisualToberas', type: 'select', options: ['Cumple', 'No cumple', 'No aplica'], label: 'Inspección visual de toberas de extinción', required: true },
      { name: 'controlVisualPresionCilindros', type: 'select', options: ['Cumple', 'No cumple', 'No aplica'], label: 'Control visual de presión de cilindros actuadores', required: true },
      { name: 'pruebaSistemaElectrico', type: 'select', options: ['Cumple', 'No cumple', 'No aplica'], label: 'Prueba del sistema eléctrico de activación automática de extinción', required: true },
      { name: 'pruebaDesconexionManual', type: 'select', options: ['Cumple', 'No cumple', 'No aplica'], label: 'Prueba del sistema de desconexión manual de extinción', required: true },
      { name: 'controlVisualCabezalDisparo', type: 'select', options: ['Cumple', 'No cumple', 'No aplica'], label: 'Control visual del cabezal de disparo eléctrico de extinción', required: true },
      { name: 'controlPesoCilindros', type: 'select', options: ['Cumple', 'No cumple', 'No aplica'], label: 'Control de peso de cilindro/s de extinción', required: true },
      { name: 'observaciones', type: 'textarea', label: 'Observaciones', required: false }
    ];
  }
  
  export function getDefaultFormFields() {
    return [
      { name: 'estado', type: 'select', options: ['Operativo', 'No operativo'], label: 'Estado', required: true },
      { name: 'observaciones', type: 'textarea', label: 'Observaciones', required: false }
    ];
  }