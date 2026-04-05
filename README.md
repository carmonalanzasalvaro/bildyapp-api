# BildyApp API

Backend REST desarrollado con **Node.js**, **Express** y **MongoDB** para la gestión de usuarios de **BildyApp**.

Esta práctica implementa el módulo completo de usuarios: registro, validación de email, login, onboarding personal y de compañía, subida de logo, obtención del usuario autenticado, gestión de sesión, borrado lógico/físico, cambio de contraseña e invitación de compañeros.

---

## Objetivo de la práctica

El objetivo de esta práctica no era únicamente crear endpoints que respondan, sino construir una API con una estructura mantenible y coherente con lo trabajado en los temas de la asignatura:

- uso de **Node.js con ESM**
- trabajo con **Express 5**
- validación con **Zod**
- persistencia con **MongoDB + Mongoose**
- organización en **arquitectura MVC**
- autenticación mediante **JWT**
- control de acceso por **roles**
- manejo de errores centralizado
- medidas básicas de seguridad
- gestión de relaciones entre entidades (`User` y `Company`)

La idea ha sido que la implementación no solo funcione, sino que también sea fácil de seguir, ampliar y corregir.

---

## Tecnologías utilizadas

- **Node.js 22+**
- **Express 5**
- **MongoDB**
- **Mongoose**
- **Zod**
- **jsonwebtoken**
- **bcryptjs**
- **Multer**
- **Helmet**
- **express-rate-limit**

---

## Decisiones de diseño

### 1. Uso de arquitectura MVC

El proyecto está organizado siguiendo una estructura **MVC**:

- `models/`: definición de los datos y esquemas Mongoose
- `controllers/`: lógica de negocio de cada endpoint
- `routes/`: definición de rutas
- `middleware/`: autenticación, validación, subida de archivos, errores, roles, sanitización
- `validators/`: esquemas Zod
- `services/`: eventos del ciclo de vida del usuario
- `utils/`: utilidades generales como `AppError`

#### Por qué se ha hecho así

Separar responsabilidades hace que el proyecto sea más mantenible.

Si toda la lógica estuviera mezclada en las rutas, el código sería más difícil de leer, probar y modificar. Con esta organización:

- las rutas solo declaran qué se ejecuta
- los controladores contienen la lógica
- los modelos definen la estructura de datos
- la validación está desacoplada de la lógica de negocio
- los middlewares resuelven problemas transversales como auth, errores o subida de ficheros

---

### 2. Uso de ESM

El proyecto usa `"type": "module"` en `package.json`, por lo que todas las importaciones/exportaciones están hechas con `import` y `export`.

#### Por qué

Era un requisito de la práctica y además es el sistema moderno de módulos en Node.js. De esta forma el proyecto queda alineado con la forma actual de trabajar en JavaScript del lado del servidor.

---

### 3. Configuración centralizada

La configuración está centralizada en `src/config/index.js`, donde se recogen las variables de entorno y se transforman a tipos útiles cuando hace falta.

#### Por qué

Esto evita valores mágicos repartidos por todo el proyecto y facilita cambiar configuración sin tocar la lógica interna.

Ejemplos:
- puerto
- URI de MongoDB
- secretos JWT
- expiración de tokens
- tamaño máximo de subida
- directorio de uploads

---

### 4. Conexión a base de datos antes de arrancar el servidor

La aplicación solo empieza a escuchar peticiones si la conexión a MongoDB se ha realizado correctamente.

#### Por qué

Tiene más sentido que el servidor no arranque si la base de datos no está disponible, porque casi todos los endpoints dependen de ella. Así se evita que la API parezca encendida cuando en realidad no puede funcionar.

---

## Modelado de datos

### 5. Modelo `User`

El modelo `User` contiene:

- email
- password
- name
- lastName
- nif
- role
- status
- verificationCode
- verificationAttempts
- company
- address
- refreshTokens
- deleted
- timestamps

#### Decisiones importantes

**Email único**  
El email se ha definido como `unique` porque es el identificador natural del usuario en el sistema.

**Password con `select: false`**  
La contraseña no se devuelve por defecto en las consultas.

**Por qué**  
Es una medida básica de seguridad: la contraseña no debería salir accidentalmente en respuestas JSON.

**`role`**  
Se ha limitado a:
- `admin`
- `guest`

**Por qué**  
La práctica solo necesita esos dos roles, así que no tenía sentido complicar el modelo con más casos.

**`status`**  
Se ha limitado a:
- `pending`
- `verified`

**Por qué**  
Permite separar claramente a un usuario recién registrado de uno que ya ha validado su email.

**`company`**  
Es una referencia a `Company`.

**Por qué**  
Un usuario pertenece a una compañía, y eso se resuelve mejor mediante referencia que duplicando datos.

**`refreshTokens`**  
Se ha añadido un array de refresh tokens.

**Por qué**  
La práctica pide access token y refresh token. Guardarlos en base de datos permite invalidarlos después en `logout` o al cambiar contraseña.

**`deleted`**  
Se ha añadido un campo booleano para soft delete.

**Por qué**  
La práctica exige soportar borrado lógico. Esto permite desactivar al usuario sin eliminarlo físicamente de la colección.

---

### 6. Virtual `fullName`

Se ha definido un virtual `fullName` que concatena `name` y `lastName`.

#### Por qué

No tiene sentido guardar en base de datos un campo que se puede calcular a partir de otros dos. El virtual permite devolver ese dato ya construido sin duplicarlo en MongoDB.

Además, se ha activado en `toJSON` para que aparezca directamente en las respuestas.

---

### 7. Índices en Mongoose

Se han añadido índices en campos frecuentes:

- `email`
- `company`
- `status`
- `role`

#### Por qué

El enunciado los recomienda y además tienen sentido real:

- `email`: búsquedas de login, registro y validación de duplicados
- `company`: consultas por compañía
- `status`: filtros de usuarios pendientes/verificados
- `role`: control de admins e invitados

---

### 8. Modelo `Company`

El modelo `Company` contiene:

- owner
- name
- cif
- address
- logo
- isFreelance
- deleted
- timestamps

#### Decisiones importantes

**`owner`**  
Guarda el usuario que creó la compañía.

**Por qué**  
Permite saber quién fue el primer admin y distinguir el caso en el que una company ya existía.

**`cif` único**  
Se ha marcado como `unique`.

**Por qué**  
La lógica del onboarding gira alrededor de si el CIF ya existe o no. Para que esa lógica tenga sentido, no puede haber dos compañías distintas con el mismo CIF.

**`isFreelance`**  
Permite distinguir entre una empresa normal y el caso del autónomo.

**Por qué**  
La práctica introduce explícitamente ese caso. En freelance, la compañía se construye a partir de los datos del propio usuario.

**`logo`**  
Se guarda como una ruta o URL.

**Por qué**  
No se guarda el binario en MongoDB. Es más simple y más razonable almacenar la imagen en disco y persistir únicamente su ruta.

---

## Validación

### 9. Validación con Zod

Toda la validación de entrada se ha centralizado en `src/validators/user.validator.js` y se aplica mediante un middleware reutilizable.

#### Por qué

Validar en las rutas o dentro de cada controlador generaría mucha repetición. Con un middleware genérico:

- se mantiene el código más limpio
- los controladores trabajan con datos ya validados
- los errores de validación tienen un formato uniforme

---

### 10. Uso de normalización en los esquemas

En los esquemas se han aplicado normalizaciones como:

- email a minúsculas
- strings sin espacios sobrantes
- NIF/CIF en mayúsculas

#### Por qué

No basta con validar: también conviene normalizar los datos. Por ejemplo, `USER@MAIL.COM` y `user@mail.com` deberían tratarse como el mismo email.

---

### 11. Uso de `.refine()`

Se ha usado `.refine()` para comprobar que la nueva contraseña sea distinta de la actual.

#### Por qué

Esa validación depende de dos campos a la vez, por lo que encaja mejor en una validación cruzada.

---

### 12. Uso de `discriminatedUnion` en company

La validación de compañía se ha resuelto con una unión discriminada basada en `isFreelance`.

#### Por qué

No se validan igual estos dos casos:

- empresa normal
- autónomo

Con `discriminatedUnion` el esquema refleja mejor la lógica real:
- si `isFreelance` es `true`, no hace falta pedir nombre, CIF y dirección manualmente
- si es `false`, esos datos sí son obligatorios

Esto hace la validación más clara y más robusta.

---

## Manejo de errores

### 13. Clase `AppError`

Se ha creado una clase `AppError` con métodos factoría para errores comunes:

- `badRequest`
- `unauthorized`
- `forbidden`
- `notFound`
- `conflict`
- `tooManyRequests`
- `internal`

#### Por qué

En una API conviene separar los errores esperables de los fallos inesperados.

Con `AppError`:
- el código queda más expresivo
- se evita repetir números de estado por todas partes
- el middleware de errores puede responder siempre con el mismo formato

---

### 14. Middleware centralizado de errores

Se ha implementado un middleware final que captura:

- errores propios (`AppError`)
- errores de Mongo/Mongoose
- errores de duplicidad
- errores de Multer
- errores no controlados

#### Por qué

Centralizar el tratamiento de errores hace que:

- las respuestas sean consistentes
- los controladores sean más limpios
- no haya que repetir `res.status(...).json(...)` para cada caso

---

## Autenticación y autorización

### 15. JWT con access token y refresh token

La autenticación se basa en dos tokens:

- **access token** de corta duración
- **refresh token** de duración más larga

#### Por qué

Separar ambos tokens es más realista y más seguro que usar uno solo.

**Access token**  
Se usa para acceder a endpoints protegidos.

**Por qué corto**  
Si se roba, su tiempo de vida es pequeño.

**Refresh token**  
Sirve para pedir un nuevo access token sin volver a hacer login completo.

**Por qué más largo**  
Mejora la experiencia y encaja con la práctica, que exige ese flujo.

---

### 16. Password cifrada con bcrypt

Las contraseñas se almacenan cifradas con `bcryptjs`.

#### Por qué

Nunca se debe guardar una contraseña en texto plano. El hash protege la contraseña incluso si alguien accediera a la base de datos.

---

### 17. Middleware de autenticación

Se ha creado `auth.middleware.js` para:

- leer el header `Authorization`
- comprobar que existe un bearer token
- verificar el JWT
- cargar al usuario autenticado
- ponerlo en `req.user`

#### Por qué

Así cualquier endpoint protegido puede reutilizar exactamente la misma lógica y trabajar directamente con el usuario autenticado.

---

### 18. Middleware de roles

Se ha creado `role.middleware.js` para restringir rutas según rol.

#### Por qué

No todos los usuarios pueden hacer lo mismo. Por ejemplo, la invitación de compañeros solo debe poder hacerla un `admin`.

Separar esta lógica en middleware evita meter comprobaciones de rol dentro de cada controlador.

---

## Endpoints implementados y justificación

### 19. `POST /api/user/register`

Registra un usuario con:

- email validado
- contraseña validada
- contraseña cifrada
- código de verificación
- número de intentos
- role `admin` por defecto
- tokens de sesión

#### Por qué se ha hecho así

El usuario se crea inicialmente como `admin` porque todavía no se sabe si terminará creando una company propia o uniéndose a una ya existente. Ese ajuste final se hace durante el onboarding de compañía.

---

### 20. `PUT /api/user/validation`

Valida el email mediante un código de 6 dígitos.

#### Por qué se ha hecho así

La práctica pide simular una verificación de email aunque todavía no se envíe correo real. Además, el contador de intentos aporta un control sencillo ante errores repetidos o usos indebidos.

---

### 21. `POST /api/user/login`

Comprueba credenciales y devuelve:
- usuario
- access token
- refresh token

#### Por qué se ha hecho así

El login es el punto natural para generar una sesión nueva. Además, se guarda el refresh token para poder invalidarlo después.

---

### 22. `PUT /api/user/register` (datos personales)

Aunque reutiliza la ruta `/register`, aquí se usa para completar:

- nombre
- apellidos
- NIF
- dirección

#### Por qué se ha hecho así

Se ha respetado el enunciado, aunque en un proyecto real probablemente esta ruta habría sido `/profile` o similar.

---

### 23. `PATCH /api/user/company`

Gestiona la parte más importante del onboarding:

- si el CIF no existe, crea una company nueva
- si el CIF ya existe, el usuario se une a ella
- si se une a una existente, pasa a `guest`
- si crea una nueva, queda como `admin`
- si `isFreelance` es `true`, la company se genera a partir del usuario

#### Por qué se ha hecho así

Este endpoint refleja la lógica central del ejercicio:

- la relación entre `User` y `Company`
- la diferenciación entre empresa nueva y empresa existente
- la reasignación de roles
- el caso especial del autónomo

---

### 24. `PATCH /api/user/logo`

Permite subir una imagen como logo de la compañía.

#### Por qué se ha hecho así

Se ha usado **Multer** para gestionar `multipart/form-data`, porque es la solución habitual en Express para subida de archivos.

Además:
- se valida que el archivo sea imagen
- se controla el tamaño máximo
- se guarda el fichero en `uploads/`
- se persiste la ruta en `company.logo`

---

### 25. `GET /api/user`

Devuelve el usuario autenticado con `populate('company')`.

#### Por qué se ha hecho así

El enunciado pide expresamente devolver la company completa y no solo su identificador. Usar `populate` resuelve esto de forma directa y además permite comprobar visualmente que la asociación entre usuario y compañía está bien construida.

---

### 26. `POST /api/user/refresh`

Recibe un refresh token y devuelve un nuevo access token.

#### Por qué se ha hecho así

Permite renovar la sesión sin volver a pedir email y contraseña.

La comprobación se hace en dos pasos:
1. verificar la firma y expiración del refresh token
2. comprobar que ese token sigue guardado en el usuario

Esto evita aceptar refresh tokens que ya fueron invalidados.

---

### 27. `POST /api/user/logout`

Invalida los refresh tokens del usuario.

#### Por qué se ha hecho así

Si no se invalida el refresh token, el usuario podría seguir renovando la sesión después de cerrar sesión. En esta implementación se vacían los refresh tokens del usuario para simplificar el flujo.

---

### 28. `DELETE /api/user`

Permite:
- **soft delete** con `?soft=true`
- **hard delete** sin query o con `soft=false`

#### Por qué se ha hecho así

La práctica exige soportar ambos casos.

**Soft delete**  
No elimina el documento, solo marca `deleted: true`.

**Ventajas**
- permite recuperación manual
- mantiene trazabilidad
- evita borrados definitivos por error

**Hard delete**  
Elimina físicamente el usuario.

**Por qué también existe**  
Porque el enunciado lo contempla y porque a veces interesa una eliminación definitiva en pruebas.

---

### 29. `PUT /api/user/password`

Permite cambiar la contraseña del usuario autenticado.

#### Por qué se ha hecho así

Antes de cambiar la contraseña:
- se valida que la actual sea correcta
- se valida que la nueva no sea la misma
- se vuelve a cifrar con bcrypt

Además, se invalidan los refresh tokens.

**Por qué se invalidan**  
Si la contraseña cambia, lo razonable es obligar a renovar las sesiones activas por seguridad.

---

### 30. `POST /api/user/invite`

Permite a un `admin` invitar compañeros.

#### Qué hace

- crea un nuevo usuario
- lo asigna a la misma company
- le da role `guest`
- lo deja en `pending`
- emite un evento `user:invited`

#### Por qué se ha hecho así

La invitación tiene sentido como mecanismo de incorporación controlada a una compañía ya existente. El invitado no debería convertirse en admin, sino en guest, porque no es quien creó la company.

---

## Eventos

### 31. Uso de `EventEmitter`

Se ha implementado un servicio de notificaciones con eventos:

- `user:registered`
- `user:verified`
- `user:invited`
- `user:deleted`

#### Por qué

La práctica lo pide expresamente y, además, es una forma buena de desacoplar acciones secundarias del flujo principal.

Ahora mismo los listeners solo hacen `console.log`, pero esta misma estructura permitiría después:
- enviar emails
- mandar mensajes a Slack
- registrar actividad
- disparar auditoría

---

## Seguridad

### 32. Helmet

Se ha añadido `helmet()`.

#### Por qué

Añade cabeceras HTTP de seguridad habituales sin necesidad de configurarlas una a una.

---

### 33. Rate limiting

Se ha añadido `express-rate-limit` sobre `/api`.

#### Por qué

Limita abusos básicos y protege especialmente endpoints sensibles como login o register.

---

### 34. Sanitización de peticiones

Se ha añadido un middleware de sanitización para limpiar claves sospechosas como las que usan `$` o `.`.

#### Por qué

Esto reduce el riesgo de ataques de inyección NoSQL.

#### Nota de implementación

Inicialmente se valoró el uso directo de `express-mongo-sanitize`, pero en esta práctica se sustituyó por un middleware propio equivalente para evitar problemas de compatibilidad con Express 5 al trabajar con `req.query`.

---

## Estructura del proyecto

```text
bildyapp-api/
├── src/
│   ├── config/
│   │   ├── db.js
│   │   └── index.js
│   ├── controllers/
│   │   └── user.controller.js
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   ├── error-handler.js
│   │   ├── role.middleware.js
│   │   ├── sanitize.middleware.js
│   │   ├── upload.js
│   │   └── validate.js
│   ├── models/
│   │   ├── Company.js
│   │   └── User.js
│   ├── routes/
│   │   └── user.routes.js
│   ├── services/
│   │   └── notification.service.js
│   ├── utils/
│   │   ├── AppError.js
│   │   └── auth.js
│   ├── validators/
│   │   └── user.validator.js
│   ├── app.js
│   └── index.js
├── uploads/
├── .env.example
├── .gitignore
├── package.json
├── requests.http
└── README.md
```

---

## Variables de entorno

Crear un archivo `.env` a partir de `.env.example`:

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/bildyapp
JWT_ACCESS_SECRET=bildyapp_access_secret_dev
JWT_REFRESH_SECRET=bildyapp_refresh_secret_dev
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
UPLOAD_DIR=uploads
MAX_FILE_SIZE=5242880
NODE_ENV=development
```

---

## Instalación y ejecución

### 1. Instalar dependencias

```bash
npm install
```

### 2. Crear `.env`

```bash
cp .env.example .env
```

En Windows, si hace falta, se puede crear manualmente.

### 3. Arrancar MongoDB

Puede usarse:
- MongoDB local
- Docker
- MongoDB Atlas

Ejemplo con Docker:

```bash
docker run -d --name bildy-mongo -p 27017:27017 mongo:7
```

### 4. Ejecutar la aplicación

```bash
npm run dev
```

---

## Flujo recomendado de prueba

1. `POST /api/user/register`
2. consultar `verificationCode` en base de datos
3. `PUT /api/user/validation`
4. `POST /api/user/login`
5. `PUT /api/user/register`
6. `PATCH /api/user/company`
7. `GET /api/user`
8. `POST /api/user/refresh`
9. `POST /api/user/logout`
10. `PATCH /api/user/logo`
11. `POST /api/user/invite`
12. `PUT /api/user/password`
13. `DELETE /api/user?soft=true` o `DELETE /api/user`

---

## Archivo de pruebas

El proyecto incluye un archivo `requests.http` con ejemplos de peticiones para probar todos los endpoints.

#### Por qué se incluye

Porque permite:
- documentar el uso de la API
- facilitar la corrección
- dejar ejemplos rápidos sin depender de una colección externa

---

## Aspectos que se podrían mejorar

Si este proyecto evolucionara más allá de la práctica, algunas mejoras razonables serían:

- envío real del código de validación por email
- rotación de refresh tokens
- separación más clara entre `/register` y `/profile`
- tests automáticos
- almacenamiento del logo en la nube
- auditoría de sesiones
- sistema de recuperación de contraseña
- endpoint para restaurar soft delete
- paginación y filtros para listados futuros

---

## Conclusión

Esta práctica me ha servido para integrar en un mismo proyecto varios conceptos que normalmente se estudian por separado: routing, validación, modelos de datos, autenticación, autorización, errores, subida de ficheros y seguridad básica.

Más allá de que cada endpoint funcione, la intención ha sido dejar una base coherente y extensible, con una estructura clara y decisiones justificadas, para que el proyecto se pueda entender, corregir y ampliar con facilidad.
