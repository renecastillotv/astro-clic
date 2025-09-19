// src/data/hybridProvider.ts - VERSIÓN MEJORADA CON BREADCRUMBS Y SIMILARES
// =====================================================
// PROVIDER CON PROTECCIÓN CONTRA BUCLES INFINITOS + BREADCRUMBS + SIMILARES
// =====================================================

const SUPABASE_URL = 'https://pacewqgypevfgjmdsorz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhY2V3cWd5cGV2ZmdqbWRzb3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2NjU4OTksImV4cCI6MjA2NDI0MTg5OX0.Qlg-UVy-sikr76GxYmTcfCz1EnAqPHxvFeLrdqnjuWs';

// Cache para evitar llamadas repetidas
const apiCache = new Map();
const CACHE_TTL = 30000; // 30 segundos

// =====================================================
// VALIDACIÓN DE SEGMENTOS (EXISTENTE)
// =====================================================

function isValidPropertySegments(segments: string[]): boolean {
  if (!segments || segments.length === 0) return false;
  
  // Filtrar segmentos que NO son válidos para propiedades
  const invalidSegments = [
    'images', 'img', 'assets', 'static', 'public', 'favicon.ico',
    'css', 'js', 'fonts', '_astro', 'api', 'admin', 'robots.txt',
    'sitemap.xml', 'manifest.json', 'sw.js', '.well-known'
  ];
  
  // Extensiones de archivo que NO son válidas
  const fileExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico',
    '.css', '.js', '.json', '.xml', '.txt', '.pdf', '.zip',
    '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.mp3'
  ];
  
  // Verificar si algún segmento es inválido
  for (const segment of segments) {
    const segmentLower = segment.toLowerCase();
    
    // Verificar segmentos inválidos
    if (invalidSegments.includes(segmentLower)) {
      console.log('❌ Segmento inválido detectado:', segment);
      return false;
    }
    
    // Verificar extensiones de archivo
    if (fileExtensions.some(ext => segmentLower.endsWith(ext))) {
      console.log('❌ Extensión de archivo detectada:', segment);
      return false;
    }
    
    // Verificar segmentos muy cortos o sospechosos
    if (segment.length < 2 && segments.length === 1) {
      console.log('❌ Segmento demasiado corto:', segment);
      return false;
    }
  }
  
  return true;
}

// =====================================================
// INTERFACE DEFINITIONS (MEJORADAS)
// =====================================================

interface PropertyData {
  id: string | number;
  name?: string;
  title?: string;
  description?: string;
  price?: string;
  slug_url?: string;
  main_image_url?: string;
  gallery_images_url?: string;
  bedrooms?: number;
  bathrooms?: number;
  built_area?: number;
  parking_spots?: number;
  code?: string;
  property_status?: string;
  is_project?: boolean;
  sectors?: { name?: string };
  cities?: { name?: string; provinces?: { name?: string } };
  property_categories?: { name?: string };
  pricing_unified?: any;
  images_unified?: any[];
  property_images?: any[];
  project_detail_id?: string;
  agent_id?: string;
  property_amenities?: any[];
}

// ✨ NUEVA INTERFACE: Breadcrumb
interface Breadcrumb {
  name: string;
  slug?: string;
  url: string;
  category?: string;
  is_active?: boolean;
  position?: number;
  tag_id?: string;
  description?: string;
  icon?: string;
  current?: boolean;
  is_current_page?: boolean;
}

// ✨ NUEVA INTERFACE: Propiedad Similar
interface SimilarProperty {
  id: string | number;
  title: string;
  price: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  image: string;
  location: string;
  type?: string;
  url: string;
  is_project?: boolean;
  parking_spots?: number;
}

interface APIResponse {
  type: 'single-property' | 'single-property-project' | 'property-list' | 'error';
  available?: boolean;
  property?: PropertyData;
  searchResults?: {
    properties: PropertyData[];
    tags: any[];
    pagination: any;
  };
  projectDetails?: any;
  agent?: any;
  referralAgent?: any;
  relatedContent?: any;
  // ✨ NUEVOS CAMPOS DE LA API
  breadcrumbs?: Breadcrumb[];
  similarProperties?: SimilarProperty[];
  similarPropertiesDebug?: {
    total_found: number;
    tags_used: number;
    search_method: string;
  };
  seo?: any;
  meta?: any;
}

// =====================================================
// UTILIDADES PARA SLUGS Y BREADCRUMBS (EXISTENTES)
// =====================================================

function createSlug(text: string): string {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .trim()
    // Reemplazos específicos para mantener consistencia
    .replace('apartamentos', 'apartamento')
    .replace('casas', 'casa')
    .replace('santo domingo este', 'santo-domingo-este')
    .replace('distrito nacional', 'distrito-nacional')
    .replace('ciudad juan bosch', 'ciudad-juan-bosch')
    .replace('autopista las americas', 'autopista-las-americas')
    .replace('punta cana', 'punta-cana')
    .replace('la altagracia', 'la-altagracia')
    // Remover caracteres especiales y reemplazar espacios
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function getOperationSlug(operationName: string): string {
  if (!operationName) return 'comprar';
  
  const operationMap: { [key: string]: string } = {
    'venta': 'comprar',
    'vender': 'comprar',
    'compra': 'comprar',
    'comprar': 'comprar',
    'alquiler': 'alquilar',
    'alquilar': 'alquilar',
    'rentar': 'alquilar',
    'renta': 'alquilar'
  };
  
  const normalized = operationName.toLowerCase().trim();
  return operationMap[normalized] || 'comprar';
}

// =====================================================
// ✨ NUEVAS FUNCIONES DE BREADCRUMBS
// =====================================================

/**
 * Procesa los breadcrumbs de la API y genera breadcrumbs del provider
 */
function processBreadcrumbs(apiBreadcrumbs: Breadcrumb[] | undefined, property: PropertyData | null, type: 'property' | 'list', tags?: any[]): Breadcrumb[] {
  console.log('🍞 === PROCESANDO BREADCRUMBS EN PROVIDER ===');
  console.log('📊 API breadcrumbs recibidos:', apiBreadcrumbs?.length || 0);
  console.log('📊 Context:', type);

  // Verificar si tenemos breadcrumbs válidos de la API
  if (apiBreadcrumbs && apiBreadcrumbs.length > 0) {
    console.log('✅ Usando breadcrumbs de la API como base');
    
    // Formatear breadcrumbs de la API al formato del provider
    const processedBreadcrumbs = apiBreadcrumbs.map((breadcrumb, index) => ({
      name: sanitizeText(breadcrumb.name || ''),
      url: breadcrumb.url || '/',
      current: breadcrumb.is_active || breadcrumb.is_current_page || false,
      slug: breadcrumb.slug,
      category: breadcrumb.category,
      position: breadcrumb.position || index,
      tag_id: breadcrumb.tag_id,
      description: breadcrumb.description,
      icon: breadcrumb.icon
    }));

    console.log('✅ Breadcrumbs de API procesados:', processedBreadcrumbs.length);
    return processedBreadcrumbs;
  }

  // Fallback: generar breadcrumbs básicos si no hay de la API
  console.log('⚠️ No hay breadcrumbs de la API, usando fallback');
  return generateFallbackBreadcrumbs(property, type, tags);
}

/**
 * Genera breadcrumbs de fallback cuando no hay de la API
 */
function generateFallbackBreadcrumbs(property: PropertyData | null, type: 'property' | 'list', tags?: any[]): Breadcrumb[] {
  console.log('🔄 Generando breadcrumbs de fallback');
  
  const breadcrumbs: Breadcrumb[] = [
    { name: 'Inicio', url: '/', current: false, position: 0 },
    { name: 'Propiedades', url: '/propiedades', current: false, position: 1 }
  ];
  
  if (type === 'property' && property) {
    // Para propiedades individuales
    const operation = 'comprar';
    breadcrumbs.push({ 
      name: 'Comprar', 
      url: '/comprar', 
      current: false, 
      position: 2,
      category: 'operacion'
    });
    
    if (property.property_categories?.name) {
      const categorySlug = createSlug(property.property_categories.name);
      breadcrumbs.push({ 
        name: sanitizeText(property.property_categories.name), 
        url: `/comprar/${categorySlug}`, 
        current: false,
        position: 3,
        category: 'categoria'
      });
    }
    
    if (property.cities?.name) {
      const citySlug = createSlug(property.cities.name);
      const categorySlug = createSlug(property.property_categories?.name || 'apartamento');
      breadcrumbs.push({ 
        name: sanitizeText(property.cities.name), 
        url: `/comprar/${categorySlug}/${citySlug}`, 
        current: false,
        position: 4,
        category: 'ciudad'
      });
    }
    
    if (property.sectors?.name) {
      const sectorSlug = createSlug(property.sectors.name);
      const citySlug = createSlug(property.cities?.name || 'distrito-nacional');
      const categorySlug = createSlug(property.property_categories?.name || 'apartamento');
      breadcrumbs.push({ 
        name: sanitizeText(property.sectors.name), 
        url: `/comprar/${categorySlug}/${citySlug}/${sectorSlug}`, 
        current: false,
        position: 5,
        category: 'sector'
      });
    }
    
    // Página actual
    breadcrumbs.push({ 
      name: sanitizeText(property.name || 'Propiedad'), 
      url: property.slug_url || '#', 
      current: true,
      position: breadcrumbs.length,
      category: 'property'
    });
  } else if (type === 'list' && tags && tags.length > 0) {
    // Para listados de propiedades
    let currentPath = '';
    let position = 2;

    // Procesar tags en orden de jerarquía
    const hierarchyOrder = ['operacion', 'categoria', 'ciudad', 'sector'];
    
    for (const categoryKey of hierarchyOrder) {
      const categoryTags = tags.filter((t: any) => t.category === categoryKey);
      
      if (categoryTags.length > 0) {
        const tag = categoryTags[0];
        currentPath = currentPath ? `${currentPath}/${tag.slug}` : tag.slug;
        
        breadcrumbs.push({
          name: tag.display_name || tag.name,
          url: `/${currentPath}`,
          current: false,
          position: position,
          category: tag.category,
          tag_id: tag.id,
          slug: tag.slug
        });
        
        position++;
      }
    }

    // Marcar el último como activo
    if (breadcrumbs.length > 2) {
      breadcrumbs[breadcrumbs.length - 1].current = true;
    } else {
      breadcrumbs[breadcrumbs.length - 1].current = true;
    }
  }
  
  console.log('✅ Breadcrumbs de fallback generados:', breadcrumbs.length);
  return breadcrumbs;
}

// =====================================================
// ✨ NUEVAS FUNCIONES DE PROPIEDADES SIMILARES
// =====================================================

/**
 * Procesa las propiedades similares de la API
 */
function processSimilarProperties(apiSimilarProperties: SimilarProperty[] | undefined): SimilarProperty[] {
  console.log('🏠 === PROCESANDO PROPIEDADES SIMILARES EN PROVIDER ===');
  console.log('📊 API similar properties recibidas:', apiSimilarProperties?.length || 0);

  if (!apiSimilarProperties || apiSimilarProperties.length === 0) {
    console.log('⚠️ No hay propiedades similares de la API');
    return [];
  }

  // Procesar y formatear las propiedades similares
  const processedSimilarProperties = apiSimilarProperties.map((property, index) => ({
    id: property.id,
    slug: property.url || `/propiedad/${property.id}`,
    titulo: formatTitle(property.title || 'Propiedad sin nombre'),
    precio: property.price || 'Precio a consultar',
    imagen: property.image || '/images/placeholder-property.jpg',
    imagenes: [property.image || '/images/placeholder-property.jpg'], // Array para compatibilidad
    sector: sanitizeText(property.location || ''),
    habitaciones: property.bedrooms || 0,
    banos: property.bathrooms || 0,
    metros: property.area || 0,
    tipo: sanitizeText(property.type || 'Apartamento'),
    url: property.url || `/propiedad/${property.id}`,
    code: `SIM-${property.id}`,
    isFormattedByProvider: true,
    is_project: property.is_project || false,
    parking_spots: property.parking_spots || 0,
    // Metadatos específicos para similares
    similarity_rank: index + 1,
    is_similar_property: true
  }));

  console.log('✅ Propiedades similares procesadas:', processedSimilarProperties.length);
  return processedSimilarProperties;
}

/**
 * Genera información sobre las propiedades similares
 */
function generateSimilarPropertiesInfo(apiSimilarPropertiesDebug: any, similarProperties: any[]): any {
  return {
    total_found: similarProperties.length,
    method: apiSimilarPropertiesDebug?.search_method || 'fallback',
    tags_used: apiSimilarPropertiesDebug?.tags_used || 0,
    has_similar_properties: similarProperties.length > 0,
    similarity_score: apiSimilarPropertiesDebug?.total_found || 0,
    provider_processed: true
  };
}

// =====================================================
// PROCESAMIENTO AVANZADO DE IMÁGENES (EXISTENTE)
// =====================================================

function processPropertyImages(property: PropertyData): any[] {
  const allImages = [];
  
  // 1. Imagen principal (main_image_url)
  if (property.main_image_url) {
    allImages.push({
      url: property.main_image_url,
      optimized_url: property.main_image_url,
      is_main: true,
      sort_order: 0,
      source: 'main_image',
      position: 0
    });
  }
  
  // 2. Imágenes de la galería (gallery_images_url)
  if (property.gallery_images_url) {
    const galleryUrls = property.gallery_images_url.split(',').filter(Boolean);
    galleryUrls.forEach((url, index) => {
      if (url.trim()) {
        allImages.push({
          url: url.trim(),
          optimized_url: url.trim(),
          is_main: false,
          sort_order: index + 100,
          source: 'gallery_string',
          position: allImages.length
        });
      }
    });
  }
  
  // 3. Images unified (ya procesadas)
  if (property.images_unified && Array.isArray(property.images_unified)) {
    property.images_unified.forEach((img, index) => {
      if (img && img.url) {
        // Verificar si la URL contiene múltiples URLs
        if (img.url.includes(',')) {
          const urls = img.url.split(',').filter(Boolean);
          urls.forEach((url, urlIndex) => {
            if (url.trim()) {
              allImages.push({
                ...img,
                url: url.trim(),
                optimized_url: url.trim(),
                sort_order: (img.sort_order || 200) + urlIndex,
                source: 'images_unified_split',
                position: allImages.length
              });
            }
          });
        } else {
          allImages.push({
            ...img,
            sort_order: img.sort_order || img.position || 200 + index,
            source: 'images_unified',
            position: allImages.length
          });
        }
      }
    });
  }
  
  // 4. Property images (estructura alternativa)
  if (property.property_images && Array.isArray(property.property_images)) {
    property.property_images.forEach((img, index) => {
      if (img && img.url) {
        allImages.push({
          ...img,
          optimized_url: img.url,
          sort_order: img.sort_order || 300 + index,
          source: 'property_images',
          position: allImages.length
        });
      }
    });
  }
  
  // Eliminar duplicados por URL
  const uniqueImages = allImages.filter((img, index, self) => 
    index === self.findIndex(i => i.url === img.url)
  );
  
  // Ordenar: principal primero, luego por sort_order
  return uniqueImages.sort((a, b) => {
    if (a.is_main && !b.is_main) return -1;
    if (!a.is_main && b.is_main) return 1;
    return (a.sort_order || 0) - (b.sort_order || 0);
  });
}

// =====================================================
// UTILIDADES DE LIMPIEZA DE TEXTO (EXISTENTES)
// =====================================================

function cleanDescription(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/[^\w\s\.,;:!?¿¡áéíóúüñÁÉÍÓÚÜÑ()-]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\.{2,}/g, '.')
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/\.\s*([a-záéíóúüñ])/g, (match, letter) => '. ' + letter.toUpperCase())
    .trim();
}

function sanitizeText(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/[^\w\s\.,;:!?¿¡áéíóúüñÁÉÍÓÚÜÑ()-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatTitle(title: string): string {
  if (!title) return 'Propiedad sin nombre';
  
  return sanitizeText(title)
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// =====================================================
// FUNCIÓN PRINCIPAL DE API CON CACHE Y PROTECCIONES (MEJORADA)
// =====================================================

async function callUnifiedAPI(segments: string[], searchParams?: URLSearchParams): Promise<APIResponse> {
  // VALIDACIÓN CRÍTICA: Verificar que los segmentos son válidos
  if (!isValidPropertySegments(segments)) {
    console.log('❌ Segmentos inválidos, abortando llamada API:', segments);
    throw new Error('Invalid segments for property search');
  }
  
  console.log('🔄 Calling Unified Edge Function with segments:', segments);
  
  // Crear clave de cache
  const cacheKey = `${segments.join('/')}${searchParams ? '?' + searchParams.toString() : ''}`;
  
  // Verificar cache
  const cached = apiCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log('📦 Returning cached result for:', cacheKey);
    return cached.data;
  }
  
  try {
    // Limpiar y procesar segmentos
    const cleanedSegments = cleanUrlSegments(segments);
    console.log('Cleaned segments:', cleanedSegments);
    
    // Verificar nuevamente después de limpiar
    if (!isValidPropertySegments(cleanedSegments)) {
      console.log('❌ Segmentos inválidos después de limpieza:', cleanedSegments);
      throw new Error('Invalid cleaned segments');
    }
    
    // Construir URL de la Edge Function
    const apiPath = cleanedSegments.length > 0 ? `/${cleanedSegments.join('/')}` : '/';
    let apiUrl = `${SUPABASE_URL}/functions/v1/busqueda${apiPath}`;
    
    // Agregar parámetros de búsqueda
    const params = new URLSearchParams();
    if (searchParams) {
      if (searchParams.get('ref')) params.set('ref', searchParams.get('ref')!);
      if (searchParams.get('page')) params.set('page', searchParams.get('page')!);
      if (searchParams.get('limit')) params.set('limit', searchParams.get('limit')!);
    }
    
    if (params.toString()) {
      apiUrl += `?${params.toString()}`;
    }
    
    console.log('Final API URL:', apiUrl);
    
    // Timeout para evitar llamadas colgadas
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos
    
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText}`);
      throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('API Response type:', data.type);
    
    // ✨ NUEVO: Logging de breadcrumbs y similares recibidos
    console.log('📊 API Response features:', {
      hasBreadcrumbs: !!data.breadcrumbs,
      breadcrumbsCount: data.breadcrumbs?.length || 0,
      hasSimilarProperties: !!data.similarProperties,
      similarPropertiesCount: data.similarProperties?.length || 0,
      hasSimilarPropertiesDebug: !!data.similarPropertiesDebug
    });
    
    // Guardar en cache
    apiCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    // Limpiar cache viejo (mantener solo últimas 50 entradas)
    if (apiCache.size > 50) {
      const keys = Array.from(apiCache.keys()).slice(0, 25);
      keys.forEach(key => apiCache.delete(key));
    }
    
    return data;
    
  } catch (error) {
    console.error('Error calling edge function:', error);
    
    // Si es un error de segmentos inválidos, no reintentemos
    if (error.message.includes('Invalid')) {
      throw error;
    }
    
    // Para otros errores, lanzar con contexto
    throw new Error(`API call failed: ${error.message}`);
  }
}

// =====================================================
// LIMPIEZA DE URL SEGMENTS CON VALIDACIONES (EXISTENTE)
// =====================================================

function cleanUrlSegments(segments: string[]): string[] {
  if (!segments || segments.length === 0) return [];
  
  let cleaned = segments
    .filter(segment => segment && segment.trim().length > 0)
    .map(segment => {
      // Remover IDs del final (-123)
      const withoutId = segment.replace(/-\d+$/, '');
      return withoutId || segment;
    });

  // Remover duplicados de palabras comunes
  const seen = new Set();
  const duplicateWords = ['comprar', 'venta', 'alquilar', 'apartamento', 'casa', 'proyecto'];
  
  cleaned = cleaned.filter(segment => {
    const segmentLower = segment.toLowerCase();
    
    if (duplicateWords.includes(segmentLower)) {
      if (seen.has(segmentLower)) {
        return false; // Skip duplicado
      }
      seen.add(segmentLower);
    }
    
    return true;
  });
  
  // Validación final
  if (!isValidPropertySegments(cleaned)) {
    console.log('❌ Segmentos inválidos después de limpieza:', cleaned);
    return [];
  }
  
  return cleaned;
}

// =====================================================
// SINGLE PROPERTY HANDLER CON PROTECCIONES (MEJORADO)
// =====================================================

async function getSingleProperty(segments: string[], searchParams?: URLSearchParams) {
  try {
    // Validación previa
    if (!isValidPropertySegments(segments)) {
      console.log('❌ getSingleProperty: Segmentos inválidos:', segments);
      return null;
    }
    
    const apiData = await callUnifiedAPI(segments, searchParams);
    
    if (apiData.type === 'single-property' || apiData.type === 'single-property-project') {
      const formattedData = formatSinglePropertyResponse(apiData);
      
      console.log('✅ Single property formateada exitosamente con breadcrumbs y similares');
      return formattedData;
    }
    
    if (!apiData.available && apiData.property) {
      return {
        type: 'property-sold',
        message: 'Esta propiedad ya no está disponible',
        property: apiData.property,
        alternatives: []
      };
    }
    
    return null;
    
  } catch (error) {
    console.error('Error getting single property:', error);
    
    // No reintentamos si son segmentos inválidos
    if (error.message.includes('Invalid')) {
      return null;
    }
    
    return null;
  }
}

// =====================================================
// PROPERTY LIST HANDLER CON PROTECCIONES (MEJORADO)
// =====================================================

async function getPropertyList(segments: string[], searchParams?: URLSearchParams) {
  try {
    // Validación previa
    if (!isValidPropertySegments(segments)) {
      console.log('❌ getPropertyList: Segmentos inválidos:', segments);
      return getEmptyListResponse();
    }
    
    const apiData = await callUnifiedAPI(segments, searchParams);
    
    if (apiData.type === 'property-list') {
      const formattedData = formatPropertyListResponse(apiData);
      
      console.log('✅ Property list formateada exitosamente con breadcrumbs');
      return formattedData;
    }
    
    return getEmptyListResponse();
    
  } catch (error) {
    console.error('Error getting property list:', error);
    return getEmptyListResponse();
  }
}

// =====================================================
// FORMATTERS MEJORADOS (CON BREADCRUMBS Y SIMILARES)
// =====================================================

function formatSinglePropertyResponse(apiData: APIResponse) {
  const property = apiData.property!;
  const pricing = property.pricing_unified || {};
  const images = property.images_unified || [];
  const isProject = apiData.type === 'single-property-project';
  
  const basicInfo = {
    id: property.id,
    title: formatTitle(property.name || property.title || 'Propiedad sin nombre'),
    subtitle: generateSubtitle(property),
    description: cleanDescription(property.description || ''),
    reference: property.code || `REF-${property.id}`,
    location: formatLocation(property),
    sector: sanitizeText(property.sectors?.name || ''),
    city: sanitizeText(property.cities?.name || ''),
    province: sanitizeText(property.cities?.provinces?.name || ''),
    bedrooms: property.bedrooms || 0,
    bathrooms: property.bathrooms || 0,
    built_area: property.built_area || 0,
    parking_spots: property.parking_spots || 0,
    price: pricing.display_price?.formatted || 'Precio a consultar',
    reservation: 'US$1,000',
    property_status: property.property_status,
    is_project: property.is_project || false,
    category: sanitizeText(property.property_categories?.name || 'Apartamento'),
    slug_url: property.slug_url
  };

  // ✨ PROCESAR PROPIEDADES SIMILARES
  const similarProperties = processSimilarProperties(apiData.similarProperties);
  const similarPropertiesInfo = generateSimilarPropertiesInfo(
    apiData.similarPropertiesDebug, 
    similarProperties
  );

  return {
    type: 'property',
    isProject,
    available: apiData.available !== false,
    property: basicInfo,
    images: formatImagesArray(images),
    mainImage: getMainImage(images),
    pricing: {
      main: pricing.display_price,
      sale: pricing.sale,
      rental: pricing.rental,
      temp_rental: pricing.temp_rental,
      furnished_rental: pricing.furnished_rental,
      operation_type: pricing.operation_type || 'sale'
    },
    agent: formatAgent(apiData.agent || apiData.referralAgent),
    project: isProject && apiData.projectDetails ? formatProjectDetails(apiData.projectDetails) : null,
    hasProject: isProject && !!apiData.projectDetails,
    location: {
      coordinates: extractCoordinates(property),
      address: formatLocation(property),
      googlePlaces: extractGooglePlacesData(apiData.seo)
    },
    amenities: formatAmenities(property.property_amenities || []),
    content: {
      articles: apiData.relatedContent?.articles || [],
      videos: apiData.relatedContent?.videos || [],
      testimonials: apiData.relatedContent?.testimonials || [],
      faqs: apiData.relatedContent?.faqs || [],
      hasSpecificContent: apiData.relatedContent?.content_source === 'specific_and_general'
    },
    // ✨ NUEVA SECCIÓN: Propiedades similares
    similarProperties: similarProperties,
    similarPropertiesInfo: similarPropertiesInfo,
    hasSimilarProperties: similarProperties.length > 0,
    seo: {
      title: sanitizeText(apiData.seo?.title || property.name || ''),
      description: cleanDescription(apiData.seo?.description || property.description?.substring(0, 160) || ''),
      keywords: apiData.seo?.keywords || [],
      og: apiData.seo?.og || {},
      structuredData: apiData.seo?.structured_data || {},
      h1: sanitizeText(apiData.seo?.h1 || property.name || '')
    },
    // ✨ NUEVA SECCIÓN: Breadcrumbs procesados del API
    breadcrumbs: processBreadcrumbs(apiData.breadcrumbs, property, 'property'),
    meta: {
      timestamp: new Date().toISOString(),
      hasProject: isProject && !!apiData.projectDetails,
      hasAgent: !!(apiData.agent || apiData.referralAgent),
      imagesCount: images.length,
      // ✨ NUEVOS METADATOS
      hasBreadcrumbs: !!(apiData.breadcrumbs?.length),
      breadcrumbsSource: apiData.breadcrumbs?.length ? 'api' : 'fallback',
      hasSimilarProperties: similarProperties.length > 0,
      similarPropertiesCount: similarProperties.length,
      debug: apiData.meta || {}
    }
  };
}

function formatPropertyListResponse(apiData: APIResponse) {
  const searchResults = apiData.searchResults!;
  const properties = searchResults.properties || [];
  const pagination = searchResults.pagination || {};
  
  return {
    type: 'property-list',
    properties: properties.map(formatPropertyForList),
    pagination: {
      currentPage: pagination.currentPage || 1,
      totalCount: pagination.totalCount || 0,
      itemsPerPage: pagination.itemsPerPage || 30,
      totalPages: pagination.totalPages || 1,
      hasMore: pagination.hasMore || false,
      hasNextPage: pagination.hasMore || false,
      hasPreviousPage: (pagination.currentPage || 1) > 1
    },
    search: {
      tags: searchResults.tags || [],
      location: extractLocationFromTags(searchResults.tags),
      propertyType: extractPropertyTypeFromTags(searchResults.tags),
      operation: extractOperationFromTags(searchResults.tags)
    },
    locationData: extractGooglePlacesData(apiData.seo),
    seo: {
      title: sanitizeText(apiData.seo?.title || 'Propiedades - CLIC Inmobiliaria'),
      description: cleanDescription(apiData.seo?.description || ''),
      h1: sanitizeText(apiData.seo?.h1 || 'Propiedades Disponibles'),
      keywords: apiData.seo?.keywords || []
    },
    content: {
      intro: generateIntroText(searchResults.tags),
      benefits: generateBenefits(searchResults.tags),
      nearbyServices: extractNearbyServices(apiData.seo),
      faqs: generateFAQs(searchResults.tags)
    },
    // ✨ NUEVA SECCIÓN: Breadcrumbs procesados del API
    breadcrumbs: processBreadcrumbs(apiData.breadcrumbs, null, 'list', searchResults.tags),
    relatedContent: {
      articles: apiData.relatedContent?.articles || [],
      videos: apiData.relatedContent?.videos || []
    },
    meta: {
      timestamp: new Date().toISOString(),
      searchTerms: searchResults.tags?.map(t => sanitizeText(t.name)) || [],
      totalResults: pagination.totalCount || 0,
      // ✨ NUEVOS METADATOS
      hasBreadcrumbs: !!(apiData.breadcrumbs?.length),
      breadcrumbsSource: apiData.breadcrumbs?.length ? 'api' : 'fallback'
    }
  };
}

// =====================================================
// UTILITY FUNCTIONS (mantenidas de la versión anterior)
// =====================================================

function formatPropertyForList(property: PropertyData) {
  const pricing = property.pricing_unified || {};
  const images = property.images_unified || [];
  
  return {
    id: property.id,
    slug: property.slug_url || `/propiedad/${property.id}`,
    titulo: formatTitle(property.name || 'Propiedad sin nombre'),
    precio: pricing.display_price?.formatted || 'Precio a consultar',
    imagen: getMainImage(images),
    imagenes: formatImagesArray(images),
    sector: formatLocation(property),
    habitaciones: property.bedrooms || 0,
    banos: property.bathrooms || 0,
    metros: property.built_area || 0,
    tipo: sanitizeText(property.property_categories?.name || 'Apartamento'),
    url: property.slug_url || `/propiedad/${property.id}`,
    code: property.code,
    isFormattedByProvider: true,
    is_project: property.is_project || false,
    project_badges: property.is_project ? ['PROYECTO', 'BONO VIVIENDA'] : undefined,
    habitaciones_rango: property.is_project ? `${property.bedrooms || 1}-3 hab` : undefined,
    banos_rango: property.is_project ? `${property.bathrooms || 1}-3 baños` : undefined,
    metros_rango: property.is_project ? `${property.built_area || 60}-90m²` : undefined,
    reserva_desde: property.is_project ? 'US$1,000' : undefined
  };
}

function formatImagesArray(images: any[]): string[] {
  if (!images || images.length === 0) {
    return ['/images/placeholder-property.jpg'];
  }
  
  const processedImages = [];
  
  for (const img of images) {
    if (!img || !img.url) continue;
    
    // Si la URL contiene múltiples URLs separadas por comas (problema detectado)
    if (img.url.includes(',')) {
      const urls = img.url.split(',').filter(Boolean);
      urls.forEach(url => {
        if (url.trim()) {
          processedImages.push({
            ...img,
            url: url.trim(),
            optimized_url: url.trim()
          });
        }
      });
    } else {
      // URL normal, agregar como está
      processedImages.push(img);
    }
  }
  
  // Filtrar duplicados por URL
  const uniqueImages = processedImages.filter((img, index, self) => 
    index === self.findIndex(i => i.url === img.url)
  );
  
  return uniqueImages
    .sort((a, b) => {
      if (a.is_main && !b.is_main) return -1;
      if (!a.is_main && b.is_main) return 1;
      return (a.sort_order || a.position || 0) - (b.sort_order || b.position || 0);
    })
    .map(img => img.optimized_url || img.url)
    .filter(Boolean)
    .slice(0, 50); // Limitar a 50 imágenes máximo
}

function getMainImage(images: any[]): string {
  if (!images || images.length === 0) {
    return '/images/placeholder-property.jpg';
  }
  
  // Primero procesar imágenes con URLs múltiples
  const processedImages = [];
  
  for (const img of images) {
    if (!img || !img.url) continue;
    
    // Si la URL contiene múltiples URLs separadas por comas
    if (img.url.includes(',')) {
      const urls = img.url.split(',').filter(Boolean);
      if (urls.length > 0) {
        // Tomar la primera URL de la lista
        processedImages.push({
          ...img,
          url: urls[0].trim(),
          optimized_url: urls[0].trim()
        });
      }
    } else {
      processedImages.push(img);
    }
  }
  
  // Buscar imagen principal
  const mainImg = processedImages.find(img => img.is_main);
  if (mainImg) {
    return mainImg.optimized_url || mainImg.url;
  }
  
  // Si no hay imagen principal, tomar la primera
  const firstImg = processedImages[0];
  if (firstImg) {
    return firstImg.optimized_url || firstImg.url;
  }
  
  return '/images/placeholder-property.jpg';
}

function formatAgent(agentData: any) {
  if (!agentData) {
    return {
      name: 'CLIC Inmobiliaria',
      phone: '+1-829-555-0100',
      email: 'info@clicinmobiliaria.com',
      position: 'Equipo Comercial',
      whatsapp: 'https://wa.me/18295550100',
      image: '/images/default-agent.jpg',
      rating: 4.9,
      code: 'CLIC001'
    };
  }
  
  return {
    name: sanitizeText(agentData.name || 'CLIC Inmobiliaria'),
    phone: agentData.phone || '+1-829-555-0100',
    email: agentData.email || 'info@clicinmobiliaria.com',
    position: sanitizeText(agentData.position || 'Asesor Inmobiliario'),
    whatsapp: formatWhatsApp(agentData.phone),
    image: agentData.profile_image || '/images/default-agent.jpg',
    rating: agentData.rating || 4.9,
    code: agentData.external_id || agentData.code || 'AGENT001'
  };
}

function formatAmenities(amenitiesData: any[]) {
  const defaultAmenities = [
    { name: 'Piscina', icon: 'fas fa-swimming-pool' },
    { name: 'Gimnasio', icon: 'fas fa-dumbbell' },
    { name: 'Seguridad 24/7', icon: 'fas fa-shield-alt' },
    { name: 'Parqueo', icon: 'fas fa-car' },
    { name: 'Salón de Eventos', icon: 'fas fa-users' },
    { name: 'Áreas Verdes', icon: 'fas fa-tree' }
  ];
  
  if (!amenitiesData || amenitiesData.length === 0) {
    return defaultAmenities;
  }
  
  const formatted = amenitiesData.map(amenity => ({
    name: sanitizeText(amenity.amenities?.name || amenity.name || ''),
    icon: amenity.amenities?.icon || amenity.icon || 'fas fa-check'
  })).filter(amenity => amenity.name);
  
  while (formatted.length < 6 && formatted.length < defaultAmenities.length) {
    const missing = defaultAmenities.find(def => 
      !formatted.some(fmt => fmt.name.toLowerCase().includes(def.name.toLowerCase()))
    );
    if (missing) formatted.push(missing);
  }
  
  return formatted;
}

// Las demás funciones de utilidad se mantienen igual...
function generateSubtitle(property: PropertyData): string {
  const location = formatLocation(property);
  const type = sanitizeText(property.property_categories?.name || 'Propiedad');
  return `${type} en ${location}`;
}

function formatLocation(property: PropertyData): string {
  const parts = [
    sanitizeText(property.sectors?.name || ''),
    sanitizeText(property.cities?.name || '')
  ].filter(Boolean);
  
  return parts.length > 0 ? parts.join(', ') : 'República Dominicana';
}

function formatWhatsApp(phone: string): string {
  if (!phone) return 'https://wa.me/18295550100';
  
  const cleaned = phone.replace(/\D/g, '');
  const number = cleaned.length === 10 ? '1' + cleaned : cleaned;
  return `https://wa.me/${number}`;
}

function extractGooglePlacesData(seoData: any) {
  const places = seoData?.places_enrichment;
  if (!places) return null;
  
  return {
    totalServices: places.total_services || 0,
    servicesScore: places.services_score || 0,
    avgRating: places.avg_rating,
    categories: places.top_categories || [],
    featuredServices: places.featured_services || [],
    hasData: true
  };
}

function extractCoordinates(property: PropertyData) {
  const locationMap: { [key: string]: { lat: number, lng: number } } = {
    'punta cana': { lat: 18.5601, lng: -68.3725 },
    'bavaro': { lat: 18.5467, lng: -68.4104 },
    'naco': { lat: 18.4861, lng: -69.9312 },
    'piantini': { lat: 18.4745, lng: -69.9254 },
    'bella vista': { lat: 18.4696, lng: -69.9411 },
    'manoguayabo': { lat: 18.4861, lng: -70.0037 },
    'santiago': { lat: 19.4517, lng: -70.6970 },
    'distrito nacional': { lat: 18.4682, lng: -69.9279 }
  };
  
  const searchTerms = [
    property.sectors?.name?.toLowerCase(),
    property.cities?.name?.toLowerCase()
  ].filter(Boolean);
  
  for (const term of searchTerms) {
    for (const [location, coords] of Object.entries(locationMap)) {
      if (term!.includes(location) || location.includes(term!)) {
        return coords;
      }
    }
  }
  
  return { lat: 18.4682, lng: -69.9279 };
}

function extractLocationFromTags(tags: any[]): string | null {
  const locationTag = tags?.find(tag => 
    tag.category === 'ciudad' || tag.category === 'sector' || tag.category === 'provincia'
  );
  return locationTag?.name || null;
}

function extractPropertyTypeFromTags(tags: any[]): string | null {
  const typeTag = tags?.find(tag => tag.category === 'categoria');
  return typeTag?.name || null;
}

function extractOperationFromTags(tags: any[]): string | null {
  const operationTag = tags?.find(tag => tag.category === 'operacion');
  return operationTag?.name || null;
}

function extractNearbyServices(seoData: any): string[] {
  const places = seoData?.places_enrichment;
  if (!places || !places.featured_services) return [];
  
  return places.featured_services.slice(0, 8).map((service: any) => sanitizeText(service.place_name));
}

function generateIntroText(tags: any[]): string {
  const location = extractLocationFromTags(tags);
  const propertyType = extractPropertyTypeFromTags(tags);
  
  if (location && propertyType) {
    return cleanDescription(`Descubre las mejores opciones de ${propertyType.toLowerCase()} en ${location}. Propiedades cuidadosamente seleccionadas con excelente ubicación y servicios cercanos.`);
  }
  
  return 'Encuentra tu propiedad ideal con CLIC Inmobiliaria. Propiedades verificadas y servicios de calidad.';
}

function generateBenefits(tags: any[]): string[] {
  return [
    'Financiamiento hasta 80%',
    'Bono Primera Vivienda disponible',
    'Asesoría legal incluida',
    'Tours virtuales',
    'Proceso 100% transparente'
  ];
}

function generateFAQs(tags: any[]): Array<{question: string, answer: string}> {
  const location = extractLocationFromTags(tags);
  
  return [
    {
      question: '¿Cómo funciona el proceso de compra?',
      answer: cleanDescription('El proceso incluye: 1) Selección de propiedad, 2) Verificación legal, 3) Negociación, 4) Financiamiento, 5) Firma y entrega de llaves. Te acompañamos en cada paso.')
    },
    {
      question: '¿Qué incluye el Bono Primera Vivienda?',
      answer: cleanDescription('El Bono Primera Vivienda puede cubrir hasta RD$300,000 del valor de la propiedad. Incluye subsidio del gobierno y beneficios fiscales para compradores elegibles.')
    },
    {
      question: `¿Por qué invertir en ${location || 'esta zona'}?`,
      answer: cleanDescription(`${location || 'Esta zona'} ofrece excelente conectividad, servicios cercanos, crecimiento sostenido y potencial de valorización. Ideal para inversión o residencia.`)
    },
    {
      question: '¿Ofrecen financiamiento?',
      answer: cleanDescription('Trabajamos con los principales bancos del país para ofrecerte las mejores opciones de financiamiento. Hasta 80% del valor con tasas competitivas.')
    }
  ];
}

function getEmptyListResponse() {
  return {
    type: 'property-list' as const,
    properties: [],
    pagination: {
      currentPage: 1,
      totalCount: 0,
      itemsPerPage: 30,
      totalPages: 0,
      hasMore: false,
      hasNextPage: false,
      hasPreviousPage: false
    },
    search: {
      tags: [],
      location: null,
      propertyType: null,
      operation: null
    },
    seo: {
      title: 'Propiedades no encontradas - CLIC Inmobiliaria',
      description: 'No se encontraron propiedades que coincidan con tu búsqueda',
      h1: 'Sin resultados'
    },
    breadcrumbs: [
      { name: 'Inicio', url: '/', current: false },
      { name: 'Propiedades', url: '/propiedades', current: true }
    ],
    content: {
      intro: 'No se encontraron propiedades para los criterios especificados.',
      benefits: [],
      nearbyServices: [],
      faqs: []
    }
  };
}

function formatProjectDetails(projectData: any) {
  if (!projectData) return null;
  
  return {
    id: projectData.id,
    name: formatTitle(projectData.name || ''),
    description: cleanDescription(projectData.description || ''),
    developer: projectData.developers ? {
      name: formatTitle(projectData.developers.name || ''),
      description: cleanDescription(projectData.developers.description || ''),
      logo_url: projectData.developers.logo_url,
      website: projectData.developers.website,
      years_experience: projectData.developers.years_experience,
      total_projects: projectData.developers.total_projects
    } : null,
    status: {
      construction: sanitizeText(projectData.construction_status || 'En construcción'),
      sales: sanitizeText(projectData.sales_status || 'En venta'),
      completion: projectData.estimated_completion_date,
      delivery_date: projectData.delivery_date
    },
    typologies: projectData.project_typologies?.map((typ: any) => ({
      id: typ.id,
      name: sanitizeText(typ.name || `${typ.bedrooms} habitaciones`),
      bedrooms: typ.bedrooms,
      bathrooms: typ.bathrooms,
      area: typ.built_area,
      priceFrom: typ.sale_price_from,
      priceTo: typ.sale_price_to,
      currency: typ.sale_currency || 'USD',
      available: !typ.is_sold_out,
      totalUnits: typ.total_units,
      availableUnits: typ.available_units
    })) || [],
    amenities: projectData.project_amenities?.map((amenity: any) => ({
      name: sanitizeText(amenity.amenities?.name || amenity.name || ''),
      icon: amenity.amenities?.icon || 'fas fa-check',
      category: sanitizeText(amenity.amenities?.category || ''),
      included: amenity.included !== false
    })) || [],
    paymentPlans: projectData.project_payment_plans?.map((plan: any) => ({
      id: plan.id,
      name: sanitizeText(plan.plan_name || 'Plan de Pago'),
      description: cleanDescription(plan.description || ''),
      reservation: plan.reservation_amount || 1000,
      reservationCurrency: plan.reservation_currency || 'USD',
      separationPercentage: plan.separation_percentage || 10,
      constructionPercentage: plan.construction_percentage || 20,
      deliveryPercentage: plan.delivery_percentage || 70,
      benefits: cleanDescription(plan.benefits || ''),
      isDefault: plan.is_default || false
    })) || [],
    phases: projectData.project_phases?.map((phase: any) => ({
      id: phase.id,
      name: sanitizeText(phase.phase_name || ''),
      description: cleanDescription(phase.description || ''),
      constructionStart: phase.construction_start,
      estimatedDelivery: phase.estimated_delivery,
      actualDelivery: phase.actual_delivery,
      totalUnits: phase.total_units,
      availableUnits: phase.available_units,
      status: sanitizeText(phase.status || ''),
      completionPercentage: phase.completion_percentage
    })) || []
  };
}

// =====================================================
// EXPORTS
// =====================================================

export { getSingleProperty, getPropertyList };