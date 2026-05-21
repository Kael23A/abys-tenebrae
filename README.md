# 🏛️ Abys Tenebrae V.2.0

Portal de narrativa oscura. Sistema autónomo diseñado para GitHub + Vercel.

---

## Estructura del Repositorio

```
abys-tenebrae/
├── index.html        ← Punto de entrada único (El Esqueleto)
├── engine.js         ← Motor central de navegación (El Cerebro)
├── styles.css        ← Identidad visual Penumbra (La Piel)
├── manifest.json     ← Registro inteligente (La Memoria)
└── historias/        ← Gran Cajón de relatos
    ├── demo-001.html
    ├── demo-002.html
    └── ...tu-historia.html
```

---

## Cómo publicar una nueva historia

### 1. Escribe tu relato en HTML puro

El archivo solo necesita el contenido narrativo. Sin `<html>`, sin `<head>`, sin `<body>`. Solo la historia:

```html
<h1>Título del Relato</h1>
<p>El primer párrafo de tu historia...</p>
<p>Puedes usar <em>cursivas</em> para atmósfera.</p>
<hr>
<p id="seccion-final">El desenlace...</p>
```

> **Consejo:** Usa `id` en los párrafos clave (ej. `id="giro-final"`) para que los comentarios puedan enlazar directamente a ese fragmento.

### 2. Súbelo a `/historias/`

Coloca el archivo `.html` en la carpeta `historias/`.  
Nombre recomendado: `slug-de-la-historia.html` (sin espacios, sin tildes).

### 3. Regístralo en `manifest.json`

Agrega una entrada al array `"historias"`:

```json
{
  "id": "mi-historia-001",
  "archivo": "historias/mi-historia.html",
  "titulo": "Nombre del Relato",
  "descripcion": "Una línea que capture la esencia del relato.",
  "pilar": "ecos-del-vacio",
  "subgenero": "terror-psicologico",
  "fecha": "2025-02-01",
  "likes": 0,
  "lecturas": 0,
  "comentarios": []
}
```

**Pilares disponibles:**
- `ecos-del-vacio` → Terror Psicológico, Realismo Sucio, Gótico Moderno, Micro-pesadillas
- `fronteras-alteradas` → Tecno-Fatalismo, Ficciones Liminales, Hiper-realismo Alterno, Post-Humanismo
- `legado-de-sombras` → Folclore Urbano, Magia de Ruinas, Fantasía Oscura, Tradiciones Prohibidas
- `el-fugitivo` → Relatos sin Clasificar, Expedientes Perdidos, Crónicas Anónimas, Escritos del Abismo

**Subgéneros disponibles (usar el `id`):**
```
terror-psicologico | realismo-sucio | gotico-moderno | micro-pesadillas
tecno-fatalismo | ficciones-liminales | hiper-realismo-alterno | post-humanismo
folclore-urbano | magia-de-ruinas | fantasia-oscura | tradiciones-prohibidas
relatos-sin-clasificar | expedientes-perdidos | cronicas-anonimas | escritos-del-abismo
```

### 4. Haz commit y push

```bash
git add historias/mi-historia.html manifest.json
git commit -m "Nueva historia: Nombre del Relato"
git push
```

Vercel desplegará automáticamente en segundos. La historia aparecerá en la interfaz principal.

---

## Despliegue en Vercel

1. Importa el repositorio de GitHub en [vercel.com](https://vercel.com)
2. Framework: **Other** (sin framework, es HTML puro)
3. Build Command: *(vacío)*
4. Output Directory: `.` (raíz)
5. Deploy → listo.

No requiere servidor. No requiere base de datos. Solo archivos estáticos.

---

## Cómo funciona el motor

| Componente | Función |
|---|---|
| `index.html` | Esqueleto base. Nunca se recarga. |
| `engine.js` | Detecta clics → busca en manifest → inyecta HTML de la historia en pantalla |
| `styles.css` | Identidad visual Penumbra (carbón, cian fantasma, tipografía elegante) |
| `manifest.json` | Base de datos jerárquica. Único archivo que el autor edita |
| `/historias/*.html` | Archivos de narrativa pura. Autónomos, sin lógica |

---

## Controles del lector

| Control | Acción |
|---|---|
| **Clic en el texto** | Activa/pausa el scroll automático |
| **Deslizar manualmente** | Toma el control, scroll auto se reanuda solo |
| **Orbe lateral (◈)** | Vuelve al inicio del relato |
| **Barra de progreso** | Indicador visual superior (no cuenta atrás) |
| **◆ Me gusta** | Se guarda localmente en el navegador |
| **↗ Compartir** | Copia enlace directo a la historia |

---

*Construido para que el autor solo piense en escribir.*
