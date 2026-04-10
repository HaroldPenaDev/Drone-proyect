# Las 4 Capas del Proyecto

El proyecto está dividido en 4 capas. Cada capa tiene una responsabilidad específica y no hace el trabajo de las otras. Piénsalo como una fábrica donde cada sección hace una sola cosa.

---

## Vista General

```
┌──────────────────────────────────────────────────────────────────┐
│  CAPA 4 — PRESENTACIÓN                                          │
│  React + TypeScript                                             │
│  Lo que el usuario ve en el navegador                           │
├──────────────────────────────────────────────────────────────────┤
│  CAPA 2 — APLICACIÓN                                            │
│  FastAPI (Python)                                               │
│  El intermediario que conecta todo                              │
├──────────────────────────────────────────────────────────────────┤
│  CAPA 3 — PERSISTENCIA                                          │
│  InfluxDB + PostgreSQL                                          │
│  Donde se guardan todos los datos                               │
├──────────────────────────────────────────────────────────────────┤
│  CAPA 1 — SIMULACIÓN                                            │
│  Python puro + SciPy                                            │
│  El cerebro que calcula la física                               │
└──────────────────────────────────────────────────────────────────┘
```

> Nota: La Capa 1 (Simulador) es independiente — escribe directo a la base de datos sin pasar por la API.

---

---

# CAPA 1 — Simulación

**Carpeta:** `simulator/`
**Lenguaje:** Python 3.12
**Responsabilidad:** Calcular el estado físico del dron cada 500 milisegundos

## ¿Qué hace?

Es el cerebro del sistema. No muestra nada, no guarda en base de datos relacional, no tiene endpoints HTTP. Solo hace matemáticas y escribe los resultados a InfluxDB.

Cada 500ms ejecuta este ciclo:

```
1. Selecciona el siguiente movimiento (hover, ascend, forward...)
2. Calcula las fuerzas en los 4 motores
3. Integra las ecuaciones de movimiento → nueva posición y velocidad
4. Calcula el Safety Factor de cada brazo
5. Actualiza el desgaste del material
6. Escribe todo a InfluxDB
7. Espera 500ms y repite
```

## Archivos Clave

### `src/main.py` — El punto de entrada

Es el único archivo que corre. Crea el loop asíncrono y lo mantiene corriendo hasta que el contenedor se detiene. Cada iteración llama a los tres motores en orden y escribe el resultado.

### `src/models/drone_state.py` — El estado del dron

Define el objeto `DroneState` — una "foto" del dron en un instante de tiempo. Contiene:

```
posición          → dónde está en el espacio (x, y, z)
velocidad         → qué tan rápido se mueve y en qué dirección
aceleración       → cómo está cambiando su velocidad
orientación       → roll (balanceo), pitch (cabeceo), yaw (guiñada)
velocidad angular → qué tan rápido está girando
motores           → thrust, torque y RPM de cada uno de los 4 motores
material_states   → estado de degradación de cada brazo
safety_factors    → el factor de seguridad calculado de cada brazo
timestamp         → cuándo fue calculado este estado
```

Este objeto es **inmutable** — nunca se modifica, siempre se crea uno nuevo. Esto evita errores de concurrencia.

### `src/engines/physics_engine.py` — El motor de física

El archivo más complejo del proyecto. Implementa los **6 Grados de Libertad** del dron usando integración numérica.

**¿Qué son 6 grados de libertad?**

Cualquier objeto en el espacio puede moverse de 6 maneras independientes:

```
Translaciones:          Rotaciones:
  ↑↓ arriba/abajo         ↺ roll   (balancear de lado)
  ←→ izquierda/derecha    ↺ pitch  (inclinar adelante/atrás)
  ↗↙ adelante/atrás       ↺ yaw    (girar sobre el eje vertical)
```

Internamente, el estado del dron es un vector de 12 números que el algoritmo RK45 de SciPy integra en cada paso:

```
[x, y, z,            ← posición (3 números)
 vx, vy, vz,         ← velocidad (3 números)
 roll, pitch, yaw,   ← orientación (3 números)
 wx, wy, wz]         ← velocidad angular (3 números)
```

**¿Cómo determina cuánta fuerza produce cada motor?**

Hay una tabla fija de multiplicadores por movimiento. El thrust base es el necesario para que el dron flote en el aire (`m×g/4 = 2.943 N` por motor):

```
Movimiento       Motor 0   Motor 1   Motor 2   Motor 3
─────────────────────────────────────────────────────
hover            1.0x      1.0x      1.0x      1.0x
ascend           1.2x      1.2x      1.2x      1.2x
descend          0.8x      0.8x      0.8x      0.8x
left             1.3x      0.7x      0.7x      1.3x
right            0.7x      1.3x      1.3x      0.7x
forward          0.7x      0.7x      1.3x      1.3x
backward         1.3x      1.3x      0.7x      0.7x
clockwise        1.15x     0.85x     1.15x     0.85x
counterclockwise 0.85x     1.15x     0.85x     1.15x
```

Para ir a la izquierda, los motores del lado derecho (0 y 3) generan más thrust que los del lado izquierdo (1 y 2), inclinando el dron.

**Curva thrust → torque:**

Cada motor genera un torque (fuerza de torsión) proporcional a su thrust según esta curva polinomial calibrada para el modelo de motor específico:

```
torque = 0.009 × thrust² + 0.145 × thrust + 0.0005
```

### `src/engines/structural_engine.py` — El motor estructural

Calcula si los brazos del dron van a romperse.

Cada brazo se modela como una **viga en voladizo** (como un trampolín): está fijo en el centro del dron y soporta el peso del motor en la punta.

```
Centro del dron ════════════[ brazo ]════ Motor (carga)
                  fijo aquí                    ↓ thrust
```

La tensión máxima ocurre en la raíz del brazo (donde se une al cuerpo):

```
Momento de flexión  M = Fuerza × Longitud del brazo
Tensión máxima      σ = M × (altura/2) / Momento de inercia
Safety Factor       = Resistencia del material / σ
```

Si el Safety Factor es:
- **Mayor a 2.0** → verde, estructura muy segura
- **Entre 1.5 y 2.0** → amarillo, margen reducido
- **Menor a 1.5** → rojo, peligro, se genera una alerta

También calcula la **fuerza de impacto** cuando el dron choca:
```
F = masa × √(2 × g × altura) / tiempo_de_contacto
```

### `src/engines/material_engine.py` — El motor de materiales

Calcula el desgaste del material ONYX a lo largo del tiempo.

**¿Qué es ONYX?**

Es el material de los brazos: nylon reforzado con microfilamentos de carbono. Es liviano y resistente, pero se fatiga con el uso repetitivo.

**¿Cómo se modela el desgaste?**

Sigue el estándar industrial **ASTM D638** (prueba de tensión para polímeros) y la **Regla de Miner** (fatiga acumulada):

```
Cada ciclo de vuelo agrega un pequeño daño:

  stress_ratio = tensión_aplicada / resistencia_del_material
  ciclos_hasta_fallar = (1 / stress_ratio) ^ 10
  daño_por_ciclo = 1 / ciclos_hasta_fallar

  daño_total += daño_por_ciclo   (máximo 100% = rotura)
```

A medida que el daño aumenta, la resistencia del material baja, lo que baja el Safety Factor, lo que genera alertas.

### `src/writers/influxdb_writer.py` — El escritor

Toma el `DroneState` calculado y lo escribe a InfluxDB. Escribe 5 registros por ciclo: uno de posición del dron y uno por cada brazo con thrust, torque, safety factor, degradación y RPM.

---

---

# CAPA 2 — Aplicación (API)

**Carpeta:** `api/`
**Lenguaje:** Python 3.12 con FastAPI
**Responsabilidad:** Ser el intermediario entre las bases de datos y el frontend

## ¿Qué hace?

La API no calcula física. No simulia nada. Su trabajo es:
- Guardar y entregar información de drones, misiones y alertas (PostgreSQL)
- Leer datos de sensores históricos o en tiempo real (InfluxDB)
- Detectar alertas cuando el Safety Factor cae bajo el umbral
- Transmitir datos en vivo al frontend vía WebSocket

## Archivos Clave

### `src/main.py` — El punto de entrada de la API

Crea la aplicación FastAPI con dos fases de vida:

```
Al iniciar:
  ├── Conecta a PostgreSQL (base de datos relacional)
  └── Conecta a InfluxDB (base de datos de tiempo real)

Mientras corre:
  └── Atiende peticiones HTTP y WebSocket

Al apagar:
  ├── Cierra conexión a PostgreSQL
  └── Cierra conexión a InfluxDB
```

También registra todos los routers y configura CORS (para que el frontend pueda conectarse desde otro origen).

### `src/routers/` — Los endpoints

Cada archivo maneja un dominio diferente:

**`drones.py`** — CRUD de drones
```
GET  /drones              → lista todos los drones
POST /drones              → registra un drone nuevo
GET  /drones/{id}         → obtiene un drone específico
PUT  /drones/{id}         → actualiza datos del drone
DELETE /drones/{id}       → elimina el drone
```

**`missions.py`** — Gestión de misiones
```
GET    /missions                → lista todas las misiones
POST   /missions                → crea una misión nueva
GET    /missions/{id}           → obtiene una misión
PATCH  /missions/{id}/start     → cambia estado a "running"
PATCH  /missions/{id}/stop      → cambia estado a "aborted"
```

**`telemetry.py`** — Consulta de datos físicos (lee de InfluxDB)
```
GET /telemetry/latest/{drone_id}  → estado actual de los 4 brazos
GET /telemetry/history            → datos históricos con filtros de tiempo
```

**`alerts.py`** — Consulta de alertas
```
GET /alerts  → lista alertas (filtrable por drone_id)
```

**`websocket.py`** — Streaming en tiempo real
```
WS /ws/telemetry/{drone_id}  → transmite datos cada 500ms mientras hay conexión
```

### `src/models/` — Las tablas de PostgreSQL

Define la estructura de los datos que se guardan permanentemente:

**`drone.py`** — Tabla `drones`
```
id             UUID, identificador único
name           nombre del drone
arm_count      número de brazos (default: 4)
mass_kg        peso en kilogramos
arm_length_m   longitud de cada brazo en metros
created_at     cuándo fue creado
updated_at     última modificación
```

**`mission.py`** — Tabla `missions`
```
id             UUID, identificador único
drone_id       referencia al drone
status         pending / running / completed / aborted
movements      lista de movimientos [ "hover", "ascend", "forward" ]
started_at     cuándo arrancó
ended_at       cuándo terminó
created_at     cuándo fue creada
```

**`alert.py`** — Tabla `alerts`
```
id                    UUID, identificador único
drone_id              qué drone generó la alerta
mission_id            en qué misión ocurrió (opcional)
alert_type            tipo de alerta (ej: "low_safety_factor")
arm_index             cuál de los 4 brazos (0-3)
safety_factor_value   el valor que disparó la alerta
threshold             el umbral configurado (default: 1.5)
created_at            cuándo ocurrió
```

### `src/services/` — La lógica de negocio

Los servicios contienen las reglas de qué se puede hacer y cómo:

**`drone_service.py`** — Valida que no haya drones con nombre duplicado, centraliza las operaciones de base de datos.

**`mission_service.py`** — Controla las transiciones de estado: una misión `pending` puede pasar a `running`, pero una `completed` no puede volver a `pending`.

**`telemetry_service.py`** — Construye las consultas Flux para InfluxDB y transforma los resultados en el formato que espera el frontend.

**`alert_service.py`** — Revisa el Safety Factor de cada brazo y crea automáticamente un registro en la tabla `alerts` cuando alguno cae por debajo del umbral de 1.5.

### `src/schemas/` — La forma de los datos

Los schemas definen exactamente qué datos acepta la API como entrada y qué datos devuelve como salida. Son la "interfaz pública" de cada endpoint.

Ejemplo para drones:
```
DroneCreate   → lo que el cliente manda al crear   (name, mass_kg, arm_length_m)
DroneRead     → lo que la API devuelve al consultar (id, name, ..., created_at)
DroneUpdate   → lo que el cliente manda al editar   (cualquier campo, todos opcionales)
```

### `alembic/` — Las migraciones de base de datos

Alembic es la herramienta que crea y actualiza las tablas en PostgreSQL. El archivo `versions/001_initial_schema.py` contiene las instrucciones SQL para crear las 3 tablas (`drones`, `missions`, `alerts`) la primera vez que el sistema arranca.

---

---

# CAPA 3 — Persistencia

**Tecnologías:** InfluxDB 2.7 + PostgreSQL 15
**Responsabilidad:** Guardar todos los datos del sistema

## ¿Por qué dos bases de datos diferentes?

Porque los tipos de datos son fundamentalmente diferentes:

| | InfluxDB | PostgreSQL |
|--|---------|-----------|
| **Tipo de dato** | Series de tiempo | Datos relacionales |
| **Ejemplo** | thrust=2.94 a las 14:32:05.500 | Drone con nombre "stmu-quad-001" |
| **Frecuencia** | Cada 500ms | Solo cuando el usuario hace algo |
| **Consulta típica** | "dame los últimos 5 minutos de thrust del brazo 0" | "dame todas las misiones del drone X" |
| **Quién escribe** | Simulador (directamente) | API (en respuesta a peticiones) |

## InfluxDB — La base de datos de tiempo real

Almacena mediciones físicas etiquetadas con el tiempo exacto.

**Organización de los datos:**

```
Bucket: drone_telemetry
│
├── Measurement: arm_telemetry
│   ├── Tags (identificadores):
│   │   ├── drone_id    = "stmu-quad-001"
│   │   └── arm_index   = "0" / "1" / "2" / "3"
│   └── Fields (valores numéricos):
│       ├── thrust             = 2.943 (Newtons)
│       ├── torque             = 0.479 (Newton-metro)
│       ├── safety_factor      = 8.2
│       ├── degradation_factor = 0.002 (0% a 100%)
│       └── rpm                = 4414
│
└── Measurement: drone_position
    ├── Tags:
    │   └── drone_id = "stmu-quad-001"
    └── Fields:
        ├── x, y, z        (posición en metros)
        └── roll, pitch, yaw (orientación en radianes)
```

**¿Cómo se consultan los datos?**

InfluxDB usa un lenguaje llamado **Flux**. La API lo usa así:

```flux
from(bucket: "drone_telemetry")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "arm_telemetry")
  |> filter(fn: (r) => r.drone_id == "stmu-quad-001")
```

Traducido: "Dame todos los datos de sensores de brazos del último 1 hora para el drone stmu-quad-001".

## PostgreSQL — La base de datos relacional

Almacena todo lo que tiene estructura de tabla clásica: drones, misiones, alertas.

**Relaciones entre tablas:**

```
drones
  ├── id  ←──┐
  └── name   │  referenciado por
             │
missions      │
  ├── id     │
  ├── drone_id ──┘
  └── status

alerts
  ├── id
  ├── drone_id ──→ drones.id
  └── mission_id → missions.id (opcional)
```

---

---

# CAPA 4 — Presentación

**Carpeta:** `frontend/`
**Lenguaje:** TypeScript con React 18
**Responsabilidad:** Mostrar la información al usuario de forma visual e interactiva

## ¿Qué hace?

Es la única parte del sistema que el usuario ve directamente. Recibe datos en tiempo real via WebSocket, los guarda en stores (estado global) y los muestra en componentes visuales.

## Cómo fluyen los datos dentro del frontend

```
WebSocket (datos llegan del servidor cada 500ms)
    │
    ▼
TelemetryWebSocket (clase que maneja la conexión)
    │  parseJSON → DroneSnapshot
    ▼
useTelemetryStore (Zustand — almacén global de estado)
    │  latestSnapshot, history
    ▼
useTelemetry (hook — hace fácil consumir el store)
    │
    ▼
Componentes React (se re-renderizan automáticamente con nuevos datos)
    │
    ▼
Pantalla del usuario
```

## Archivos Clave

### `src/App.tsx` — El enrutador

Define qué página mostrar según la URL:

```
/           → DashboardPage  (monitor en tiempo real)
/missions   → MissionsPage   (gestión de misiones)
/history    → HistoryPage    (datos históricos)
```

### `src/stores/` — El estado global (Zustand)

Los stores son la única fuente de verdad del estado de la aplicación. Ningún componente guarda datos importantes en su propio estado interno.

**`telemetryStore.ts`**
```
latestSnapshot  → último estado recibido del WebSocket
history         → historial de puntos (hasta 120 × 4 por brazo)
connected       → si el WebSocket está activo
updateSnapshot  → función llamada cuando llega un mensaje WebSocket
loadHistory     → función para cargar datos históricos de la API
```

**`droneStore.ts`**
```
drones          → lista de todos los drones del sistema
selectedDrone   → el drone actualmente seleccionado en el dropdown
loadDrones      → carga los drones desde la API
selectDrone     → cambia el drone activo
addDrone        → crea un drone nuevo via API
```

**`alertStore.ts`**
```
alerts          → lista de alertas registradas
unreadCount     → cuántas alertas no se han visto
loadAlerts      → carga alertas desde la API
addAlert        → agrega una alerta nueva
markAllRead     → pone unreadCount a 0
```

### `src/hooks/` — Los hooks personalizados

Los hooks son funciones reutilizables que encapsulan lógica compleja.

**`useWebSocket.ts`** — Maneja toda la lógica de conexión WebSocket:
- Conecta al endpoint `/ws/telemetry/{droneId}`
- Si la conexión se cae, reintenta automáticamente con espera exponencial (1s → 2s → 4s → ... máximo 30s)
- Al cambiar de drone, cierra la conexión anterior y abre una nueva
- Al desmontar el componente, cierra la conexión limpiamente

**`useTelemetry.ts`** — Combina WebSocket + historial en una sola interfaz:
- Llama a `useWebSocket` internamente
- Al montar, carga el historial de la última hora desde la API
- Al desmontar, limpia el store para evitar datos obsoletos
- Expone `{latestSnapshot, history, connected, loadHistory}`

**`useMissions.ts`** — Gestión completa de misiones:
- Carga las misiones del drone seleccionado
- Expone funciones `createMission`, `startMission`, `stopMission`
- Recarga la lista automáticamente después de cada operación

### `src/components/` — Los componentes visuales

Organizados por dominio:

#### `layout/` — La estructura de la app
```
MainLayout.tsx  → contenedor principal con Header + Sidebar + contenido
Header.tsx      → barra superior con dropdown de drones y campana de alertas
Sidebar.tsx     → navegación lateral (Dashboard / Missions / History)
```

#### `dashboard/` — Los widgets del monitor
```
TelemetryPanel.tsx    → contenedor que organiza todos los widgets
SafetyFactorGauge.tsx → barra de progreso con color según el SF de cada brazo
MaterialHealthBar.tsx → barra de progreso que muestra la salud del material
ThrustTorqueChart.tsx → gráfica de líneas dual-eje (Recharts) en tiempo real
DegradationChart.tsx  → gráfica de área que muestra el desgaste de los 4 brazos
```

#### `drone-viewer/` — El visualizador 3D
```
DroneScene.tsx    → el "canvas" 3D con cámara, luces y controles de órbita
DroneModel.tsx    → modelo 3D del cuadricóptero: cuerpo central + 4 brazos
MotorIndicator.tsx → cilindro 3D + hélice animada, cambia de color por degradación
```

La rotación de las hélices es proporcional a los RPM reales calculados por el simulador. El color del motor refleja el estado de degradación del material de ese brazo.

#### `missions/` — La gestión de misiones
```
MissionForm.tsx   → botones para agregar movimientos a la secuencia + botón crear
MissionDetail.tsx → card con info de la misión activa (estado, hora de inicio, secuencia)
MissionList.tsx   → tabla de misiones pasadas con badges de estado y botones start/stop
```

#### `alerts/` — El sistema de alertas
```
AlertBanner.tsx   → banner rojo animado que aparece cuando hay alertas no vistas
AlertHistory.tsx  → lista scrolleable de todas las alertas con tipo, brazo y timestamp
```

### `src/api/` — Los clientes HTTP

Funciones tipadas que llaman a la API REST:

```
client.ts      → instancia de Axios con la URL base y manejo de errores
drones.ts      → fetchDrones, fetchDrone, createDrone, updateDrone, deleteDrone
missions.ts    → fetchMissions, createMission, startMission, stopMission
telemetry.ts   → fetchLatestTelemetry, fetchTelemetryHistory
websocket.ts   → clase TelemetryWebSocket con reconnect automático
```

### `src/types/` — Los tipos de datos

TypeScript exige que todo dato tenga un tipo definido. Estos archivos son el "contrato" de qué forma tienen los datos:

```typescript
interface Drone {
  id: string;
  name: string;
  arm_count: number;
  mass_kg: number;
  arm_length_m: number;
  created_at: string;
  updated_at: string;
}

interface DroneSnapshot {
  drone_id: string;
  timestamp: string;
  arms: [ArmSnapshot, ArmSnapshot, ArmSnapshot, ArmSnapshot];
}
```

Si en algún momento la API devuelve un campo que no está en el tipo, TypeScript lo detecta en tiempo de compilación antes de que el error llegue a producción.

---

## Resumen Visual de Responsabilidades

```
Capa 1 (Simulator)     → "YO CALCULO la física"
Capa 2 (API)           → "YO ORGANIZO y distribuyo los datos"
Capa 3 (Persistencia)  → "YO GUARDO todo"
Capa 4 (Frontend)      → "YO MUESTRO todo al usuario"
```

Ninguna capa hace el trabajo de otra.
El simulador no conoce al frontend.
El frontend no conoce la física.
La API no simula.
Las bases de datos solo almacenan.
