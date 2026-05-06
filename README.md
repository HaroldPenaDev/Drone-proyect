# 🚁 Drone Digital Twin

Un gemelo digital de un dron cuadricóptero. Simula en tiempo real cómo vuela el dron, qué tan resistentes están sus brazos y cómo se desgasta el material con el uso.

---

## ¿Qué es un Gemelo Digital?

Es una copia virtual de un objeto físico. En este caso, el sistema:

1. **Simula** el comportamiento de un dron real usando física matemática
2. **Monitorea** la salud estructural de cada brazo en tiempo real
3. **Predice** el desgaste del material antes de que cause una falla real

---

## ¿Qué hace el proyecto exactamente?

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  Simulador → calcula física cada 500ms              │
│      ↓                                              │
│  Base de datos de tiempo real (InfluxDB)            │
│      ↓                                              │
│  API → lee datos y detecta alertas                  │
│      ↓                                              │
│  Dashboard web → muestra todo en pantalla           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

- Cada **0.5 segundos** el simulador calcula: posición, velocidad, fuerzas en cada brazo y desgaste del material
- El **dashboard** muestra estos datos en vivo con gauges, gráficas y un modelo 3D del dron
- El sistema **genera alertas** automáticas si algún brazo está en peligro

---

## Requisitos

Solo necesitas tener instalado:

- **Docker Desktop** → [descargar aquí](https://www.docker.com/products/docker-desktop/)
- **Git** → [descargar aquí](https://git-scm.com/downloads)

No necesitas Python, Node.js ni ningún otro lenguaje instalado. Docker se encarga de todo.

---

## Cómo Ejecutar

### Paso 1 — Clonar el proyecto

```bash
git clone <url-del-repositorio>
cd drone-digital-twin
```

### Paso 2 — Copiar el archivo de configuración

```bash
cp .env.example .env
```

### Paso 3 — Levantar todo

```bash
docker compose up --build
```

La primera vez tarda unos minutos porque descarga las imágenes. Verás muchos logs — es normal. Cuando veas algo como `Application startup complete`, ya está listo.

### Paso 4 — Crear el dron en el sistema

Abre una terminal nueva (con el proyecto corriendo) y ejecuta:

```bash
curl -X POST http://localhost:8000/drones \
  -H "Content-Type: application/json" \
  -d '{"name":"stmu-quad-001","mass_kg":1.2,"arm_length_m":0.25}'
```

### Paso 5 — Abrir el dashboard

Abre tu navegador en:

```
http://localhost
```

---

## Qué vas a ver en el Dashboard

### Página Principal (Dashboard)

![Estructura del dashboard]

- **Modelo 3D del dron** — puedes rotarlo con el mouse. Los motores cambian de color:
  - 🟢 Verde = material en buen estado
  - 🟡 Amarillo = desgaste moderado
  - 🔴 Rojo = desgaste crítico

- **Safety Factor por brazo** — indica cuántas veces más resistente es el brazo respecto a la carga que soporta. Por debajo de **1.5** es peligroso.

- **Salud del material** — porcentaje de vida útil restante del material ONYX de cada brazo.

- **Gráficas de Thrust y Torque** — fuerza y par torsional de cada motor en tiempo real.

### Página de Misiones

Define una secuencia de movimientos para el dron:

| Movimiento | Qué hace |
|-----------|----------|
| `hover` | Mantiene posición |
| `ascend` | Sube |
| `descend` | Baja |
| `forward` | Avanza |
| `backward` | Retrocede |
| `left` | Mueve a la izquierda |
| `right` | Mueve a la derecha |
| `clockwise` | Gira sobre su eje |
| `counterclockwise` | Gira al revés |

### Página de Historial

Gráficas históricas de thrust, torque y degradación del material. Puedes filtrar por 1h, 6h, 24h o 7 días.

---

## Cómo Detener el Proyecto

```bash
# Para detener (conserva los datos)
docker compose down

# Para detener Y borrar todos los datos guardados
docker compose down -v
```

---

## Estructura del Proyecto

```
drone-digital-twin/
│
├── simulator/          ← Motor de física (Python)
│   └── src/
│       ├── engines/    ← Física, estructura, material
│       ├── models/     ← Definición del estado del dron
│       └── writers/    ← Escribe datos a la base de datos
│
├── api/                ← Servidor web (Python/FastAPI)
│   └── src/
│       ├── routers/    ← Endpoints HTTP y WebSocket
│       ├── services/   ← Lógica de negocio
│       └── models/     ← Tablas de la base de datos
│
├── frontend/           ← Interfaz web (React/TypeScript)
│   └── src/
│       ├── components/ ← Gauges, gráficas, visor 3D
│       ├── pages/      ← Dashboard, Misiones, Historial
│       └── stores/     ← Estado global de la app
│
├── infra/              ← Configuración de infraestructura
│   ├── influxdb/       ← Base de datos de tiempo real
│   ├── postgres/       ← Base de datos relacional
│   └── nginx/          ← Servidor web / proxy
│
└── docker-compose.yml  ← Orquesta todos los servicios
```

---

## Los 6 Servicios que Corren

| Servicio | Puerto | Para qué sirve |
|---------|--------|----------------|
| `influxdb` | 8086 | Almacena datos de sensores en tiempo real |
| `postgres` | 5432 | Almacena drones, misiones y alertas |
| `simulator` | — | Calcula la física cada 500ms |
| `api` | 8000 | Servidor HTTP + WebSocket |
| `frontend` | — | App React compilada |
| `nginx` | **80** | Punto de entrada único (proxy) |

Solo necesitas acceder al puerto **80** (http://localhost). Nginx enruta todo internamente.

---

## Ver Logs de Cada Servicio

```bash
# Ver qué está calculando el simulador
docker compose logs -f simulator

# Ver peticiones a la API
docker compose logs -f api

# Ver todos los servicios a la vez
docker compose logs -f
```

---

## La Física Detrás del Simulador

El simulador implementa **6 Grados de Libertad (6-DOF)** — los mismos 6 movimientos posibles de un objeto en el espacio 3D: 3 translaciones (x, y, z) y 3 rotaciones (roll, pitch, yaw).

**Curva thrust → torque del motor:**
```
torque = 0.009 × thrust² + 0.145 × thrust + 0.0005
```

**Safety Factor de cada brazo:**
```
                  Resistencia del material
Safety Factor = ─────────────────────────────
                  Tensión aplicada por carga
```

Un SF de `1.5` significa que el brazo aguanta 1.5 veces más de lo que actualmente soporta — el mínimo seguro. Por debajo de eso, el sistema genera una alerta.

**Degradación del material (ONYX):**

El material ONYX (nylon reforzado con microfibra de carbono) se degrada acumulativamente con cada ciclo de vuelo. El modelo sigue el estándar **ASTM D638** para polímeros y la **Regla de Miner** para fatiga acumulada:

```
Daño por ciclo = 1 / Ciclos_hasta_falla
Daño total     = suma de todos los daños acumulados (se clampea en 100%)
```

---

## Solución de Problemas Comunes

**No veo datos en el dashboard:**
- Asegúrate de haber ejecutado el paso 4 (crear el dron con nombre `stmu-quad-001`)
- Espera 30 segundos para que el simulador acumule datos

**El comando `docker compose up` falla:**
- Asegúrate de que Docker Desktop está corriendo
- En Windows, puede que necesites ejecutar la terminal como Administrador

**Los logs muestran "Connection refused":**
- Es normal durante el inicio — los servicios esperan entre sí
- Si persiste después de 2 minutos: `docker compose restart`

**Quiero resetear todo y empezar de cero:**
```bash
docker compose down -v
docker compose up --build
```

---

## API REST — Para Explorar Manualmente

Si quieres interactuar directamente con el sistema, la documentación interactiva está en:

```
http://localhost:8000/docs
```

Desde ahí puedes probar todos los endpoints sin escribir código. Solo hacer click en cada endpoint, rellenar los campos y ejecutar.

---

## Tecnologías Usadas

| Componente | Tecnología | Por qué |
|-----------|-----------|---------|
| Simulador | Python 3.12 + SciPy | Matemática científica de alta precisión |
| API | FastAPI | Moderno, rápido, documentación automática |
| Base de datos tiempo real | InfluxDB 2.7 | Diseñada específicamente para series de tiempo |
| Base de datos relacional | PostgreSQL 15 | Datos estructurados (drones, misiones, alertas) |
| Frontend | React 18 + TypeScript | UI reactiva con tipado estricto |
| Visor 3D | React Three Fiber | Three.js con integración React |
| Gráficas | Recharts | Gráficas declarativas para React |
| Estado global | Zustand | State management simple y eficiente |
| Infraestructura | Docker + Nginx | Portabilidad y proxy unificado |
