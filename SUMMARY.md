# CLIC Inmobiliaria - Arquitectura Completa del Sistema

## Índice
1. [Visión General](#visión-general)
2. [Arquitectura de Base de Datos](#arquitectura-de-base-de-datos)
3. [Sistema de Edge Functions](#sistema-de-edge-functions)
4. [Sistema Multiidioma](#sistema-multiidioma)
5. [Tipos de Páginas y Layouts](#tipos-de-páginas-y-layouts)
6. [Flujo de Datos](#flujo-de-datos)
7. [Sistema de Tags y Búsqueda](#sistema-de-tags-y-búsqueda)
8. [Guía para Desarrollar un CRM](#guía-para-desarrollar-un-crm)

---

## Visión General

**CLIC Inmobiliaria** es una plataforma inmobiliaria multi-país con arquitectura serverless construida con:

- **Frontend**: Astro.js (SSR/SSG)
- **Backend**: Supabase Edge Functions (Deno)
- **Base de Datos**: PostgreSQL (Supabase)
- **Idiomas Soportados**: Español (es), Inglés (en), Francés (fr)
- **Países Activos**: República Dominicana (DOM), Panamá (PAN), México (MEX)

### Características Principales

- 🌍 **Multi-país y multi-dominio**: Cada país tiene su propio dominio o subdominio
- 🌐 **Multiidioma completo**: Contenido traducido en 3 idiomas
- 🏢 **Sistema de Tags jerárquico**: Categorización avanzada por país, ciudad, sector, tipo de propiedad
- 📊 **SEO Avanzado**: Schema.org, hreflang, Open Graph automático
- 🔄 **Data real/fake configurable**: Campo `real_data` controla si mostrar números reales o ficticios
- 📝 **CMS completo**: Artículos, videos, testimonios, asesores
- 🏡 **Propiedades con múltiples precios**: Venta, alquiler, temporal, amueblado
- ⭐ **Favoritos compartidos**: Sistema colaborativo de listas favoritas
- 📞 **Contact submissions con tracking**: UTM, fbclid, gclid completo

---

## Arquitectura de Base de Datos

### Tablas Principales del Sistema

#### 1. `countries` - Países y Configuración
**Propósito**: Gestión multi-país con configuración personalizada por dominio.

**Campos Importantes**:
```typescript
{
  id: number                    // ID único del país
  name: string                  // Nombre del país (ej: "República Dominicana")
  code: string                  // Código ISO (ej: "DOM", "PAN", "MEX")
  country_tag_id: number        // FK → tags (tag de país)
  subdomain: string             // Subdominio (ej: "pa", "mx")
  custom_domain: string         // Dominio personalizado (ej: "clicinmobiliaria.com")
  currency: string              // Moneda principal ("DOP", "USD", "MXN")
  timezone: string              // Zona horaria
  real_data: boolean            // ⚠️ IMPORTANTE: true = datos reales, false = datos ficticios
  active: boolean               // País activo o no
  config: JSONB                 // Configuración completa del país
}
```

**Campo `config` (JSONB)**:
```json
{
  "contact": { "phone": "", "email": "", "address": "" },
  "social": {
    "company": { "facebook": "", "instagram": "", "youtube": "" }
  },
  "legal": {
    "company_name": "CLIC Inmobiliaria",
    "company_full_name": "CLIC DOM SRL",
    "logo_url": ""
  },
  "features": {
    "header": {
      "sections": {
        "comprar": { "urls": { "es": "/comprar", "en": "/buy", "fr": "/acheter" } }
      }
    }
  },
  "footer_links": {
    "properties_by_zone": [
      { "label": { "es": "...", "en": "...", "fr": "..." }, "urls": { ... } }
    ]
  },
  "translations": {
    "es": { "search_placeholder": "Buscar propiedades..." },
    "en": { "search_placeholder": "Search properties..." }
  }
}
```

**Relaciones**:
- `country_tag_id` → `tags.id` (tag de categoría "pais")

---

#### 2. `tags` - Sistema de Etiquetas Jerárquico
**Propósito**: Sistema universal de categorización para propiedades, contenido y ubicaciones.

**Campos**:
```typescript
{
  id: number                    // ID único
  slug: string                  // Slug en español (ej: "punta-cana")
  slug_en: string               // Slug en inglés (ej: "punta-cana")
  slug_fr: string               // Slug en francés (ej: "punta-cana")
  category: string              // Categoría del tag (ver abajo)
  display_name: string          // Nombre display español
  display_name_en: string       // Nombre display inglés
  display_name_fr: string       // Nombre display francés
  parent_id: number             // FK → tags.id (jerarquía)
  active: boolean               // Tag activo
  priority: number              // Orden de visualización
}
```

**Categorías de Tags (`category`)**:
- `pais` - País (ej: República Dominicana, Panamá)
- `provincia` - Provincia/Estado (ej: Santo Domingo, La Altagracia)
- `ciudad` - Ciudad (ej: Punta Cana, Santiago)
- `sector` - Sector/Vecindario (ej: Bávaro, Naco)
- `categoria` - Tipo de propiedad (ej: Apartamento, Villa, Casa)
- `caracteristica` - Características (ej: Piscina, Vista al mar)
- `proyecto` - Proyectos (ej: Torre en construcción)
- `asesor` - Agentes inmobiliarios
- `custom` - Tags personalizados

**Jerarquía de Tags**:
```
País (pais)
  └─ Provincia (provincia)
      └─ Ciudad (ciudad)
          └─ Sector (sector)

Ejemplo:
República Dominicana (pais)
  └─ La Altagracia (provincia)
      └─ Punta Cana (ciudad)
          └─ Bávaro (sector)
```

**Relaciones**:
- `parent_id` → `tags.id` (auto-referencia para jerarquía)
- Usados en `property_tags`, `content_tags`, `popular_items`

---

#### 3. `properties` - Propiedades Inmobiliarias
**Propósito**: Tabla central de todas las propiedades en venta/alquiler.

**Campos Clave**:
```typescript
{
  id: number                              // ID único
  code: string                            // Código interno (ej: "CLIC-001")
  name: string                            // Nombre de la propiedad
  description: text                       // Descripción completa
  slug_url: string                        // URL slug única

  // PRECIOS Y OPERACIONES - Sistema Multi-precio
  sale_price: decimal                     // Precio de venta
  sale_currency: string                   // Moneda de venta ("USD", "DOP")
  rental_price: decimal                   // Precio alquiler mensual
  rental_currency: string
  temp_rental_price: decimal              // Alquiler temporal (diario/semanal)
  temp_rental_currency: string
  furnished_rental_price: decimal         // Alquiler amueblado
  furnished_rental_currency: string
  furnished_sale_price: decimal           // Venta amueblada
  furnished_sale_currency: string

  // CARACTERÍSTICAS FÍSICAS
  bedrooms: integer                       // Habitaciones
  bathrooms: decimal                      // Baños (permite .5 para medio baño)
  parking_spots: integer                  // Estacionamientos
  built_area: decimal                     // Área construida (m²)
  land_area: decimal                      // Área de terreno (m²)

  // UBICACIÓN Y COORDENADAS
  exact_coordinates: point                // Coordenadas exactas (PostgreSQL POINT)
  show_exact_location: boolean            // Mostrar ubicación exacta o aproximada

  // IMÁGENES
  main_image_url: string                  // Imagen principal
  gallery_images_url: text                // URLs separadas por comas

  // ESTADO Y VISIBILIDAD
  property_status: string                 // "Publicada", "Vendida", "Retirada", "Borrador"
  availability: integer                   // 1 = disponible, 0 = no disponible

  // PROYECTO
  is_project: boolean                     // ¿Es un proyecto?
  delivery_date: date                     // Fecha de entrega (para proyectos)
  project_detail_id: number               // FK → project_details

  // AGENTE
  agent_id: number                        // FK → agents (asesor principal)

  // AUDITORÍA
  created_at: timestamptz
  updated_at: timestamptz
  views: integer                          // Contador de vistas
}
```

**Relaciones Importantes**:
```sql
properties
  ├─ property_categories (many-to-many) → property_categories
  ├─ cities (FK) → cities
  ├─ sectors (FK) → sectors
  ├─ agents (FK) → agents
  ├─ property_images (1-to-many) → property_images
  ├─ property_amenities (1-to-many) → property_amenities
  └─ property_tags (many-to-many) → tags
```

**Consulta SELECT típica** (usado en edge function):
```typescript
const selectQuery = `
  id, code, name, description, agent_id, slug_url,
  sale_price, sale_currency, rental_price, rental_currency,
  temp_rental_price, temp_rental_currency,
  furnished_rental_price, furnished_rental_currency,
  bedrooms, bathrooms, parking_spots, built_area, land_area,
  main_image_url, gallery_images_url, property_status, is_project,
  delivery_date, project_detail_id,
  exact_coordinates, show_exact_location,
  property_categories(name, description),
  cities(name, coordinates, provinces(name, coordinates)),
  sectors(name, coordinates),
  property_images(url, title, description, is_main, sort_order),
  property_amenities(amenity_id, value, amenities(name, icon, category))
`;
```

---

#### 4. `property_tags` - Relación Propiedades-Tags
**Propósito**: Tabla pivote many-to-many entre propiedades y tags.

```typescript
{
  id: number                    // ID único
  property_id: number           // FK → properties.id
  tag_id: number                // FK → tags.id
  created_at: timestamptz
}
```

**Uso en Búsqueda**:
```sql
-- Buscar propiedades con tags específicos
SELECT p.*
FROM properties p
JOIN property_tags pt ON pt.property_id = p.id
WHERE pt.tag_id IN (1, 5, 10)  -- IDs de tags
  AND p.availability = 1
  AND p.property_status = 'Publicada'
```

---

#### 5. `cities`, `provinces`, `sectors` - Ubicaciones
**Propósito**: Sistema jerárquico de ubicaciones geográficas.

**Tabla `provinces`**:
```typescript
{
  id: number
  name: string                  // Nombre de la provincia
  coordinates: point            // Coordenadas centrales
  country_id: number            // FK → countries.id
}
```

**Tabla `cities`**:
```typescript
{
  id: number
  name: string
  coordinates: point
  province_id: number           // FK → provinces.id
}
```

**Tabla `sectors`**:
```typescript
{
  id: number
  name: string
  coordinates: point
  city_id: number               // FK → cities.id
}
```

**Jerarquía**:
```
Country → Province → City → Sector
   ↓         ↓         ↓       ↓
  DOM   → La Altagracia → Punta Cana → Bávaro
```

---

#### 6. `agents` - Asesores Inmobiliarios
**Propósito**: Gestión de agentes de bienes raíces.

```typescript
{
  id: number
  first_name: string
  last_name: string
  email: string
  phone: string
  whatsapp: string
  bio: text
  photo_url: string
  specialties: string[]         // Array de especialidades
  languages: string[]           // Array de idiomas
  active: boolean
  slug: string                  // Slug para URL

  // Estadísticas (controladas por real_data)
  total_sales: integer          // Total de ventas
  properties_sold: integer      // Propiedades vendidas
  avg_rating: decimal           // Calificación promedio
}
```

**Relación con `properties`**:
- Una propiedad tiene un `agent_id` (agente principal)
- Un agente puede tener múltiples propiedades

---

#### 7. `content_articles` - Artículos del Blog
**Propósito**: Sistema de blog/contenido multiidioma.

```typescript
{
  id: number
  title: string                 // Título en español
  slug: string                  // Slug en español
  excerpt: text                 // Extracto corto
  content: text                 // Contenido HTML completo
  featured_image: string        // Imagen destacada

  // Multiidioma
  content_en: JSONB             // { title, slug, excerpt, content }
  content_fr: JSONB
  slug_en: string
  slug_fr: string

  // Categoría y Tags
  category_id: number           // FK → content_categories.id

  // Metadatos
  author_id: number             // FK → agents.id
  published_at: timestamptz
  updated_at: timestamptz
  views: integer
  read_time_minutes: integer
  featured: boolean
  status: string                // "published", "draft", "archived"
}
```

**Relación con Tags**:
```sql
-- Tabla pivote
content_tags
  ├─ content_id (FK → content_articles.id)
  ├─ tag_id (FK → tags.id)
  └─ content_type: 'article' | 'video' | 'testimonial'
```

---

#### 8. `content_categories` - Categorías de Contenido
**Propósito**: Categorizar artículos, videos, testimonios.

```typescript
{
  id: number
  name: string                  // Nombre en español
  slug: string
  description: text

  // Multiidioma
  name_en: string
  name_fr: string
  slug_en: string
  slug_fr: string

  // Configuración
  content_type: string          // 'article', 'video', 'testimonial'
  active: boolean
  priority: integer             // Orden de visualización
}
```

---

#### 9. `content_videos` - Videos
**Propósito**: Gestión de contenido en video (YouTube, Vimeo, etc).

```typescript
{
  id: number
  title: string
  slug: string
  description: text
  video_url: string             // URL del video
  thumbnail: string             // Miniatura
  duration_seconds: integer

  // Multiidioma
  content_en: JSONB
  content_fr: JSONB

  category_id: number
  published_at: timestamptz
  views: integer
  featured: boolean
}
```

---

#### 10. `content_testimonials` - Testimonios
**Propósito**: Reseñas y testimonios de clientes.

```typescript
{
  id: number
  client_name: string
  client_position: string       // Ej: "Propietario", "Inversionista"
  client_avatar: string
  excerpt: text                 // Testimonio corto
  full_testimonial: text        // Testimonio completo
  rating: integer               // 1-5 estrellas

  // Multiidioma
  content_en: JSONB
  content_fr: JSONB

  // Ubicación del cliente
  client_location: string

  // Propiedad relacionada (opcional)
  property_id: number           // FK → properties.id

  featured: boolean
  published_at: timestamptz
}
```

---

#### 11. `contact_submissions` - Envíos del Formulario de Contacto
**Propósito**: Almacenar todos los contactos del sitio web con tracking completo.

```typescript
{
  id: uuid                      // UUID único

  // Información del contacto (REQUERIDOS)
  nombre: string                // Nombre completo
  telefono: string              // Teléfono
  email: string                 // Email
  tipo_servicio: enum           // 'asesor' | 'vender' | 'desarrollo' | 'comprar' | 'otro'

  // Información adicional (OPCIONALES)
  mensaje: text                 // Mensaje del usuario
  preferencia_contacto: string  // Cuándo contactar (default: 'asap')

  // Tracking de marketing
  ip_address: string
  user_agent: string
  referer: string

  // Parámetros UTM completos
  utm_source: string            // Ej: "google", "facebook"
  utm_medium: string            // Ej: "cpc", "organic"
  utm_campaign: string          // Ej: "verano-2024"
  utm_content: string
  utm_term: string

  // Otros parámetros de tracking
  ref_param: string             // Parámetro ref= personalizado
  fbclid: string                // Facebook Click ID
  gclid: string                 // Google Click ID

  // Tracking data completo (JSONB)
  tracking_data: JSONB          // Objeto con todos los datos de tracking

  // Estado y workflow
  status: enum                  // 'pendiente' | 'contactado' | 'en_proceso' | 'completado' | 'descartado'

  // Timestamps
  created_at: timestamptz
  updated_at: timestamptz       // Auto-actualizado con trigger
}
```

**Índices de Performance**:
```sql
idx_contact_submissions_email           -- Búsqueda por email
idx_contact_submissions_telefono        -- Búsqueda por teléfono
idx_contact_submissions_tipo_servicio   -- Filtro por tipo
idx_contact_submissions_status          -- Filtro por estado
idx_contact_submissions_created_at      -- Orden cronológico
idx_contact_submissions_utm_source      -- Análisis de fuentes
idx_contact_submissions_utm_campaign    -- Análisis de campañas
idx_contact_submissions_tracking_data   -- Búsqueda en JSON (GIN index)
```

**Row Level Security (RLS)**:
- INSERT: Permitido para usuarios anónimos (formulario público)
- SELECT: Solo usuarios autenticados
- UPDATE: Solo usuarios autenticados

---

#### 12. `favorite_visitors` - Visitantes de Listas Compartidas
**Propósito**: Tracking de visitantes en listas de favoritos compartidas.

```typescript
{
  id: bigserial                 // ID único
  list_id: string               // ID de la lista compartida
  visitor_device_id: string     // ID único del dispositivo del visitante
  visitor_alias: string         // Alias/nombre del visitante
  joined_at: timestamptz        // Cuándo se unió
  last_seen: timestamptz        // Última actividad
}
```

**Constraint único**: `(list_id, visitor_device_id)` - Un dispositivo solo puede unirse una vez

---

#### 13. `favorite_reactions` - Reacciones a Propiedades
**Propósito**: Sistema de likes, dislikes y comentarios en listas compartidas.

```typescript
{
  id: bigserial
  list_id: string               // ID de la lista compartida
  property_id: uuid             // FK → properties.id
  visitor_device_id: string     // ID del dispositivo que reacciona
  visitor_alias: string         // Nombre del visitante
  reaction_type: enum           // 'like' | 'dislike' | 'comment'
  comment_text: text            // Texto del comentario (si reaction_type = 'comment')
  created_at: timestamptz
}
```

**Constraint único**: `(list_id, property_id, visitor_device_id, reaction_type)`
- Un visitante solo puede dar un like por propiedad
- Un visitante solo puede dar un dislike por propiedad
- Un visitante puede dejar múltiples comentarios (sin unique constraint en comments)

**RLS**: Acceso público (lectura/escritura permitida para todos)

---

#### 14. `popular_items` - Items Destacados por País
**Propósito**: Gestionar secciones de "búsquedas populares" o "propiedades destacadas" por país.

```typescript
{
  id: number
  country_tag_id: number        // FK → tags.id (tag de país)
  category: enum                // 'categoria' | 'ciudad' | 'sector' | 'asesor' | 'proyecto' | 'custom'
  title: string                 // Título en español
  subtitle: string              // Subtítulo en español
  url: string                   // URL relativa
  image_url: string             // Imagen destacada

  // Multiidioma
  content_en: JSONB             // { title, subtitle, url }
  content_fr: JSONB

  // Configuración
  active: boolean
  priority: integer             // Orden de visualización
  created_at: timestamptz
}
```

**Uso**: El edge function `content-backend` consulta estos items para mostrar en homepage y footers.

---

#### 15. `curated_listings` - Listados Curados
**Propósito**: Colecciones especiales de propiedades (ej: "Propiedades frente al mar", "Lujo en Punta Cana").

```typescript
{
  id: number
  title: string                 // Título en español
  slug: string                  // Slug para URL
  description: text
  featured_image: string

  // Multiidioma
  content_en: JSONB             // { title, slug, description }
  content_fr: JSONB

  // Tags asociados
  // Se relaciona con tags para filtrar propiedades

  active: boolean
  featured: boolean
  priority: integer
  created_at: timestamptz
}
```

**Relación con propiedades**: Se usa el sistema de tags para filtrar propiedades que pertenecen a un curated listing.

---

## Sistema de Edge Functions

### Arquitectura de Edge Functions

Las Edge Functions están organizadas en 3 sistemas principales:

1. **`content-backend`** - Sistema modular de contenido (artículos, videos, testimonios, asesores, contacto, vender, favoritos)
2. **`backend`** - Sistema de propiedades (búsqueda, single property, carousel)
3. **`v2`** - Sistema de búsqueda avanzada (property-search, projects, similar-properties)

---

### Edge Function Principal: `content-backend`

**Ubicación**: `edge/content-backend/index.ts`

**Propósito**: Router principal que maneja todas las rutas de contenido multiidioma.

#### Rutas Registradas

```typescript
const CONTENT_ROUTES = {
  // ESPAÑOL
  'articulos': { type: 'articles', handler: handleArticles },
  'videos': { type: 'videos', handler: handleVideos },
  'testimonios': { type: 'testimonials', handler: handleTestimonials },
  'asesores': { type: 'advisors', handler: handleAdvisors },
  'contacto': { type: 'contact', handler: handleContact },
  'vender': { type: 'sell', handler: handleSell },
  'rentas-vacacionales': { type: 'vacation-rentals', handler: handleVacationRentals },
  'listados-de': { type: 'curated-listings', handler: handleCuratedListings },
  'favoritos': { type: 'favorites', handler: handleFavorites },

  // INGLÉS
  'articles': { type: 'articles', handler: handleArticles },
  'advisors': { type: 'advisors', handler: handleAdvisors },
  'sell': { type: 'sell', handler: handleSell },
  'favorites': { type: 'favorites', handler: handleFavorites },

  // FRANCÉS
  'temoignages': { type: 'testimonials', handler: handleTestimonials },
  'vendre': { type: 'sell', handler: handleSell },
  'favoris': { type: 'favorites', handler: handleFavorites }
};
```

#### Flujo de una Request

```
1. Request: GET /content-backend/articulos/categoria/bienes-raices
                                ↓
2. parseContentPath() → { language: 'es', contentSegments: ['articulos', 'categoria', 'bienes-raices'] }
                                ↓
3. getContentRouteInfo() → { type: 'articles', handler: handleArticles, remainingSegments: ['categoria', 'bienes-raices'] }
                                ↓
4. detectCountryAndDomain() → { country: { code: 'DOM', ... }, realDomain: 'https://clicinmobiliaria.com' }
                                ↓
5. getBaseContentData() → { globalConfig, hotItems, countryTag }
                                ↓
6. handleArticles(params) → Ejecuta lógica específica de artículos
                                ↓
7. enrichSEO() → Agrega hreflang, structured_data, open_graph, twitter_card
                                ↓
8. Response JSON con toda la data procesada
```

---

### Handler: `sell-handler.ts`

**Propósito**: Genera datos para la página de "Vender mi Propiedad".

**Funcionalidad clave**: Usa el campo `real_data` del país para decidir si mostrar datos reales o ficticios.

```typescript
// Obtener configuración del país
const hideRealData = !baseData.country.real_data;

// Si real_data = false, generar números ficticios
if (hideRealData) {
  stats.topAgents = stats.topAgents.map(agent => ({
    ...agent,
    totalSales: faker.number.int({ min: 30000000, max: 120000000 }),
    propertiesSold: faker.number.int({ min: 15, max: 80 }),
    avgDaysOnMarket: faker.number.int({ min: 20, max: 70 })
  }));
}
```

**Datos que retorna**:
- `stats`: Estadísticas de mercado (ventas, propiedades activas, días promedio)
- `topAgents`: Agentes líderes (con datos reales o ficticios)
- `services`: Servicios premium ofrecidos
- `testimonials`: Testimonios de clientes
- `faqs`: Preguntas frecuentes
- `seo`: Metadatos SEO completos

---

### Handler: `articles-handler.ts`

**Propósito**: Maneja artículos del blog con soporte multiidioma.

**Tipos de páginas que maneja**:
1. **articles-main**: Página principal de artículos
2. **articles-category**: Artículos filtrados por categoría
3. **articles-single**: Artículo individual

**Lógica de detección**:
```typescript
if (contentSegments.length === 0) {
  // Página principal: /articulos
  return handleMainArticles();
}

const firstSegment = contentSegments[0];
const categoryExists = await checkIfCategoryExists(firstSegment);

if (categoryExists && contentSegments.length === 1) {
  // Categoría: /articulos/inversiones
  return handleCategoryArticles(category);
}

// Single article: /articulos/guia-comprar-punta-cana
return handleSingleArticle(slug);
```

**Procesamiento multiidioma**:
```typescript
function processMultilingualContent(item, language, contentField = 'content') {
  if (language === 'en' && item.content_en) {
    const contentEn = JSON.parse(item.content_en);
    return { title: contentEn.title, excerpt: contentEn.excerpt, ... };
  }
  // Fallback a español
  return { title: item.title, excerpt: item.excerpt, ... };
}
```

---

### Handler: `curated-listings-handler.ts`

**Propósito**: Genera listados curados de propiedades (colecciones especiales).

**Flujo**:
```
1. Recibe slug: "propiedades-frente-al-mar"
2. Busca en tabla curated_listings
3. Obtiene tags asociados al curated listing
4. Consulta propiedades que tengan esos tags
5. Retorna propiedades + metadatos del curated listing
```

**Diferencia con búsqueda normal**:
- Curated listings: Colección pre-definida con título/descripción/imagen
- Búsqueda: Filtrado dinámico por tags

---

### Handler: `country-detector.ts`

**Propósito**: Detectar país y dominio desde la request.

**Lógica de detección**:
```typescript
1. Modo testing: ?country=DOM → Forzar país
2. Custom domain: clicinmobiliaria.com → DOM
3. Subdomain: pa.clicinmobiliaria.com → PAN
4. Default: República Dominicana
```

**Consultas a DB**:
```sql
-- Buscar por custom_domain
SELECT id, name, code, country_tag_id, subdomain, custom_domain, currency, timezone, real_data
FROM countries
WHERE custom_domain = 'clicinmobiliaria.com' AND active = true;

-- Buscar por subdomain
SELECT ... FROM countries WHERE subdomain = 'pa' AND active = true;
```

**⚠️ IMPORTANTE**: Este handler **SIEMPRE** debe incluir `real_data` en el SELECT para que funcione correctamente el sistema de datos reales/ficticios.

---

### Handler: `advisors-handler.ts`

**Propósito**: Gestiona páginas de asesores (listado y perfil individual).

**Datos que consulta**:
```sql
SELECT
  id, first_name, last_name, email, phone, whatsapp,
  bio, photo_url, specialties, languages, active, slug,
  total_sales, properties_sold, avg_rating
FROM agents
WHERE active = true
```

**Multiidioma en bio**:
```typescript
// Si el agente tiene content_en/content_fr
if (language === 'en' && agent.content_en) {
  const contentEn = JSON.parse(agent.content_en);
  agent.bio = contentEn.bio;
}
```

---

### Handler: `favorites-handler.ts`

**Propósito**: Sistema de favoritos compartidos entre usuarios.

**Funcionalidades**:
1. Crear lista de favoritos compartida
2. Agregar/quitar propiedades de la lista
3. Compartir lista con otros usuarios
4. Ver reacciones (likes, dislikes, comments) de otros

**Tablas involucradas**:
- `favorite_visitors`: Quién accede a la lista
- `favorite_reactions`: Reacciones a propiedades

**Flujo de uso**:
```
Usuario A crea lista → Obtiene ID: "abc123"
Usuario A comparte link: /favoritos/abc123
Usuario B accede → Se registra en favorite_visitors
Usuario B da like a propiedad → Inserta en favorite_reactions
Usuario A ve reacciones de todos los visitantes
```

---

## Sistema Multiidioma

### Estrategia de Traducción

El sistema soporta **3 niveles de multiidioma**:

#### Nivel 1: URLs y Rutas
```
Español:  /articulos/guia-comprar-casa
Inglés:   /en/articles/buying-house-guide
Francés:  /fr/articles/guide-achat-maison
```

#### Nivel 2: Contenido en Base de Datos

**Estrategia A: Campos separados**
```sql
-- Tabla: content_articles
title VARCHAR          -- "Guía para Comprar"
slug VARCHAR           -- "guia-comprar"
slug_en VARCHAR        -- "buying-guide"
slug_fr VARCHAR        -- "guide-achat"
```

**Estrategia B: JSONB**
```sql
-- Tabla: content_articles
content_en JSONB       -- { "title": "...", "excerpt": "...", "content": "..." }
content_fr JSONB       -- { "title": "...", "excerpt": "...", "content": "..." }
```

#### Nivel 3: Configuración Global (JSONB en `countries.config`)

```json
{
  "translations": {
    "es": {
      "search_placeholder": "Buscar propiedades...",
      "contact_us": "Contáctanos"
    },
    "en": {
      "search_placeholder": "Search properties...",
      "contact_us": "Contact us"
    },
    "fr": {
      "search_placeholder": "Rechercher des propriétés...",
      "contact_us": "Contactez-nous"
    }
  }
}
```

---

### Procesamiento de Contenido Multiidioma

**Función helper universal** (usada en todos los handlers):
```typescript
function processMultilingualContent(item, language, contentField = 'content') {
  let processed = {};

  if (language === 'en' && item[`${contentField}_en`]) {
    const contentEn = typeof item[`${contentField}_en`] === 'string'
      ? JSON.parse(item[`${contentField}_en`])
      : item[`${contentField}_en`];
    processed = { ...contentEn };
  } else if (language === 'fr' && item[`${contentField}_fr`]) {
    const contentFr = typeof item[`${contentField}_fr`] === 'string'
      ? JSON.parse(item[`${contentField}_fr`])
      : item[`${contentField}_fr`];
    processed = { ...contentFr };
  }

  // Retornar con fallback a español
  return {
    title_display: processed.title || item.title || '',
    description_display: processed.description || item.description || '',
    excerpt_display: processed.excerpt || item.excerpt || ''
  };
}
```

---

### Detección de Idioma

**Desde la URL**:
```typescript
function parseContentPath(pathAfterContentBackend) {
  const segments = pathAfterContentBackend.split('/').filter(s => s);

  let language = 'es';  // Default español
  let contentSegments = [...segments];

  if (segments.length > 0) {
    const firstSegment = segments[0];
    if (firstSegment === 'en' || firstSegment === 'fr') {
      language = firstSegment;
      contentSegments = segments.slice(1);  // Remover prefijo de idioma
    }
  }

  return { language, contentSegments };
}
```

**Ejemplos**:
```
/content-backend/articulos        → language: 'es', segments: ['articulos']
/content-backend/en/articles      → language: 'en', segments: ['articles']
/content-backend/fr/temoignages   → language: 'fr', segments: ['temoignages']
```

---

### Hreflang Automático

El sistema genera automáticamente etiquetas hreflang para SEO:

```typescript
function buildHreflangUrls(contentSegments, language, trackingString, globalConfig, domainInfo) {
  const languages = ['es', 'en', 'fr'];
  const routeTranslations = {
    'articulos': { en: 'articles', fr: 'articles' },
    'vender': { en: 'sell', fr: 'vendre' }
  };

  const hreflangObject = {};

  languages.forEach(targetLang => {
    let translatedSegments = contentSegments.map(segment => {
      if (targetLang === 'es') return segment;
      const translation = routeTranslations[segment];
      return translation?.[targetLang] || segment;
    });

    let path = translatedSegments.join('/');
    if (targetLang !== 'es') path = targetLang + '/' + path;

    hreflangObject[targetLang] = baseDomain + '/' + path + trackingString;
  });

  return hreflangObject;
}
```

**Output**:
```json
{
  "es": "https://clicinmobiliaria.com/articulos/guia-comprar",
  "en": "https://clicinmobiliaria.com/en/articles/buying-guide",
  "fr": "https://clicinmobiliaria.com/fr/articles/guide-achat"
}
```

---

## Tipos de Páginas y Layouts

### Estructura de Layouts en Astro

Todos los layouts extienden de `Layout.astro` (layout base).

```
Layout.astro (Base)
  ├─ HomepageLayout.astro
  ├─ PropertyListLayout.astro
  ├─ SinglePropertyLayout.astro
  ├─ ArticlesMainLayout.astro
  ├─ ArticlesSingleLayout.astro
  ├─ ArticlesCategoryLayout.astro
  ├─ VideosMainLayout.astro
  ├─ VideosSingleLayout.astro
  ├─ TestimonialsMainLayout.astro
  ├─ AdvisorsLayout.astro
  ├─ SingleAdvisorLayout.astro
  ├─ ContactLayout.astro
  ├─ SellLayout.astro
  ├─ FavoritesLayout.astro
  ├─ SharedFavoritesLayout.astro
  ├─ CuratedListingsLayout.astro
  ├─ CuratedListingsSingleLayout.astro
  └─ VacationRentalsLayout.astro
```

---

### Layout Base: `Layout.astro`

**Propósito**: Layout raíz que define estructura HTML, estilos globales, y metadatos SEO.

**Props que recibe**:
```typescript
interface Props {
  seo?: {
    title: string
    description: string
    canonical_url: string
    keywords?: string
    hreflang?: { es: string, en: string, fr: string }
    structured_data?: object
    open_graph?: object
    twitter_card?: object
  }
  globalConfig?: object
  language?: 'es' | 'en' | 'fr'
}
```

**Responsabilidades**:
- Inyectar `<title>`, `<meta description>`, canonical
- Generar hreflang links
- Inyectar Schema.org JSON-LD
- Cargar estilos globales (`global.css`, `utilities.css`)
- Renderizar header y footer

---

### SinglePropertyLayout.astro

**Propósito**: Renderizar página de una propiedad individual.

**Data que recibe** (del edge function):
```typescript
{
  property: {
    id, name, description, slug_url,
    price_display: "US$350,000",        // Ya formateado
    operation_display: "Venta",         // Ya traducido
    bedrooms, bathrooms, parking_spots,
    built_area, land_area,
    processed_images: {
      main_image, gallery_images, final_images
    },
    exact_coordinates: { lat, lng },
    property_categories: [...],
    cities: { name, provinces: { name } },
    sectors: { name },
    property_amenities: [...]
  },
  agent: {
    main: { first_name, last_name, photo_url, whatsapp, ... },
    properties_count: 25,
    cocaptors: [...]                    // Co-asesores
  },
  related_content: {
    similar_properties: [...],
    articles: [...],
    videos: [...],
    faqs: [...],
    testimonials: [...]
  },
  project_details: { ... },             // Si is_project = true
  seo: { ... }
}
```

**Componentes que usa**:
- `PropertyHero.astro` - Hero con imágenes en carousel
- `PropertyDetails.astro` - Tabla de características (habitaciones, baños, etc)
- `PropertyDescription.astro` - Descripción HTML completa
- `PropertyAmenities.astro` - Grid de amenidades con iconos
- `PropertyLocation.astro` - Mapa con coordenadas
- `PropertyVideos.astro` - Videos embebidos
- `PropertyFAQs.astro` - Preguntas frecuentes
- `PropertySimilar.astro` - Propiedades similares
- `AgentWidget.astro` - Sidebar con info del asesor
- `CalculatorWidget.astro` - Calculadora de hipoteca

---

### PropertyListLayout.astro

**Propósito**: Listado de propiedades con filtros y paginación.

**Data que recibe**:
```typescript
{
  properties: [...],                    // Array de propiedades
  pagination: {
    page: 1,
    totalPages: 10,
    total: 320,
    hasNext: true,
    hasPrev: false
  },
  filters: {
    tags: [...],                        // Tags activos
    priceRange: { min: 0, max: 1000000 },
    bedrooms: 3,
    operationType: 'sale'
  },
  searchTags: {                         // Tags disponibles para filtros
    tags: {
      provincia: [...],
      ciudad: [...],
      sector: [...],
      categoria: [...]
    },
    currencies: { available: ['USD', 'DOP'], default: 'USD' }
  },
  seo: { ... }
}
```

**Componentes principales**:
- `PropertyList.astro` - Grid de propiedades
  - Prop `maxColumns` (3 o 4) para controlar columnas
- `SearchFilters.astro` - Sidebar con filtros
- `Pagination.astro` - Navegación entre páginas

---

### ArticlesSingleLayout.astro

**Propósito**: Artículo individual del blog.

**Data que recibe**:
```typescript
{
  article: {
    id, title, subtitle, excerpt, content,
    featuredImage, publishedAt, updatedAt,
    readTime: "5 min",
    category: "Inversiones",
    tags: [...],
    author: {
      name, avatar, position, bio, phone, whatsapp, email
    }
  },
  relatedArticles: [...],               // Artículos relacionados
  category: {
    name, slug, description
  },
  seo: { ... }
}
```

**Secciones**:
- Hero con imagen destacada
- Breadcrumbs
- Contenido HTML completo
- Autor del artículo
- Artículos relacionados
- Compartir en redes sociales

---

### ArticlesMainLayout.astro

**Propósito**: Página principal del blog con artículos destacados.

**Data que recibe**:
```typescript
{
  featuredArticles: [...],              // Artículos destacados (featured = true)
  recentArticles: [...],                // Artículos recientes
  categories: [...],                    // Categorías disponibles
  pagination: { ... },
  seo: { ... }
}
```

---

### ArticlesCategoryLayout.astro

**Propósito**: Artículos filtrados por categoría (ej: /articulos/inversiones).

Similar a ArticlesMainLayout pero con artículos de una sola categoría.

---

### SellLayout.astro

**Propósito**: Página de "Vender mi Propiedad" con servicios y asesores.

**Data que recibe**:
```typescript
{
  stats: {
    totalSales: 50000000,               // Total vendido (real o fake)
    activeProperties: 250,
    avgDaysOnMarket: 45,
    satisfactionRate: 98
  },
  topAgents: [...],                     // Agentes líderes (con stats reales o fake)
  services: [                           // Servicios premium
    { icon: 'chart-line', title: 'Análisis de Mercado', description: '...' },
    { icon: 'dollar-sign', title: 'Tasación y Estrategia de Precio', description: '...' }
  ],
  testimonials: [...],                  // Testimonios de vendedores
  faqs: [...],
  marketHighlights: {
    topCities: [...],
    topSectors: [...],
    categories: {...}
  },
  seo: { ... }
}
```

**Secciones importantes**:
- Hero con CTA "Vender mi Propiedad"
- Servicios premium (6 cards con iconos)
- Agentes líderes (con glassmorphism en fondo oscuro)
- Estadísticas de mercado
- Testimonios
- FAQs

**⚠️ Campo `real_data` en acción**:
```typescript
// En sell-handler.ts
const hideRealData = !baseData.country.real_data;

if (hideRealData) {
  stats.topAgents = stats.topAgents.map(agent => ({
    ...agent,
    totalSales: faker.number.int({ min: 30000000, max: 120000000 }),  // Números falsos
    propertiesSold: faker.number.int({ min: 15, max: 80 })
  }));
}
```

---

### CuratedListingsSingleLayout.astro

**Propósito**: Listado curado con sidebar y descripción.

**Diferencia con PropertyListLayout**:
- Tiene sidebar con info del curated listing
- Usa `maxColumns={3}` en PropertyList (3 columnas en vez de 4)
- Muestra descripción y metadata del curated listing

**Data que recibe**:
```typescript
{
  curatedListing: {
    id, title, description, featuredImage, slug
  },
  properties: [...],
  pagination: { ... },
  tags: [...],                          // Tags asociados al curated listing
  seo: { ... }
}
```

---

### ContactLayout.astro

**Propósito**: Formulario de contacto.

**Funcionalidad**:
- Formulario con campos: nombre, teléfono, email, tipo_servicio, mensaje
- Captura automática de tracking (UTM params, fbclid, gclid)
- Envía a edge function `contact-submission`
- Guarda en tabla `contact_submissions`

**Tracking automático**:
```typescript
// JavaScript en el layout
const urlParams = new URLSearchParams(window.location.search);
const trackingData = {
  utm_source: urlParams.get('utm_source'),
  utm_medium: urlParams.get('utm_medium'),
  utm_campaign: urlParams.get('utm_campaign'),
  utm_content: urlParams.get('utm_content'),
  utm_term: urlParams.get('utm_term'),
  ref: urlParams.get('ref'),
  fbclid: urlParams.get('fbclid'),
  gclid: urlParams.get('gclid'),
  referer: document.referrer,
  user_agent: navigator.userAgent
};

// Enviar junto con el formulario
```

---

## Flujo de Datos

### Flujo Completo: Desde Request hasta Render

#### Ejemplo: Usuario visita `/articulos/inversiones/guia-comprar-punta-cana`

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. BROWSER REQUEST                                              │
│    GET https://clicinmobiliaria.com/articulos/inversiones/      │
│        guia-comprar-punta-cana?utm_source=google                │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. ASTRO ROUTING (src/pages/[...slug].astro)                   │
│    Captura: slug = ['articulos', 'inversiones',                 │
│                     'guia-comprar-punta-cana']                  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. FETCH TO EDGE FUNCTION                                       │
│    const response = await fetch(                                │
│      'https://pacewqgypevfgjmdsorz.supabase.co/functions/v1/    │
│       content-backend/articulos/inversiones/                    │
│       guia-comprar-punta-cana?utm_source=google'                │
│    );                                                            │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. EDGE FUNCTION: content-backend/index.ts                      │
│    - parseContentPath() → language: 'es', segments:             │
│      ['articulos', 'inversiones', 'guia-comprar-punta-cana']    │
│    - detectCountryAndDomain() → country: DOM                    │
│    - getContentRouteInfo() → handler: handleArticles           │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. HANDLER: articles-handler.ts                                 │
│    - Detecta: 2 segments → Categoría + Slug                    │
│    - Query 1: Buscar categoría "inversiones"                   │
│    - Query 2: Buscar artículo con slug "guia-comprar-punta-cana"│
│    - Query 3: Artículos relacionados (misma categoría)          │
│    - Query 4: Tags del artículo                                 │
│    - processMultilingualContent() → Traducir si language != es │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. ENRICH SEO: enrichSEO()                                      │
│    - buildHreflangUrls() → { es: '...', en: '...', fr: '...' } │
│    - generateArticlesSchema() → Schema.org Article              │
│    - generateOpenGraph() → OG tags                              │
│    - generateTwitterCard() → Twitter card                       │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. RESPONSE JSON                                                │
│    {                                                             │
│      pageType: 'articles-single',                               │
│      article: { title, content, author, ... },                  │
│      relatedArticles: [...],                                    │
│      category: { name: 'Inversiones', ... },                    │
│      seo: {                                                      │
│        title: 'Guía para Comprar en Punta Cana | CLIC',        │
│        hreflang: { es: '...', en: '...', fr: '...' },           │
│        structured_data: { @type: 'Article', ... }               │
│      },                                                          │
│      globalConfig: { contact, social, features, ... },          │
│      language: 'es',                                            │
│      trackingString: '?utm_source=google'                       │
│    }                                                             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. ASTRO COMPONENT: [...slug].astro                             │
│    - Detecta pageType: 'articles-single'                        │
│    - Selecciona layout: ArticlesSingleLayout                    │
│    - Pasa data como prop                                        │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 9. RENDER: ArticlesSingleLayout.astro                           │
│    - Extrae article, seo, relatedArticles de props              │
│    - Renderiza hero con featuredImage                           │
│    - Renderiza content HTML                                     │
│    - Renderiza sidebar con autor y artículos relacionados       │
│    - Layout.astro inyecta SEO (hreflang, Schema.org, etc)      │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 10. HTML FINAL AL BROWSER                                       │
│     <html>                                                       │
│       <head>                                                     │
│         <title>Guía para Comprar en Punta Cana | CLIC</title>  │
│         <link rel="alternate" hreflang="es" href="..." />       │
│         <link rel="alternate" hreflang="en" href="..." />       │
│         <script type="application/ld+json">                     │
│           { "@type": "Article", ... }                           │
│         </script>                                                │
│       </head>                                                    │
│       <body>...</body>                                          │
│     </html>                                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

### Flujo de Búsqueda de Propiedades

```
┌─────────────────────────────────────────────────────────────────┐
│ Usuario entra a: /comprar/punta-cana/apartamentos              │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Edge Function: backend/index.ts                                 │
│ - Parsea: ['comprar', 'punta-cana', 'apartamentos']            │
│ - Detecta: Búsqueda por tags                                   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ search-tags-handler.ts                                          │
│ - Convierte slugs a tag IDs:                                   │
│   "punta-cana" → tag_id: 45 (ciudad)                           │
│   "apartamentos" → tag_id: 12 (categoria)                      │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ property-search.ts: searchPropertiesByTags()                    │
│ - Inyecta automáticamente country_tag_id (DOM)                 │
│ - Query:                                                        │
│   SELECT p.* FROM properties p                                  │
│   JOIN property_tags pt ON pt.property_id = p.id               │
│   WHERE pt.tag_id IN (45, 12, [country_tag])                   │
│     AND p.availability = 1                                      │
│     AND p.property_status = 'Publicada'                         │
│   ORDER BY p.created_at DESC                                    │
│   LIMIT 32 OFFSET 0                                             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Retorna:                                                        │
│ {                                                                │
│   properties: [...],  // 32 propiedades                        │
│   pagination: { page: 1, totalPages: 8, total: 245 },          │
│   tags: [                                                       │
│     { id: 45, slug: 'punta-cana', category: 'ciudad' },        │
│     { id: 12, slug: 'apartamentos', category: 'categoria' }    │
│   ]                                                              │
│ }                                                                │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ PropertyListLayout.astro renderiza:                             │
│ - Breadcrumbs: Inicio > Comprar > Punta Cana > Apartamentos    │
│ - Filtros (sidebar): Precio, Habitaciones, Baños               │
│ - Grid de propiedades (4 columnas)                             │
│ - Paginación                                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Sistema de Tags y Búsqueda

### Arquitectura de Tags

El sistema de tags es el **núcleo** de la búsqueda y categorización.

#### Jerarquía Completa

```
Nivel 1: País (pais)
  ├─ República Dominicana (DOM)
  ├─ Panamá (PAN)
  └─ México (MEX)

Nivel 2: Provincia (provincia)
  ├─ La Altagracia
  ├─ Distrito Nacional
  └─ Santiago

Nivel 3: Ciudad (ciudad)
  ├─ Punta Cana
  ├─ Santo Domingo
  └─ Santiago

Nivel 4: Sector (sector)
  ├─ Bávaro
  ├─ Naco
  └─ Los Jardines

Paralelo: Categorías de Propiedad (categoria)
  ├─ Apartamento
  ├─ Villa
  ├─ Casa
  ├─ Penthouse
  └─ Proyecto

Paralelo: Características (caracteristica)
  ├─ Piscina
  ├─ Vista al mar
  ├─ Cerca de la playa
  └─ Amueblado
```

---

### Búsqueda por Tags: Inyección Automática de País

**Problema**: Los usuarios buscan por ciudad/sector, pero necesitamos filtrar por país automáticamente.

**Solución**: Inyección automática del `country_tag_id`.

```typescript
// property-search.ts
async searchPropertiesByTags(tagIds, countryTagId, page = 1, limit = 32) {
  // ✅ INYECCIÓN AUTOMÁTICA DEL TAG DE PAÍS
  let finalTagIds = [...tagIds];
  let countryInjected = false;

  // Verificar si ya incluye el tag de país
  const hasCountryTag = tagIds.some(id => {
    // Verificar en DB si es tag de categoría "pais"
  });

  if (!hasCountryTag && countryTagId) {
    finalTagIds.push(countryTagId);  // Agregar país automáticamente
    countryInjected = true;
  }

  // Query con todos los tags (incluido país)
  const query = `
    SELECT DISTINCT p.*
    FROM properties p
    JOIN property_tags pt ON pt.property_id = p.id
    WHERE pt.tag_id IN (${finalTagIds.join(',')})
      AND p.availability = 1
      AND p.property_status = 'Publicada'
  `;
}
```

**Resultado**: Usuario busca "Punta Cana + Apartamentos" → Sistema agrega automáticamente "República Dominicana".

---

### URLs Amigables con Tags

**Formato**: `/{operacion}/{ubicacion}/{categoria}`

**Ejemplos**:
```
/comprar/punta-cana/apartamentos
/alquilar/santo-domingo/casas
/venta/bavaro/villas-de-lujo
```

**Procesamiento**:
```typescript
// search-tags-handler.ts
async function validateTags(slugs, countryTag, language) {
  const { data: tags } = await supabase
    .from('tags')
    .select('id, slug, category, display_name')
    .in('slug', slugs);

  // Convertir slugs a tag IDs
  const tagIds = tags.map(t => t.id);

  return { validTags: tags, tagIds };
}
```

---

### Search Tags Handler

**Propósito**: Generar filtros disponibles para la búsqueda.

**Retorna**:
```typescript
{
  tags: {
    provincia: [
      { id: 1, slug: 'la-altagracia', display_name: 'La Altagracia' },
      { id: 2, slug: 'distrito-nacional', display_name: 'Distrito Nacional' }
    ],
    ciudad: [
      { id: 10, slug: 'punta-cana', display_name: 'Punta Cana' },
      { id: 11, slug: 'santo-domingo', display_name: 'Santo Domingo' }
    ],
    sector: [...],
    categoria: [
      { id: 20, slug: 'apartamento', display_name: 'Apartamento' },
      { id: 21, slug: 'villa', display_name: 'Villa' }
    ]
  },
  currencies: {
    available: ['USD', 'DOP'],
    default: 'USD',
    rates: { USD: 1, DOP: 58.5 }
  },
  priceRanges: {
    sale: {
      USD: [
        { min: 0, max: 100000, label: 'Menos de US$100K' },
        { min: 100000, max: 250000, label: 'US$100K - US$250K' }
      ],
      DOP: [...]
    },
    rental: {...}
  }
}
```

**Uso**: El frontend usa este objeto para renderizar filtros en sidebar.

---

## Guía para Desarrollar un CRM

Si quieres crear un CRM para gestionar este sistema inmobiliario, aquí está todo lo que necesitas saber:

---

### 1. Autenticación y Roles

**Tabla sugerida**: `users` (ya existe en Supabase Auth)

```sql
-- Extender auth.users con perfil
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  role VARCHAR CHECK (role IN ('admin', 'agent', 'manager', 'viewer')),
  agent_id INTEGER REFERENCES agents(id),  -- Vincular con tabla agents
  permissions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Roles sugeridos**:
- `admin`: Acceso completo (gestión de países, configuraciones, usuarios)
- `manager`: Gestión de propiedades, agentes, contenido
- `agent`: Gestión de sus propias propiedades y leads
- `viewer`: Solo lectura (para clientes o inversionistas)

---

### 2. Dashboard Principal

**Métricas clave a mostrar**:

```sql
-- Total de propiedades activas
SELECT COUNT(*) FROM properties
WHERE availability = 1 AND property_status = 'Publicada';

-- Propiedades por estado
SELECT property_status, COUNT(*)
FROM properties
GROUP BY property_status;

-- Contactos recibidos (últimos 30 días)
SELECT COUNT(*) FROM contact_submissions
WHERE created_at >= NOW() - INTERVAL '30 days';

-- Contactos por estado
SELECT status, COUNT(*)
FROM contact_submissions
GROUP BY status;

-- Vistas de propiedades (top 10)
SELECT id, name, views
FROM properties
ORDER BY views DESC
LIMIT 10;

-- Propiedades por agente
SELECT
  a.first_name || ' ' || a.last_name AS agent_name,
  COUNT(p.id) AS total_properties,
  SUM(CASE WHEN p.property_status = 'Publicada' THEN 1 ELSE 0 END) AS active
FROM agents a
LEFT JOIN properties p ON p.agent_id = a.id
GROUP BY a.id, agent_name;
```

---

### 3. Módulo: Gestión de Propiedades

**Funcionalidades**:
- ✅ Crear/Editar/Eliminar propiedades
- ✅ Cambiar estado (Publicada, Vendida, Retirada, Borrador)
- ✅ Asignar agente principal
- ✅ Gestionar galería de imágenes
- ✅ Asignar tags (ubicación, categoría, características)
- ✅ Configurar múltiples precios (venta, alquiler, temporal, amueblado)
- ✅ Ver historial de cambios (auditoría)
- ✅ Duplicar propiedad

**Queries importantes**:

```sql
-- Crear propiedad
INSERT INTO properties (
  code, name, description, slug_url,
  sale_price, sale_currency,
  bedrooms, bathrooms, built_area,
  agent_id, property_status, availability
) VALUES (
  'CLIC-2025-001', 'Villa en Bávaro', 'Descripción...', '/villa-bavaro',
  350000, 'USD',
  3, 2.5, 180,
  5, 'Publicada', 1
) RETURNING id;

-- Asignar tags a propiedad
INSERT INTO property_tags (property_id, tag_id)
VALUES
  (123, 45),  -- Punta Cana (ciudad)
  (123, 12),  -- Villa (categoria)
  (123, 67);  -- Piscina (caracteristica)

-- Actualizar imágenes
UPDATE properties
SET main_image_url = 'https://...',
    gallery_images_url = 'https://...,https://...,https://...'
WHERE id = 123;
```

---

### 4. Módulo: Gestión de Contactos (Leads)

**Funcionalidades**:
- ✅ Ver todos los contactos (tabla con filtros)
- ✅ Filtrar por estado, tipo_servicio, fecha, utm_source
- ✅ Cambiar estado (pendiente → contactado → en_proceso → completado)
- ✅ Asignar contacto a un agente
- ✅ Ver tracking completo (UTM params, referer, IP)
- ✅ Exportar a CSV/Excel
- ✅ Integración con WhatsApp (link directo)

**Query para dashboard de leads**:

```sql
-- Contactos pendientes (últimos 7 días)
SELECT
  id, nombre, telefono, email, tipo_servicio,
  utm_source, utm_campaign,
  created_at
FROM contact_submissions
WHERE status = 'pendiente'
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- Estadísticas de conversión por fuente
SELECT
  utm_source,
  COUNT(*) AS total_leads,
  SUM(CASE WHEN status = 'completado' THEN 1 ELSE 0 END) AS converted,
  ROUND(
    SUM(CASE WHEN status = 'completado' THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) * 100,
    2
  ) AS conversion_rate
FROM contact_submissions
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY utm_source
ORDER BY total_leads DESC;
```

---

### 5. Módulo: Gestión de Agentes

**Funcionalidades**:
- ✅ Crear/Editar/Desactivar agentes
- ✅ Ver propiedades asignadas a cada agente
- ✅ Ver estadísticas de ventas
- ✅ Gestionar bio multiidioma (content_en, content_fr)
- ✅ Subir foto de perfil
- ✅ Asignar especialidades y idiomas

**Estadísticas de agente**:

```sql
-- Dashboard de un agente
SELECT
  a.id,
  a.first_name || ' ' || a.last_name AS name,
  a.total_sales,
  a.properties_sold,
  COUNT(p.id) AS active_properties,
  SUM(CASE WHEN p.property_status = 'Vendida' THEN 1 ELSE 0 END) AS sold_properties,
  AVG(p.sale_price) AS avg_price
FROM agents a
LEFT JOIN properties p ON p.agent_id = a.id
WHERE a.id = 5
GROUP BY a.id;
```

**⚠️ Control de datos reales/ficticios**:

```sql
-- Al mostrar estadísticas de ventas, verificar real_data
SELECT c.real_data
FROM countries c
WHERE c.code = 'DOM';

-- Si real_data = false, generar números ficticios en el backend
```

---

### 6. Módulo: Gestión de Contenido (CMS)

**Artículos**:
- ✅ Crear/Editar/Publicar/Archivar artículos
- ✅ Editor WYSIWYG (TinyMCE, Tiptap, etc.)
- ✅ Gestionar traducciones (content_en, content_fr)
- ✅ Asignar categoría y tags
- ✅ SEO: Meta title, meta description, slug personalizado
- ✅ Programar publicación (published_at futuro)
- ✅ Previsualizar antes de publicar

**Videos**:
- Similar a artículos
- Campo adicional: `video_url` (YouTube, Vimeo)
- Auto-detectar duración y thumbnail

**Testimonios**:
- Formulario simple con rating (1-5 estrellas)
- Vincular con propiedad (opcional)
- Traducción de testimonio

---

### 7. Módulo: Configuración Multi-País

**Funcionalidades**:
- ✅ Gestionar países activos
- ✅ Editar configuración JSONB (contact, social, legal, features)
- ✅ Configurar dominios y subdominios
- ✅ **Toggle `real_data`** (IMPORTANTE para ocultar/mostrar datos reales)
- ✅ Gestionar traducciones globales
- ✅ Configurar moneda y timezone

**Interface sugerida para editar config JSONB**:

```typescript
// CRM Frontend - Form de configuración
interface CountryConfigForm {
  contact: {
    phone: string;
    email: string;
    address: string;
  };
  social: {
    company: {
      facebook: string;
      instagram: string;
      youtube: string;
    };
  };
  legal: {
    company_name: string;
    company_full_name: string;
    logo_url: string;
  };
  // ... resto de campos
}

// Guardar en DB
UPDATE countries
SET config = '{ "contact": { ... }, "social": { ... } }'::jsonb
WHERE code = 'DOM';
```

---

### 8. Módulo: Gestión de Tags

**Funcionalidades**:
- ✅ Crear/Editar/Eliminar tags
- ✅ Vista jerárquica (árbol de tags)
- ✅ Asignar parent_id (para jerarquía)
- ✅ Gestionar traducciones (slug_en, slug_fr, display_name_en, display_name_fr)
- ✅ Activar/Desactivar tags
- ✅ Reordenar (priority)

**Query para árbol de tags**:

```sql
-- Tags jerárquicos (país → provincia → ciudad → sector)
WITH RECURSIVE tag_tree AS (
  -- Nivel 1: Países
  SELECT
    id, slug, display_name, category, parent_id,
    1 AS level,
    ARRAY[id] AS path
  FROM tags
  WHERE category = 'pais' AND active = true

  UNION ALL

  -- Niveles hijos
  SELECT
    t.id, t.slug, t.display_name, t.category, t.parent_id,
    tt.level + 1,
    tt.path || t.id
  FROM tags t
  JOIN tag_tree tt ON t.parent_id = tt.id
  WHERE t.active = true
)
SELECT * FROM tag_tree
ORDER BY path;
```

---

### 9. Módulo: Reportes y Analíticas

**Reportes sugeridos**:

**A. Reporte de Conversión de Leads**:
```sql
SELECT
  DATE_TRUNC('month', created_at) AS mes,
  tipo_servicio,
  COUNT(*) AS total_leads,
  SUM(CASE WHEN status = 'completado' THEN 1 ELSE 0 END) AS completados,
  ROUND(
    SUM(CASE WHEN status = 'completado' THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) * 100,
    2
  ) AS tasa_conversion
FROM contact_submissions
WHERE created_at >= NOW() - INTERVAL '6 months'
GROUP BY mes, tipo_servicio
ORDER BY mes DESC;
```

**B. Reporte de ROI por Canal de Marketing**:
```sql
SELECT
  utm_source,
  utm_campaign,
  COUNT(*) AS total_leads,
  SUM(CASE WHEN status = 'completado' THEN 1 ELSE 0 END) AS ventas,
  -- Puedes agregar campo 'commission' o 'revenue' en contact_submissions
  SUM(tracking_data->>'revenue')::DECIMAL AS revenue_total
FROM contact_submissions
WHERE utm_source IS NOT NULL
GROUP BY utm_source, utm_campaign
ORDER BY revenue_total DESC NULLS LAST;
```

**C. Reporte de Propiedades Más Vistas**:
```sql
SELECT
  p.id,
  p.name,
  p.slug_url,
  p.views,
  p.property_status,
  a.first_name || ' ' || a.last_name AS agent_name
FROM properties p
LEFT JOIN agents a ON a.id = p.agent_id
ORDER BY p.views DESC
LIMIT 50;
```

**D. Tiempo Promedio en Mercado (Days on Market)**:
```sql
SELECT
  AVG(
    EXTRACT(DAY FROM (
      CASE
        WHEN property_status = 'Vendida' THEN updated_at
        ELSE NOW()
      END - created_at
    ))
  ) AS avg_days_on_market
FROM properties
WHERE availability = 1;
```

---

### 10. Integraciones Recomendadas para el CRM

**WhatsApp Business API**:
- Enviar mensajes automáticos a leads
- Integración con `contact_submissions.telefono`

**Email Marketing (Mailchimp, SendGrid)**:
- Sincronizar contactos automáticamente
- Campañas segmentadas por `tipo_servicio`, `utm_source`

**Google Analytics / Facebook Pixel**:
- Tracking de conversiones
- Sincronizar con `utm_*` y `fbclid`/`gclid`

**Zapier / Make.com**:
- Automatizar workflows (ej: Nuevo contacto → Notificar en Slack → Asignar a agente)

**Supabase Realtime**:
- Notificaciones en tiempo real cuando llega nuevo contacto
- Dashboard live con WebSockets

---

### 11. Permisos y RLS (Row Level Security)

**Ejemplo de política para agentes**:

```sql
-- Los agentes solo pueden ver/editar sus propias propiedades
CREATE POLICY "Agents can view their own properties"
ON properties
FOR SELECT
TO authenticated
USING (
  agent_id = (
    SELECT agent_id FROM user_profiles
    WHERE id = auth.uid()
  )
);

-- Los managers pueden ver todas las propiedades
CREATE POLICY "Managers can view all properties"
ON properties
FOR SELECT
TO authenticated
USING (
  (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'manager'
  OR
  (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
);
```

---

## Resumen de Campos Críticos

### Campo `real_data` en `countries`

**¿Qué hace?**
- `true`: Mostrar datos reales (ventas reales, estadísticas reales de agentes)
- `false`: Mostrar datos ficticios (números generados con Faker.js)

**¿Dónde se usa?**
- `sell-handler.ts`: Estadísticas de agentes líderes
- `advisors-handler.ts`: Total de ventas de cada asesor
- Homepage: Estadísticas de mercado

**¿Por qué existe?**
- Privacidad: No revelar números reales de ventas si el país no lo permite
- Testing: Usar datos ficticios en staging sin afectar producción
- Marketing: Mostrar números "aspiracionales" en países nuevos

**⚠️ IMPORTANTE**: Siempre incluir `real_data` en los SELECT de la tabla `countries`.

```sql
-- ✅ CORRECTO
SELECT id, name, code, real_data FROM countries WHERE code = 'DOM';

-- ❌ INCORRECTO (faltaría real_data)
SELECT id, name, code FROM countries WHERE code = 'DOM';
```

---

### Campo `slug_url` en `properties`

**¿Qué hace?**
- URL amigable para SEO (ej: `/mystic-bay-a-solo-2min-de-playa-gorda`)

**Variantes de búsqueda** (implementadas en `property-search.ts`):
```typescript
const searchVariants = [
  searchPath,                           // "mystic-bay-..."
  `/${searchPath}`,                     // "/mystic-bay-..."
  `/property/${searchPath}`,            // "/property/mystic-bay-..."
  `/properties/${searchPath}`,          // "/properties/mystic-bay-..."
  `${searchPath}/`                      // "mystic-bay-.../"
];
```

---

### Campos de precio en `properties`

**Sistema multi-precio**:
- `sale_price` / `sale_currency`: Venta
- `rental_price` / `rental_currency`: Alquiler mensual
- `temp_rental_price` / `temp_rental_currency`: Alquiler temporal (diario/semanal)
- `furnished_rental_price` / `furnished_rental_currency`: Alquiler amueblado
- `furnished_sale_price` / `furnished_sale_currency`: Venta amueblada

**Prioridad de visualización** (definida en `calculatePriceAndOperation()`):
```
1. sale_price (Venta)
2. furnished_sale_price (Venta Amueblada)
3. rental_price (Alquiler)
4. furnished_rental_price (Alquiler Amueblado)
5. temp_rental_price (Temporal)
6. "Consultar precio" (si no hay ninguno)
```

---

### Campo `property_status` en `properties`

**Valores posibles**:
- `Publicada`: Visible en búsquedas
- `Vendida`: Vendida (se puede mostrar como "Vendida" en single page)
- `Retirada`: Propiedad retirada del mercado
- `Borrador`: No visible, en edición

**Filtro en búsquedas**:
```sql
WHERE property_status = 'Publicada' AND availability = 1
```

---

### Campo `tracking_data` (JSONB) en `contact_submissions`

**Estructura sugerida**:
```json
{
  "page_url": "https://clicinmobiliaria.com/comprar/punta-cana/apartamentos",
  "user_agent": "Mozilla/5.0...",
  "ip_address": "192.168.1.1",
  "referer": "https://google.com",
  "utm_params": {
    "utm_source": "google",
    "utm_medium": "cpc",
    "utm_campaign": "verano-2024",
    "utm_content": "ad-variant-a",
    "utm_term": "apartamentos punta cana"
  },
  "click_ids": {
    "fbclid": "...",
    "gclid": "..."
  },
  "device": {
    "type": "mobile",
    "browser": "Chrome",
    "os": "Android"
  }
}
```

**Búsqueda en JSONB**:
```sql
-- Buscar leads de campaña específica
SELECT * FROM contact_submissions
WHERE tracking_data->'utm_params'->>'utm_campaign' = 'verano-2024';

-- Buscar leads de Facebook
SELECT * FROM contact_submissions
WHERE tracking_data->'click_ids'->>'fbclid' IS NOT NULL;
```

---

## Conclusión

Este documento cubre:
- ✅ Todas las tablas principales y sus relaciones
- ✅ Sistema completo de Edge Functions
- ✅ Flujo de datos desde request hasta render
- ✅ Sistema multiidioma (3 idiomas)
- ✅ Sistema de tags jerárquico
- ✅ Búsqueda avanzada con inyección automática de país
- ✅ Guía completa para construir un CRM
- ✅ Queries SQL útiles para reportes
- ✅ Explicación del campo `real_data` y su importancia

**Próximos pasos para desarrollar CRM**:
1. Elegir stack (Next.js + Supabase, o React + Supabase)
2. Implementar autenticación (Supabase Auth)
3. Crear módulos en este orden:
   - Dashboard (métricas básicas)
   - Gestión de propiedades
   - Gestión de contactos/leads
   - Gestión de agentes
   - Configuración de países
   - CMS (artículos, videos)
   - Reportes y analíticas

**Contacto para dudas**:
- Equipo CLIC Inmobiliaria
- Email: info@clicinmobiliaria.com
- WhatsApp: +1 809 487 2542

---

*Documento generado con Claude Code*
*Última actualización: 2025-10-25*
