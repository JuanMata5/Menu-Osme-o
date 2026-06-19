const menuContainer = document.getElementById('menuContainer');
const statusMessage = document.getElementById('statusMessage');
const searchInput = document.getElementById('searchInput');

// ====== CONFIGURACIÓN ======
// Reemplaza este ID con el ID de tu hoja pública de Google Sheets.
// Ejemplo: https://docs.google.com/spreadsheets/d/1AbCdEFgHIjklMNopQRstuVWxyz12345/edit#gid=0
// El ID es la parte entre /d/ y /edit
const SHEET_ID = '1zQPNz1zlEL6p3g1U03-uBDuIbtxMCdNMf9QZdz44b8k';
const SHEET_NAME = 'Hoja 1';

const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}`;

/**
 * Convierte un número en formato peso argentino.
 * @param {number} value
 * @returns {string}
 */
function formatearPrecio(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(value);
}

/**
 * Agrupa los datos de la hoja por categoría.
 * @param {Array<Object>} rows
 * @returns {Object}
 */
function agruparPorCategoria(rows) {
  return rows.reduce((acc, item) => {
    const categoria = item.Categoria || 'Sin categoría';
    const producto = item.Producto || ''; 
    const descripcion = item.Descripcion || '';
    const precio = Number(item.Precio || 0);

    if (!producto) return acc;

    if (!acc[categoria]) {
      acc[categoria] = [];
    }

    acc[categoria].push({ producto, descripcion, precio });
    return acc;
  }, {});
}

/**
 * Crea las tarjetas del menú en el DOM.
 * @param {Object} groupedData
 */
function mostrarMenu(groupedData) {
  if (!Object.keys(groupedData).length) {
    statusMessage.textContent = 'No se encontraron productos para mostrar.';
    return;
  }

  menuContainer.innerHTML = '';

  Object.entries(groupedData).forEach(([categoria, items]) => {
    const categoryCard = document.createElement('article');
    categoryCard.className = 'category-card';

    const title = document.createElement('h3');
    title.textContent = categoria;
    categoryCard.appendChild(title);

    const itemList = document.createElement('div');
    itemList.className = 'item-list';

    items.forEach((item) => {
      const itemCard = document.createElement('div');
      itemCard.className = 'menu-item';

      const titleWrapper = document.createElement('div');
      titleWrapper.className = 'menu-item-title';
      const productName = document.createElement('h4');
      productName.textContent = item.producto;
      const priceTag = document.createElement('span');
      priceTag.className = 'price';
      priceTag.textContent = formatearPrecio(item.precio);
      titleWrapper.appendChild(productName);
      titleWrapper.appendChild(priceTag);

      const description = document.createElement('p');
      description.textContent = item.descripcion;

      itemCard.appendChild(titleWrapper);
      itemCard.appendChild(description);
      itemList.appendChild(itemCard);
    });

    categoryCard.appendChild(itemList);
    menuContainer.appendChild(categoryCard);
  });
}

/**
 * Filtra el menú por término de búsqueda.
 * @param {Array<Object>} rows
 * @param {string} term
 * @returns {Array<Object>}
 */
function filtrarMenu(rows, term) {
  const filter = term.trim().toLowerCase();
  if (!filter) return rows;

  return rows.filter((item) => {
    return (
      item.Categoria?.toLowerCase().includes(filter) ||
      item.Producto?.toLowerCase().includes(filter) ||
      item.Descripcion?.toLowerCase().includes(filter)
    );
  });
}

/**
 * Actualiza el menú en pantalla con el término de búsqueda.
 * @param {Array<Object>} rows
 */
function actualizarBusqueda(rows) {
  const termino = searchInput.value;
  const filteredRows = filtrarMenu(rows, termino);
  const grouped = agruparPorCategoria(filteredRows);
  mostrarMenu(grouped);

  if (!Object.keys(grouped).length) {
    statusMessage.textContent = 'No se encontró ningún producto con ese criterio.';
  } else {
    statusMessage.textContent = `Mostrando ${filteredRows.length} producto(s).`;
  }
}

/**
 * Convierte la respuesta JSON de Google Sheets en un arreglo de objetos.
 * @param {Object} rawData
 * @returns {Array<Object>}
 */
function parseGoogleSheetJSON(rawData) {
  const jsonText = rawData.substring(rawData.indexOf('(') + 1, rawData.lastIndexOf(')'));
  const data = JSON.parse(jsonText);
  const cols = data.table.cols.map((col) => col.label || col.id || '');
  const rows = data.table.rows.map((row) => {
    return row.c.reduce((obj, cell, index) => {
      obj[cols[index]] = cell ? cell.v : '';
      return obj;
    }, {});
  });
  return rows;
}

/**
 * Solicita los datos desde Google Sheets.
 */
async function fetchMenuData() {
  if (SHEET_ID === 'TU_ID_DE_HOJA_AQUI') {
    statusMessage.textContent = 'Por favor actualiza SHEET_ID en script.js con el ID de tu hoja pública.';
    return [];
  }

  statusMessage.textContent = 'Actualizando menú…';

  try {
    const response = await fetch(SHEET_URL, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}`);
    }

    const text = await response.text();
    const rows = parseGoogleSheetJSON(text);

    if (!rows.length) {
      throw new Error('La hoja no contiene datos definidos. Revisa la configuración.');
    }

    statusMessage.textContent = `Menú actualizado (${rows.length} productos).`;
    return rows;
  } catch (error) {
    statusMessage.textContent = `No se pudo actualizar el menú. Reintentá más tarde.`;
    console.error('Google Sheets load failed:', error);
    return [];
  }
}

/**
 * Inicia la aplicación de menú.
 */
async function initMenuApp() {
  const rows = await fetchMenuData();
  const grouped = agruparPorCategoria(rows);
  mostrarMenu(grouped);

  searchInput.addEventListener('input', () => actualizarBusqueda(rows));
}

initMenuApp();

// ===== MODO OSCURO =====
const themeToggle = document.getElementById('themeToggle');

// cargar preferencia
const savedTheme = localStorage.getItem('theme');

if (savedTheme === 'dark') {
  document.body.classList.add('dark');
  themeToggle.textContent = '☀️ Modo claro';
}

themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');

  const isDark = document.body.classList.contains('dark');

  themeToggle.textContent = isDark
    ? '☀️ Modo claro'
    : '🌙 Modo oscuro';

  localStorage.setItem('theme', isDark ? 'dark' : 'light');
});