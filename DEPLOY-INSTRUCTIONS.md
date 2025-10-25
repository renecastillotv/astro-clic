# 🚀 Instrucciones de Despliegue - Favoritos Compartidos

## Cambios realizados:

Se actualizó el `favorites-handler.ts` para soportar URLs de favoritos compartidos con query parameters.

## Para desplegar los cambios:

```bash
# Navega al directorio del proyecto
cd "c:\Users\Rene Castillo\astro-clic"

# Despliega la edge function actualizada
supabase functions deploy content-backend
```

## URLs soportadas:

Ahora ambas funcionan:
- ✅ `/favoritos/compartir/DEV-0f1241a8-120`
- ✅ `/favoritos/compartir?id=DEV-0f1241a8-120`

## Verificar después del deploy:

1. Recarga la página: `http://localhost:4321/favoritos/compartir?id=DEV-0f1241a8-120`
2. Revisa los logs de la función: `supabase functions logs content-backend --tail`
3. Deberías ver en los logs: `🔗 Handling shared favorites: DEV-0f1241a8-120`

## Nota importante:

Para que la página funcione completamente, necesitas tener datos en la tabla `favorite_lists`:

- `share_slug` = `'DEV-0f1241a8-120'`
- `is_public` = `true`
- Con propiedades asociadas en `favorite_list_properties`

Si no tienes datos de prueba, la función devolverá: "Shared list not found or expired"
