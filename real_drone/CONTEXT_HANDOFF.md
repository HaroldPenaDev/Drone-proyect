# Contexto de continuidad — Dron real ↔ Digital Twin

**Última actualización**: 2026-05-08
**Objetivo de la sesión**: Conectar el mando RadioMaster TX16S al controlador de vuelo del dron y verificar que el FC recibe los canales RC.
**Estado actual**: Bloqueado en el último paso — el FC no recibe datos CRSF aunque todo el resto funciona.

---

## 1. Hardware inventariado

### Dron
- **Frame**: Cuadricóptero impreso en 3D (negro, custom), brazos largos, 4 motores brushless
- **Flight Controller**: **Holybro Kakute H7** (STM32H743 @ 480 MHz)
- **Firmware**: **ArduCopter V4.2.3 oficial** (build `a480c0a7`, ago-2022)
- **RTOS**: ChibiOS
- **Motores**: Brushless con ESCs separados, **PWM normal** (no DShot — `MOT_PWM_TYPE=0`)
- **Sensores activos**: gyro ICM-42688-P (8 kHz), accel, barómetro, compass (1 detectada, DEV_ID 658945)
- **Sensores configurados pero sin señal**: GPS (sin fix indoors)
- **Sensores NO conectados**: batería (`BATT_MONITOR=0`)

### Receptor RC (en el dron)
- **Modelo**: ExpressLRS Nano-class (form factor ~12×18 mm, dipolo)
- **Firmware**: presumiblemente ELRS 3.x (compatible con TX que está en 3.3.1)
- **LED**: Fijo (bound) cuando la radio está encendida
- **Cableado al FC** (según usuario): 4 cables a pads `GND`, `R6`, `5V`, `T6`
- **PENDIENTE de verificar visualmente**: que los pads sean realmente R6/T6 y no R1/T1, y que las soldaduras estén bien

### Radio (mando)
- **Modelo**: **RadioMaster TX16S MKII ELRS Edition**
- **EdgeTX**: 2.7.1 (a55aff02), build jul-2022
- **Módulo interno**: ELRS (FW **3.3.1 ISM2G4**, hash `e051b8`)
- **Bay externo**: vacío
- **Modelo activo**: `model4.yml` = "QUAD"
- **Calibración**: sticks calibrados ✓

### USB / conexiones
- **FC al Mac**: USB CDC en `/dev/cu.usbmodem1101` (a veces `usbmodem101`, cambia al reenchufar)
- **Receptor**: alimentado por 5V del FC (que a su vez recibe de USB)

---

## 2. Configuración relevante del FC (ArduCopter)

Snapshot completo de los **1093 parámetros** en:
- [snapshots/2026-05-08_first/params.txt](snapshots/2026-05-08_first/params.txt)
- [snapshots/2026-05-08_first/identification.txt](snapshots/2026-05-08_first/identification.txt)
- [snapshots/2026-05-08_first/live_status.json](snapshots/2026-05-08_first/live_status.json)
- [snapshots/2026-05-08_first/rc_detection.log](snapshots/2026-05-08_first/rc_detection.log)
- [snapshots/2026-05-08_first/rc_after_bind.log](snapshots/2026-05-08_first/rc_after_bind.log)

### Parámetros tocados en esta sesión

| Parámetro | Valor original | Valor actual | Razón |
|---|---|---|---|
| `SERIAL6_PROTOCOL` | `-1` (disabled) | **`23` (RCIN)** | Activar UART6 para CRSF/ELRS |
| `SERIAL6_OPTIONS` | `0` | **`0`** | Probamos 8 (swap) y 1 (invert RX), revertido a 0 |

Todo lo demás está como estaba (defaults de ArduCopter 4.2.3 + algunos tweaks previos del fabricante).

### Configuración mecánica clave
```
FRAME_CLASS         = 1   (COPTER)
FRAME_TYPE          = 1   (X)
MOT_PWM_TYPE        = 0   (PWM normal)
MOT_SPIN_ARM        = 0.10
MOT_SPIN_MIN        = 0.15
MOT_SPIN_MAX        = 0.95
MOT_THST_HOVER      = 0.35
MOT_THST_EXPO       = 0.65
```

### EKF / fusión
```
AHRS_EKF_TYPE       = 3   (EKF3)
EK3_SRC1_POSXY      = 3   (GPS)
EK3_SRC1_POSZ       = 1   (Baro)
EK3_SRC1_YAW        = 1   (Compass)
```

### PIDs (defaults de fábrica, sin afinar)
```
ATC_RAT_RLL  P=0.135  I=0.135  D=0.0036  FF=0   (filtros 20 Hz)
ATC_RAT_PIT  P=0.135  I=0.135  D=0.0036  FF=0   (filtros 20 Hz)
ATC_RAT_YAW  P=0.180  I=0.018  D=0      FF=0
ATC_ANG_RLL/PIT/YAW_P = 4.5
```

### Configuraciones IMPORTANTES pendientes (antes de cualquier vuelo)
- [ ] `BATT_MONITOR = 4` y cablear el sensor de voltaje/corriente
- [ ] `FLTMODE_CH = 5` y mapear modos (`FLTMODE1..6`)
- [ ] `RCx_OPTION` para arming/RTL en switches
- [ ] Calibrar acelerómetro (drone nivelado)
- [ ] Calibrar brújula (rotaciones)
- [ ] Calibrar RC (mover sticks a extremos) — desde QGroundControl

---

## 3. Lo que YA está hecho

1. ✅ Identificación de FC, firmware, frame, sensores
2. ✅ Volcado completo de 1093 parámetros del FC
3. ✅ Análisis de configuración por subsistemas (Sensor, EKF, PID, Failsafe, etc.)
4. ✅ Memoria persistente actualizada para futuras sesiones
5. ✅ Documento puente FC → digital twin: [MAPPING_TO_TWIN.md](MAPPING_TO_TWIN.md)
6. ✅ Identificación del RadioMaster TX16S MKII ELRS y del receptor (vía SD card del TX leída por USB-Storage)
7. ✅ Verificación de que la radio y el receptor son **compatibles** (ambos ELRS)
8. ✅ Bind exitoso del RX a la radio (LED fijo, telemetría confirmada en pantalla del TX)
9. ✅ Activación de `SERIAL6_PROTOCOL=23` en el FC para CRSF
10. ❌ **Verificar que llegan los canales RC al FC — sigue fallando**

---

## 4. EL PROBLEMA PENDIENTE

**Síntoma**: aunque la radio transmite y el RX está bound (LED fijo + telemetría de vuelta), el FC reporta `chancount=0` y `RC sensor present=False` constantemente.

**Confirmado por software**:
- `SERIAL6_PROTOCOL=23` (RCIN) ✓
- `RC_PROTOCOLS=1` (auto-detect) ✓
- Reboot del FC tras cada cambio ✓
- Probadas `SERIAL6_OPTIONS`: 0, 8 (swap TX/RX), 1 (invert RX) — ninguna funcionó

**Diagnóstico**: hay un problema **físico** en la conexión RX → FC:
1. Los cables podrían estar soldados a pads equivocados (¿R1/T1 en vez de R6/T6?)
2. Soldadura fría en el cable amarillo (signal)
3. El receptor podría estar configurado por firmware para sacar SBUS/PWM en vez de CRSF

**Pendiente**: foto cercana del lado del FC mostrando dónde van soldados los 4 cables del RX y qué letras pone serigrafiadas.

---

## 5. Próximos pasos (cuando retomes)

### Paso A — Verificar conexión física
1. Foto **muy cercana** del FC mostrando los pads donde están soldados los cables del RX.
2. Leer la serigrafía: confirmar que son `R6`/`T6`, `GND`, `5V`.
3. Inspeccionar visualmente las 4 soldaduras (brillo, forma).

### Paso B — Si los pads son correctos pero las soldaduras se ven mal
- Resoldar con un poco de flux.

### Paso C — Si los pads son distintos (p.ej. R1/T1)
- Reconfigurar el UART correspondiente:
  ```bash
  ~/.fcvenv/bin/python real_drone/set_param.py SERIAL1_PROTOCOL 23 --type INT8 --reboot
  ```
  (Cuidado: SERIAL1 actualmente está como MAVLink2 para TELEM1 radio. Si se reusa, esa función se pierde, pero no afecta al USB.)

### Paso D — Si todo se ve bien físicamente
- Verificar que el ELRS RX está sacando **CRSF** (no SBUS/PWM):
  1. Apagar la radio
  2. Esperar 60 s
  3. RX entra en modo WiFi → buscar red `ExpressLRS RX`
  4. Conectar al WiFi, abrir `http://10.0.0.1`
  5. En "Serial Protocol" debe estar `CRSF` (no SBUS ni PWM)

### Paso E — Una vez RC reciba en el FC
- Calibrar radio en QGroundControl (`Vehicle Setup → Radio → Calibrate`)
- Configurar modos de vuelo (FLTMODE_CH = 5)
- Configurar batería (BATT_MONITOR)
- Test de motores SIN hélices, con batería (USB desconectado)

---

## 6. Stack de software (cómo replicar el entorno en otro PC)

### Instalaciones (macOS)
```bash
# 1. Betaflight Configurator (lo instalamos pero al final no se usa porque el FC tiene ArduPilot, no Betaflight)
brew install --cask betaflight-configurator

# 2. dfu-util (por si hay que reflashear)
brew install dfu-util

# 3. Python venv con pymavlink (lo que usamos para hablar con el FC)
# Importante: usar ~/.fcvenv (persistente) y NO /tmp/fcvenv (se borra al reiniciar el Mac)
python3 -m venv ~/.fcvenv
~/.fcvenv/bin/pip install pymavlink pyserial

# 4. (Recomendado pero opcional) QGroundControl para calibraciones GUI
brew install --cask qgroundcontrol
```

### En otro PC sin el venv
- Crear el venv en `~/.fcvenv` y `pip install pymavlink pyserial`
- Los scripts en `real_drone/` son auto-contenidos y solo necesitan ese venv

### Detectar el puerto USB del FC
```bash
ls /dev/cu.usbmodem*
# Saldrá algo tipo /dev/cu.usbmodem101 o /dev/cu.usbmodem1101
# El número cambia al reenchufar — ojo
```

---

## 7. Scripts disponibles en `real_drone/`

| Script | Qué hace |
|---|---|
| [identify.py](identify.py) | Heartbeat + AUTOPILOT_VERSION + banner. Confirma tipo de autopiloto y FW. |
| [dump_params.py](dump_params.py) | Volcado de los 1093 parámetros del FC a un archivo. |
| [live_status.py](live_status.py) | Snapshot de RC, GPS, batería, baro, attitude. JSON. |
| [detect_rc.py](detect_rc.py) | Vigila RC durante N segundos. Detecta cambios en canales. |
| [diagnose_rc.py](diagnose_rc.py) | Verifica params SERIAL6 + sensor health + STATUSTEXT. |
| [configure_rc_uart.py](configure_rc_uart.py) | Setea `SERIAL{x}_PROTOCOL=23` + reboot. |
| [set_param.py](set_param.py) | Setter genérico de un parámetro (+ reboot opcional). |

### Ejemplos de uso (desde la raíz del proyecto)
```bash
# Identificar el FC
~/.fcvenv/bin/python real_drone/identify.py --port /dev/cu.usbmodem101

# Re-dump de parámetros
~/.fcvenv/bin/python real_drone/dump_params.py --out real_drone/snapshots/$(date +%F)_v2/params.txt

# Comprobar si llega RC
~/.fcvenv/bin/python real_drone/detect_rc.py --port /dev/cu.usbmodem101 --seconds 30

# Cambiar un parámetro
~/.fcvenv/bin/python real_drone/set_param.py SERIAL6_PROTOCOL 23 --type INT8 --reboot
```

---

## 8. Documentos relacionados en el proyecto

- [MAPPING_TO_TWIN.md](MAPPING_TO_TWIN.md) — Cómo los parámetros del FC alimentan al digital twin
- [snapshots/2026-05-08_first/](snapshots/2026-05-08_first/) — Configuración congelada del 2026-05-08
- Memoria persistente (otro Mac/sesión recordará todo):
  - `~/.claude/projects/-Users-harold-Proyect/memory/MEMORY.md`
  - `~/.claude/projects/-Users-harold-Proyect/memory/project_real_drone_kakute_h7.md`
  - `~/.claude/projects/-Users-harold-Proyect/memory/project_real_flight_ingest_pending.md`

---

## 9. Mensaje al "yo" del futuro / al Claude del próximo PC

Si retomas este trabajo en otro Mac o tras tiempo, este es el resumen de 3 frases:

> Estamos a un paso de tener al dron escuchando al mando. Todo el software está bien (ArduCopter 4.2.3 con SERIAL6_PROTOCOL=23 listo para CRSF, radio TX16S MKII ELRS con bind exitoso al receptor ELRS Nano del dron). **El cuello de botella es físico**: por algún motivo el FC no recibe ningún byte por su UART6 aunque todo el resto del enlace funciona. Próximo paso: foto cercana de las soldaduras del receptor al FC para confirmar pads correctos y soldaduras sanas.

Una vez resuelto eso → calibrar radio en QGC → configurar batería y modos → test de motores SIN hélices → primer hover.

---

## 10. Estado de seguridad

⚠️ **Antes de cualquier vuelo o test de motores**:
- Hélices fuera del dron durante toda la configuración
- USB y batería NUNCA conectados simultáneamente al FC (riesgo de daño al PC)
- Para configurar → solo USB
- Para test de motores → solo batería, sin hélices, dron sujeto

Tu Kakute H7 tiene protecciones, pero la regla "no mezclar USB+batería" es estándar en la comunidad ArduPilot.
