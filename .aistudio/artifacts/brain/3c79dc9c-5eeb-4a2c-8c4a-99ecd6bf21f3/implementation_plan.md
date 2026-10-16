# Sistema de Emparejamiento en Línea y Partidas Multijugador

Plan paso a paso y análisis técnico para implementar el sistema de emparejamiento competitivo (Matchmaking) y partidas en tiempo real para Duelo 1v1 y Batalla por Equipos.

## User Review & Critical Decisions

> [!IMPORTANT]
> **Decisiones Confirmadas por el Usuario (Fase 1):**
> 1. **Arquitectura Prioritaria:** Simulación de emparejamiento hiperrealista con perfiles en línea competitivos y bots reactivos de alto nivel (la opción más práctica, inmediata y sin latencia en entornos web sin requerir servidores dedicados costosos).
> 2. **Modo Prioritario:** **Duelo de Honor 1v1** en tiempo real para máxima fluidez, latencia cero y dinámica competitiva inmediata.
> 3. **Gestión de Cola:** Cola de emparejamiento con cálculo de tiempo estimado, emparejamiento por copas/rango (MMR), tarjeta de presentación del rival encontrado y aceptación de combate.

---

## 1. Overview & Core Concept

### ¿Qué es y qué soluciona?
En los juegos móviles y web competitivos (como Brawl Stars, Clash Royale o Smash Legends), el mayor desafío del multijugador real es la latencia (ping), la falta de jugadores concurrentes en cola a toda hora y los costos de infraestructura de servidores dedicados de físicas en tiempo real (ticks a 60 FPS).

La **solución más práctica y adoptada en la industria** para este tipo de juegos web es un **Sistema de Emparejamiento Híbrido**:
1. **Fase de Matchmaking Realista**: Una interfaz de búsqueda de partida interactiva que busca por rango de copas/trofeos, muestra tiempo transcurrido vs. tiempo estimado, estado del servidor ("Buscando oponente...", "Rival localizado", "Conectando al servidor...").
2. **Perfiles de Jugadores en Línea**: Generación dinámica y persistente de rivales con nombres reales de la comunidad, nacionalidades/banderas, títulos competitivos, estadísticas de trofeos y brawlers/personajes favoritos.
3. **IA Reactiva de Alto Nivel (Bots Competitivos)**: El rival encontrado en 1v1 no es un bot genérico que camina en línea recta: esquiva proyectiles, embosca en arbustos, retrocede para curarse progresivamente con la nueva regla de 3 segundos fuera de combate, y utiliza su **Potenciador** y **Súper** estratégicamente.
4. **Ruta Escalable a Servidor Real (WebSockets)**: El motor queda desacoplado mediante eventos (`engine.ts`), de modo que un `server.ts` con Express y WebSockets (`ws` o `socket.io`) pueda reemplazar la IA por un socket de red sin rehacer el juego.

---

## 2. User Experience & Visual Design

### Flujo de Usuario Paso a Paso
```
[Menú Principal] 
      │
      ▼ (Presionar "¡JUGAR!" en Duelo 1v1)
[Pantalla de Emparejamiento / Matchmaking Radar]
      ├── Muestra tiempo de espera estimado (ej. ~6s) y cronómetro en vivo
      ├── Radar circular animado escaneando jugadores en el mismo rango de copas
      ├── Botón para "Cancelar Búsqueda"
      │
      ▼ (Jugador encontrado: Sonido de alerta + Animación de impacto)
[Pantalla de Cara a Cara (Versus Screen)]
      ├── Tarjeta de Jugador Local (Tú) vs. Tarjeta de Jugador Rival
      ├── Nombre del rival, avatar, copas del personaje, rango y bandera
      ├── Contador de cuenta regresiva (3.. 2.. 1.. ¡COMBATE!)
      │
      ▼
[Arena de Combate Duelo 1v1]
      ├── Cámara centrada y fluida
      ├── Oponente con etiqueta de nombre, título y barra de vida + Potenciador
      ├── IA con toma de decisiones competitivas avanzadas
      │
      ▼
[Pantalla de Victoria / Derrota]
      ├── Ganancia o pérdida de Trofeos/Copas calculada por diferencia de nivel
      ├── Resumen de estadísticas (Daño causado, eliminaciones)
      └── Botones: "Jugar Otra Vez" (vuelve a la cola) o "Volver al Menú"
```

### Identidad Visual y Estilo
- **Paleta y Contrastes**: Fondo oscuro slate (`slate-950`), luces cian/índigo para tu equipo y carmesí/naranja para el rival.
- **Tipografía**: Títulos limpios en `font-display`, métricas con números tabulares (`font-mono tabular-nums`).
- **Feedback Sensorial**:
  - Sonido de radar o pulso durante la búsqueda.
  - Sonido de impacto metálico al encontrar rival.
  - Indicador de estado de red (ej. *Ping: 24 ms · Servidor Local Latam/Global*).

---

## 3. Key Product Decisions & Trade-Offs

### Decisión 1: ¿Por qué la Simulación de Matchmaking + Bots Avanzados es la más práctica hoy?
- **Ventaja**: Cero problemas de desconexión, tiempo de espera garantizado de 3 a 8 segundos en cualquier momento del día, jugabilidad suave a 60 FPS sin tirones por pérdida de paquetes WiFi/4G.
- **Alternativa Descartada (P2P WebRTC directo)**: En redes móviles o redes detrás de NAT estricto (colegios, oficinas, datos móviles), WebRTC suele fallar al conectar sin servidores TURN de pago.
- **Alternativa Futura (WebSocket Centralizado en server.ts)**: Puede activarse mediante Express + Socket.io en el backend de Node.js cuando haya dos personas conectadas al mismo enlace.

### Decisión 2: Inteligencia Artificial Adaptativa al Rango
- Los rivales de 0 a 300 copas tendrán tiempos de reacción humanos (300-400ms).
- Los rivales de más de 500 copas usarán predicción de trayectoria, uso de cobertura en arbustos y retiradas tácticas para activar la curación progresiva.

---

## 4. Arquitectura Técnica y Estrategia de Datos

```
┌─────────────────────────────────────────────────────────────┐
│                       MatchmakingManager                    │
│   - Gestiona estado de cola: IDLE, SEARCHING, FOUND, READY  │
│   - Genera rival basado en copas del jugador actual        │
│   - Simula latencia, nombre de clan, avatar y banderas      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
   ┌─────────────────────────┐   ┌───────────────────────────┐
   │   MatchmakingOverlay    │   │      VersusIntroModal     │
   │  - Radar animado        │   │  - Cara a cara 1v1        │
   │  - Tiempo transcurrido  │   │  - Estadísticas de rival  │
   │  - Botón cancelar       │   │  - Cuenta atrás de inicio │
   └─────────────────────────┘   └─────────────┬─────────────┘
                                               │
                                               ▼
                                 ┌───────────────────────────┐
                                 │     GameEngine (1v1)      │
                                 │  - IA con comportamiento  │
                                 │    humano avanzado        │
                                 │  - Sistema de copas post- │
                                 │    partida (+8 / -5)      │
                                 └───────────────────────────┘
```

### Paso a Paso de Implementación:
1. **Paso 1: Módulo de Base de Datos de Jugadores (`src/game/onlinePlayers.ts`)**:
   - Generador de perfiles creíbles con nombres, clubes/gremios, banderas de países y niveles de maestría.
2. **Paso 2: Gestor de Emparejamiento (`src/game/matchmaking.ts`)**:
   - Algoritmo que busca un rival cercano a tus trofeos actuales con un tiempo aleatorio realista (entre 3 y 7 segundos).
3. **Paso 3: Componente Visual de Búsqueda (`src/components/MatchmakingModal.tsx`)**:
   - Interfaz con radar giratorio, trofeos en juego y botón de cancelación.
4. **Paso 4: Pantalla de Enfrentamiento (`src/components/VersusScreen.tsx`)**:
   - Muestra las dos tarjetas enfrentadas con animación de impacto y cuenta regresiva.
5. **Paso 5: Ajuste de IA Competitiva en `engine.ts`**:
   - Lógica de combate para que los rivales online aprovechen los nuevos potenciadores por recarga y la regeneración progresiva fuera de combate.
6. **Paso 6: Sistema de Trofeos y Recompensas**:
   - Ajuste de copas según la victoria o derrota frente al rival emparejado.
