# Google Drive media provider — estado y próximos pasos

Implementación mínima (conexión + listar archivos) según el enfoque A:
consentimiento OAuth incremental por storage, refresh token cifrado en
Firestore, y proxy de streaming autenticado (Drive no tiene URLs prefirmadas).

## Qué está hecho

- `lib/drive.ts`: cliente REST de Drive v3 (sin dependencias nuevas): refresco
  de access token, resolución de ruta → folder id, listado, streaming de
  archivos, y state firmado (HMAC con `AUTH_SECRET`, TTL 10 min).
- `lib/actions/media.ts`: `startDriveConnect` y `completeDriveConnect`
  (server action; owner/admin), branch de Drive en `createMediaStorage`,
  `listMediaStorageEntries`, `getMediaEntryUrl` y subida (`uploadMediaEntries`
  / `getMediaUploadUrl`). Mover y borrar siguen sin soporte.
- `app/(pages)/media/drive/callback/page.tsx`: landing del redirect de Google.
  Envía `code` y `state` a `completeDriveConnect`, que verifica el state, cambia el código por
  tokens y guarda el refresh token cifrado (`config.refreshTokenEnc`).
- `app/api/media/[id]/file/route.ts`: proxy de descarga/streaming con soporte
  de `Range` (imprescindible para que movi-player pueda hacer seek; una server
  action no puede ser la URL del reproductor) y `?dl=1` para descargas.
- UI: selector de proveedor en `CreateStorageForm`; estado de conexión y
  botón Conectar/Reconectar en `ajustes`; crear carpeta sigue oculto para
  Drive; `MediaStorage.config` es ahora unión
  `R2Config | DriveConfig`.
- Tests: `lib/__tests__/drive.test.ts` (state, listado, resolución de rutas) y
  caso nuevo en `media-validation.test.ts`.

## Pendiente (próximos pasos)

1. **Configuración de Google Cloud Console**
   - Registrar `<origin>/media/drive/callback` como redirect URI autorizado
     en el OAuth client (AUTH_GOOGLE_ID). Sin esto el callback falla.
   - El consentimiento pide el scope `drive` (ver y subir todos los archivos,
     también los anteriores). Si se publica, Google exige verificación.

2. **Pruebas end-to-end manuales**
   - Crear storage Drive → consentir → verificar listado y reproducción
     (seek incluido, depende del proxy con Range).
   - Reconexión tras revocar acceso en la cuenta de Google
     (`invalid_grant` → mensaje pide reconectar desde ajustes).
   - Carpeta compartida conmigo / Shared Drives (se usa
     `supportsAllDrives=true`, comprobar en la práctica).

3. **Operaciones de escritura para Drive** (subida ya hecha)
   - Borrar archivo/carpeta (`files.delete`, carpeta borra recursivo).
   - Mover: `files.update` cambiando `parents`.
   - Crear carpeta: `files.create` con `mimeType` de carpeta.
   - Al añadirlas, quitar las guardas en `getMediaStorageClient`.

4. **Detalles conocidos por pulir**
   - Nombres de carpeta duplicados en el mismo padre: se toma el primero.
   - Archivos nativos de Google (Docs/Sheets): se listan sin `size` y la
     descarga vía `alt=media` falla; decidir si filtrarlos o exportarlos.
   - `listMediaFolders` (picker de "mover") no está implementado para Drive.
   - Errores del callback llegan como `?drive_error=` y se muestran con un toast.
   - La sesión de Google del login principal no pide scopes de Drive a propósito:
     mantener así (consentimiento incremental por storage, enfoque A).
