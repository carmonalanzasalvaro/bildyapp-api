# EXAMEN — Álvaro Carmona Lanza

## Reto
F13 — Semántica PUT vs PATCH: idempotencia y reemplazo total

## Tarea técnica

### Qué problema detecté
Al inspeccionar el repositorio real, vi que los endpoints de actualización de cliente y proyecto están registrados como `PUT`: `PUT /api/client/:id` y `PUT /api/project/:id`. La sospecha inicial era que quizá estuvieran haciendo una actualización parcial y que, por tanto, encajaran mejor como `PATCH`. Sin embargo, en este proyecto los validadores de actualización reutilizan el esquema completo de creación y obligan a enviar los campos principales del recurso. Además, los servicios cargan el documento, asignan explícitamente los campos recibidos y guardan el recurso, por lo que la semántica actual se acerca más a un reemplazo controlado que a un parche parcial.

### Cómo lo arreglé
No cambié los endpoints a `PATCH` porque habría sido incoherente con la implementación real. Mantuve `PUT` en clientes y proyectos, y añadí un test específico de idempotencia para `PUT /api/project/:id`. El test crea un proyecto, envía dos veces la misma representación completa al endpoint de actualización y comprueba que el estado estable del recurso después de ambas llamadas es el mismo. También revisé Swagger y comprobé que documenta estos endpoints como `PUT`, lo cual es coherente con la decisión tomada.

### Por qué mi solución es correcta
RFC 9110 define `PUT` como una petición para crear o reemplazar el estado del recurso objetivo con la representación enviada. En cambio, `PATCH` se usa para aplicar modificaciones parciales; si se quiere citar con precisión, PATCH está definido en RFC 5789. Como mi API de cliente y proyecto exige una representación completa validada para actualizar y no acepta simplemente cualquier subconjunto arbitrario de campos, mantener `PUT` es más correcto que cambiarlo a `PATCH`. Además, la operación es idempotente: enviar dos veces la misma representación completa deja el recurso en el mismo estado final.

## Respuestas socráticas

1. Según RFC 9110, `PUT` representa crear o reemplazar el estado del recurso objetivo con la representación enviada, mientras que `PATCH` aplica una modificación parcial. En este proyecto, `PATCH /api/deliverynote/:id/sign` no reemplaza el albarán completo, sino que realiza una transición parcial: añade firma, marca el albarán como firmado y guarda el PDF. En la implementación real, si el albarán ya está firmado, `signDeliveryNote` devuelve un conflicto `409` con código `DELIVERY_NOTE_SIGNED`. Por eso no es idempotente en el sentido práctico de obtener el mismo resultado HTTP en llamadas repetidas: la primera firma y la segunda falla, aunque el estado final firmado no cambie.

2. En este proyecto no se usa `findOneAndUpdate(..., body, { new: true })` para clientes, sino que se carga el cliente, se asignan campos concretos y se llama a `save()`. Además, `updateClientSchema` exige el mismo cuerpo completo que la creación, incluyendo `email`, así que una petición sin `email` no pasa validación. Si existiera un `PUT` que aceptase body parcial y no modificase el email ausente, eso sería comportamiento de actualización parcial y se parecería a `PATCH`. RFC 9110 apoya esta distinción porque describe `PUT` como reemplazo del estado del recurso con la representación enviada.

3. En `src/services/deliverynote.service.js`, `deleteDeliveryNote` lanza `AppError.conflict` si el albarán está firmado, y `signDeliveryNote` también lanza conflicto si ya estaba firmado. Revisando `src/controllers/deliverynote.controller.js`, el evento realtime de firma se emite después de que `signDeliveryNote` haya terminado; dentro del servicio, primero se guarda el albarán con `await deliveryNote.save()` y después el controlador llama a `emitCompanyEvent`. Emitir antes de guardar tendría el riesgo de avisar al cliente de un cambio que luego falla en base de datos. Emitir después es más fiable porque representa estado persistido, aunque si falla la emisión la base de datos ya quedó modificada; para garantías fuertes se podría usar un outbox pattern o un event log, sin afirmar que este proyecto implemente event sourcing.

4. En `src/config/socket.js`, el middleware de Socket.IO llama a `resolveAuthenticatedUser(token)` en cada conexión. Si un usuario abre 100 pestañas y cada una crea su propia conexión socket, ese middleware se ejecutaría 100 veces y, como `resolveAuthenticatedUser` consulta el usuario y su compañía, provocaría 100 verificaciones/consultas de autenticación. Para reducirlo, se podría cachear durante poco tiempo el resultado de validar el token o el usuario por `userId`/identificador de token con un TTL corto. También se podría compartir una única conexión socket en el frontend o limitar conexiones, pero sin eliminar la validación de compañía ni romper el aislamiento multi-tenant por rooms de company.

5. Una URL pre-firmada de S3 es temporal: si expira en una hora, un cliente que guarde esa URL y la reutilice más tarde ya no podrá acceder al PDF. Por eso no conviene persistir una pre-signed URL como identificador permanente del documento. En este proyecto, `uploadBuffer` guarda una referencia usable (`publicBaseUrl + key` si hay URL pública configurada, o la `key` si no la hay) y `getFileUrl` resuelve después una URL pública o una pre-signed URL nueva cuando el valor almacenado no es absoluto. La estrategia que defendería es mantener una referencia estable al objeto y resolver/generar una URL de descarga en el backend cuando el cliente la necesite, validando permisos en ese momento.

## Proceso

Tiempo total invertido: aproximadamente 1 hora y 30 minutos.

Herramientas usadas:
- IDE/editor
- npm test
- npm run lint

Notas de trabajo:
- Se inspeccionó el repositorio real antes de decidir la semántica de los endpoints.
- Se añadió cobertura de idempotencia y se documentó la decisión técnica en este archivo.

Commits descriptivos:
- Añade test de idempotencia en actualización de proyectos
- Documenta decisión PUT PATCH del examen
