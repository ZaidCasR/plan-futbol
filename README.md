# Plan Futbol

App web para entrenar de lunes a sábado pensando en el partido del domingo: pliometría, fuerza, velocidad, resistencia, movilidad y prevención de lesiones. Cada jugador crea su perfil (posición, nivel y modo bajo impacto) y la app ajusta su rutina, cuenta sus series y guarda su progreso en su propio teléfono.

## Qué hay en esta carpeta

| Archivo | Para qué sirve |
|---|---|
| `index.html` | La app completa |
| `diagramas.js` | Dibujos paso a paso, animaciones y búsquedas de YouTube de cada ejercicio |
| `manifest.webmanifest`, `icon-*.png`, `apple-touch-icon.png` | Permiten instalarla en la pantalla de inicio |
| `sw.js` | Hace que abra sin señal en la cancha |
| `bsd-800.woff2`, `bsd-900.woff2`, `ah-400.woff2`, `ah-700.woff2` | Tipografías (Big Shoulders Display y Atkinson Hyperlegible, licencia SIL OFL 1.1) |
| `apps-script.gs` | Opcional: tablero del equipo en una hoja de Google |
| `README.md` | Este archivo |

## 1. Publicarla en GitHub Pages (gratis, sin instalar nada)

1. Crea una cuenta en [github.com](https://github.com) si no tienes.
2. Arriba a la derecha, **+ › New repository**.
   - Nombre: `plan-futbol` (o el que quieras; será parte del link).
   - Visibilidad: **Public**. Con la cuenta gratuita, GitHub Pages solo funciona en repositorios públicos.
   - Clic en **Create repository**.
3. En la página del repositorio vacío, clic en **uploading an existing file**.
4. Descomprime el zip en tu computadora, selecciona **todos los archivos** y arrástralos a la página. Clic en **Commit changes**.
5. Ve a **Settings › Pages**. En *Build and deployment*, en *Source* elige **Deploy from a branch**; en *Branch* elige **main** y **/ (root)**. Clic en **Save**.
6. Espera uno o dos minutos y recarga esa página. Arriba aparece el link:
   `https://TU-USUARIO.github.io/plan-futbol/`
7. Manda ese link al grupo del equipo.

> El código queda público, pero los datos de entrenamiento no: cada jugador los guarda en su propio teléfono.

## 2. Ponerle el nombre del equipo

En GitHub abre `index.html`, toca el lápiz (*Edit*) y cambia esta línea cerca del inicio del `<script>`:

```js
TEAM_NAME: 'Nuestro equipo',
```

Guarda con **Commit changes**. La app se actualiza en un par de minutos.

## 3. Cómo la usan tus compañeros

1. Abren el link y llenan su perfil: nombre, número, posición, nivel y, si pesan 95 kg o más o vienen de una lesión de rodilla o tobillo, el modo bajo impacto.
2. **La instalan en la pantalla de inicio**:
   - iPhone (Safari): botón Compartir › **Agregar a inicio**.
   - Android (Chrome): menú ⋮ › **Instalar app** o **Agregar a pantalla principal**.
3. Cada día abren **Hoy**, responden «¿Cómo llegas hoy?», marcan cada serie (el reloj de descanso arranca solo) y al final tocan **Guardar sesión**.
4. El domingo registran minutos jugados y esfuerzo del partido. Si jugaron menos de 45 minutos, el lunes activan el bloque compensatorio.

## 4. Dónde se guarda el progreso

- En el navegador de cada teléfono (almacenamiento local). No hay cuentas ni servidores.
- **iPhone**: Safari borra los datos de una página si pasas 7 días usando Safari sin abrirla. Abrirla desde el ícono de la pantalla de inicio evita ese problema.
- Cada jugador debería tocar **Guía › Tus datos › Descargar respaldo** una vez por semana. Si cambia de teléfono, usa **Cargar respaldo**.
- Mientras el link no cambie, actualizar la app no borra el progreso.

## 5. Opcional: tablero del equipo

Si quieren ver en la app quién entrenó esta semana, conecten una hoja de Google:

1. Crea una hoja de Google nueva (con la cuenta del organizador).
2. **Extensiones › Apps Script**. Borra lo que haya y pega el contenido de `apps-script.gs`.
3. Cambia `CLAVE` por una palabra que solo conozca el equipo y guarda.
4. **Implementar › Nueva implementación**. Tipo: **Aplicación web**. Ejecutar como: **Yo**. Quién tiene acceso: **Cualquier usuario**. Implementar y autorizar.
5. Copia la URL que termina en `/exec`.
6. En `index.html` (en GitHub, con el lápiz) llena:

   ```js
   SYNC_URL: 'https://script.google.com/macros/s/.../exec',
   SYNC_KEY: 'la-misma-clave',
   ```

7. Commit. Desde ese momento cada sesión guardada sube como una fila a la pestaña **Registros** de la hoja, y la pestaña **Equipo** de la app muestra el tablero de la semana.

La clave queda visible en el código público, así que solo evita que alguien escriba en la hoja por accidente; no la uses para nada más. Si alguien abusa, cámbiala en los dos lugares.

Sin tablero, la pestaña **Equipo** sigue sirviendo: cada jugador comparte su semana por WhatsApp con un botón.

## 6. Cómo está armado el plan

| Día | Enfoque | Por qué ahí |
|---|---|---|
| Lunes (MD+1) | Recuperación y movilidad | El cuerpo viene del partido |
| Martes (MD+2) | Fuerza + Nórdico + Copenhague | Lejos del partido para que las agujetas no estorben |
| Miércoles (MD-4) | Pliometría fuerte + aceleración | El día de más impacto, a cuatro días del partido |
| Jueves (MD-3) | Cambios de dirección + 4 × 4 | Resistencia con tiempo para recuperar |
| Viernes (MD-2) | Velocidad y reacción, poco volumen | Rápido sin cansar |
| Sábado (MD-1) | Activación corta | Llegar fresco |
| Domingo | Partido | Calentamiento FIFA 11+ y registro |

Ciclo de 8 semanas: semanas 1 a 3 construyen, la 4 descarga, de la 5 a la 7 los saltos se vuelven reactivos, y la 8 descarga y repite las pruebas de la semana 1 (salto vertical, sprint de 30 m, 5-10-5 y tobillo). Después el ciclo vuelve a empezar.

Las fuentes científicas están dentro de la app, en **Guía › Por qué este plan**.

## Aviso

Esta app es una guía general de entrenamiento y no sustituye la valoración de un médico o fisioterapeuta. Ante dolor articular, dolor que cambia la forma de moverse o una lesión previa, consulten a un profesional.
