// src/data/mockDatabase.ts
import type { Property, Article, Advisor, Video, Testimonial } from './types';

/**
 * 🗄️ BASE DE DATOS MOCK CENTRALIZADA
 * 
 * Todos los datos mock en un solo lugar, organizados y tipados
 * Preparado para migración a Supabase
 */
class MockDatabase {
  
  // ===============================
  // 🏠 PROPIEDADES
  // ===============================
  
  private properties: Property[] = [
    {
      slug: 'villa-cortecito-3h-piscina',
      titulo: 'Villa 3H en Cortecito con piscina',
      precio: '$275,000',
      descripcion: 'Hermosa villa de 3 habitaciones ubicada en el corazón de Cortecito, Bávaro. Esta propiedad cuenta con piscina privada, jardín tropical y está a solo 5 minutos de la playa. Ideal para inversión o vivienda familiar.',
      imagen: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&h=800&fit=crop',
      imagenes: [
        'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&h=800&fit=crop'
      ],
      sector: 'Cortecito, Bávaro',
      habitaciones: 3,
      banos: 2,
      metros: 180,
      terreno: 400,
      tipo: 'Villa',
      amenidades: ['Piscina', 'Jardín', 'Parqueo techado', 'Cocina equipada', 'Cerca de la playa'],
      caracteristicas: {
        'Año de construcción': '2021',
        'Niveles': '1',
        'Parqueos': '2',
        'Estado': 'Nueva'
      }
    },
    {
      slug: 'villa-familiar-cortecito',
      titulo: 'Villa familiar cerca de la playa',
      precio: '$325,000',
      descripcion: 'Espaciosa villa familiar de 4 habitaciones con diseño moderno y acabados de primera. Ubicada en una zona tranquila de Cortecito con fácil acceso a comercios y playas.',
      imagen: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=800&fit=crop',
      imagenes: [
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&h=800&fit=crop'
      ],
      sector: 'Cortecito, Bávaro',
      habitaciones: 4,
      banos: 3,
      metros: 220,
      tipo: 'Villa',
      amenidades: ['Piscina', 'Jardín', 'Gazebo', 'Cocina moderna', 'Seguridad 24/7'],
      caracteristicas: {
        'Año de construcción': '2020',
        'Niveles': '2',
        'Parqueos': '3',
        'Estado': 'Excelente'
      }
    },
    {
      slug: 'villa-punta-cana-golf',
      titulo: 'Villa en Punta Cana con vista al golf',
      precio: '$650,000',
      descripcion: 'Espectacular villa de lujo con vistas panorámicas al campo de golf. Esta propiedad premium cuenta con acabados de alta gama, piscina infinita y acceso directo al club de golf más exclusivo de Punta Cana.',
      imagen: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&h=800&fit=crop',
      imagenes: [
        'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=1200&h=800&fit=crop'
      ],
      sector: 'Punta Cana',
      habitaciones: 4,
      banos: 4,
      metros: 400,
      terreno: 1200,
      tipo: 'Villa de Lujo',
      amenidades: ['Piscina infinita', 'Vista al golf', 'Jacuzzi', 'Gimnasio', 'Sala de cine', 'Bodega de vinos', 'Cocina gourmet', 'Seguridad 24/7'],
      caracteristicas: {
        'Año de construcción': '2022',
        'Niveles': '2',
        'Parqueos': '4',
        'Estado': 'Nueva',
        'Vista': 'Campo de golf'
      }
    },
    {
      slug: 'apartamento-blue-mall',
      titulo: 'Apartamento moderno cerca de Blue Mall',
      precio: '$225,000',
      descripcion: 'Moderno apartamento en torre de primera, ubicado en la exclusiva zona de Piantini. A solo minutos de Blue Mall, restaurantes y centros de entretenimiento.',
      imagen: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&h=800&fit=crop',
      imagenes: [
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1560448205-17d3a46c84de?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1560448075-cbc16bb4af8e?w=1200&h=800&fit=crop'
      ],
      sector: 'Piantini, D.N.',
      habitaciones: 2,
      banos: 2,
      metros: 120,
      tipo: 'Apartamento',
      amenidades: ['Gimnasio', 'Piscina', 'Área social', 'Lobby', 'Seguridad 24/7', 'Generador full'],
      caracteristicas: {
        'Año de construcción': '2021',
        'Piso': '8vo',
        'Parqueos': '2',
        'Estado': 'Nuevo'
      }
    },
    {
      slug: 'penthouse-anacaona',
      titulo: 'Penthouse exclusivo en Anacaona',
      precio: '$550,000',
      descripcion: 'Lujoso penthouse con vistas espectaculares de la ciudad. Diseño contemporáneo con amplios espacios, terraza privada y acabados importados.',
      imagen: 'https://images.unsplash.com/photo-1567684014761-b65e2e59b9eb?w=1200&h=800&fit=crop',
      imagenes: [
        'https://images.unsplash.com/photo-1567684014761-b65e2e59b9eb?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1560185008-b033106af5c3?w=1200&h=800&fit=crop'
      ],
      sector: 'Bella Vista, D.N.',
      habitaciones: 4,
      banos: 3,
      metros: 300,
      tipo: 'Penthouse',
      amenidades: ['Terraza privada', 'Jacuzzi', 'BBQ', 'Vista panorámica', 'Ascensor privado', 'Gimnasio en el edificio'],
      caracteristicas: {
        'Año de construcción': '2023',
        'Niveles': '2 (dúplex)',
        'Parqueos': '3',
        'Estado': 'Nuevo',
        'Vista': 'Ciudad y mar'
      }
    },
    {
      slug: 'casa-santiago-gurabo',
      titulo: 'Casa familiar en Gurabo, Santiago',
      precio: '$180,000',
      descripcion: 'Cómoda casa familiar en Gurabo con excelente acceso a colegios y centros comerciales.',
      imagen: 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800&h=600&fit=crop',
      sector: 'Gurabo, Santiago',
      habitaciones: 3,
      banos: 2,
      metros: 200,
      tipo: 'Casa',
      amenidades: ['Jardín', 'Parqueo', 'Cerca de colegios'],
      caracteristicas: {
        'Año de construcción': '2019',
        'Niveles': '2',
        'Parqueos': '2',
        'Estado': 'Bueno'
      }
    }
  ];

  // ===============================
  // 📄 ARTÍCULOS
  // ===============================
  
  private articles: Article[] = [
    {
      slug: 'tendencias-mercado-inmobiliario-rd-2025',
      title: 'Tendencias del Mercado Inmobiliario en RD 2025',
      excerpt: 'René Castillo analiza las proyecciones y oportunidades más importantes para este año.',
      content: 'Contenido completo del artículo...',
      featuredImage: 'https://images.unsplash.com/photo-1560520653-9e0e4c89eb11?w=800&h=450&fit=crop',
      author: { name: 'René Castillo', avatar: 'https://i.pravatar.cc/150?img=1' },
      publishedAt: '2024-03-20',
      readTime: '12',
      category: 'Análisis de Mercado',
      views: '8.5K',
      tags: ['mercado', 'tendencias', '2025']
    },
    {
      slug: 'guia-comprar-extranjero-rd',
      title: 'Guía para Extranjeros que Compran en República Dominicana',
      excerpt: 'Todo lo que necesitas saber sobre documentación, procesos y mejores prácticas.',
      content: 'Contenido completo del artículo...',
      featuredImage: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=450&fit=crop',
      author: { name: 'Equipo CLIC', avatar: 'https://i.pravatar.cc/150?img=2' },
      publishedAt: '2024-03-18',
      readTime: '15',
      category: 'Guías de Compra',
      views: '12.3K',
      tags: ['extranjeros', 'documentos', 'proceso']
    }
  ];

  // ===============================
  // 👥 ASESORES
  // ===============================
  
  private advisors: Advisor[] = [
    {
      slug: 'maria-rodriguez',
      name: 'María Rodríguez',
      title: 'Directora de Ventas Premium',
      avatar: 'https://i.pravatar.cc/300?img=5',
      specialties: ['Propiedades de Lujo', 'Casa de Campo', 'Cap Cana'],
      areas: ['Santo Domingo', 'La Romana', 'Punta Cana'],
      languages: ['Español', 'Inglés', 'Francés'],
      experience: '12 años',
      totalSales: '$45M',
      propertiesSold: 180,
      avgDays: 28,
      rating: 4.9,
      reviewCount: 127,
      phone: '+1 809 555 0101',
      whatsapp: '18095550101',
      email: 'maria.rodriguez@clic.do',
      bio: 'Especialista en propiedades de lujo con más de una década de experiencia.',
      achievements: ['Top Seller 2023', 'Asesor del Año 2022']
    },
    {
      slug: 'carlos-santana',
      name: 'Carlos Santana',
      title: 'Especialista en Inversiones',
      avatar: 'https://i.pravatar.cc/300?img=8',
      specialties: ['Airbnb', 'Inversión Inmobiliaria', 'Análisis ROI'],
      areas: ['Bávaro', 'Uvero Alto', 'Samaná'],
      languages: ['Español', 'Inglés'],
      experience: '8 años',
      totalSales: '$28M',
      propertiesSold: 145,
      avgDays: 32,
      rating: 4.8,
      reviewCount: 98,
      phone: '+1 809 555 0108',
      whatsapp: '18095550108',
      email: 'carlos.santana@clic.do',
      bio: 'Experto en inversiones inmobiliarias con enfoque en alquiler vacacional.',
      achievements: ['Especialista en Airbnb Certificado', 'Mejor ROI 2023']
    }
  ];

  // ===============================
  // 🎬 VIDEOS
  // ===============================
  
  private videos: Video[] = [
    {
      id: '1',
      title: 'La Casa de Luz García en Cacicazgos - Tour Exclusivo',
      description: 'Visitamos la espectacular villa de la reconocida presentadora dominicana',
      thumbnail: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&h=450&fit=crop',
      duration: '18:45',
      views: '342K',
      category: 'casa-famosos',
      videoId: 'dQw4w9WgXcQ',
      videoSlug: 'la-casa-de-luz-garcia',
      featured: true
    },
    {
      id: '2',
      title: 'Cómo Invertir en Punta Cana - Guía 2024',
      description: 'René Castillo te explica las mejores oportunidades de inversión',
      thumbnail: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=450&fit=crop',
      duration: '15:30',
      views: '89K',
      category: 'tips',
      videoId: 'dQw4w9WgXcQ2',
      videoSlug: 'como-invertir-punta-cana-2024'
    }
  ];

  // ===============================
  // 💬 TESTIMONIOS
  // ===============================
  
  private testimonials: Testimonial[] = [
    {
      id: '1',
      slug: 'carlos-mendoza-villa-cap-cana',
      category: 'compradores',
      author: {
        name: 'Carlos Mendoza',
        avatar: 'https://i.pravatar.cc/150?img=10',
        location: 'Santo Domingo',
        verified: true
      },
      rating: 5,
      text: 'René y su equipo me ayudaron a encontrar la villa perfecta en Cap Cana. Su experiencia en TV se nota en la atención al detalle y el profesionalismo.',
      excerpt: 'René y su equipo me ayudaron a encontrar la villa perfecta en Cap Cana.',
      propertyType: 'Villa',
      location: 'Cap Cana',
      date: '2024-03-15'
    },
    {
      id: '2',
      slug: 'ana-martinez-apartamento-piantini',
      category: 'inversionistas',
      author: {
        name: 'Ana Martínez',
        avatar: 'https://i.pravatar.cc/150?img=6',
        location: 'Miami, FL',
        verified: true
      },
      rating: 5,
      text: 'Como extranjera, necesitaba mucha asesoría. CLIC me guió en todo el proceso y ahora tengo un apartamento que genera excelente ROI.',
      excerpt: 'CLIC me guió en todo el proceso y ahora tengo un apartamento que genera excelente ROI.',
      propertyType: 'Apartamento',
      location: 'Piantini',
      date: '2024-02-28'
    }
  ];

  // ===============================
  // 🔍 MÉTODOS DE CONSULTA
  // ===============================

  // Properties
  getAllProperties(): Property[] {
    return this.properties;
  }

  getPropertyBySlug(slug: string): Property | undefined {
    return this.properties.find(p => p.slug === slug);
  }

  propertyExists(slug: string): boolean {
    return this.properties.some(p => p.slug === slug);
  }

  getPropertiesByType(tipo: string): Property[] {
    return this.properties.filter(p => 
      p.tipo?.toLowerCase().includes(tipo.toLowerCase())
    );
  }

  getPropertiesByArea(area: string): Property[] {
    return this.properties.filter(p => 
      p.sector?.toLowerCase().includes(area.toLowerCase())
    );
  }

  // Articles
  getAllArticles(): Article[] {
    return this.articles;
  }

  getArticleBySlug(slug: string): Article | undefined {
    return this.articles.find(a => a.slug === slug);
  }

  getArticlesByCategory(category: string): Article[] {
    return this.articles.filter(a => 
      a.category?.toLowerCase().includes(category.toLowerCase()) ||
      a.tags?.some(tag => tag.toLowerCase().includes(category.toLowerCase()))
    );
  }

  // Advisors
  getAllAdvisors(): Advisor[] {
    return this.advisors;
  }

  getAdvisorBySlug(slug: string): Advisor | undefined {
    return this.advisors.find(a => a.slug === slug);
  }

  getAdvisorsByArea(area: string): Advisor[] {
    return this.advisors.filter(a => 
      a.areas?.some(advisorArea => 
        advisorArea.toLowerCase().includes(area.toLowerCase())
      )
    );
  }

  // Videos
  getAllVideos(): Video[] {
    return this.videos;
  }

  getVideosByCategory(category: string): Video[] {
    return this.videos.filter(v => 
      v.category?.toLowerCase().includes(category.toLowerCase())
    );
  }

  // Testimonials
  getAllTestimonials(): Testimonial[] {
    return this.testimonials;
  }

  getTestimonialsByCategory(category: string): Testimonial[] {
    return this.testimonials.filter(t => t.category === category);
  }
}

// ===============================
// 🚀 EXPORTAR INSTANCIA SINGLETON
// ===============================

export const mockDatabase = new MockDatabase();