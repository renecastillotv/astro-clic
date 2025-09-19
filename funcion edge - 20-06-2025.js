// =====================================================
// EDGE FUNCTION COMPLETA EXTENDIDA - PARTE 1/4
// Archivo: supabase/functions/tag-search/index.ts
// =====================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

// =====================================================
// NUEVA FUNCIÓN: OBTENER CONTENIDO RELACIONADO
// =====================================================
async function getRelatedContent(supabaseClient, tagIds, limitPerType = 5) {
  if (!tagIds || tagIds.length === 0) {
    console.log('⚠️ No hay tags para buscar contenido relacionado');
    return {
      articles: [],
      videos: [],
      testimonials: [],
      faqs: [],
      seo_content: []
    };
  }

  console.log('🔍 === OBTENIENDO CONTENIDO RELACIONADO ===');
  console.log('📋 Parámetros:', {
    tagIds,
    limitPerType,
    tagCount: tagIds.length
  });

  try {
    // ✅ PASO 1: Llamar a la función RPC
    console.log('🚀 Llamando RPC get_all_content_by_tags...');
    const { data: contentResults, error: rpcError } = await supabaseClient
      .rpc('get_all_content_by_tags', {
        tag_ids: tagIds,
        limit_per_type: limitPerType
      });

    if (rpcError) {
      console.error('❌ Error en RPC get_all_content_by_tags:', rpcError);
      return {
        articles: [],
        videos: [],
        testimonials: [],
        faqs: [],
        seo_content: []
      };
    }

    if (!contentResults || contentResults.length === 0) {
      console.log('⚠️ No se encontró contenido relacionado');
      return {
        articles: [],
        videos: [],
        testimonials: [],
        faqs: [],
        seo_content: []
      };
    }

    console.log('✅ RPC ejecutado exitosamente:', {
      totalResults: contentResults.length,
      types: [...new Set(contentResults.map(r => r.content_type))]
    });

    // ✅ PASO 2: Agrupar por tipo de contenido
    const groupedIds = {
      article: [],
      video: [],
      testimonial: [],
      faq: [],
      seo_content: []
    };

    // Crear un mapa para mantener la metadata de relevancia
    const metadataMap = {};

    contentResults.forEach(result => {
      const { content_id, content_type, total_weight, matched_tags } = result;
      
      if (groupedIds[content_type]) {
        groupedIds[content_type].push(content_id);
        metadataMap[content_id] = {
          total_weight,
          matched_tags,
          content_type
        };
      }
    });

    console.log('📊 Contenido agrupado:', {
      articles: groupedIds.article.length,
      videos: groupedIds.video.length,
      testimonials: groupedIds.testimonial.length,
      faqs: groupedIds.faq.length,
      seo_content: groupedIds.seo_content.length
    });

    // ✅ PASO 3: Obtener datos reales de cada tabla
    const relatedContent = {
      articles: [],
      videos: [],
      testimonials: [],
      faqs: [],
      seo_content: []
    };

    // Obtener artículos
    if (groupedIds.article.length > 0) {
      const { data: articles, error: articlesError } = await supabaseClient
        .from('articles')
        .select(`
          id, title, slug, excerpt, content, featured_image,
          author_name, published_at, created_at, updated_at,
          meta_title, meta_description, reading_time,
          article_categories(name, slug),
          users(first_name, last_name, email)
        `)
        .in('id', groupedIds.article)
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (!articlesError && articles) {
        relatedContent.articles = articles.map(article => ({
          ...article,
          ...metadataMap[article.id],
          formatted_author: article.users ? 
            `${article.users.first_name} ${article.users.last_name}` : 
            article.author_name
        }));
      }
    }

    // Obtener videos
    if (groupedIds.video.length > 0) {
      const { data: videos, error: videosError } = await supabaseClient
        .from('videos')
        .select(`
          id, title, description, youtube_url, thumbnail_url,
          duration, published_at, created_at, updated_at,
          meta_title, meta_description,
          video_categories(name, slug)
        `)
        .in('id', groupedIds.video)
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (!videosError && videos) {
        relatedContent.videos = videos.map(video => ({
          ...video,
          ...metadataMap[video.id],
          formatted_duration: formatDuration(video.duration)
        }));
      }
    }

    // Obtener testimonios
    if (groupedIds.testimonial.length > 0) {
      const { data: testimonials, error: testimonialsError } = await supabaseClient
        .from('testimonials')
        .select(`
          id, client_name, client_title, content, rating,
          featured_image, published_at, created_at,
          testimonial_categories(name, slug)
        `)
        .in('id', groupedIds.testimonial)
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (!testimonialsError && testimonials) {
        relatedContent.testimonials = testimonials.map(testimonial => ({
          ...testimonial,
          ...metadataMap[testimonial.id]
        }));
      }
    }

    // Obtener FAQs
    if (groupedIds.faq.length > 0) {
      const { data: faqs, error: faqsError } = await supabaseClient
        .from('faqs')
        .select(`
          id, question, answer, sort_order,
          created_at, updated_at,
          faq_categories(name, slug)
        `)
        .in('id', groupedIds.faq)
        .eq('status', 'published')
        .order('sort_order', { ascending: true });

      if (!faqsError && faqs) {
        relatedContent.faqs = faqs.map(faq => ({
          ...faq,
          ...metadataMap[faq.id]
        }));
      }
    }

    // Obtener contenido SEO
    if (groupedIds.seo_content.length > 0) {
      const { data: seoContent, error: seoError } = await supabaseClient
        .from('seo_content')
        .select(`
          id, title, content, content_type as seo_type,
          page_url, meta_title, meta_description,
          created_at, updated_at
        `)
        .in('id', groupedIds.seo_content)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (!seoError && seoContent) {
        relatedContent.seo_content = seoContent.map(content => ({
          ...content,
          ...metadataMap[content.id]
        }));
      }
    }

    console.log('✅ Contenido relacionado obtenido:', {
      articles: relatedContent.articles.length,
      videos: relatedContent.videos.length,
      testimonials: relatedContent.testimonials.length,
      faqs: relatedContent.faqs.length,
      seo_content: relatedContent.seo_content.length
    });

    return relatedContent;

  } catch (error) {
    console.error('❌ Error obteniendo contenido relacionado:', error);
    return {
      articles: [],
      videos: [],
      testimonials: [],
      faqs: [],
      seo_content: []
    };
  }
}

// =====================================================
// FUNCIÓN AUXILIAR: FORMATEAR DURACIÓN
// =====================================================
function formatDuration(seconds) {
  if (!seconds) return null;
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}
// =====================================================
// PARTE 2/4 - FUNCIONES DE REFERIDOS Y AGENTES
// =====================================================

// ✅ FUNCIONES DE REFERIDOS - TOTALMENTE CORREGIDAS CON DEBUGGING
async function getAgentByReferralCode(supabaseClient, referralCode) {
  if (!referralCode) {
    console.log('⚠️ No se proporcionó código de referido');
    return null;
  }
  console.log('🎯 === DEBUGGING BÚSQUEDA AGENTE DE REFERIDO ===');
  console.log('📋 Buscando código:', referralCode);
  try {
    // ✅ PASO 1: Verificar conectividad con tabla users
    console.log('🔍 Verificando tabla users...');
    const { data: testUsers, error: testError } = await supabaseClient.from('users').select('id, first_name, last_name, external_id, slug').limit(3);
    console.log('📊 Test tabla users:', {
      accessible: !testError,
      error: testError?.message || 'none',
      found: testUsers?.length || 0
    });
    // ✅ PASO 2: Buscar por external_id
    console.log('🔍 Método 1: Buscando por external_id =', referralCode);
    let { data: agent, error } = await supabaseClient.from('users').select(`
        id, external_id, first_name, last_name, email, phone, 
        position, slug, biography, facebook_url, instagram_url, 
        twitter_url, linkedin_url, youtube_url, team_id, office_id,
        commission_agreement, gender, birth_date, document_number,
        active, show_on_website, user_type
      `).eq('external_id', referralCode).single();
    console.log('📋 Resultado external_id:', {
      referralCode,
      found: !!agent,
      error: error?.message || 'none',
      errorCode: error?.code || 'none'
    });
    if (agent) {
      console.log('✅ AGENTE ENCONTRADO POR external_id:', {
        id: agent.id,
        external_id: agent.external_id,
        name: `${agent.first_name} ${agent.last_name}`,
        active: agent.active,
        show_on_website: agent.show_on_website
      });
      console.log('✅ Devolviendo agente (ignorando estado activo para debugging)');
      return agent;
    }
    // ✅ PASO 3: Buscar por slug
    console.log('🔍 Método 2: Buscando por slug =', referralCode);
    ({ data: agent, error } = await supabaseClient.from('users').select(`
        id, external_id, first_name, last_name, email, phone, 
        position, slug, biography, facebook_url, instagram_url, 
        twitter_url, linkedin_url, youtube_url, team_id, office_id,
        commission_agreement, gender, birth_date, document_number,
        active, show_on_website, user_type
      `).eq('slug', referralCode).single());
    console.log('📋 Resultado slug:', {
      referralCode,
      found: !!agent,
      error: error?.message || 'none',
      errorCode: error?.code || 'none'
    });
    if (agent) {
      console.log('✅ AGENTE ENCONTRADO POR slug:', {
        id: agent.id,
        slug: agent.slug,
        name: `${agent.first_name} ${agent.last_name}`,
        active: agent.active,
        show_on_website: agent.show_on_website
      });
      console.log('✅ Devolviendo agente (ignorando estado activo para debugging)');
      return agent;
    }
    // ✅ PASO 4: Buscar CUALQUIER usuario con external_id o slug similar (case insensitive)
    console.log('🔍 Método 3: Búsqueda flexible...');
    const { data: flexibleResults, error: flexError } = await supabaseClient.from('users').select('id, external_id, slug, first_name, last_name, active, show_on_website').or(`external_id.ilike.%${referralCode}%,slug.ilike.%${referralCode}%`).limit(5);
    console.log('📋 Búsqueda flexible:', {
      found: flexibleResults?.length || 0,
      results: flexibleResults?.map((u)=>({
          id: u.id,
          external_id: u.external_id,
          slug: u.slug,
          name: `${u.first_name} ${u.last_name}`
        })) || []
    });
    console.log('❌ No se encontró agente válido para código:', referralCode);
    return null;
  } catch (error) {
    console.error('❌ Error crítico buscando asesor de referido:', error);
    return null;
  }
}

// ✅ FUNCIÓN TOTALMENTE CORREGIDA: getPropertyAgent
async function getPropertyAgent(supabaseClient, agentId) {
  if (!agentId) {
    console.log('⚠️ No agent_id proporcionado');
    return null;
  }
  console.log('👤 === DEBUGGING BÚSQUEDA AGENTE DE PROPIEDAD ===');
  console.log('📋 Buscando asesor ID:', agentId, 'Tipo:', typeof agentId);
  try {
    // ✅ PASO 1: Verificar si el UUID es válido
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(agentId);
    console.log('🔍 UUID válido:', isValidUUID);
    if (!isValidUUID) {
      console.log('❌ Agent ID no es un UUID válido');
      return null;
    }
    // ✅ PASO 2: Buscar TODOS los usuarios primero (para verificar que la tabla funciona)
    console.log('🔍 Verificando conectividad con tabla users...');
    const { data: allUsers, error: allUsersError } = await supabaseClient.from('users').select('id, first_name, last_name, active, show_on_website').limit(5);
    console.log('📊 Verificación tabla users:', {
      accessible: !allUsersError,
      error: allUsersError?.message || 'none',
      totalFound: allUsers?.length || 0,
      sample: allUsers?.map((u)=>({
          id: u.id,
          name: `${u.first_name} ${u.last_name}`
        })) || []
    });
    // ✅ PASO 3: Buscar el agente específico SIN FILTROS
    console.log('🔍 Buscando agente específico sin filtros...');
    const { data: agent, error } = await supabaseClient.from('users').select(`
        id, external_id, first_name, last_name, email, phone, 
        position, slug, biography, facebook_url, instagram_url, 
        twitter_url, linkedin_url, youtube_url, team_id, office_id,
        commission_agreement, gender, birth_date, document_number,
        active, show_on_website, user_type, role
      `).eq('id', agentId).single();
    console.log('📋 === RESULTADO BÚSQUEDA AGENTE ESPECÍFICO ===');
    console.log('🎯 Resultado query:', {
      agentId,
      agentIdType: typeof agentId,
      found: !!agent,
      error: error?.message || 'none',
      errorCode: error?.code || 'none',
      errorDetails: error?.details || 'none'
    });
    if (agent) {
      console.log('✅ AGENTE ENCONTRADO:', {
        id: agent.id,
        name: `${agent.first_name} ${agent.last_name}`,
        email: agent.email,
        active: agent.active,
        show_on_website: agent.show_on_website,
        user_type: agent.user_type,
        role: agent.role,
        external_id: agent.external_id,
        slug: agent.slug
      });
      console.log('✅ AGENTE DE PROPIEDAD ENCONTRADO - devolviendo sin verificar condiciones');
      return agent;
    }
    console.log('❌ No se encontró agente para ID:', agentId);
    return null;
  } catch (error) {
    console.error('❌ Error crítico buscando asesor de la propiedad:', error);
    return null;
  }
}

function formatAgent(agent, isReferral = false) {
  if (!agent) {
    console.log('⚠️ formatAgent: agente nulo recibido');
    return null;
  }
  console.log('📋 Formateando agente:', {
    id: agent.id,
    name: `${agent.first_name} ${agent.last_name}`,
    isReferral,
    external_id: agent.external_id,
    slug: agent.slug
  });
  return {
    name: `${agent.first_name || ''} ${agent.last_name || ''}`.trim(),
    email: agent.email,
    phone: agent.phone,
    position: agent.position,
    slug: agent.slug,
    biography: agent.biography,
    external_id: agent.external_id,
    document_number: agent.document_number,
    social: {
      facebook: agent.facebook_url,
      instagram: agent.instagram_url,
      twitter: agent.twitter_url,
      linkedin: agent.linkedin_url,
      youtube: agent.youtube_url
    },
    team_id: agent.team_id,
    office_id: agent.office_id,
    commission_agreement: agent.commission_agreement,
    gender: agent.gender,
    birth_date: agent.birth_date,
    is_referral_agent: isReferral,
    referral_code: isReferral ? agent.external_id || agent.slug : null,
    user_type: agent.user_type,
    active: agent.active,
    show_on_website: agent.show_on_website
  };
}

// ✅ FUNCIÓN TOTALMENTE CORREGIDA: assignPropertyAgent
async function assignPropertyAgent(supabaseClient, property, referralAgent, referralCode) {
  let finalAgent = null;
  let agentSource = 'none';
  console.log('🔄 === INICIANDO ASIGNACIÓN DE AGENTE ===');
  console.log('📋 Datos de entrada:', {
    propertyId: property.id,
    propertyCode: property.code,
    propertyName: property.name,
    propertyAgentId: property.agent_id,
    propertyAgentIdType: typeof property.agent_id,
    hasReferralAgent: !!referralAgent,
    referralCode: referralCode || 'ninguno',
    referralAgentName: referralAgent ? `${referralAgent.first_name} ${referralAgent.last_name}` : 'ninguno'
  });
  // 1. PRIORIDAD MÁXIMA: Asesor de referido
  if (referralAgent) {
    console.log('🎯 USANDO ASESOR DE REFERIDO');
    finalAgent = formatAgent(referralAgent, true);
    agentSource = 'referral';
    console.log('✅ Asesor de referido asignado:', finalAgent?.name);
  } else if (property.agent_id) {
    console.log('🔄 NO HAY REFERIDO - Buscando asesor de la propiedad');
    console.log('📋 Datos del agent_id:', {
      value: property.agent_id,
      type: typeof property.agent_id,
      isNull: property.agent_id === null,
      isUndefined: property.agent_id === undefined
    });
    const propertyAgent = await getPropertyAgent(supabaseClient, property.agent_id);
    if (propertyAgent) {
      console.log('✅ Asesor de propiedad encontrado');
      finalAgent = formatAgent(propertyAgent, false);
      agentSource = 'property';
      console.log('👤 ✅ Asesor de la propiedad asignado:', finalAgent?.name);
    } else {
      console.log('❌ No se encontró asesor para la propiedad');
    }
  } else {
    console.log('⚠️ Propiedad sin agent_id definido');
  }
  console.log('📋 === RESULTADO FINAL ASIGNACIÓN ===');
  console.log('🎯 Resultado asignación agente:', {
    agentSource,
    hasAgent: !!finalAgent,
    agentName: finalAgent?.name || 'NINGUNO',
    agentId: finalAgent ? agentSource === 'referral' ? referralAgent?.id : property.agent_id : null,
    referralCodeUsed: referralCode || 'ninguno'
  });
  return {
    finalAgent,
    agentSource
  };
}
// =====================================================
// PARTE 3/4 - FUNCIONES DE PARSEO Y BÚSQUEDA
// =====================================================

// ✅ FUNCIÓN DE DEBUGGING: Verificar datos de propiedad
function debugPropertyData(property) {
  console.log('🏠 === DEBUGGING DATOS DE PROPIEDAD ===');
  console.log('📋 Información básica:', {
    id: property.id,
    code: property.code,
    name: property.name,
    private_name: '[OCULTO PARA LOGS]',
    agent_id: property.agent_id,
    agent_id_type: typeof property.agent_id,
    hasAgentId: !!property.agent_id,
    availability: property.availability,
    property_status: property.property_status
  });
  console.log('📋 Campos relacionados con agente:', {
    agent_id_value: property.agent_id,
    agent_id_is_uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(property.agent_id),
    agent_id_length: property.agent_id ? property.agent_id.toString().length : 0
  });
}

function parseUrlToSlugs(pathname) {
  const systemRoutes = [
    '/tag-search',
    '/api',
    '/functions',
    '/_app',
    '/admin'
  ];
  if (systemRoutes.some((route)=>pathname.startsWith(route))) {
    return [];
  }
  const segments = pathname.replace(/^\//, '').split('/').filter((segment)=>segment.length > 0).map((segment)=>segment.toLowerCase().trim());
  const lastSegment = segments[segments.length - 1];
  if (lastSegment && /^.+-\d+$/.test(lastSegment)) {
    return segments.slice(0, -1);
  }
  return segments;
}

async function findTagsBySlug(supabaseClient, slugs) {
  if (slugs.length === 0) return [];
  const { data: tags, error } = await supabaseClient.from('tags').select('id, name, slug, category').in('slug', slugs);
  if (error) {
    console.error('Error buscando tags:', error);
    return [];
  }
  return tags || [];
}

async function searchPropertiesByTags(supabaseClient, tagIds, page = 1, limit = 50) {
  const offset = (page - 1) * limit;
  if (tagIds.length === 0) {
    return {
      properties: [],
      totalCount: 0
    };
  }
  console.log('🔍 Buscando propiedades con tags:', tagIds);
  try {
    console.log('🚀 Llamando RPC con tag_ids:', tagIds);
    const { data: propertyIds, error: rpcError } = await supabaseClient.rpc('get_properties_with_all_tags', {
      tag_ids: tagIds
    });
    if (!rpcError && propertyIds && propertyIds.length > 0) {
      console.log('✅ RPC funcionó, encontrados:', propertyIds.length, 'propiedades');
      const totalCount = propertyIds.length;
      const limitedPropertyIds = propertyIds.slice(offset, offset + limit);
      const { data: properties, error: propertiesError } = await supabaseClient.from('properties').select(`
          id, code, name, private_name, description, agent_id,
          sale_price, sale_currency,
          rental_price, rental_currency,
          temp_rental_price, temp_rental_currency,
          furnished_rental_price, furnished_rental_currency,
          furnished_sale_price, furnished_sale_currency,
          maintenance_price, maintenance_currency,
          separation_price, separation_currency,
          bedrooms, bathrooms, parking_spots, built_area, land_area,
          main_image_url, gallery_images_url, property_status, is_project,
          delivery_date, release_date, created_at, updated_at,
          project_detail_id,
          property_categories(name, description),
          cities(name, provinces(name, countries(name))),
          sectors(name),
          property_images(url, title, description, is_main, sort_order),
          property_amenities(amenity_id, value, amenities(name, icon, category))
        `).in('id', limitedPropertyIds).eq('availability', 1).eq('property_status', 'Publicada');
      if (!propertiesError && properties) {
        const enrichedProperties = await enrichPropertiesWithProjectData(supabaseClient, properties);
        return {
          properties: enrichedProperties,
          totalCount
        };
      }
    }
    console.log('⚠️ RPC no disponible o sin resultados, usando método alternativo...');
  } catch (rpcError) {
    console.log('⚠️ RPC falló, usando método alternativo:', rpcError);
  }
  // MÉTODO 2: Búsqueda manual usando content_tags
  console.log('🔄 Usando búsqueda manual con content_tags');
  const { data: contentTags, error: contentTagsError } = await supabaseClient.from('content_tags').select('content_id, tag_id').eq('content_type', 'property').in('tag_id', tagIds);
  if (contentTagsError) {
    console.error('❌ Error buscando content_tags:', contentTagsError);
    return {
      properties: [],
      totalCount: 0
    };
  }
  if (!contentTags || contentTags.length === 0) {
    console.log('⚠️ No hay content_tags para estos tag_ids');
    return {
      properties: [],
      totalCount: 0
    };
  }
  const tagCountByProperty = {};
  contentTags.forEach((ct)=>{
    tagCountByProperty[ct.content_id] = (tagCountByProperty[ct.content_id] || 0) + 1;
  });
  const requiredTagCount = tagIds.length;
  const validPropertyIds = Object.keys(tagCountByProperty).filter((propertyId)=>tagCountByProperty[propertyId] === requiredTagCount);
  if (validPropertyIds.length === 0) {
    return {
      properties: [],
      totalCount: 0
    };
  }
  const totalCount = validPropertyIds.length;
  const limitedPropertyIds = validPropertyIds.slice(offset, offset + limit);
  const { data: properties, error: propertiesError } = await supabaseClient.from('properties').select(`
      id, code, name, private_name, description, agent_id,
      sale_price, sale_currency,
      rental_price, rental_currency,
      temp_rental_price, temp_rental_currency,
      furnished_rental_price, furnished_rental_currency,
      furnished_sale_price, furnished_sale_currency,
      maintenance_price, maintenance_currency,
      separation_price, separation_currency,
      bedrooms, bathrooms, parking_spots, built_area, land_area,
      main_image_url, gallery_images_url, property_status, is_project,
      delivery_date, release_date, created_at, updated_at,
      project_detail_id,
      property_categories(name, description),
      cities(name, provinces(name, countries(name))),
      sectors(name),
      property_images(url, title, description, is_main, sort_order),
      property_amenities(amenity_id, value, amenities(name, icon, category))
    `).in('id', limitedPropertyIds).eq('availability', 1).eq('property_status', 'Publicada');
  if (propertiesError) {
    console.error('❌ Error obteniendo propiedades:', propertiesError);
    return {
      properties: [],
      totalCount: 0
    };
  }
  const enrichedProperties = await enrichPropertiesWithProjectData(supabaseClient, properties || []);
  return {
    properties: enrichedProperties,
    totalCount
  };
}

async function enrichPropertiesWithProjectData(supabaseClient, properties) {
  if (!properties || properties.length === 0) return [];
  const normalProperties = properties.filter((p)=>!p.is_project);
  const projectProperties = properties.filter((p)=>p.is_project && p.project_detail_id);
  if (projectProperties.length > 0) {
    const projectDetailIds = [
      ...new Set(projectProperties.map((p)=>p.project_detail_id))
    ];
    const { data: projectsData, error: projectsError } = await supabaseClient.from('project_details').select(`
        id,
        project_typologies(
          bedrooms,
          bathrooms,
          built_area,
          total_area,
          sale_price_from,
          sale_price_to,
          sale_currency,
          is_sold_out
        ),
        project_benefits(
          project_benefits_catalog(name, benefit_type)
        ),
        project_payment_plans(
          reservation_amount,
          reservation_currency,
          is_default
        )
      `).in('id', projectDetailIds);
    if (!projectsError && projectsData) {
      const projectDataMap = {};
      projectsData.forEach((project)=>{
        projectDataMap[project.id] = project;
      });
      projectProperties.forEach((property)=>{
        const projectData = projectDataMap[property.project_detail_id];
        if (projectData) {
          enrichPropertyWithProjectData(property, projectData);
        }
      });
    }
  }
  return [
    ...normalProperties,
    ...projectProperties
  ];
}

function enrichPropertyWithProjectData(property, projectData) {
  const typologies = projectData.project_typologies || [];
  const benefits = projectData.project_benefits || [];
  const paymentPlans = projectData.project_payment_plans || [];
  const priceRange = calculatePriceRange(typologies);
  const bedroomRange = calculateBedroomRange(typologies);
  const bathroomRange = calculateBathroomRange(typologies);
  const areaRange = calculateAreaRange(typologies);
  const mainBenefits = getMainBenefits(benefits);
  const minReservation = getMinReservation(paymentPlans);
  property.project_data = {
    price_range: priceRange,
    bedroom_range: bedroomRange,
    bathroom_range: bathroomRange,
    area_range: areaRange,
    main_benefits: mainBenefits,
    min_reservation: minReservation,
    typologies: typologies,
    benefits: benefits,
    payment_plans: paymentPlans
  };
}

function calculatePriceRange(typologies) {
  if (!typologies || typologies.length === 0) return null;
  const availableTypologies = typologies.filter((t)=>!t.is_sold_out);
  if (availableTypologies.length === 0) return null;
  const minPrice = Math.min(...availableTypologies.map((t)=>t.sale_price_from).filter(Boolean));
  const maxPrice = Math.max(...availableTypologies.map((t)=>t.sale_price_to).filter(Boolean));
  const currency = availableTypologies[0]?.sale_currency || 'USD';
  return {
    min_price: minPrice,
    max_price: maxPrice,
    currency: currency,
    formatted: formatProjectPriceRange(minPrice, maxPrice, currency)
  };
}

function calculateBedroomRange(typologies) {
  if (!typologies || typologies.length === 0) return null;
  const availableTypologies = typologies.filter((t)=>!t.is_sold_out);
  if (availableTypologies.length === 0) return null;
  const bedrooms = availableTypologies.map((t)=>t.bedrooms).filter(Boolean);
  if (bedrooms.length === 0) return null;
  const minBedrooms = Math.min(...bedrooms);
  const maxBedrooms = Math.max(...bedrooms);
  return {
    min: minBedrooms,
    max: maxBedrooms,
    formatted: minBedrooms === maxBedrooms ? `${minBedrooms} hab` : `${minBedrooms}-${maxBedrooms} hab`
  };
}

function calculateBathroomRange(typologies) {
  if (!typologies || typologies.length === 0) return null;
  const availableTypologies = typologies.filter((t)=>!t.is_sold_out);
  if (availableTypologies.length === 0) return null;
  const bathrooms = availableTypologies.map((t)=>t.bathrooms).filter(Boolean);
  if (bathrooms.length === 0) return null;
  const minBathrooms = Math.min(...bathrooms);
  const maxBathrooms = Math.max(...bathrooms);
  return {
    min: minBathrooms,
    max: maxBathrooms,
    formatted: minBathrooms === maxBathrooms ? `${minBathrooms} baños` : `${minBathrooms}-${maxBathrooms} baños`
  };
}

function calculateAreaRange(typologies) {
  if (!typologies || typologies.length === 0) return null;
  const availableTypologies = typologies.filter((t)=>!t.is_sold_out);
  if (availableTypologies.length === 0) return null;
  const areas = availableTypologies.map((t)=>t.built_area || t.total_area).filter(Boolean);
  if (areas.length === 0) return null;
  const minArea = Math.min(...areas);
  const maxArea = Math.max(...areas);
  return {
    min: minArea,
    max: maxArea,
    formatted: minArea === maxArea ? `${minArea} m²` : `${minArea}-${maxArea} m²`
  };
}

function getMainBenefits(benefits) {
  if (!benefits || benefits.length === 0) return [];
  const priorityOrder = [
    'government_incentive',
    'financing_option',
    'developer_offer'
  ];
  const sortedBenefits = benefits.filter((b)=>b.project_benefits_catalog).sort((a, b)=>{
    const aPriority = priorityOrder.indexOf(a.project_benefits_catalog.benefit_type);
    const bPriority = priorityOrder.indexOf(b.project_benefits_catalog.benefit_type);
    return (aPriority === -1 ? 999 : aPriority) - (bPriority === -1 ? 999 : bPriority);
  }).slice(0, 3);
  return sortedBenefits.map((b)=>({
      name: b.project_benefits_catalog.name,
      type: b.project_benefits_catalog.benefit_type,
      badge: formatBenefitForBadge(b.project_benefits_catalog.name)
    }));
}

function getMinReservation(paymentPlans) {
  if (!paymentPlans || paymentPlans.length === 0) return null;
  const defaultPlan = paymentPlans.find((p)=>p.is_default) || paymentPlans[0];
  if (!defaultPlan) return null;
  return {
    amount: defaultPlan.reservation_amount,
    currency: defaultPlan.reservation_currency,
    formatted: formatCurrency(defaultPlan.reservation_amount, defaultPlan.reservation_currency)
  };
}

function formatProjectPriceRange(minPrice, maxPrice, currency) {
  const symbol = currency === 'USD' ? 'US$' : 'RD$';
  const min = formatPriceShort(minPrice);
  const max = formatPriceShort(maxPrice);
  return `Desde ${symbol}${min}-${symbol}${max}`;
}

function formatPriceShort(price) {
  if (price >= 1000000) {
    return (price / 1000000).toFixed(1).replace('.0', '') + 'M';
  } else if (price >= 1000) {
    return (price / 1000).toFixed(0) + 'K';
  }
  return price.toLocaleString();
}

function formatBenefitForBadge(name) {
  const badgeMap = {
    'Bono Primera Vivienda': 'BONO VIVIENDA',
    'CONFOTUR': 'CONFOTUR',
    'Contrato de Fideicomiso': 'FIDEICOMISO',
    'Línea Blanca Incluida': 'LÍNEA BLANCA',
    'Financiamiento Directo': 'FINANCIAMIENTO',
    'Bono Militar': 'BONO MILITAR'
  };
  return badgeMap[name] || name.toUpperCase().substring(0, 12);
}
// =====================================================
// PARTE 4/4 - FUNCIONES DE FORMATEO + SERVIDOR PRINCIPAL
// =====================================================

function detectPropertyPage(pathname) {
  const segments = pathname.replace(/^\//, '').split('/').filter(Boolean);
  if (segments.length === 0) return {
    isPropertyPage: false
  };
  if (segments.length === 5) {
    const lastSegment = segments[segments.length - 1];
    const idMatch = lastSegment.match(/^(.+)-(\d+)$/);
    if (idMatch) {
      const [, propertySlug, propertyId] = idMatch;
      return {
        isPropertyPage: true,
        propertySlug: lastSegment,
        propertyId: parseInt(propertyId),
        propertyName: propertySlug
      };
    }
  }
  return {
    isPropertyPage: false
  };
}

async function getPropertyBySlug(supabaseClient, propertySlug, propertyId = null) {
  console.log('🔍 Buscando propiedad:', {
    propertySlug,
    propertyId
  });
  if (propertyId) {
    try {
      // ✅ BUSCAR POR CODE PRIMERO (MÁS ESTABLE)
      let { data: property, error } = await supabaseClient.from('properties').select(`
          id, code, name, private_name, description, agent_id,
          sale_price, sale_currency,
          rental_price, rental_currency,
          temp_rental_price, temp_rental_currency,
          furnished_rental_price, furnished_rental_currency,
          furnished_sale_price, furnished_sale_currency,
          maintenance_price, maintenance_currency,
          separation_price, separation_currency,
          bedrooms, bathrooms, parking_spots, built_area, land_area,
          main_image_url, gallery_images_url, property_status, is_project,
          delivery_date, release_date, created_at, updated_at,
          project_detail_id,
          property_categories(name, description),
          cities(name, provinces(name, countries(name))),
          sectors(name),
          property_images(url, title, description, is_main, sort_order),
          property_amenities(amenity_id, value, amenities(name, icon, category))
        `).eq('code', propertyId).eq('availability', 1).eq('property_status', 'Publicada').single();
      // ✅ SI NO FUNCIONA POR CODE, BUSCAR POR ID
      if (error || !property) {
        ({ data: property, error } = await supabaseClient.from('properties').select(`
            id, code, name, private_name, description, agent_id,
            sale_price, sale_currency,
            rental_price, rental_currency,
            temp_rental_price, temp_rental_currency,
            furnished_rental_price, furnished_rental_currency,
            furnished_sale_price, furnished_sale_currency,
            maintenance_price, maintenance_currency,
            separation_price, separation_currency,
            bedrooms, bathrooms, parking_spots, built_area, land_area,
            main_image_url, gallery_images_url, property_status, is_project,
            delivery_date, release_date, created_at, updated_at,
            project_detail_id,
            property_categories(name, description),
            cities(name, provinces(name, countries(name))),
            sectors(name),
            property_images(url, title, description, is_main, sort_order),
            property_amenities(amenity_id, value, amenities(name, icon, category))
          `).eq('id', propertyId).eq('availability', 1).eq('property_status', 'Publicada').single());
      }
      if (!error && property) {
        console.log('✅ Propiedad encontrada:', property.name || property.private_name);
        // ✅ OBTENER IMÁGENES ADICIONALES DE property_images
        const { data: additionalImages, error: imagesError } = await supabaseClient.from('property_images').select('url, is_main, sort_order').eq('property_id', property.id).order('sort_order', {
          ascending: true
        });
        if (!imagesError && additionalImages && additionalImages.length > 0) {
          console.log('📸 Imágenes adicionales encontradas:', additionalImages.length);
          property.property_images = additionalImages;
        }
        return property;
      }
    } catch (error) {
      console.error('❌ Error buscando por ID:', error);
    }
  }
  console.log('🔄 Fallback: buscando por nombre');
  const searchTerms = propertySlug.replace(/-\d+$/, '').replace(/-/g, ' ');
  try {
    const { data: properties, error } = await supabaseClient.from('properties').select(`
        id, code, name, private_name, description, agent_id,
        sale_price, sale_currency,
        rental_price, rental_currency,
        temp_rental_price, temp_rental_currency,
        furnished_rental_price, furnished_rental_currency,
        furnished_sale_price, furnished_sale_currency,
        maintenance_price, maintenance_currency,
        separation_price, separation_currency,
        bedrooms, bathrooms, parking_spots, built_area, land_area,
        main_image_url, gallery_images_url, property_status, is_project,
        delivery_date, release_date, created_at, updated_at,
        project_detail_id,
        property_categories(name, description),
        cities(name, provinces(name, countries(name))),
        sectors(name),
        property_images(url, title, description, is_main, sort_order),
        property_amenities(amenity_id, value, amenities(name, icon, category))
      `).eq('availability', 1).eq('property_status', 'Publicada').or(`name.ilike.%${searchTerms}%,private_name.ilike.%${searchTerms}%`).order('created_at', {
      ascending: false
    }).limit(3);
    if (!error && properties && properties.length > 0) {
      const selectedProperty = properties[0];
      console.log('✅ Propiedad encontrada por nombre:', selectedProperty.name || selectedProperty.private_name);
      return selectedProperty;
    }
    console.error('❌ Propiedad no encontrada para slug:', propertySlug);
    return null;
  } catch (error) {
    console.error('❌ Error buscando propiedad:', error);
    return null;
  }
}

// ✅ FUNCIÓN PRINCIPAL CORREGIDA: formatProperty
function formatProperty(property, referralAgent = null) {
  // ✅ TITULO: Solo usar name público, nunca private_name
  const titulo = property.name || `Propiedad en ${property.sectors?.name || property.cities?.name || 'República Dominicana'}`;
  const precio = formatPrice(property);
  const imagen = getMainImage(property);
  const imagenes = getAllImages(property); // ✅ FUNCIÓN CORREGIDA
  const sector = formatLocation(property);
  const habitaciones = property.bedrooms || 0;
  const banos = property.bathrooms || 0;
  const metros = property.built_area || property.land_area || 0;
  const tipo = property.property_categories?.name || 'Apartamento';
  const url = buildCorrectUrl(property);
  const slug = generateSlug(property);
  console.log('🏠 Formateando propiedad:', {
    id: property.id,
    tituloPublico: titulo,
    imagenPrincipal: imagen,
    totalImagenes: imagenes.length,
    imagenesDetalle: imagenes.slice(0, 3).map((url)=>url.substring(url.lastIndexOf('/') + 1)),
    isProject: property.is_project,
    hasProjectData: !!property.project_data,
    usingPublicName: !!property.name
  });
  // ❌ NO FORMATEAR AGENTE AQUÍ - SE HARÁ DESPUÉS
  const baseProperty = {
    id: property.id,
    slug: slug,
    titulo: titulo,
    precio: precio,
    imagen: imagen,
    imagenes: imagenes,
    sector: sector,
    habitaciones: habitaciones,
    banos: banos,
    metros: metros,
    tipo: tipo,
    url: url,
    code: property.code,
    name: property.name,
    description: property.description,
    category: property.property_categories?.name,
    is_project: property.is_project,
    project_detail_id: property.project_detail_id,
    agent_id: property.agent_id,
    location: {
      city: property.cities?.name,
      province: property.cities?.provinces?.name,
      country: property.cities?.provinces?.countries?.name,
      sector: property.sectors?.name,
      full_address: formatFullAddress(property)
    },
    pricing: {
      sale: {
        price: property.sale_price,
        currency: property.sale_currency,
        formatted: property.sale_price ? formatCurrency(property.sale_price, property.sale_currency) : null
      },
      rental: {
        price: property.rental_price,
        currency: property.rental_currency,
        formatted: property.rental_price ? formatCurrency(property.rental_price, property.rental_currency) + '/mes' : null
      }
    },
    features: {
      bedrooms: habitaciones,
      bathrooms: banos,
      parking_spots: property.parking_spots,
      built_area: property.built_area,
      land_area: property.land_area
    },
    agent: null,
    dates: {
      created_at: property.created_at,
      updated_at: property.updated_at
    },
    isFormattedByProvider: true
  };
  // Datos de proyecto mejorados
  if (property.is_project && property.project_data) {
    baseProperty.project_badges = property.project_data.main_benefits?.map((b)=>b.badge) || [];
    baseProperty.habitaciones_rango = property.project_data.bedroom_range?.formatted || `${habitaciones} hab`;
    baseProperty.banos_rango = property.project_data.bathroom_range?.formatted || null;
    baseProperty.metros_rango = property.project_data.area_range?.formatted || null;
    baseProperty.reserva_desde = property.project_data.min_reservation?.formatted || null;
    baseProperty.project_data_full = property.project_data;
  }
  return baseProperty;
}

function getMainImage(property) {
  if (property.main_image_url) return property.main_image_url;
  if (property.property_images && Array.isArray(property.property_images)) {
    const mainImage = property.property_images.find((img)=>img.is_main === true);
    if (mainImage?.url) return mainImage.url;
    if (property.property_images[0]?.url) return property.property_images[0].url;
  }
  if (property.gallery_images_url && Array.isArray(property.gallery_images_url)) {
    if (property.gallery_images_url[0]) return property.gallery_images_url[0];
  }
  return '/images/placeholder-property.jpg';
}

// ✅ CORRECCIÓN CRÍTICA 2: getAllImages - Arreglar array de imágenes
function getAllImages(property) {
  const images = [];
  console.log('📸 Procesando imágenes para propiedad:', {
    id: property.id,
    main_image_url: !!property.main_image_url,
    property_images_count: property.property_images?.length || 0,
    gallery_images_url_type: typeof property.gallery_images_url,
    gallery_images_url_value: property.gallery_images_url
  });
  // 1. Primero agregar imágenes desde property_images (ordenadas por sort_order)
  if (property.property_images && Array.isArray(property.property_images)) {
    const sortedImages = property.property_images.sort((a, b)=>(a.sort_order || 0) - (b.sort_order || 0)).map((img)=>img.url).filter(Boolean);
    sortedImages.forEach((imageUrl)=>{
      if (!images.includes(imageUrl)) {
        images.push(imageUrl);
      }
    });
  }
  // 2. ✅ CORRECCIÓN CRÍTICA: Procesar gallery_images_url CORRECTAMENTE
  if (property.gallery_images_url) {
    let galleryUrls = [];
    if (Array.isArray(property.gallery_images_url)) {
      // Si ya es array, procesar cada elemento
      galleryUrls = property.gallery_images_url.map((url)=>{
        if (typeof url === 'string' && url.includes(',')) {
          // ✅ Si un elemento del array contiene comas, dividirlo
          return url.split(',').map((u)=>u.trim()).filter(Boolean);
        }
        return url;
      }).flat() // ✅ Aplanar el array
      .filter(Boolean);
    } else if (typeof property.gallery_images_url === 'string') {
      // ✅ Si es string, dividir por comas
      galleryUrls = property.gallery_images_url.split(',').map((url)=>url.trim()).filter((url)=>url && url !== '');
    }
    console.log('📸 Gallery URLs procesadas:', {
      originalType: typeof property.gallery_images_url,
      isArray: Array.isArray(property.gallery_images_url),
      processedUrls: galleryUrls.length,
      firstFew: galleryUrls.slice(0, 3),
      duplicatesFound: galleryUrls.length !== [
        ...new Set(galleryUrls)
      ].length
    });
    // ✅ Agregar URLs únicas que no estén ya incluidas
    galleryUrls.forEach((imageUrl)=>{
      if (imageUrl && typeof imageUrl === 'string' && !images.includes(imageUrl)) {
        images.push(imageUrl);
      }
    });
  }
  // 3. Agregar imagen principal si no está ya incluida
  if (property.main_image_url && !images.includes(property.main_image_url)) {
    images.unshift(property.main_image_url);
  }
  // 4. Si aún no hay imágenes, usar placeholder
  if (images.length === 0) {
    images.push('/images/placeholder-property.jpg');
  }
  // ✅ VERIFICAR QUE NO HAY STRINGS CON COMAS EN EL ARRAY FINAL
  const cleanImages = images.filter((img)=>{
    if (typeof img !== 'string') return false;
    if (img.includes(',')) {
      console.log('⚠️ Imagen con comas detectada (se omite):', img.substring(0, 100) + '...');
      return false;
    }
    return true;
  });
  console.log('✅ Imágenes finales procesadas:', {
    propertyId: property.id,
    totalImages: cleanImages.length,
    hasCommaStrings: images.length !== cleanImages.length,
    imageNames: cleanImages.map((url)=>url.substring(url.lastIndexOf('/') + 1))
  });
  return cleanImages;
}

function formatPrice(property) {
  if (property.is_project && property.project_data?.price_range) {
    return property.project_data.price_range.formatted;
  }
  if (property.sale_price) {
    return formatCurrency(property.sale_price, property.sale_currency);
  }
  if (property.rental_price) {
    return formatCurrency(property.rental_price, property.rental_currency) + '/mes';
  }
  if (property.temp_rental_price) {
    return formatCurrency(property.temp_rental_price, property.temp_rental_currency) + '/noche';
  }
  if (property.furnished_rental_price) {
    return formatCurrency(property.furnished_rental_price, property.furnished_rental_currency) + '/mes amueblado';
  }
  return 'Precio a consultar';
}

function formatCurrency(amount, currency) {
  if (currency === 'USD') {
    return `US$${amount.toLocaleString()}`;
  } else {
    return `RD$${amount.toLocaleString()}`;
  }
}

function formatLocation(property) {
  const parts = [
    property.sectors?.name,
    property.cities?.name
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Ubicación no especificada';
}

function formatFullAddress(property) {
  const parts = [
    property.sectors?.name,
    property.cities?.name,
    property.cities?.provinces?.name,
    property.cities?.provinces?.countries?.name
  ].filter(Boolean);
  return parts.join(', ');
}

// ✅ FUNCIÓN TOTALMENTE CORREGIDA: generateSlug
function generateSlug(property) {
  // ✅ USAR SOLO NAME PÚBLICO
  let name = property.name;
  // Si no hay name público, usar un genérico
  if (!name || name.trim() === '') {
    const category = property.property_categories?.name || 'propiedad';
    const location = property.sectors?.name || property.cities?.name || 'republica-dominicana';
    name = `${category}-en-${location}`;
    console.log('⚠️ Propiedad sin nombre público, usando genérico:', name);
  }
  const slug = name.toLowerCase().replace(/[áàäâ]/g, 'a').replace(/[éèëê]/g, 'e').replace(/[íìïî]/g, 'i').replace(/[óòöô]/g, 'o').replace(/[úùüû]/g, 'u').replace(/[ñ]/g, 'n').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  // ✅ USAR CODE si está disponible, sino ID
  const identifier = property.code || property.id;
  console.log('🔗 Generando slug PÚBLICO:', {
    propertyId: property.id,
    propertyCode: property.code,
    publicName: property.name,
    privateName: '[OCULTO]',
    generatedSlug: `${slug}-${identifier}`,
    usingCode: !!property.code
  });
  return `${slug}-${identifier}`;
}

function buildCorrectUrl(property) {
  let accion = 'comprar';
  if (property.rental_price || property.temp_rental_price || property.furnished_rental_price) {
    accion = 'alquilar';
  }
  const tipo = normalizePropertyType(property.property_categories?.name || 'Apartamento');
  const ubicacion = normalizeCityName(property.cities?.name || 'republica-dominicana');
  const sector = normalizeSectorName(property.sectors?.name || 'sector');
  const propertySlug = generateSlug(property);
  const url = `/${accion}/${tipo}/${ubicacion}/${sector}/${propertySlug}`;
  console.log('🔗 URL construida (PÚBLICA):', {
    accion,
    tipo,
    ubicacion,
    sector,
    propertySlug,
    finalUrl: url,
    usingPublicName: !!property.name
  });
  return url;
}

function normalizePropertyType(type) {
  const typeMap = {
    'Apartamento': 'apartamento',
    'Apartamentos': 'apartamento',
    'Casa': 'casa',
    'Casas': 'casa',
    'Villa': 'villa',
    'Villas': 'villa',
    'Estudio': 'estudio',
    'Estudios': 'estudio',
    'Penthouse': 'penthouse',
    'Terreno': 'terreno',
    'Terrenos': 'terreno',
    'Oficina': 'oficina',
    'Oficinas': 'oficina',
    'Local Comercial': 'local-comercial',
    'Locales Comerciales': 'local-comercial',
    'Bodega': 'bodega',
    'Bodegas': 'bodega',
    'Townhouse': 'townhouse',
    'Loft': 'loft',
    'Lofts': 'loft'
  };
  return typeMap[type] || type.toLowerCase().replace(/\s+/g, '-');
}

// =====================================================
// PARTE 5/5 - RESTO DE FUNCIONES + SERVIDOR PRINCIPAL
// =====================================================

function normalizeCityName(city) {
  return normalizeForUrl(city);
}

function normalizeSectorName(sector) {
  return normalizeForUrl(sector);
}

function normalizeForUrl(str) {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[,\.]/g, '').replace(/[áéíóú]/g, (match)=>{
    const map = {
      'á': 'a',
      'é': 'e',
      'í': 'i',
      'ó': 'o',
      'ú': 'u'
    };
    return map[match] || match;
  }).replace(/ñ/g, 'n').replace(/[^a-z0-9\-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

// =====================================================
// FUNCIONES DE GENERACIÓN DE CONTENIDO
// =====================================================
function generateSeoTitle(tags, searchMetadata) {
  if (tags.length === 0) return 'Propiedades en República Dominicana - CLIC';
  const operationTag = tags.find((t)=>t.category === 'operacion');
  const categoryTag = tags.find((t)=>t.category === 'categoria');
  const locationTag = tags.find((t)=>t.category === 'ciudad' || t.category === 'provincia');
  const sectorTag = tags.find((t)=>t.category === 'sector');
  const parts = [];
  if (categoryTag) parts.push(categoryTag.name);
  if (operationTag?.slug === 'venta') parts.push('en Venta');
  if (operationTag?.slug === 'alquiler') parts.push('en Alquiler');
  if (sectorTag) parts.push(`en ${sectorTag.name}`);
  else if (locationTag) parts.push(`en ${locationTag.name}`);
  const title = parts.length > 0 ? parts.join(' ') : 'Propiedades';
  return `${title} - CLIC`;
}

function generateBreadcrumbs(tags) {
  const breadcrumbs = [
    {
      name: 'Inicio',
      url: '/'
    }
  ];
  const operationTag = tags.find((t)=>t.category === 'operacion');
  const categoryTag = tags.find((t)=>t.category === 'categoria');
  const locationTag = tags.find((t)=>t.category === 'ciudad' || t.category === 'provincia');
  const sectorTag = tags.find((t)=>t.category === 'sector');
  let currentPath = '';
  if (operationTag) {
    currentPath += `/${operationTag.slug}`;
    breadcrumbs.push({
      name: operationTag.name,
      url: currentPath
    });
  }
  if (categoryTag) {
    currentPath += `/${categoryTag.slug}`;
    breadcrumbs.push({
      name: categoryTag.name,
      url: currentPath
    });
  }
  if (locationTag) {
    currentPath += `/${locationTag.slug}`;
    breadcrumbs.push({
      name: locationTag.name,
      url: currentPath
    });
  }
  if (sectorTag) {
    currentPath += `/${sectorTag.slug}`;
    breadcrumbs.push({
      name: sectorTag.name,
      url: currentPath
    });
  }
  return breadcrumbs;
}

// ✅ FUNCIÓN LIMPIA: handleSinglePropertyPage
async function handleSinglePropertyPage(supabaseClient, propertySlug, propertyId, referralAgent, referralCode, url, tags) {
  console.log('🏠 === PROCESANDO PÁGINA DE PROPIEDAD INDIVIDUAL EXTENDIDA ===');
  console.log('📋 Parámetros de entrada:', {
    propertySlug,
    propertyId,
    hasReferralAgent: !!referralAgent,
    referralCode: referralCode || 'ninguno'
  });

  const property = await getPropertyBySlug(supabaseClient, propertySlug, propertyId);
  if (!property) {
    console.log('❌ Propiedad no encontrada');
    return {
      error: 'Propiedad no encontrada',
      property_slug: propertySlug,
      property_id: propertyId,
      search_attempted: url.pathname
    };
  }

  console.log('✅ Propiedad encontrada');
  debugPropertyData(property);

  // ✅ LÓGICA DE AGENTE CON DEBUGGING EXHAUSTIVO
  const { finalAgent, agentSource } = await assignPropertyAgent(supabaseClient, property, referralAgent, referralCode);

  // Enriquecer con datos de proyecto si aplica
  let enrichedProperty = property;
  if (property.is_project) {
    console.log('🏗️ Enriqueciendo datos de proyecto...');
    const enrichedProperties = await enrichPropertiesWithProjectData(supabaseClient, [property]);
    if (enrichedProperties.length > 0) {
      enrichedProperty = enrichedProperties[0];
      console.log('✅ Datos de proyecto enriquecidos');
    }
  }

  // ✅ FORMATEAR PROPIEDAD
  console.log('🎨 Formateando propiedad...');
  const formattedProperty = formatProperty(enrichedProperty);

  // ✅ ASIGNAR AGENTE AL RESULTADO FINAL
  if (finalAgent) {
    formattedProperty.agent = finalAgent;
    console.log('✅ ✅ ✅ AGENTE FINALMENTE ASIGNADO:', {
      name: finalAgent.name,
      source: agentSource,
      is_referral: agentSource === 'referral'
    });
  } else {
    console.log('❌ ❌ ❌ NO SE PUDO ASIGNAR NINGÚN AGENTE');
  }

  // ✅ NUEVO: Obtener contenido relacionado
  const tagIds = tags.map(t => t.id);
  console.log('🔍🔍🔍 ANTES DE LLAMAR getRelatedContent - tagIds:', tagIds);
  const propertyRelatedContent = await getRelatedContent(supabaseClient, tagIds, 3);
  console.log('🔍🔍🔍 DESPUÉS DE LLAMAR getRelatedContent - resultado:', propertyRelatedContent);

  // Buscar propiedades relacionadas
  const similarResults = await searchPropertiesByTags(supabaseClient, tagIds, 1, 6);
  let relatedProperties = [];
  if (similarResults.properties.length > 0) {
    const filteredSimilar = similarResults.properties.filter(p => p.id !== property.id);
    relatedProperties = filteredSimilar.map(p => {
      const formatted = formatProperty(p);
      if (referralAgent) {
        formatted.agent = formatAgent(referralAgent, true);
      }
      return formatted;
    }).slice(0, 4);
  }

  const result = {
    type: 'single_property',
    property: formattedProperty,
    related_properties: {
      title: 'Propiedades similares',
      data: relatedProperties
    },
    // ✅ NUEVO: Contenido relacionado
    related_content: propertyRelatedContent,
    agent_info: {
      source: agentSource,
      is_referral: agentSource === 'referral',
      agent_id: finalAgent ? agentSource === 'referral' ? referralAgent.id : property.agent_id : null,
      agent_found: !!finalAgent
    },
    referral_info: referralAgent ? {
      agent_name: `${referralAgent.first_name} ${referralAgent.last_name}`,
      referral_code: referralCode,
      external_id: referralAgent.external_id,
      is_active: true
    } : null,
    seo: {
      title: `${formattedProperty.titulo} - ${formattedProperty.sector} - CLIC`,
      description: `${formattedProperty.tipo} ${formattedProperty.habitaciones ? `de ${formattedProperty.habitaciones} habitaciones` : ''} en ${formattedProperty.sector}. ${formattedProperty.precio}.`,
      canonical: url.pathname,
      tags: tags,
      breadcrumbs: generateBreadcrumbs(tags)
    },
    debug: {
      property_agent_id: property.agent_id,
      property_agent_id_type: typeof property.agent_id,
      referral_code: referralCode,
      agent_source: agentSource,
      agent_found: !!finalAgent,
      agent_assigned_to_property: !!formattedProperty.agent,
      property_id_from_url: propertyId,
      images_found: formattedProperty.imagenes.length,
      main_image: formattedProperty.imagen,
      using_public_name: !!property.name,
      generated_slug: formattedProperty.slug,
      property_found: !!property,
      agent_lookup_attempted: !!property.agent_id,
      final_agent_assigned: !!formattedProperty.agent,
      referral_agent_provided: !!referralAgent,
      referral_agent_name: referralAgent ? `${referralAgent.first_name} ${referralAgent.last_name}` : null,
      property_agent_search_result: agentSource === 'property' ? 'found' : agentSource === 'none' ? 'not_found' : 'not_attempted',
      related_content_found: {
        articles: propertyRelatedContent.articles.length,
        videos: propertyRelatedContent.videos.length,
        testimonials: propertyRelatedContent.testimonials.length,
        faqs: propertyRelatedContent.faqs.length,
        seo_content: propertyRelatedContent.seo_content.length
      }
    }
  };

  console.log('🎯 === RESULTADO FINAL PÁGINA DE PROPIEDAD ===');
  console.log('✅ Resumen final:', {
    propertyTitle: result.property.titulo,
    hasAgent: !!result.property.agent,
    agentName: result.property.agent?.name || 'NINGUNO',
    agentSource: result.agent_info.source,
    agentIsReferral: result.agent_info.is_referral,
    imagesCount: result.property.imagenes.length,
    debugAgentFound: result.debug.agent_found,
    debugAgentAssigned: result.debug.final_agent_assigned,
    relatedContentTotal: Object.values(result.debug.related_content_found).reduce((a, b) => a + b, 0)
  });

  return result;
}
// =====================================================
// SERVIDOR PRINCIPAL EXTENDIDO
// =====================================================
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '');
    const url = new URL(req.url);
    const searchParams = url.searchParams;
    // ✅ EXTRAER CÓDIGO DE REFERIDO
    const referralCode = searchParams.get('ref');
    let referralAgent = null;
    console.log('🚀 === INICIO PROCESAMIENTO REFERIDOS ===');
    console.log('📋 URL completa:', req.url);
    console.log('📋 Parámetros:', Object.fromEntries(searchParams.entries()));
    console.log('📋 Código de referido extraído:', referralCode);
    // ✅ BUSCAR ASESOR DE REFERIDO SI EXISTE
    if (referralCode) {
      console.log('🎯 === INICIANDO BÚSQUEDA DE REFERIDO ===');
      console.log('📋 Procesando referido con código:', referralCode);
      referralAgent = await getAgentByReferralCode(supabaseClient, referralCode);
      console.log('📋 === RESULTADO BÚSQUEDA REFERIDO ===');
      if (referralAgent) {
        console.log('✅ ✅ ✅ ASESOR DE REFERIDO ENCONTRADO:', {
          id: referralAgent.id,
          external_id: referralAgent.external_id,
          name: `${referralAgent.first_name} ${referralAgent.last_name}`,
          active: referralAgent.active,
          show_on_website: referralAgent.show_on_website
        });
      } else {
        console.log('❌ ❌ ❌ NO SE ENCONTRÓ ASESOR DE REFERIDO');
      }
    } else {
      console.log('⚠️ No se proporcionó código de referido en la URL');
    }
    let functionPath = url.pathname;
    const possiblePrefixes = [
      '/functions/v1/tag-search',
      '/tag-search'
    ];
    for (const prefix of possiblePrefixes){
      if (functionPath.startsWith(prefix)) {
        functionPath = functionPath.substring(prefix.length);
        break;
      }
    }
    if (!functionPath || functionPath === '' || functionPath === '/') {
      functionPath = '/';
    }
    if (functionPath === '/' || functionPath === '/tag-search') {
      const queryPath = searchParams.get('_path') || searchParams.get('path');
      if (queryPath) {
        functionPath = queryPath.startsWith('/') ? queryPath : `/${queryPath}`;
      }
    }
    console.log('🔍 Procesando URL:', {
      originalUrl: url.href,
      functionPath,
      referralCode: referralCode || 'ninguno',
      hasReferralAgent: !!referralAgent,
      referralAgentName: referralAgent ? `${referralAgent.first_name} ${referralAgent.last_name}` : 'ninguno',
      referralAgentId: referralAgent?.id || 'ninguno'
    });
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    // ✅ DETECTAR PÁGINA DE PROPIEDAD CON ID
    const { isPropertyPage, propertySlug, propertyId } = detectPropertyPage(functionPath);
    if (isPropertyPage && propertySlug) {
      console.log('🏠 Procesando página de propiedad individual:', {
        propertySlug,
        propertyId
      });
      // Buscar tags para breadcrumbs
      const urlSlugs = parseUrlToSlugs(functionPath);
      const tags = await findTagsBySlug(supabaseClient, urlSlugs);
      // ✅ USAR FUNCIÓN EXTENDIDA
      const propertyPageResult = await handleSinglePropertyPage(supabaseClient, propertySlug, propertyId, referralAgent, referralCode, url, tags);
      if (propertyPageResult.error) {
        return new Response(JSON.stringify(propertyPageResult), {
          status: 404,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      return new Response(JSON.stringify(propertyPageResult), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // ✅ BÚSQUEDA DE LISTADO EXTENDIDA
    console.log('📋 Procesando listado de propiedades');
    const urlSlugs = parseUrlToSlugs(functionPath);
    const tags = await findTagsBySlug(supabaseClient, urlSlugs);
    const tagIds = tags.map((t)=>t.id);
    console.log('🔍 Tags encontrados:', {
      urlSlugs,
      tags: tags.map((t)=>({
          slug: t.slug,
          id: t.id,
          category: t.category
        })),
      tagIds
    });
    const searchResults = await searchPropertiesByTags(supabaseClient, tagIds, page, limit);
    // ✅ FORMATEAR PROPIEDADES Y ASIGNAR AGENTES
    const formattedProperties = searchResults.properties.map((property)=>{
      const formatted = formatProperty(property);
      // Si hay agente de referido, asignarlo a todas las propiedades del listado
      if (referralAgent) {
        formatted.agent = formatAgent(referralAgent, true);
      }
      return formatted;
    });

    // ✅ NUEVO: Obtener contenido relacionado para listados
    console.log('🔍 Obteniendo contenido relacionado para listado...');
    const relatedContent = await getRelatedContent(supabaseClient, tagIds, 5);

    console.log('✅ Búsqueda completada:', {
      originalSlugs: urlSlugs,
      tagsFound: tags.length,
      propertiesFound: formattedProperties.length,
      totalCount: searchResults.totalCount,
      referralAgent: referralAgent?.first_name || 'ninguno',
      relatedContentTotal: Object.values(relatedContent).reduce((acc, arr) => acc + arr.length, 0)
    });
    const response = {
      type: 'property_listing',
      data: formattedProperties,
      // ✅ NUEVO: Contenido relacionado en listados
      related_content: relatedContent,
      search: {
        url_path: url.pathname,
        original_slugs: urlSlugs,
        tags_found: tags,
        tags_used: tagIds
      },
      pagination: {
        page,
        limit,
        total: searchResults.totalCount,
        pages: Math.ceil(searchResults.totalCount / limit),
        has_next: page * limit < searchResults.totalCount,
        has_prev: page > 1
      },
      referral_info: referralAgent ? {
        agent_name: `${referralAgent.first_name} ${referralAgent.last_name}`,
        referral_code: referralCode,
        external_id: referralAgent.external_id,
        is_active: true
      } : null,
      seo: {
        title: generateSeoTitle(tags, {}),
        description: `Encuentra las mejores propiedades${tags.length > 0 ? ' en ' + tags.map((t)=>t.name).join(', ') : ''} con CLIC.`,
        canonical: url.pathname,
        tags: tags,
        breadcrumbs: generateBreadcrumbs(tags)
      }
    };
    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('❌ Error en tag-search extendido:', error);
    return new Response(JSON.stringify({
      error: 'Error interno del servidor',
      message: error.message,
      timestamp: new Date().toISOString(),
      stack: error.stack
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});