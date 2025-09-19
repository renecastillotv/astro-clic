// src/data/types.ts

/**
 * 🏠 PROPIEDAD INMOBILIARIA
 */
export interface Property {
  slug: string;
  titulo: string;
  precio: string;
  descripcion?: string;
  imagen: string;
  imagenes?: string[];
  sector: string;
  habitaciones: number;
  banos: number;
  metros?: number;
  terreno?: number;
  tipo?: string;
  amenidades?: string[];
  caracteristicas?: Record<string, string>;
  destacado?: boolean;
  nuevo?: boolean;
  descuento?: string;
}

/**
 * 📄 ARTÍCULO DEL BLOG
 */
export interface Article {
  slug: string;
  title: string;
  excerpt?: string;
  content: string;
  featuredImage?: string;
  author: {
    name: string;
    avatar?: string;
  };
  publishedAt: string;
  readTime?: string;
  category?: string;
  views?: string;
  tags?: string[];
  featured?: boolean;
}

/**
 * 👥 ASESOR INMOBILIARIO
 */
export interface Advisor {
  slug: string;
  name: string;
  title: string;
  avatar?: string;
  specialties: string[];
  areas: string[];
  languages: string[];
  experience: string;
  totalSales: string;
  propertiesSold: number;
  avgDays: number;
  rating: number;
  reviewCount: number;
  phone: string;
  whatsapp: string;
  email: string;
  bio?: string;
  achievements?: string[];
  featured?: boolean;
}

/**
 * 🎬 VIDEO
 */
export interface Video {
  id: string;
  title: string;
  description?: string;
  thumbnail: string;
  duration: string;
  views: string;
  category?: string;
  videoId: string;
  videoSlug?: string;
  featured?: boolean;
}

/**
 * 💬 TESTIMONIO
 */
export interface Testimonial {
  id: string;
  slug: string;
  category: string;
  author: {
    name: string;
    avatar?: string;
    location?: string;
    verified?: boolean;
  };
  rating: number;
  text: string;
  excerpt: string;
  propertyType?: string;
  location?: string;
  date: string;
  views?: string;
  readTime?: string;
  stayDuration?: string;
  groupSize?: string;
}

/**
 * 📊 DATOS DE PÁGINA COMPLETOS
 * 
 * Estructura unificada que puede contener cualquier tipo de página
 */
export interface PageData {
  // Tipo de página
  type: 'property-list' | 'property' | 'article' | 'advisor' | '404';
  
  // Contenido principal según el tipo
  property?: Property;
  listings?: Property[];
  article?: Article;
  advisor?: Advisor;
  
  // Metadatos para SEO
  meta?: {
    title: string;
    description: string;
    canonical?: string;
  };
  
  // Datos adicionales para listados
  total?: number;
  filters?: any;
  
  // Contenido complementario (solo para páginas completas)
  videos?: Video[];
  articles?: Article[];
  testimonials?: Testimonial[];
  advisors?: Advisor[];
  thematicLists?: any[];
  propertyCarousels?: any[];
  faqs?: any[];
}

/**
 * 🔍 FILTROS DE BÚSQUEDA
 */
export interface SearchFilters {
  accion?: 'comprar' | 'alquilar';
  tipo?: string;
  ubicacion?: string;
  sector?: string;
  precioMin?: string;
  precioMax?: string;
  moneda?: 'USD' | 'DOP';
  habitaciones?: string;
  banos?: string;
  parqueos?: string;
  caracteristicas?: string[];
}

/**
 * 📄 RESULTADO DE BÚSQUEDA PAGINADA
 */
export interface SearchResult {
  properties: Property[];
  total: number;
  hasMore: boolean;
  currentPage?: number;
  totalPages?: number;
}

/**
 * 🎯 OPCIONES PARA FUNCIONES DE BÚSQUEDA
 */
export interface SearchOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'precio-asc' | 'precio-desc' | 'habitaciones-desc' | 'fecha-desc';
}

/**
 * 🔧 RESPUESTA DE API (para fetch parcial)
 */
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}