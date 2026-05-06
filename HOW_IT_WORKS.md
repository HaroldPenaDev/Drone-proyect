# Cómo Funciona el Drone Digital Twin

## Levantar el Proyecto

```bash
cd drone-digital-twin
cp .env.example .env
docker compose up --build
```

Servicios que inician y en qué orden (healthchecks garantizan el orden):

1. **influxdb** → espera hasta responder en `/health`
2. **postgres** → espera hasta que `pg_isready` confirme conexión
3. **simulator** → arranca cuando influxdb está healthy
4. **api** → arranca cuando postgres + influxdb están healthy
5. **frontend** → build estático, espera que api esté healthy
6. **nginx** → proxy que enruta todo el tráfico

URLs disponibles:
- `http://localhost` → Dashboard React
- `http://localhost:8000/docs` → Swagger UI de la API
- `http://localhost:8086` → InfluxDB UI (user: admin / pass: adminpassword)

---

## Flujo de Datos de Punta a Punta

```
Simulator (Python)
    │
    │  cada 500ms escribe directamente
    ▼
InfluxDB (drone_telemetry bucket)
    │
    │  Flux queries cada 500ms
    ▼
API FastAPI (WebSocket /ws/telemetry/{drone_id})
    │
    │  JSON over WebSocket
    ▼
Frontend React (Zustand store)
    │
    │  React render
    ▼
Dashboard (gauges, 3D viewer, charts)
```

La API **nunca recibe datos del simulador** — el simulador escribe directo a InfluxDB. La API solo lee.

---

## Cómo Funciona Cada Capa

### Capa 1: Simulador

**Archivo de entrada:** `simulator/src/main.py`

Loop asíncrono que corre cada 500ms:

```
1. Selecciona el siguiente movimiento del MOVEMENT_SEQUENCE
2. Llama a physics_engine.integrate_state()
3. Llama a structural_engine.compute_all_safety_factors()
4. Llama a material_engine.compute_cycle_degradation()
5. Construye nuevo DroneState inmutable
6. Escribe a InfluxDB vía InfluxDBWriter
7. asyncio.sleep(0.5)
```

**`DroneState`** es un frozen dataclass — nunca se muta, siempre se crea uno nuevo.

---

### Physics Engine (`src/engines/physics_engine.py`)

Implementa 6 Grados de Libertad (6-DOF):

**Tabla de thrust por movimiento:**

| Movimiento | Motor 0 | Motor 1 | Motor 2 | Motor 3 |
|-----------|---------|---------|---------|---------|
| HOVER | 1.0x | 1.0x | 1.0x | 1.0x |
| ASCEND | 1.2x | 1.2x | 1.2x | 1.2x |
| DESCEND | 0.8x | 0.8x | 0.8x | 0.8x |
| LEFT | 1.3x | 0.7x | 0.7x | 1.3x |
| RIGHT | 0.7x | 1.3x | 1.3x | 0.7x |
| FORWARD | 0.7x | 0.7x | 1.3x | 1.3x |
| BACKWARD | 1.3x | 1.3x | 0.7x | 0.7x |
| CLOCKWISE | 1.15x | 0.85x | 1.15x | 0.85x |
| COUNTERCLOCKWISE | 0.85x | 1.15x | 0.85x | 1.15x |

El valor base (1.0x) es `HOVER_THRUST = m*g/4 = (1.2 * 9.81) / 4 = 2.943 N`.

**Curva polinomial thrust → torque:**
```
torque = 0.009 * thrust² + 0.145 * thrust + 0.0005
```

**Integración numérica** usando `scipy.integrate.solve_ivp` con método RK45:

El estado del dron es un vector de 12 elementos:
```
[x, y, z,           # posición en mundo
 vx, vy, vz,        # velocidad en mundo
 roll, pitch, yaw,  # orientación (ángulos Euler)
 wx, wy, wz]        # velocidad angular
```

La derivada del estado se calcula así:
1. Rotar los vectores de thrust de frame del cuerpo → frame del mundo (matriz de rotación ZYX)
2. Fuerza neta = suma(thrust rotados) + gravedad `[0, 0, -m*g]`
3. Torque neto = suma de `r_i × F_i` (producto cruz) + torque de reacción por par motor
4. Aceleración = F_neta / m
5. Aceleración angular = torque_neto / I (tensor de inercia diagonal)

El `max_step=0.01s` del integrador asegura precisión aunque el intervalo de escritura sea 0.5s.

**Posiciones de los motores** (frame del cuerpo, en metros):
```
Motor 0: [ 0.25,  0,    0   ]  → brazo derecho
Motor 1: [ 0,     0.25, 0   ]  → brazo frontal
Motor 2: [-0.25,  0,    0   ]  → brazo izquierdo
Motor 3: [ 0,    -0.25, 0   ]  → brazo trasero
```

Pares contra-rotativos: motores 0,2 giran CW y motores 1,3 giran CCW (para cancelar torques de yaw en hover).

---

### Structural Engine (`src/engines/structural_engine.py`)

**Safety Factor por brazo:**

Cada brazo se modela como una viga en voladizo (cantilever beam) con carga puntual en la punta (donde está el motor).

```
Momento de flexión  M = thrust × arm_length
Tensión máxima      σ = M × c / I
Safety Factor       SF = σ_ult_efectiva / σ
```

Donde:
- `c` = distancia al eje neutro (height/2 = 0.005 m)
- `I` = momento de inercia de sección = 5.2e-10 m⁴
- `σ_ult_efectiva` = resistencia del material degradada = `36 MPa × (1 - degradation_factor)`

Si SF < 1.5 (threshold) → la API genera una alerta en PostgreSQL.

**Fuerza de impacto** (para eventos de impacto externos):
```
F = m × sqrt(2*g*h) / t_contacto
```

---

### Material Engine (`src/engines/material_engine.py`)

Modelo de degradación del ONYX (nylon + microfibra de carbono) basado en ASTM D638.

**Acumulación de daño por ciclos** (Regla de Miner):
```
stress_ratio  = σ_aplicada / σ_ult_efectiva
N_failure     = (1 / stress_ratio) ^ 10        ← exponente fatiga ONYX ≈ 10
D_por_ciclo   = (1 / N_failure) × 0.0001       ← factor de escala
D_nuevo       = D_anterior + D_por_ciclo
```

**Acumulación de daño por impacto:**
```
D_impacto = F_impacto / (σ_ult × A × k)
```
Donde `k = 0.7` es el coeficiente de absorción de energía del ONYX.

`D` se clampea en 1.0 (destrucción total).
La resistencia efectiva en cada ciclo = `36 MPa × (1 - D)`.

---

### Escritura a InfluxDB (`src/writers/influxdb_writer.py`)

Por cada `DroneState` se escriben 5 `Point`:

**Measurement `arm_telemetry`** (4 points, uno por brazo):
```
Tags:   drone_id="stmu-quad-001", arm_index="0"
Fields: thrust=2.943, torque=0.479, safety_factor=8.2,
        degradation_factor=0.002, rpm=4414
```

**Measurement `drone_position`** (1 point):
```
Tags:   drone_id="stmu-quad-001"
Fields: x=0.01, y=-0.02, z=1.05, roll=0.001, pitch=-0.002, yaw=0.0
```

El timestamp es en nanosegundos desde epoch.

---

### Capa 2: API

**Archivo de entrada:** `api/src/main.py`

FastAPI con lifespan que al iniciar:
1. Crea engine async SQLAlchemy → PostgreSQL
2. Crea cliente InfluxDB
3. Registra todos los routers

**Routers y sus endpoints:**

```
GET  /drones              → lista todos
POST /drones              → crea drone (name, mass_kg, arm_length_m)
GET  /drones/{id}         → obtiene uno
PUT  /drones/{id}         → actualiza
DELETE /drones/{id}       → elimina

GET  /missions            → lista (filtro: ?drone_id=...)
POST /missions            → crea (drone_id, movements=[...])
GET  /missions/{id}       → obtiene uno
PATCH /missions/{id}/start → cambia status a "running", guarda started_at
PATCH /missions/{id}/stop  → cambia status a "aborted", guarda ended_at

GET  /telemetry/latest/{drone_id}  → snapshot actual de los 4 brazos
GET  /telemetry/history            → ?drone_id=...&start=-1h&stop=now()

GET  /alerts              → lista (filtro: ?drone_id=...)

WS   /ws/telemetry/{drone_id}  → stream en tiempo real
```

**WebSocket (`src/routers/websocket.py`):**

Cuando un cliente conecta a `/ws/telemetry/{drone_id}`:
1. Se registra en `_active_connections[drone_id]`
2. Si es el primer cliente para ese `drone_id`, lanza `asyncio.create_task(_broadcast_loop)`
3. El loop consulta InfluxDB cada 500ms con Flux query
4. Serializa el snapshot a JSON y hace `send_text()` a todos los WebSockets del drone
5. Al desconectar, se remueve de la lista (el loop termina si la lista queda vacía)

**Migraciones:** Al correr `docker compose up`, el contenedor API ejecuta `alembic upgrade head` que aplica `001_initial_schema.py` creando las 3 tablas: `drones`, `missions`, `alerts`.

---

### Capa 3: Persistencia

**InfluxDB** almacena solo series de tiempo — datos que cambian cada 500ms.
**PostgreSQL** almacena el estado relacional — drones, misiones, alertas.

**Flux query para historial:**
```flux
from(bucket: "drone_telemetry")
  |> range(start: -1h, stop: now())
  |> filter(fn: (r) => r._measurement == "arm_telemetry")
  |> filter(fn: (r) => r.drone_id == "stmu-quad-001")
  |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
```

El `pivot` transforma filas de campo individual → una fila por timestamp con todas las columnas.

---

### Capa 4: Frontend

**Flujo de datos React:**

```
useWebSocket hook
    │  conecta a ws://localhost:8000/ws/telemetry/{droneId}
    │  con exponential backoff (1s → 2s → 4s → ... → 30s)
    ▼
TelemetryWebSocket class (api/websocket.ts)
    │  onmessage → parseJSON → DroneSnapshot
    ▼
telemetryStore (Zustand)
    │  updateSnapshot() → actualiza latestSnapshot + agrega a history
    ▼
useTelemetry hook
    │  expone {latestSnapshot, history, connected}
    ▼
DashboardPage
    ├── DroneScene (React Three Fiber)
    │       DroneModel → 4 brazos con MotorIndicator
    │       Propelas giran a velocidad proporcional al RPM
    │       Color del motor: verde/amarillo/rojo según degradación
    └── TelemetryPanel
            SafetyFactorGauge × 4 (barras de progreso coloreadas)
            MaterialHealthBar × 4 (salud = 1 - degradación)
            ThrustTorqueChart × 2 (Recharts LineChart dual-axis)
```

**Zustand stores** son la única fuente de verdad del estado — los componentes solo leen del store, nunca tienen estado local para datos de negocio.

---

## Verificar que Funciona

```bash
# 1. Verificar que la API responde
curl http://localhost:8000/docs

# 2. Crear un drone
curl -X POST http://localhost:8000/drones \
  -H "Content-Type: application/json" \
  -d '{"name":"test-drone","mass_kg":1.2,"arm_length_m":0.25}'

# 3. Ver telemetría del drone por defecto (stmu-quad-001)
curl "http://localhost:8000/telemetry/latest/stmu-quad-001"

# 4. Ver historial de la última hora
curl "http://localhost:8000/telemetry/history?drone_id=stmu-quad-001&start=-1h"

# 5. Crear y arrancar una misión
DRONE_ID="<id del drone creado en paso 2>"
curl -X POST http://localhost:8000/missions \
  -H "Content-Type: application/json" \
  -d "{\"drone_id\":\"$DRONE_ID\",\"movements\":[\"hover\",\"ascend\",\"forward\",\"hover\",\"descend\"]}"

# 6. Ver logs del simulador
docker compose logs -f simulator

# 7. Ver datos en InfluxDB
docker compose exec influxdb influx query \
  'from(bucket:"drone_telemetry") |> range(start:-1m) |> limit(n:5)' \
  --org drone-lab --token dev-token
```

---

## Desarrollo Local (Hot Reload)

```bash
# En lugar del docker-compose.yml base, usa el override local
docker compose -f docker-compose.yml -f docker-compose.local.yml up

# Solo levantar las bases de datos (para desarrollar sin Docker)
docker compose up influxdb postgres

# Correr el simulador localmente
cd simulator
python -m venv .venv && source .venv/bin/activate
pip install -e .
python -m src.main

# Correr la API localmente
cd api
python -m venv .venv && source .venv/bin/activate
pip install -e .
uvicorn src.main:app --reload --port 8000

# Correr el frontend localmente
cd frontend
npm install
npm run dev  # abre en http://localhost:3000
```

---

## Tests

```bash
# Tests del simulador (no requieren infraestructura)
cd simulator
pip install -e ".[dev]"
pytest tests/ -v

# Tests de la API (no requieren infraestructura — son tests de schemas)
cd api
pip install -e ".[dev]"
pytest tests/ -v
```

Los tests del simulador verifican:
- La curva polinomial `torque = 0.009*T² + 0.145*T + 0.0005` exacta
- Que ASCEND produce más thrust que HOVER
- Que integrar en HOVER mantiene altitud (± 0.5m)
- Que integrar en ASCEND aumenta altitud
- Que el safety factor disminuye con más thrust
- Que el daño acumulado nunca supera 1.0

---

## Troubleshooting

**El simulador no conecta a InfluxDB:**
```bash
docker compose logs simulator
# Si ves "Connection refused": influxdb aún está iniciando, esperar healthcheck
docker compose ps  # verificar que influxdb esté "healthy"
```

**La API no conecta a PostgreSQL:**
```bash
docker compose logs api
# Si ves "could not connect": postgres aún está iniciando
docker compose restart api  # forzar reintento después de que postgres esté healthy
```

**El frontend muestra "Disconnected":**
- El WebSocket conecta a `VITE_WS_URL/telemetry/{droneId}`
- Si no hay drone seleccionado (no existen drones en BD), no hay WebSocket
- Crear al menos un drone via API y recargando la página

**No aparecen datos en el dashboard:**
- El drone ID en el frontend debe coincidir con `SIMULATOR_DRONE_ID` en `.env` (default: `stmu-quad-001`)
- El simulador escribe para `stmu-quad-001` por defecto
- El frontend en el dropdown mostrará los drones de la BD — crear uno con nombre `stmu-quad-001` para que coincida

**Para crear el drone que el simulador ya está usando:**
```bash
curl -X POST http://localhost:8000/drones \
  -H "Content-Type: application/json" \
  -d '{"name":"stmu-quad-001","mass_kg":1.2,"arm_length_m":0.25}'
```
