# 🚀 Sistema Completo de Favoritos - Instrucciones de Despliegue

## ✅ Cambios Realizados:

### 1. **Nueva Edge Function `/favorites`**
Creada en `edge/favorites/index.ts` - Maneja CRUD de favoritos en Supabase

**Endpoints:**
- `GET /favorites/{device_id}` - Obtener favoritos
- `POST /favorites/{device_id}/add` - Agregar propiedad
- `POST /favorites/{device_id}/remove` - Eliminar propiedad
- `POST /favorites/{device_id}/email` - Actualizar email

### 2. **Actualizado `favorites-handler.ts`**
Ahora usa la tabla `favorites_lists` correctamente con los campos:
- `public_id` (device ID único)
- `properties` (array JSONB de IDs)
- `email` (opcional)
- `created_at`, `updated_at`, `last_accessed`

### 3. **SimpleFavoritesManager**
Ya configurado en `Layout.astro` - Solo necesita que la edge function esté desplegada

---

## 📋 Pasos para Desplegar:

### **Paso 1: Desplegar Edge Functions**

```bash
# Navega al proyecto
cd "c:\Users\Rene Castillo\astro-clic"

# Despliega la nueva función de favoritos
supabase functions deploy favorites

# Despliega la función actualizada de content-backend
supabase functions deploy content-backend
```

### **Paso 2: Verificar Políticas RLS**

Ejecuta en el SQL Editor de Supabase:

```sql
-- Permitir SELECT para usuarios anónimos
CREATE POLICY "Allow anon select on favorites_lists"
  ON favorites_lists
  FOR SELECT
  TO anon
  USING (true);

-- Las inserts/updates las hace la función con service_role, no necesitan política
```

### **Paso 3: Probar el Sistema**

1. **Agregar favoritos:**
   - Ve a cualquier propiedad
   - Haz clic en el corazón ❤️
   - Abre DevTools (F12) y verifica en Console que veas: `✅ Favorite added successfully`

2. **Ver favoritos:**
   - Ve a `/favoritos`
   - Deberías ver tus propiedades guardadas

3. **Compartir favoritos:**
   - En `/favoritos`, haz clic en "Compartir"
   - Copia el enlace generado (ej: `/favoritos/compartir?id=DEV-0f1241a8-120`)
   - Abre en una ventana de incógnito
   - Deberías ver la lista compartida con todas las propiedades

---

## 🔍 Debugging:

### Ver logs de las funciones:

```bash
# Logs de favorites
supabase functions logs favorites --tail

# Logs de content-backend
supabase functions logs content-backend --tail
```

### Verificar datos en la base de datos:

```sql
-- Ver todas las listas de favoritos
SELECT
  id,
  public_id,
  email,
  jsonb_array_length(properties) as property_count,
  created_at,
  last_accessed
FROM favorites_lists
ORDER BY created_at DESC;

-- Ver una lista específica
SELECT *
FROM favorites_lists
WHERE public_id = 'DEV-0f1241a8-120';
```

---

## ✨ Flujo Completo:

1. **Usuario agrega favoritos** → Se guarda en `localStorage` + llama a `/favorites/{device_id}/add`
2. **Backend crea/actualiza** registro en `favorites_lists` tabla
3. **Usuario comparte** → URL usa el `public_id` como parámetro
4. **Otra persona abre** → `content-backend` busca en `favorites_lists` y muestra propiedades

---

## 🎯 URLs de Prueba:

- **Ver favoritos**: `http://localhost:4321/favoritos`
- **Compartir**: `http://localhost:4321/favoritos/compartir?id=DEV-xxx`
- **API directa**: `https://pacewqgypevfgjmdsorz.supabase.co/functions/v1/favorites/DEV-xxx`

---

## ⚠️ Notas Importantes:

1. **Device ID**: Se genera automáticamente en el navegador y se guarda en `localStorage`
2. **Email**: Opcional - permite sincronizar favoritos entre dispositivos
3. **Compartir**: Funciona inmediatamente después de agregar favoritos (se guarda en BD)
4. **Sin autenticación**: Sistema funciona para usuarios anónimos

---

## 🐛 Problemas Comunes:

### Error: "Missing Supabase configuration"
- Las edge functions tienen acceso automático a `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`
- No necesitas configurar nada, solo desplegar

### Error: "Shared list not found"
- Verifica que el `public_id` exista en la tabla `favorites_lists`
- El usuario debe haber agregado al menos 1 favorito primero

### Los favoritos no se guardan
- Verifica los logs: `supabase functions logs favorites --tail`
- Verifica que la tabla `favorites_lists` existe
- Revisa la consola del navegador para errores de CORS

---

¡Listo! El sistema completo de favoritos está implementado y listo para usar.
