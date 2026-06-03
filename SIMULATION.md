# Guía de Simulación — Drone Digital Twin

> Documento técnico-divulgativo sobre cómo está construido el simulador físico
> del proyecto. Pensado para presentar en una clase de simulación: **explica
> qué se simula, con qué librerías, dónde se usan en el código y por qué cada
> decisión técnica tiene sentido**.

---

## 1. ¿Qué tipo de simulación es esta?

Este proyecto implementa un **Gemelo Digital (Digital Twin)** de un dron
cuadricóptero. Un gemelo digital no es un videojuego ni una animación: es una
**réplica virtual basada en física real** que evoluciona en paralelo al objeto
físico que representa.

La diferencia clave con una simulación tradicional:

| Simulación tradicional | Gemelo Digital |
|------------------------|----------------|
| Corre una vez, con datos sintéticos | Corre continuamente, alimentándose de datos reales |
| Predice un escenario aislado | Refleja el estado del objeto físico en tiempo real |
| Resultado = un reporte | Resultado = un sistema vivo que avisa cuando algo va mal |

Concretamente, simulamos **dos sistemas físicos acoplados**:

1. **Dinámica de vuelo** — cómo se mueve el dron en el espacio (posición,
   velocidad, rotación) bajo el efecto de la gravedad y los empujes de los 4
   motores.
2. **Fatiga estructural** — cómo el material de los brazos del dron se va
   degradando con cada ciclo de vuelo, hasta que estructuralmente deja de ser
   seguro volar.

Ambas simulaciones corren cada **500 milisegundos**, y los resultados se
escriben a una base de datos de series temporales para que el dashboard los
visualice en vivo.

---

## 2. Arquitectura general

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   ┌─────────────┐     ┌──────────────┐    ┌──────────────┐   │
│   │  Misión en  │ →   │  Simulador   │ →  │   InfluxDB   │   │
│   │  PostgreSQL │     │   (Python)   │    │ (time-series)│   │
│   └─────────────┘     └──────────────┘    └──────────────┘   │
│                              │                    │          │
│                              │ cada 500ms          ↓          │
│                              ▼            ┌──────────────┐   │
│                       ┌─────────────┐     │     API      │   │
│                       │  Físicas:   │     │  (FastAPI)   │   │
│                       │ • Newton    │     └──────────────┘   │
│                       │ • Euler     │             │          │
│                       │ • Miner     │             ↓          │
│                       └─────────────┘     ┌──────────────┐   │
│                                           │   Frontend   │   │
│                                           │   (React)    │   │
│                                           └──────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

El simulador es un proceso Python independiente que:
1. Lee qué misión está activa desde PostgreSQL
2. Calcula el siguiente estado del dron usando física
3. Escribe el resultado a InfluxDB
4. Espera 500 ms y repite

---

## 3. Stack tecnológico

### Lenguaje y entorno

- **Python 3.12** — elegido porque tiene el ecosistema de computación
  científica más maduro (NumPy, SciPy, pandas, matplotlib).
- **Docker** — el simulador corre en un contenedor aislado para garantizar
  que las dependencias y la versión de Python sean idénticas en cualquier
  máquina.

### Librerías de simulación

| Librería | Versión | Rol |
|----------|---------|-----|
| **NumPy** | ≥ 1.26 | Álgebra vectorial y matricial |
| **SciPy** | ≥ 1.12 | Integración numérica de ODEs + transformaciones espaciales |
| **Pydantic** | ≥ 2.6 | Validación de configuración tipada |
| **influxdb-client** | ≥ 1.40 | Persistencia de telemetría en serie temporal |
| **asyncpg** | ≥ 0.29 | Lectura de misiones desde PostgreSQL |

Las dos primeras son las que **realmente hacen la simulación**. Las demás son
infraestructura.

---

## 4. La física implementada

### 4.1 Dinámica de vuelo — 6 Grados de Libertad (6-DOF)

Un objeto rígido en el espacio tiene **6 grados de libertad**: tres
traslaciones (X, Y, Z) y tres rotaciones (roll, pitch, yaw). El estado del
dron en cualquier instante se representa con un **vector de estado** de 12
componentes:

```
[ posición (x,y,z) | velocidad (vx,vy,vz) | orientación (φ,θ,ψ) | velocidad angular (p,q,r) ]
```

Las leyes que gobiernan la evolución de este estado son:

**Newton (traslación):**
$$
\vec{F}_{total} = m \cdot \vec{a} \quad \Rightarrow \quad \vec{a} = \vec{F}_{total} / m
$$

**Euler (rotación):**
$$
\vec{\tau}_{total} = I \cdot \vec{\alpha} \quad \Rightarrow \quad \vec{\alpha} = \vec{\tau}_{total} / I
$$

Donde:
- $\vec{F}_{total}$ = suma de la gravedad y el empuje de los 4 motores
- $\vec{\tau}_{total}$ = suma de los torques de cada brazo y la reacción
  inducida por el giro de las hélices
- $m$ = masa del dron (1.2 kg)
- $I$ = tensor de inercia rotacional

Estas son **ecuaciones diferenciales** porque relacionan derivadas (velocidad
y aceleración) con cantidades del estado mismo. **No se resuelven
analíticamente en tiempo real** — se integran numéricamente.

### 4.2 Fatiga de material — ASTM D638 + Regla de Miner

La fatiga estructural sigue dos modelos clásicos de la ingeniería de
materiales:

**Esfuerzo de flexión en el brazo** (mecánica de materiales):
$$
\sigma_{flex} = \frac{M \cdot c}{I_{xx}}
$$

Donde $M$ = momento flector causado por el empuje, $c$ = distancia al eje
neutro, $I_{xx}$ = momento de inercia de la sección transversal.

**Safety Factor (factor de seguridad):**
$$
SF = \frac{\sigma_{efectivo}}{\sigma_{aplicado}}
$$

Si $SF < 1.5$, la pieza está estructuralmente comprometida.

**Curva S–N de Wöhler** (ciclos hasta falla en función del esfuerzo):
$$
N_f = \left(\frac{1}{\sigma_{ratio}}\right)^{b}
$$

**Regla de Miner** (daño acumulativo):
$$
D_{total} = \sum_{i} \frac{n_i}{N_{f,i}}
$$

Cada ciclo de vuelo aporta un daño proporcional a `1 / N_f`. Cuando $D = 1$,
la pieza ha agotado su vida útil.

> 📚 Estos modelos no son inventados: son los mismos que se usan para
> calcular la vida útil de las alas de un avión comercial o las palas de una
> turbina eólica.

---

## 5. Las librerías en profundidad

### 5.1 NumPy — álgebra vectorial

**Dónde se usa:** en todo el motor de física, cada vez que hay que sumar
fuerzas, multiplicar matrices o calcular productos cruz.

**Por qué la usamos:** Python puro es ~100 veces más lento que NumPy para
operaciones numéricas en arrays grandes. NumPy delega los cálculos a código
C/Fortran compilado y vectorizado.

**Ejemplo concreto** — cálculo de fuerzas y torques en
[`physics_engine.py:80-92`](simulator/src/engines/physics_engine.py):

```python
# Vector gravedad (apunta hacia -Z)
gravity = np.array([0.0, 0.0, -DRONE_MASS_KG * GRAVITY_M_S2])
total_force = gravity.copy()
total_torque = np.zeros(3)

for i, motor in enumerate(motors):
    # Empuje en el frame del cuerpo (siempre hacia +Z local)
    thrust_body = np.array([0.0, 0.0, motor.thrust_newtons])

    # Rotamos el empuje al frame del mundo según la orientación del dron
    thrust_world = rotation @ thrust_body         # @ = multiplicación matricial

    total_force = total_force + thrust_world      # suma vectorial
    arm_torque = np.cross(MOTOR_POSITIONS[i], thrust_body)  # producto cruz
    total_torque = total_torque + arm_torque
```

**Conceptos NumPy aquí:**
- `np.array(...)` — creación de vectores
- `@` — operador de multiplicación matricial (PEP 465)
- `np.cross(a, b)` — producto cruz, fundamental en física rotacional
- Aritmética vectorial — `vec + vec`, `vec * scalar` — sin loops manuales

### 5.2 SciPy — integración numérica y transformaciones

SciPy es probablemente la librería más importante de este proyecto. Usamos
**dos módulos** específicos:

#### 5.2.1 `scipy.integrate.solve_ivp`

Resuelve **Initial Value Problems** (problemas de valor inicial) — exactamente
lo que necesitamos para integrar las ecuaciones de movimiento.

**Dónde:** [`physics_engine.py:98-104`](simulator/src/engines/physics_engine.py).

```python
solution = solve_ivp(
    fun=lambda t, y: _derivatives(t, y, total_force, total_torque),
    t_span=(0.0, dt),    # Intervalo: de t=0 a t=dt (10 ms)
    y0=state_vector,      # Estado inicial (12 componentes)
    method="RK45",        # Algoritmo: Runge-Kutta 4(5) adaptativo
    max_step=0.01,
)
```

**¿Qué hace internamente?**

El algoritmo **Runge-Kutta de orden 4(5)** (RK45 / Dormand-Prince) toma el
estado actual y calcula el estado en el siguiente instante de tiempo
evaluando la función derivada en varios puntos intermedios y combinándolos
con pesos calibrados. Es **el método estándar** para integración de ODEs en
ingeniería.

La función `_derivatives` que le pasamos es literalmente las leyes de Newton
y Euler:

```python
def _derivatives(_t, state_vector, total_force, total_torque):
    vx, vy, vz = state_vector[3:6]
    wx, wy, wz = state_vector[9:12]

    # Newton: a = F/m
    ax = total_force[0] / DRONE_MASS_KG
    ay = total_force[1] / DRONE_MASS_KG
    az = total_force[2] / DRONE_MASS_KG

    # Euler: α = τ/I
    alpha_x = total_torque[0] / INERTIA_XX
    alpha_y = total_torque[1] / INERTIA_YY
    alpha_z = total_torque[2] / INERTIA_ZZ

    return np.array([vx, vy, vz, ax, ay, az, wx, wy, wz, alpha_x, alpha_y, alpha_z])
```

**Por qué RK45 y no otra cosa:**
- **Euler explícito** (el más simple) acumula error cuadráticamente — tras
  unos segundos el dron flotaría a alturas absurdas
- **RK4** es muy preciso pero usa pasos fijos
- **RK45** combina RK4 con un estimador de error que ajusta el paso
  automáticamente — más estable y eficiente

#### 5.2.2 `scipy.spatial.transform.Rotation`

Convierte ángulos de Euler a matrices de rotación 3×3. Esto es necesario
porque cuando el dron se inclina, los empujes de los motores **ya no apuntan
hacia arriba** — apuntan en una dirección rotada según la orientación del
dron.

**Dónde:** [`physics_engine.py:54-57`](simulator/src/engines/physics_engine.py).

```python
def _build_rotation_matrix(orientation):
    return Rotation.from_euler(
        "ZYX", [orientation[2], orientation[1], orientation[0]]
    ).as_matrix()
```

La convención `"ZYX"` es la de yaw–pitch–roll (estándar aeroespacial).

**Por qué no calculamos la matriz a mano:** las matrices de rotación tienen
problemas numéricos sutiles (gimbal lock, drift de la determinante).
`Rotation` usa quaterniones internamente, lo que es numéricamente robusto.

### 5.3 InfluxDB Client — base de datos de series temporales

**Dónde:** [`influxdb_writer.py:25-35`](simulator/src/writers/influxdb_writer.py).

```python
point = (
    Point("arm_telemetry")
    .tag("drone_id", drone_id)
    .tag("arm_index", str(i))
    .field("thrust", motor.thrust_newtons)
    .field("torque", motor.torque_nm)
    .field("safety_factor", safety)
    .field("degradation_factor", material.degradation_factor)
    .field("rpm", motor.rpm)
    .time(int(state.timestamp * 1e9), WritePrecision.NS)
)
```

**¿Por qué InfluxDB y no PostgreSQL?**

PostgreSQL podría guardar estos datos, pero está optimizado para datos
relacionales (consultas tipo JOIN). InfluxDB es una **time-series database**
diseñada específicamente para:

- **Insertar datos ordenados por tiempo a alta frecuencia** (>10K puntos/seg)
- **Comprimir series temporales** muy eficientemente
- **Consultas de ventana temporal** rápidas (`-1h`, `-30d`, `aggregateWindow`)
- **Tags** (índices) y **fields** (datos) — schema flexible

Es la misma tecnología que usa Tesla para guardar telemetría de coches o
Grafana para almacenar métricas de servidores.

### 5.4 Pydantic — validación de tipos

**Dónde:** [`config.py`](simulator/src/config.py) y los modelos del dominio.

```python
class SimulatorSettings(BaseSettings):
    influxdb_url: str
    influxdb_token: str
    influxdb_org: str
    influxdb_bucket: str
    postgres_dsn: str

    class Config:
        env_prefix = "SIM_"
```

No es una librería de simulación, pero es importante porque garantiza que
**todos los parámetros físicos sean validados al iniciar el contenedor**. Si
falta una variable o tiene tipo incorrecto, el simulador falla rápido en
lugar de propagar valores corruptos.

---

## 6. Flujo completo de una iteración

Cada 500 ms el simulador ejecuta este ciclo
([`main.py`](simulator/src/main.py)):

```
1. LEER  → consulta PostgreSQL: ¿hay misión activa?
              ↓ sí: obtiene la lista de movimientos (hover, ascend, ...)

2. CALCULAR EMPUJES → cada movimiento define multiplicadores de empuje por
              motor (ver motor_specs.py). Ejemplo:
                hover    → [1.0, 1.0, 1.0, 1.0]
                ascend   → [1.1, 1.1, 1.1, 1.1]
                forward  → [1.0, 1.05, 1.05, 1.0]

3. INTEGRAR → physics_engine.integrate_state(...)
              · construye fuerzas (NumPy)
              · arma vector de estado
              · llama scipy.solve_ivp con RK45
              · obtiene nuevo estado en t+dt

4. DEGRADAR → material_engine.compute_cycle_degradation(...)
              · calcula esfuerzo aplicado
              · calcula daño por ciclo (Wöhler + Miner)
              · acumula al daño previo

5. SAFETY  → structural_engine.compute_safety_factor(...)
              · SF = resistencia efectiva / esfuerzo aplicado

6. ESCRIBIR → influxdb_writer.write_state(...)
              · 4 puntos arm_telemetry (uno por brazo)
              · 1 punto drone_position (orientación + altitud)

7. DORMIR  → time.sleep(0.5 - tiempo_ya_transcurrido)
```

En total: ~12 ecuaciones diferenciales integradas por iteración + 4 cálculos
estructurales + 5 puntos escritos a InfluxDB. Todo en menos de 50 ms reales.

---

## 7. Estándares de ingeniería referenciados

| Estándar / Modelo | Año | Origen | Uso aquí |
|-------------------|-----|--------|----------|
| **Leyes de Newton** | 1687 | I. Newton | Dinámica traslacional |
| **Ecuaciones de Euler** | 1758 | L. Euler | Dinámica rotacional de cuerpo rígido |
| **Curva S–N de Wöhler** | 1860 | A. Wöhler | Ciclos hasta falla por fatiga |
| **Regla de Miner** | 1945 | M. A. Miner | Acumulación lineal de daño |
| **ASTM D638** | 1941 (vigente) | ASTM International | Pruebas de tensión en plásticos |
| **Runge-Kutta 4(5)** | 1980 | Dormand-Prince | Integración numérica adaptativa |

El uso conjunto de modelos físicos **publicados y peer-reviewed** es lo que
diferencia a un gemelo digital de una "demo bonita".

---

## 8. Comparación con otras herramientas de simulación

| Herramienta | Tipo | Usado para | Pros | Contras |
|-------------|------|------------|------|---------|
| **MATLAB / Simulink** | Comercial | Estándar académico/aeroespacial | Muy maduro | Caro, propietario |
| **Gazebo + ROS** | Open source | Robótica de servicio | Físicas completas | Pesado, curva de aprendizaje alta |
| **AirSim** (Microsoft) | Open source | Drones con gráficos foto-realistas | Visualmente impactante | Discontinuado en 2024 |
| **PX4 SITL / jMAVSim** | Open source | Simulación de firmware de vuelo | Compatible con autopilotos reales | Acoplado a PX4 |
| **Unity / Unreal Engine** | Comercial / gratuito | Motores de videojuegos con física | Visualmente espectacular | Pensados para juegos, no precisión |
| **Python + SciPy** *(este proyecto)* | Open source | Simulación científica general | Transparente, gratis, didáctico | Hay que escribir más código que en MATLAB |

**¿Por qué Python para este proyecto?**

- Es el lenguaje estándar de la ciencia de datos hoy.
- NumPy y SciPy son **gratuitas, abiertas, de calidad industrial**.
- Cualquier estudiante de ingeniería puede leer el código y entender qué
  hace.
- Se integra trivialmente con ML (si mañana queremos predecir fallas con
  redes neuronales, scikit-learn / PyTorch están a un `pip install` de
  distancia).

---

## 9. Limitaciones del modelo actual

Para ser honestos sobre lo que **no** modela esta simulación:

- **Aerodinámica detallada** — no modelamos arrastre del aire, efecto suelo,
  vórtices de hélice. Asumimos vuelo en aire calmo.
- **Dinámica del rotor** — los motores cambian de RPM instantáneamente. En
  realidad tienen una respuesta de primer orden con constante de tiempo.
- **Sensores ruidosos** — nuestra telemetría es "perfecta". Un dron real
  tiene IMU con ruido gaussiano, GPS con drift, etc.
- **Acoplamiento térmico** — no modelamos cómo la temperatura afecta la
  resistencia del material.

Estos son problemas conocidos y bien estudiados; añadirlos requiere más
ecuaciones, no más librerías. La arquitectura del simulador permite
extenderlo modularmente.

---

## 10. Para presentar en clase — guion sugerido

Si te toca presentar 5-10 minutos, este orden funciona bien:

1. **(1 min)** *Qué es un gemelo digital* — el contraste con una simulación
   tradicional.
2. **(2 min)** *Las dos físicas que simulamos* — vuelo (Newton + Euler) y
   fatiga (Wöhler + Miner).
3. **(3 min)** *Las librerías y dónde se usan*:
   - NumPy → vectores y matrices (mostrar `physics_engine.py` líneas 80-92)
   - SciPy → integración con `solve_ivp` (mostrar líneas 98-104)
   - SciPy → `Rotation` para orientación
4. **(2 min)** *El ciclo completo* — leer misión → integrar → escribir, cada
   500 ms.
5. **(2 min)** *Demo en vivo* — abrir [http://localhost](http://localhost) y
   mostrar el dashboard con el dron volando.

**Frase para cerrar:**

> "Lo que ven en pantalla no es animación. Son 12 ecuaciones diferenciales
> resolviéndose en vivo cada medio segundo, con los mismos métodos numéricos
> que usa cualquier ingeniero aeronáutico. La diferencia entre una
> simulación y un gemelo digital está en eso: si mañana este código predice
> que un brazo va a fallar después de 1000 vuelos, y el dron físico lo
> confirma, hemos validado un modelo. Eso es lo que hace esto útil."

---

## Apéndice — Estructura de archivos relevantes

```
simulator/src/
├── main.py                       ← Loop principal del simulador
├── engines/
│   ├── physics_engine.py         ← NumPy + SciPy: dinámica 6-DOF
│   ├── structural_engine.py      ← Cálculo de Safety Factor
│   └── material_engine.py        ← Wöhler + Miner: fatiga
├── models/
│   ├── drone_state.py            ← Estado del dron (12-DOF + extras)
│   ├── motor.py                  ← Modelo de un motor (thrust, torque, RPM)
│   └── material.py               ← Material y su degradación
├── constants/
│   ├── drone_specs.py            ← Masa, geometría, inercias
│   ├── motor_specs.py            ← Curvas thrust-torque, multiplicadores
│   └── material_properties.py    ← ONYX: 36 MPa, exponente fatiga, etc.
├── readers/
│   └── postgres_reader.py        ← Lee misiones activas
└── writers/
    └── influxdb_writer.py        ← Escribe telemetría a InfluxDB
```

---

**Última actualización:** mayo 2026
**Autor del documento:** generado para apoyo de presentación académica
