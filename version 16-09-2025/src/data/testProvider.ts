// src/data/testProvider.ts - PROVIDER SIMPLIFICADO PARA DEBUGGING
import { HYBRID_CONFIG } from './hybridConfig';

/**
 * 🧪 PROVIDER DE TEST SIMPLIFICADO
 * Solo para diagnosticar problemas de conexión con la API
 */
export class TestProvider {
  private static SUPABASE_API_URL = 'https://pacewqgypevfgjmdsorz.supabase.co/functions/v1/property-search';
  private static SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhY2V3cWd5cGV2ZmdqbWRzb3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2NjU4OTksImV4cCI6MjA2NDI0MTg5OX0.Qlg-UVy-sikr76GxYmTcfCz1EnAqPHxvFeLrdqnjuWs';
  
  /**
   * 🧪 Test directo de la API
   */
  static async testAPIDirectly(segments: string[]): Promise<{
    success: boolean;
    data?: any;
    error?: string;
    requestInfo: {
      url: string;
      segments: string[];
      headers: Record<string, string>;
    };
  }> {
    const apiPath = segments.join('/');
    const apiUrl = `${this.SUPABASE_API_URL}/${apiPath}`;
    
    const headers = {
      'Authorization': `Bearer ${this.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    };
    
    const requestInfo = {
      url: apiUrl,
      segments,
      headers
    };
    
    console.log('🧪 TestProvider.testAPIDirectly', requestInfo);
    
    try {
      const startTime = Date.now();
      const response = await fetch(apiUrl, { headers });
      const endTime = Date.now();
      
      console.log(`📡 API Response in ${endTime - startTime}ms:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `${response.status}: ${errorText}`,
          requestInfo
        };
      }
      
      const data = await response.json();
      console.log('✅ API Data received:', {
        type: data.type,
        dataLength: Array.isArray(data.data) ? data.data.length : 'not array',
        hasProperties: !!data.data
      });
      
      return {
        success: true,
        data,
        requestInfo
      };
      
    } catch (error) {
      console.error('💥 API Exception:', error);
      return {
        success: false,
        error: error.message,
        requestInfo
      };
    }
  }
  
  /**
   * 🔍 Diagnóstico de configuración
   */
  static diagnoseConfiguration(): {
    configOK: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Verificar configuración básica
    if (!HYBRID_CONFIG.use_real_api) {
      issues.push('use_real_api está desactivado');
      recommendations.push('Activar use_real_api en hybridConfig.ts');
    }
    
    if (HYBRID_CONFIG.content_sources.properties !== 'api') {
      issues.push(`content_sources.properties está en '${HYBRID_CONFIG.content_sources.properties}' en lugar de 'api'`);
      recommendations.push('Cambiar content_sources.properties a "api" en hybridConfig.ts');
    }
    
    if (!HYBRID_CONFIG.api_base_url) {
      issues.push('api_base_url no está configurada');
      recommendations.push('Configurar api_base_url en hybridConfig.ts');
    }
    
    if (!HYBRID_CONFIG.api_base_url.includes('supabase.co')) {
      issues.push('api_base_url no parece ser de Supabase');
      recommendations.push('Verificar que la URL de Supabase sea correcta');
    }
    
    // Verificar credenciales
    if (!this.SUPABASE_ANON_KEY) {
      issues.push('SUPABASE_ANON_KEY no está configurada');
      recommendations.push('Configurar la clave anón de Supabase');
    }
    
    if (this.SUPABASE_ANON_KEY.length < 100) {
      issues.push('SUPABASE_ANON_KEY parece ser inválida (muy corta)');
      recommendations.push('Verificar que la clave anón sea correcta');
    }
    
    return {
      configOK: issues.length === 0,
      issues,
      recommendations
    };
  }
  
  /**
   * 🧪 Test de conectividad básica
   */
  static async testConnectivity(): Promise<{
    reachable: boolean;
    error?: string;
    responseTime?: number;
  }> {
    try {
      const startTime = Date.now();
      const response = await fetch(this.SUPABASE_API_URL, {
        method: 'OPTIONS',
        headers: {
          'Authorization': `Bearer ${this.SUPABASE_ANON_KEY}`
        }
      });
      const endTime = Date.now();
      
      return {
        reachable: true,
        responseTime: endTime - startTime
      };
    } catch (error) {
      return {
        reachable: false,
        error: error.message
      };
    }
  }
  
  /**
   * 🔍 Test completo de diagnóstico
   */
  static async runFullDiagnostic(segments: string[] = ['comprar']): Promise<{
    configuration: ReturnType<typeof TestProvider.diagnoseConfiguration>;
    connectivity: Awaited<ReturnType<typeof TestProvider.testConnectivity>>;
    apiTest: Awaited<ReturnType<typeof TestProvider.testAPIDirectly>>;
    summary: {
      overallStatus: 'success' | 'partial' | 'failure';
      mainIssue?: string;
      nextSteps: string[];
    };
  }> {
    console.log('🔍 Ejecutando diagnóstico completo...');
    
    const configuration = this.diagnoseConfiguration();
    const connectivity = await this.testConnectivity();
    const apiTest = await this.testAPIDirectly(segments);
    
    // Determinar estado general
    let overallStatus: 'success' | 'partial' | 'failure' = 'success';
    let mainIssue: string | undefined;
    const nextSteps: string[] = [];
    
    if (!configuration.configOK) {
      overallStatus = 'failure';
      mainIssue = 'Problemas de configuración';
      nextSteps.push(...configuration.recommendations);
    } else if (!connectivity.reachable) {
      overallStatus = 'failure';
      mainIssue = 'No se puede conectar a la API';
      nextSteps.push('Verificar conectividad a internet', 'Verificar URL de Supabase');
    } else if (!apiTest.success) {
      overallStatus = 'partial';
      mainIssue = 'API accesible pero devuelve error';
      nextSteps.push('Verificar que la Edge Function esté desplegada', 'Revisar logs de Supabase');
    }
    
    if (overallStatus === 'success') {
      nextSteps.push('Todo funciona correctamente', 'Verificar que el HybridProvider use este test');
    }
    
    return {
      configuration,
      connectivity,
      apiTest,
      summary: {
        overallStatus,
        mainIssue,
        nextSteps
      }
    };
  }
}

/**
 * 🚀 Función de conveniencia para usar en páginas
 */
export async function testAPIConnection(segments: string[] = ['comprar']) {
  return TestProvider.runFullDiagnostic(segments);
}