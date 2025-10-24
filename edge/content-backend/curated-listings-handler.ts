import { getUIText } from './ui-texts.ts';
// ============================================================================
// CURATED LISTINGS HANDLER - LISTADOS CURADOS
// ============================================================================
async function handleCuratedListingsMain(params) {
  const { supabase, language, trackingString } = params;
  console.log('📋 Handling curated listings main page');
  // Obtener listados curados activos
  const { data: curatedCollections } = await supabase.from('curated_collections').select(`
      id, title, description, slug, slug_en, slug_fr, featured_image, 
      property_count, collection_type, featured, sort_order, status,
      content_en, content_fr, created_at, updated_at
    `).eq('status', 'published').eq('active', true).order('featured', {
    ascending: false
  }).order('sort_order', {
    ascending: true
  }).limit(20);
  // Procesar colecciones
  const processedCollections = (curatedCollections || []).map((collection)=>processCuratedCollection(collection, language, trackingString));
  // Separar colecciones destacadas
  const featuredCollections = processedCollections.filter((c)=>c.featured).slice(0, 6);
  const regularCollections = processedCollections.filter((c)=>!c.featured);
  // Obtener categorías de colecciones
  const collectionTypes = [
    ...new Set(curatedCollections?.map((c)=>c.collection_type).filter(Boolean) || [])
  ];
  const categories = collectionTypes.map((type)=>({
      name: formatCollectionTypeName(type, language),
      slug: type,
      count: (curatedCollections || []).filter((c)=>c.collection_type === type).length,
      url: buildCuratedCategoryUrl(type, language, trackingString)
    }));
  const seo = {
    title: language === 'en' ? 'Curated Property Listings | CLIC Inmobiliaria' : language === 'fr' ? 'Listes de Propriétés Sélectionnées | CLIC Inmobiliaria' : 'Listados de Propiedades Curados | CLIC Inmobiliaria',
    description: language === 'en' ? 'Discover our expertly curated property collections. Luxury homes, investment opportunities, beachfront properties and more in Dominican Republic.' : language === 'fr' ? 'Découvrez nos collections de propriétés soigneusement sélectionnées. Maisons de luxe, opportunités d\'investissement, propriétés en bord de mer et plus en République Dominicaine.' : 'Descubre nuestras colecciones de propiedades cuidadosamente seleccionadas. Casas de lujo, oportunidades de inversión, propiedades frente al mar y más en República Dominicana.',
    h1: language === 'en' ? 'Curated Property Collections' : language === 'fr' ? 'Collections de Propriétés Sélectionnées' : 'Colecciones de Propiedades Curadas',
    h2: language === 'en' ? 'Expertly selected properties for discerning buyers' : language === 'fr' ? 'Propriétés expertement sélectionnées pour acheteurs exigeants' : 'Propiedades expertamente seleccionadas para compradores exigentes',
    canonical_url: language === 'es' ? '/listados-de' : `/${language}/listings-of`,
    breadcrumbs: [
      {
        name: getUIText('HOME', language),
        url: language === 'es' ? '/' : `/${language}/`
      },
      {
        name: language === 'en' ? 'Curated Listings' : language === 'fr' ? 'Listes Sélectionnées' : 'Listados Curados',
        url: language === 'es' ? '/listados-de' : `/${language}/listings-of`
      }
    ]
  };
  return {
    type: 'curated-listings-main',
    pageType: 'curated-listings-main',
    seo,
    collections: processedCollections,
    featuredCollections,
    regularCollections,
    categories,
    stats: {
      totalCollections: processedCollections.length,
      totalProperties: (curatedCollections || []).reduce((sum, c)=>sum + (c.property_count || 0), 0),
      averageCollectionSize: Math.round((curatedCollections || []).reduce((sum, c)=>sum + (c.property_count || 0), 0) / (processedCollections.length || 1))
    }
  };
}
async function handleCuratedListingsSingle(params) {
  const { supabase, language, contentSegments, trackingString, queryParams } = params;
  if (contentSegments.length === 0) {
    throw new Error('Collection slug required');
  }
  const collectionSlug = contentSegments[0];
  console.log('🏷️ Handling single curated collection:', collectionSlug);
  // Buscar la colección
  const slugField = language === 'en' ? 'slug_en' : language === 'fr' ? 'slug_fr' : 'slug';
  const { data: collection } = await supabase.from('curated_collections').select(`
      id, title, description, slug, slug_en, slug_fr, featured_image, 
      property_count, collection_type, featured, content_en, content_fr,
      seo_title, seo_description, created_at, updated_at,
      curator_notes, investment_highlights, area_insights
    `).eq(slugField, collectionSlug).eq('status', 'published').eq('active', true).single();
  if (!collection) {
    throw new Error(`Curated collection "${collectionSlug}" not found`);
  }
  // Obtener propiedades de la colección
  const page = parseInt(queryParams.get('page') || '1');
  const limit = 12;
  const offset = (page - 1) * limit;
  const { data: collectionProperties, count } = await supabase.from('curated_collection_properties').select(`
      sort_order, featured_in_collection, curator_notes,
      properties!inner(
        id, name, description, main_image_url, sale_price, rental_price,
        bedrooms, bathrooms, area, slug_url, featured, status, operation,
        property_type, city, sector, currency, amenities, gallery_images,
        users:users!properties_agent_id_fkey(first_name, last_name, profile_photo_url, slug, position)
      )
    `, {
    count: 'exact'
  }).eq('collection_id', collection.id).eq('properties.status', 'active').order('featured_in_collection', {
    ascending: false
  }).order('sort_order', {
    ascending: true
  }).range(offset, offset + limit - 1);
  // Procesar colección con contenido multiidioma
  const processedCollection = processCuratedCollection(collection, language, trackingString);
  // Procesar propiedades
  const processedProperties = (collectionProperties || []).map((item)=>({
      ...processCollectionProperty(item.properties, language, trackingString),
      curatorNotes: item.curator_notes,
      featuredInCollection: item.featured_in_collection,
      sortOrder: item.sort_order
    }));
  // Obtener colecciones relacionadas
  const { data: relatedCollections } = await supabase.from('curated_collections').select(`
      id, title, description, slug, slug_en, slug_fr, featured_image, 
      property_count, collection_type, content_en, content_fr
    `).eq('collection_type', collection.collection_type).neq('id', collection.id).eq('status', 'published').eq('active', true).order('featured', {
    ascending: false
  }).limit(3);
  const processedRelated = (relatedCollections || []).map((c)=>processCuratedCollection(c, language, trackingString));
  // Construir paginación
  const totalPages = Math.ceil((count || 0) / limit);
  const pagination = {
    page,
    limit,
    total: count || 0,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
  const seo = {
    title: processedCollection.seoTitle || `${processedCollection.title} | CLIC Inmobiliaria`,
    description: processedCollection.seoDescription || processedCollection.description,
    h1: processedCollection.title,
    h2: `${count || 0} ${language === 'en' ? 'selected properties' : language === 'fr' ? 'propriétés sélectionnées' : 'propiedades seleccionadas'}`,
    canonical_url: processedCollection.url.replace(trackingString, ''),
    breadcrumbs: [
      {
        name: getUIText('HOME', language),
        url: language === 'es' ? '/' : `/${language}/`
      },
      {
        name: language === 'en' ? 'Curated Listings' : language === 'fr' ? 'Listes Sélectionnées' : 'Listados Curados',
        url: language === 'es' ? '/listados-de' : `/${language}/listings-of`
      },
      {
        name: processedCollection.title,
        url: processedCollection.url
      }
    ]
  };
  return {
    type: 'curated-listings-single',
    pageType: 'curated-listings-single',
    seo,
    collection: processedCollection,
    properties: processedProperties,
    relatedCollections: processedRelated,
    pagination,
    stats: {
      totalProperties: count || 0,
      averagePrice: calculateAveragePrice(processedProperties),
      priceRange: calculatePriceRange(processedProperties),
      propertyTypes: getPropertyTypeBreakdown(processedProperties, language)
    }
  };
}
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function processCuratedCollection(collection, language, trackingString) {
  // Procesar contenido multiidioma
  let processedTitle = collection.title;
  let processedDescription = collection.description;
  let processedSeoTitle = collection.seo_title;
  let processedSeoDescription = collection.seo_description;
  if (language === 'en' && collection.content_en) {
    try {
      const contentEn = typeof collection.content_en === 'string' ? JSON.parse(collection.content_en) : collection.content_en;
      if (contentEn.title) processedTitle = contentEn.title;
      if (contentEn.description) processedDescription = contentEn.description;
      if (contentEn.seo_title) processedSeoTitle = contentEn.seo_title;
      if (contentEn.seo_description) processedSeoDescription = contentEn.seo_description;
    } catch (e) {
      console.warn('Failed to parse EN content for collection:', e);
    }
  } else if (language === 'fr' && collection.content_fr) {
    try {
      const contentFr = typeof collection.content_fr === 'string' ? JSON.parse(collection.content_fr) : collection.content_fr;
      if (contentFr.title) processedTitle = contentFr.title;
      if (contentFr.description) processedDescription = contentFr.description;
      if (contentFr.seo_title) processedSeoTitle = contentFr.seo_title;
      if (contentFr.seo_description) processedSeoDescription = contentFr.seo_description;
    } catch (e) {
      console.warn('Failed to parse FR content for collection:', e);
    }
  }
  // Construir URL
  const slug = language === 'en' && collection.slug_en ? collection.slug_en : language === 'fr' && collection.slug_fr ? collection.slug_fr : collection.slug;
  const basePath = language === 'es' ? 'listados-de' : language === 'en' ? 'listings-of' : 'listes-de';
  let url = `${basePath}/${slug}`;
  if (language === 'en') url = `en/${url}`;
  if (language === 'fr') url = `fr/${url}`;
  return {
    id: collection.id,
    title: processedTitle,
    description: processedDescription,
    seoTitle: processedSeoTitle,
    seoDescription: processedSeoDescription,
    featuredImage: collection.featured_image,
    propertyCount: collection.property_count || 0,
    collectionType: collection.collection_type,
    featured: collection.featured || false,
    url: `/${url}${trackingString}`,
    slug,
    slug_en: collection.slug_en,
    slug_fr: collection.slug_fr,
    createdAt: collection.created_at,
    updatedAt: collection.updated_at,
    curatorNotes: collection.curator_notes,
    investmentHighlights: collection.investment_highlights,
    areaInsights: collection.area_insights
  };
}
function processCollectionProperty(property, language, trackingString) {
  let url = property.slug_url;
  if (language === 'en') url = `en/${url}`;
  if (language === 'fr') url = `fr/${url}`;
  const agent = property.users ? {
    name: `${property.users.first_name || ''} ${property.users.last_name || ''}`.trim() || getUIText('TEAM_CLIC', language),
    avatar: property.users.profile_photo_url || '/images/team/clic-experts.jpg',
    slug: property.users.slug,
    position: property.users.position || getUIText('REAL_ESTATE_ADVISOR', language)
  } : null;
  return {
    id: property.id,
    name: property.name,
    description: property.description,
    mainImage: property.main_image_url,
    gallery: property.gallery_images || [],
    salePrice: property.sale_price,
    rentalPrice: property.rental_price,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    area: property.area,
    propertyType: property.property_type,
    operation: property.operation,
    city: property.city,
    sector: property.sector,
    currency: property.currency,
    amenities: property.amenities || [],
    featured: property.featured,
    url: `/${url}${trackingString}`,
    agent
  };
}
function buildCuratedCategoryUrl(type, language, trackingString) {
  const basePath = language === 'es' ? 'listados-de' : language === 'en' ? 'listings-of' : 'listes-de';
  let url = `${basePath}?type=${type}`;
  if (language === 'en') url = `en/${url}`;
  if (language === 'fr') url = `fr/${url}`;
  return `/${url}${trackingString}`;
}
function formatCollectionTypeName(type, language) {
  const typeNames = {
    luxury: {
      es: 'Lujo',
      en: 'Luxury',
      fr: 'Luxe'
    },
    investment: {
      es: 'Inversión',
      en: 'Investment',
      fr: 'Investissement'
    },
    beachfront: {
      es: 'Frente al Mar',
      en: 'Beachfront',
      fr: 'Front de Mer'
    },
    new_developments: {
      es: 'Nuevos Desarrollos',
      en: 'New Developments',
      fr: 'Nouveaux Développements'
    },
    vacation_homes: {
      es: 'Casas Vacacionales',
      en: 'Vacation Homes',
      fr: 'Maisons de Vacances'
    }
  };
  return typeNames[type]?.[language] || typeNames[type]?.es || type;
}
function calculateAveragePrice(properties) {
  if (!properties.length) return 0;
  const validPrices = properties.map((p)=>p.salePrice || p.rentalPrice).filter((price)=>price && price > 0);
  if (!validPrices.length) return 0;
  const total = validPrices.reduce((sum, price)=>sum + price, 0);
  return Math.round(total / validPrices.length);
}
function calculatePriceRange(properties) {
  if (!properties.length) return {
    min: 0,
    max: 0
  };
  const validPrices = properties.map((p)=>p.salePrice || p.rentalPrice).filter((price)=>price && price > 0);
  if (!validPrices.length) return {
    min: 0,
    max: 0
  };
  return {
    min: Math.min(...validPrices),
    max: Math.max(...validPrices)
  };
}
function getPropertyTypeBreakdown(properties, language) {
  const typeCount = {};
  properties.forEach((property)=>{
    const type = property.propertyType || 'other';
    typeCount[type] = (typeCount[type] || 0) + 1;
  });
  return Object.entries(typeCount).map(([type, count])=>({
      type,
      name: formatPropertyTypeName(type, language),
      count,
      percentage: Math.round(count / properties.length * 100)
    }));
}
function formatPropertyTypeName(type, language) {
  const typeNames = {
    apartment: {
      es: 'Apartamento',
      en: 'Apartment',
      fr: 'Appartement'
    },
    house: {
      es: 'Casa',
      en: 'House',
      fr: 'Maison'
    },
    villa: {
      es: 'Villa',
      en: 'Villa',
      fr: 'Villa'
    },
    condo: {
      es: 'Condominio',
      en: 'Condo',
      fr: 'Condo'
    },
    penthouse: {
      es: 'Penthouse',
      en: 'Penthouse',
      fr: 'Penthouse'
    },
    land: {
      es: 'Terreno',
      en: 'Land',
      fr: 'Terrain'
    }
  };
  return typeNames[type]?.[language] || typeNames[type]?.es || type;
}
// ============================================================================
// MAIN EXPORT HANDLER
// ============================================================================
export async function handleCuratedListings(params) {
  try {
    const { contentSegments, supabase, language, trackingString, baseData, queryParams } = params;
    const countryTag = baseData?.countryTag;
    console.log(`🔍 Handling curated listings with ${contentSegments.length} segments:`, contentSegments);
    // Caso 1: Sin segmentos - Listado principal
    if (contentSegments.length === 0) {
      return await handleCuratedListingsMain(params);
    }
    // Caso 2: Un segmento - Verificar si es una colección curada predefinida
    if (contentSegments.length === 1) {
      const segment = contentSegments[0];
      const slugField = language === 'en' ? 'slug_en' : language === 'fr' ? 'slug_fr' : 'slug';
      // Primero verificamos si es una colección predefinida
      const { data: collection } = await supabase.from('curated_collections').select('id').eq(slugField, segment).eq('status', 'published').eq('active', true).single();
      if (collection) {
        console.log(`Found predefined collection for segment: ${segment}`);
        return await handleCuratedListingsSingle(params);
      }
      // Si no es colección predefinida, tratar como filtrado dinámico
      return await handleCuratedListingsFiltered(params);
    }
    // Caso 3: Múltiples segmentos - Tratar como filtros combinados
    console.log(`Processing ${contentSegments.length} segments as combined filters`);
    return await handleCuratedListingsFiltered(params);
  } catch (error) {
    console.error('Error in curated listings handler:', error);
    throw error;
  }
}
async function handleCuratedListingsFiltered(params) {
  const { supabase, language, contentSegments, trackingString, baseData, queryParams } = params;
  const countryTag = baseData?.countryTag;
  console.log(`🏷️ Handling filtered curated listings with segments:`, contentSegments);
  // Paso 1: Inicializar variables para los diferentes tipos de tags
  let propertyTypeTag = null;
  let customListTag = null;
  let locationTag = null;
  let cityTag = null;
  // Determinar el tipo de cada segmento
  if (contentSegments.length > 0) {
    // Obtener los tipos de segmentos
    const tagTypes = await identifySegmentTypes(supabase, contentSegments);
    console.log('Segment types identified:', tagTypes);
    // Asignar cada segmento a su tipo correspondiente
    for(let i = 0; i < contentSegments.length; i++){
      const segment = contentSegments[i];
      const type = tagTypes[i];
      if (segment === 'propiedades') continue; // Ignorar el segmento genérico "propiedades"
      if (type === 'property_type' && !propertyTypeTag) {
        propertyTypeTag = segment;
      } else if (type === 'custom_list' && !customListTag) {
        customListTag = segment;
      } else if (type === 'city' && !cityTag) {
        cityTag = segment;
      } else if ((type === 'sector' || type === 'location') && !locationTag) {
        locationTag = segment;
      }
    }
  }
  console.log('Analyzed segments:', {
    propertyType: propertyTypeTag,
    customList: customListTag,
    location: locationTag,
    city: cityTag
  });
  // Paso 2: Obtener información de los tags seleccionados
  const requiredTagIds = [];
  let optionalGroupTagIds = [];
  let customListInfo = null;
  let propertyTypeInfo = null;
  let locationInfo = null;
  let cityInfo = null;
  // Incluir el tag del país (siempre requerido)
  if (countryTag && countryTag.id) {
    requiredTagIds.push(countryTag.id);
    console.log(`Added country tag ID: ${countryTag.id}`);
  }
  // Obtener ID y detalles del tag de tipo de propiedad
  if (propertyTypeTag && propertyTypeTag !== 'propiedades') {
    const { data: propertyTypeData } = await supabase.from('tags').select('id, slug, slug_en, slug_fr, display_name, display_name_en, display_name_fr, category').eq('category', 'property_type').or(`slug.eq.${propertyTypeTag},slug_en.eq.${propertyTypeTag},slug_fr.eq.${propertyTypeTag}`).limit(1);
    if (propertyTypeData && propertyTypeData.length > 0) {
      requiredTagIds.push(propertyTypeData[0].id);
      console.log(`Added property type tag ID: ${propertyTypeData[0].id}`);
      propertyTypeInfo = {
        id: propertyTypeData[0].id,
        slug: propertyTypeTag,
        displayName: getTagDisplayName(propertyTypeData[0], language),
        category: 'property_type'
      };
    }
  }
  // Obtener ID y detalles del tag de ciudad
  if (cityTag) {
    const { data: cityData } = await supabase.from('tags').select('id, slug, slug_en, slug_fr, display_name, display_name_en, display_name_fr, category').eq('category', 'city').or(`slug.eq.${cityTag},slug_en.eq.${cityTag},slug_fr.eq.${cityTag}`).limit(1);
    if (cityData && cityData.length > 0) {
      requiredTagIds.push(cityData[0].id);
      console.log(`Added city tag ID: ${cityData[0].id}`);
      cityInfo = {
        id: cityData[0].id,
        slug: cityTag,
        displayName: getTagDisplayName(cityData[0], language),
        category: 'city'
      };
    }
  }
  // Obtener ID y detalles del tag de sector/ubicación
  if (locationTag) {
    const { data: locationData } = await supabase.from('tags').select('id, slug, slug_en, slug_fr, display_name, display_name_en, display_name_fr, category').eq('category', cityTag ? 'sector' : 'location').or(`slug.eq.${locationTag},slug_en.eq.${locationTag},slug_fr.eq.${locationTag}`).limit(1);
    if (locationData && locationData.length > 0) {
      requiredTagIds.push(locationData[0].id);
      console.log(`Added location tag ID: ${locationData[0].id}`);
      locationInfo = {
        id: locationData[0].id,
        slug: locationTag,
        displayName: getTagDisplayName(locationData[0], language),
        category: locationData[0].category
      };
    }
  }
  // Obtener ID y tags relacionados del custom-list
  if (customListTag) {
    // Primero obtener el ID del grupo (tag_group) por su slug
    const { data: customListData } = await supabase.from('tag_groups').select('id, name, slug, slug_en, slug_fr, description, icon, color, seo_title, seo_description, content_en, content_fr').or(`slug.eq.${customListTag},slug_en.eq.${customListTag},slug_fr.eq.${customListTag}`).limit(1);
    if (customListData && customListData.length > 0) {
      const groupId = customListData[0].id;
      // Obtener todos los tags asociados al grupo
      const { data: groupTagsData } = await supabase.from('tag_group_tags').select('tag_id').eq('group_id', groupId);
      if (groupTagsData && groupTagsData.length > 0) {
        optionalGroupTagIds = groupTagsData.map((gt)=>gt.tag_id);
        console.log(`Found ${optionalGroupTagIds.length} tags for custom-list '${customListTag}'`);
        // Obtener detalles de los tags para mostrar en la UI
        const { data: tagDetails } = await supabase.from('tags').select('id, slug, display_name, display_name_en, display_name_fr, category').in('id', optionalGroupTagIds).limit(20);
        // Procesar información multilingüe del grupo
        const groupContent = processMultilingualContent(customListData[0], language);
        const groupName = groupContent.name || groupContent.seo_title || customListData[0].name || customListData[0].seo_title;
        const groupDescription = groupContent.description || groupContent.seo_description || customListData[0].description || customListData[0].seo_description;
        customListInfo = {
          id: groupId,
          slug: customListTag,
          displayName: groupName,
          description: groupDescription,
          icon: customListData[0].icon,
          color: customListData[0].color,
          tags: tagDetails
        };
      }
    }
  }
  // Generar información de tipo de propiedad por defecto si no se encontró
  if (!propertyTypeInfo && propertyTypeTag === 'propiedades') {
    propertyTypeInfo = {
      slug: 'propiedades',
      displayName: language === 'en' ? 'Properties' : language === 'fr' ? 'Propriétés' : 'Propiedades',
      category: 'property_type'
    };
  }
  // Paso 3: Obtener propiedades paginadas usando la RPC
  let properties = [];
  let totalCount = 0;
  // Parámetros de paginación
  const page = parseInt(queryParams.get('page') || '1');
  const pageSize = 32; // Establecido en 32 propiedades por página
  if (requiredTagIds.length > 0) {
    // Si tenemos tags de grupo (custom-list), usamos esos como opcionales
    if (optionalGroupTagIds.length > 0) {
      // Obtener el conteo total primero
      const { data: countResult } = await supabase.rpc('count_filtered_properties', {
        required_tag_ids: requiredTagIds,
        optional_group_tag_ids: optionalGroupTagIds,
        min_optional_matches: 1
      });
      totalCount = countResult || 0;
      // Obtener las propiedades para la página actual
      const { data: taggedProperties } = await supabase.rpc('get_filtered_properties_paginated', {
        required_tag_ids: requiredTagIds,
        optional_group_tag_ids: optionalGroupTagIds,
        min_optional_matches: 1,
        page_size: pageSize,
        page_number: page
      });
      if (taggedProperties && taggedProperties.length > 0) {
        const propertyIds = taggedProperties.map((p)=>p.property_id);
        console.log(`Found ${totalCount} total properties with required tags, displaying ${propertyIds.length} for page ${page}`);
        // Obtener detalles completos de las propiedades
        const { data: propertyDetails } = await supabase.from('properties').select(`
            id, code, name, description, content_en, content_fr, 
            main_image_url, sale_price, rental_price, sale_currency, rental_currency,
            bedrooms, bathrooms, built_area, land_area, is_project, 
            slug_url, slug_en, slug_fr, featured, property_status, availability,
            sector_id, city_id, category_id, gallery_images_url,
            users:agent_id(first_name, last_name, profile_photo_url, slug, position)
          `).in('id', propertyIds).eq('property_status', 'Publicada').eq('availability', 1);
        if (propertyDetails && propertyDetails.length > 0) {
          // Obtener IDs únicos para datos relacionados
          const sectorIds = [
            ...new Set(propertyDetails.map((p)=>p.sector_id).filter(Boolean))
          ];
          const cityIds = [
            ...new Set(propertyDetails.map((p)=>p.city_id).filter(Boolean))
          ];
          const categoryIds = [
            ...new Set(propertyDetails.map((p)=>p.category_id).filter(Boolean))
          ];
          // Obtener datos relacionados
          const relatedData = await fetchRelatedData(supabase, propertyIds, categoryIds, sectorIds, cityIds);
          // Procesar propiedades con formato completo
          properties = propertyDetails.map((property)=>{
            // Encontrar información de coincidencia de tags para esta propiedad
            const matchInfo = taggedProperties.find((p)=>p.property_id === property.id);
            const tagMatches = matchInfo ? matchInfo.optional_matches : 0;
            // Procesar la propiedad
            const processedProperty = processCollectionProperty(property, language, trackingString);
            // Agregar información de coincidencias de tags
            return {
              ...processedProperty,
              tagMatches: tagMatches,
              matchScore: tagMatches
            };
          });
          // Ordenar por número de coincidencias (mayor primero)
          properties.sort((a, b)=>b.tagMatches - a.tagMatches);
          console.log(`Processed ${properties.length} properties for display`);
        }
      }
    } else {
      // Si no hay custom-list, hacer una búsqueda más simple con solo tags requeridos
      const { data: propertiesData, count } = await supabase.from('content_tags').select('content_id', {
        count: 'exact',
        distinct: true
      }).eq('content_type', 'property').in('tag_id', requiredTagIds).order('content_id', {
        ascending: true
      }).range((page - 1) * pageSize, page * pageSize - 1);
      totalCount = count || 0;
      if (propertiesData && propertiesData.length > 0) {
        const propertyIds = propertiesData.map((p)=>p.content_id);
        console.log(`Found ${totalCount} total properties with required tags, displaying ${propertyIds.length} for page ${page}`);
        // Obtener detalles completos de las propiedades
        const { data: propertyDetails } = await supabase.from('properties').select(`
            id, code, name, description, content_en, content_fr, 
            main_image_url, sale_price, rental_price, sale_currency, rental_currency,
            bedrooms, bathrooms, built_area, land_area, is_project, 
            slug_url, slug_en, slug_fr, featured, property_status, availability,
            sector_id, city_id, category_id, gallery_images_url,
            users:agent_id(first_name, last_name, profile_photo_url, slug, position)
          `).in('id', propertyIds).eq('property_status', 'Publicada').eq('availability', 1).order('featured', {
          ascending: false
        });
        if (propertyDetails && propertyDetails.length > 0) {
          properties = propertyDetails.map((property)=>processCollectionProperty(property, language, trackingString));
          console.log(`Processed ${properties.length} properties for display`);
        }
      }
    }
  }
  // Paso 4: Generar información SEO
  const countryName = baseData?.country?.name || getCountryName(language);
  const seoInfo = buildSEOInfo(language, propertyTypeInfo, customListInfo, locationInfo, cityInfo, countryName, properties.length, totalCount);
  // Paso 5: Construir breadcrumbs
  const breadcrumbs = buildBreadcrumbs(language, propertyTypeInfo, customListInfo, cityInfo, locationInfo, contentSegments, trackingString);
  // Paso 6: Construir paginación
  const totalPages = Math.ceil(totalCount / pageSize);
  const pagination = {
    page,
    limit: pageSize,
    total: totalCount,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
  // Paso 7: Obtener colecciones relacionadas
  const relatedCollections = await getRelatedCollections(supabase, requiredTagIds, optionalGroupTagIds, language, trackingString);
  // Paso 8: Calcular estadísticas
  const stats = {
    totalProperties: totalCount,
    displayedProperties: properties.length,
    tags: {
      propertyType: propertyTypeInfo?.displayName,
      customList: customListInfo?.displayName,
      location: locationInfo?.displayName,
      city: cityInfo?.displayName
    }
  };
  // Paso 9: Construir respuesta final
  const canonicalPath = `/${contentSegments.join('/')}`;
  const canonicalUrl = language === 'es' ? canonicalPath : `/${language}${canonicalPath}`;
  return {
    type: 'curated-listings-filtered',
    pageType: 'curated-listings-filtered',
    seo: {
      title: seoInfo.title,
      description: seoInfo.description,
      h1: seoInfo.h1,
      h2: seoInfo.h2,
      canonical_url: canonicalUrl,
      breadcrumbs
    },
    properties,
    relatedCollections,
    pagination,
    tags: {
      propertyType: propertyTypeInfo,
      customList: customListInfo,
      location: locationInfo,
      city: cityInfo
    },
    stats,
    segments: contentSegments
  };
}
// Función para identificar el tipo de cada segmento
async function identifySegmentTypes(supabase, segments) {
  if (!segments || segments.length === 0) return [];
  const segmentTypes = [];
  for (const segment of segments){
    if (segment === 'propiedades') {
      segmentTypes.push('all_properties');
      continue;
    }
    // Buscar el segmento en diferentes categorías de tags
    const { data: tagData } = await supabase.from('tags').select('category').or(`slug.eq.${segment},slug_en.eq.${segment},slug_fr.eq.${segment}`).limit(1);
    if (tagData && tagData.length > 0) {
      segmentTypes.push(tagData[0].category);
    } else {
      // Buscar como grupo de tags (custom list)
      const { data: groupData } = await supabase.from('tag_groups').select('id').or(`slug.eq.${segment},slug_en.eq.${segment},slug_fr.eq.${segment}`).limit(1);
      if (groupData && groupData.length > 0) {
        segmentTypes.push('custom_list');
      } else {
        // Si no encontramos el tag, intentamos adivinar por patrones comunes
        if ([
          'apartamentos',
          'casas',
          'villas',
          'terrenos',
          'apartments',
          'houses',
          'lands'
        ].includes(segment)) {
          segmentTypes.push('property_type');
        } else if (segment.includes('-para-') || segment.includes('-con-') || segment.includes('-for-') || segment.includes('-with-')) {
          segmentTypes.push('custom_list');
        } else {
          // Fallback genérico
          segmentTypes.push('unknown');
        }
      }
    }
  }
  return segmentTypes;
}
// Función auxiliar para obtener nombre de display del tag según idioma
function getTagDisplayName(tag, language) {
  if (!tag) return '';
  if (language === 'en' && tag.display_name_en) {
    return tag.display_name_en;
  } else if (language === 'fr' && tag.display_name_fr) {
    return tag.display_name_fr;
  }
  return tag.display_name || tag.name || '';
}
// Función para construir información SEO
function buildSEOInfo(language, propertyTypeInfo, customListInfo, locationInfo, cityInfo, countryName, propertiesCount, totalCount) {
  let title = '';
  let description = '';
  let h1 = '';
  let h2 = '';
  // Obtener nombres para SEO
  const propertyTypeName = propertyTypeInfo?.displayName || '';
  const customListName = customListInfo?.displayName || '';
  const locationName = locationInfo?.displayName || '';
  const cityName = cityInfo?.displayName || '';
  // Construir títulos y descripciones basados en los tags
  if (propertyTypeName && customListName && locationName && cityName) {
    title = `${propertyTypeName} ${customListName} en ${locationName}, ${cityName} | CLIC Inmobiliaria`;
    h1 = `${propertyTypeName} ${customListName} en ${locationName}, ${cityName}`;
    description = `Descubre nuestra selección de ${propertyTypeName.toLowerCase()} ${customListName.toLowerCase()} en ${locationName}, ${cityName}, ${countryName}. Propiedades seleccionadas para inversión inmobiliaria.`;
    h2 = `${totalCount} propiedades disponibles`;
  } else if (propertyTypeName && customListName && locationName) {
    title = `${propertyTypeName} ${customListName} en ${locationName} | CLIC Inmobiliaria`;
    h1 = `${propertyTypeName} ${customListName} en ${locationName}`;
    description = `Descubre nuestra selección de ${propertyTypeName.toLowerCase()} ${customListName.toLowerCase()} en ${locationName}, ${countryName}. Propiedades seleccionadas para inversión inmobiliaria.`;
    h2 = `${totalCount} propiedades disponibles`;
  } else if (propertyTypeName && customListName) {
    title = `${propertyTypeName} ${customListName} en ${countryName} | CLIC Inmobiliaria`;
    h1 = `${propertyTypeName} ${customListName}`;
    description = `Descubre nuestra selección de ${propertyTypeName.toLowerCase()} ${customListName.toLowerCase()} en ${countryName}. Propiedades seleccionadas para inversión inmobiliaria.`;
    h2 = `${totalCount} propiedades disponibles`;
  } else if (propertyTypeName) {
    title = `${propertyTypeName} en ${countryName} | CLIC Inmobiliaria`;
    h1 = `${propertyTypeName} en ${countryName}`;
    description = `Descubre nuestra selección de ${propertyTypeName.toLowerCase()} en ${countryName}. Propiedades seleccionadas para inversión inmobiliaria.`;
    h2 = `${totalCount} propiedades disponibles`;
  } else if (customListName) {
    title = `Propiedades ${customListName} en ${countryName} | CLIC Inmobiliaria`;
    h1 = `Propiedades ${customListName} en ${countryName}`;
    description = `Descubre nuestra selección de propiedades ${customListName.toLowerCase()} en ${countryName}. Propiedades seleccionadas para inversión inmobiliaria.`;
    h2 = `${totalCount} propiedades disponibles`;
  } else {
    title = `Propiedades Curadas en ${countryName} | CLIC Inmobiliaria`;
    h1 = `Propiedades Curadas en ${countryName}`;
    description = `Descubre nuestra selección de propiedades curadas en ${countryName}. Propiedades seleccionadas para inversión inmobiliaria.`;
    h2 = `${totalCount} propiedades disponibles`;
  }
  // Traducir según el idioma
  if (language === 'en') {
    title = title.replace('en', 'in').replace('Propiedades', 'Properties').replace('disponibles', 'available');
    description = description.replace('Descubre', 'Discover').replace('nuestra selección', 'our selection').replace('propiedades seleccionadas', 'properties selected').replace('inversión inmobiliaria', 'real estate investment');
    h2 = h2.replace('propiedades disponibles', 'properties available');
  } else if (language === 'fr') {
    title = title.replace('en', 'à').replace('Propiedades', 'Propriétés').replace('disponibles', 'disponibles');
    description = description.replace('Descubre', 'Découvrez').replace('nuestra selección', 'notre sélection').replace('propiedades seleccionadas', 'propriétés sélectionnées').replace('inversión inmobiliaria', 'investissement immobilier');
    h2 = h2.replace('propiedades disponibles', 'propriétés disponibles');
  }
  return {
    title,
    description,
    h1,
    h2
  };
}
// Función para construir breadcrumbs
function buildBreadcrumbs(language, propertyTypeInfo, customListInfo, cityInfo, locationInfo, contentSegments, trackingString) {
  let breadcrumbs = [
    {
      name: getUIText('HOME', language),
      url: language === 'es' ? '/' : `/${language}/`
    },
    {
      name: language === 'en' ? 'Curated Listings' : language === 'fr' ? 'Listes Sélectionnées' : 'Listados Curados',
      url: language === 'es' ? '/listados-de' : `/${language}/${language === 'en' ? 'listings-of' : 'listes-de'}`
    }
  ];
  // Agregar nivel de propiedad si existe
  if (propertyTypeInfo) {
    const propertyTypeUrl = language === 'es' ? `/listados-de/${propertyTypeInfo.slug}` : `/${language}/${language === 'en' ? 'listings-of' : 'listes-de'}/${propertyTypeInfo.slug}`;
    breadcrumbs.push({
      name: propertyTypeInfo.displayName,
      url: propertyTypeUrl + trackingString
    });
  }
  // Agregar nivel de lista personalizada si existe
  if (customListInfo) {
    const baseUrl = breadcrumbs[breadcrumbs.length - 1].url.replace(trackingString, '');
    const customListUrl = propertyTypeInfo ? `${baseUrl}/${customListInfo.slug}` : `${breadcrumbs[1].url}/${customListInfo.slug}`;
    breadcrumbs.push({
      name: customListInfo.displayName,
      url: customListUrl + trackingString
    });
  }
  // Agregar nivel de ciudad si existe
  if (cityInfo) {
    const baseUrl = breadcrumbs[breadcrumbs.length - 1].url.replace(trackingString, '');
    const cityUrl = `${baseUrl}/${cityInfo.slug}`;
    breadcrumbs.push({
      name: cityInfo.displayName,
      url: cityUrl + trackingString
    });
  }
  // Agregar nivel de ubicación/sector si existe
  if (locationInfo && !breadcrumbs.some((b)=>b.name === locationInfo.displayName)) {
    const baseUrl = breadcrumbs[breadcrumbs.length - 1].url.replace(trackingString, '');
    const locationUrl = `${baseUrl}/${locationInfo.slug}`;
    breadcrumbs.push({
      name: locationInfo.displayName,
      url: locationUrl + trackingString
    });
  }
  return breadcrumbs;
}
// Función para obtener colecciones relacionadas
async function getRelatedCollections(supabase, requiredTagIds, optionalTagIds, language, trackingString) {
  // Buscar colecciones relacionadas con los mismos tags o temas
  const tagIds = [
    ...requiredTagIds,
    ...optionalTagIds
  ].slice(0, 5); // Limitar para evitar consultas muy grandes
  if (tagIds.length === 0) {
    // Si no hay tags, obtener colecciones destacadas
    const { data: featuredCollections } = await supabase.from('curated_collections').select(`
        id, title, description, slug, slug_en, slug_fr, featured_image, 
        property_count, collection_type, content_en, content_fr
      `).eq('status', 'published').eq('active', true).eq('featured', true).limit(3);
    if (featuredCollections && featuredCollections.length > 0) {
      return featuredCollections.map((collection)=>processCuratedCollection(collection, language, trackingString));
    }
    return [];
  }
  // Buscar colecciones con tags similares
  const { data: collectionTags } = await supabase.from('content_tags').select('content_id').eq('content_type', 'collection').in('tag_id', tagIds).limit(20);
  if (collectionTags && collectionTags.length > 0) {
    const collectionIds = [
      ...new Set(collectionTags.map((ct)=>ct.content_id))
    ];
    const { data: collections } = await supabase.from('curated_collections').select(`
        id, title, description, slug, slug_en, slug_fr, featured_image, 
        property_count, collection_type, content_en, content_fr
      `).in('id', collectionIds).eq('status', 'published').eq('active', true).limit(3);
    if (collections && collections.length > 0) {
      return collections.map((collection)=>processCuratedCollection(collection, language, trackingString));
    }
  }
  // Si no se encuentran colecciones relacionadas, devolver colecciones recientes
  const { data: recentCollections } = await supabase.from('curated_collections').select(`
      id, title, description, slug, slug_en, slug_fr, featured_image, 
      property_count, collection_type, content_en, content_fr
    `).eq('status', 'published').eq('active', true).order('created_at', {
    ascending: false
  }).limit(3);
  if (recentCollections && recentCollections.length > 0) {
    return recentCollections.map((collection)=>processCuratedCollection(collection, language, trackingString));
  }
  return [];
}
// Función para obtener nombre del país
function getCountryName(language) {
  if (language === 'en') return 'Dominican Republic';
  if (language === 'fr') return 'République Dominicaine';
  return 'República Dominicana';
}
// Función para procesar contenido multilingüe
function processMultilingualContent(item, language, contentField = 'content') {
  let processed = {};
  if (!item) return processed;
  if (language === 'en' && item[`${contentField}_en`]) {
    try {
      const contentEn = typeof item[`${contentField}_en`] === 'string' ? JSON.parse(item[`${contentField}_en`]) : item[`${contentField}_en`];
      processed = {
        ...contentEn
      };
    } catch (e) {
      console.warn('Failed to parse EN content:', e);
    }
  } else if (language === 'fr' && item[`${contentField}_fr`]) {
    try {
      const contentFr = typeof item[`${contentField}_fr`] === 'string' ? JSON.parse(item[`${contentField}_fr`]) : item[`${contentField}_fr`];
      processed = {
        ...contentFr
      };
    } catch (e) {
      console.warn('Failed to parse FR content:', e);
    }
  }
  return processed;
}
// Función auxiliar para obtener nombre legible de un tag
async function getReadableTagName(supabase, slug, category, language) {
  if (!slug) return null;
  // Casos especiales
  if (slug === 'propiedades') {
    return language === 'en' ? 'Properties' : language === 'fr' ? 'Propriétés' : 'Propiedades';
  }
  const { data: tagData } = await supabase.from('tags').select('display_name, display_name_en, display_name_fr').eq('category', category).or(`slug.eq.${slug},slug_en.eq.${slug},slug_fr.eq.${slug}`).limit(1);
  if (tagData && tagData.length > 0) {
    if (language === 'en' && tagData[0].display_name_en) {
      return tagData[0].display_name_en;
    } else if (language === 'fr' && tagData[0].display_name_fr) {
      return tagData[0].display_name_fr;
    }
    return tagData[0].display_name;
  }
  // Si no encuentra el tag, devuelve el slug formateado
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (l)=>l.toUpperCase());
}
