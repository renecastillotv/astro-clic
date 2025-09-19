// src/pages/sitemap.xml.js
const SITEMAP_URL = 'https://pacewqgypevfgjmdsorz.supabase.co/functions/v1/sitemap-data';
const AUTH_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhY2V3cWd5cGV2ZmdqbWRzb3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2NjU4OTksImV4cCI6MjA2NDI0MTg5OX0.Qlg-UVy-sikr76GxYmTcfCz1EnAqPHxvFeLrdqnjuWs';

export async function GET({ request }) {
  try {
    const host = request.headers.get('host') || 'clicinmobiliaria.com';
    
    console.log('Sitemap: Getting data for host:', host);
    
    const response = await fetch(`${SITEMAP_URL}?domain=${host}`, {
      method: 'GET',
      headers: {
        'Authorization': AUTH_TOKEN,
        'Content-Type': 'application/json',
        'User-Agent': `SitemapGenerator/${host}`,
      },
    });

    if (!response.ok) {
      console.error('Backend error:', response.status);
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();
    console.log('Data received:', data.urls?.length, 'URLs for country:', data.country);

    let sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    if (data && data.urls && Array.isArray(data.urls)) {
      data.urls.forEach(urlData => {
        // Español
        if (urlData.url_es) {
          const cleanUrl = urlData.url_es.startsWith('/') ? urlData.url_es.substring(1) : urlData.url_es;
          sitemapContent += `
  <url>
    <loc>https://${host}/${cleanUrl}</loc>
    <lastmod>${urlData.lastmod}</lastmod>
    <changefreq>${urlData.changefreq}</changefreq>
    <priority>${urlData.priority}</priority>
  </url>`;
        }
        
        // Inglés
        if (urlData.url_en) {
          const cleanUrl = urlData.url_en.startsWith('/') ? urlData.url_en.substring(1) : urlData.url_en;
          sitemapContent += `
  <url>
    <loc>https://${host}/${cleanUrl}</loc>
    <lastmod>${urlData.lastmod}</lastmod>
    <changefreq>${urlData.changefreq}</changefreq>
    <priority>${urlData.priority}</priority>
  </url>`;
        }
        
        // Francés
        if (urlData.url_fr) {
          const cleanUrl = urlData.url_fr.startsWith('/') ? urlData.url_fr.substring(1) : urlData.url_fr;
          sitemapContent += `
  <url>
    <loc>https://${host}/${cleanUrl}</loc>
    <lastmod>${urlData.lastmod}</lastmod>
    <changefreq>${urlData.changefreq}</changefreq>
    <priority>${urlData.priority}</priority>
  </url>`;
        }
      });
    }

    sitemapContent += `
</urlset>`;

    console.log('Sitemap generated successfully');

    return new Response(sitemapContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'X-Robots-Tag': 'noindex'
      },
    });

  } catch (error) {
    console.error('Sitemap error:', error);
    
    const fallbackSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://clicinmobiliaria.com</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <priority>1.0</priority>
  </url>
</urlset>`;

    return new Response(fallbackSitemap, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
    });
  }
}