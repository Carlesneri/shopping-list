# COMPALE

## Problema conocido: timeouts con Cloudflare R2 en desarrollo local

### Síntoma

Al abrir `/media/{id}` en local, la lista de archivos se muestra vacía y en los
logs aparece un error de timeout:

```
Error [AbortError]: Request aborted
  [cause]: Error [TimeoutError]: The operation was aborted due to timeout
    code: 23 (TIMEOUT_ERR)
```

La petición `ListObjectsV2` contra R2 tarda los 15s del `AbortSignal.timeout`
(ver `lib/actions/media.ts`) y nunca llega a completarse.

### Causa raíz

No es un bug del código. **El endpoint R2 de Cloudflare resuelve a IPs del rango
anycast `172.64.0.0/13` que quedan sin enrutar desde la red local.** El DNS
resuelve correctamente (mismo resultado con `1.1.1.1` y `8.8.8.8`), pero la
conexión TCP a `172.64.x.x:443` no se establece (timeout en `curl`, `nc` y
traceroute).

En el caso observado, el traceroute se muere dentro de la red de **Orange
España** (hops internos `10.x.x.x` y luego `* * *`), mientras que otras IPs de
Cloudflare (`cloudflare.com` → `104.16.x.x`) sí son alcanzables. Es un problema
de enrutado del proveedor de Internet, no del proyecto.

En producción (Vercel/Node) funciona porque el servidor sí llega a ese rango de
IPs.

### Diagnóstico

```bash
# 1. ¿Resuelve el DNS? (debería devolver 172.64.x.x)
dig +short 943ab35e84a9e7205c0337203d15dfc7.r2.cloudflarestorage.com

# 2. ¿Es alcanzable? (si falla con timeout, es red, no código)
curl -sS -o /dev/null -w '%{http_code} %{time_total}s\n' --max-time 10 \
  https://943ab35e84a9e7205c0337203d15dfc7.r2.cloudflarestorage.com

# 3. Compara con otra IP de Cloudflare (debería funcionar)
curl -sS -o /dev/null -w '%{http_code} %{time_total}s\n' --max-time 10 https://cloudflare.com

# 4. Ver dónde se muere la ruta
traceroute 172.64.66.1
```

### Soluciones / workarounds

1. **VPN**: con cualquier VPN conectada el rango es alcanzable. Es la opción más
   rápida para desarrollar en local.
2. **Otra red**: datos móviles / hotspot para confirmar que el bloqueo es del ISP.
3. **Dominio personalizado de Cloudflare**: apuntar el bucket R2 a un dominio
   propio (usa otro rango de IPs).
4. **Reportar al ISP**: en el caso observado (Orange España) es un problema de
   enrutado de su lado y un ticket podría resolverlo.

### Nota técnica

El endpoint se construye en `lib/actions/media.ts` (`normalizeR2Endpoint`) y el
timeout está controlado por `AbortSignal.timeout(15_000)` con `maxAttempts: 1`
en el `S3Client` para que un intento colgado no se reintente antes del abort.
