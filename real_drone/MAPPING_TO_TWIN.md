# Mapping: FC real → Digital Twin

Este documento conecta los parámetros y mensajes del dron físico (Kakute H7 / ArduCopter 4.2.3) con los componentes del digital twin que los consumen.

Snapshot fuente: [snapshots/2026-05-08_first/](snapshots/2026-05-08_first/)

## 1. Modelo físico (la `physics` del simulador)

| Concepto físico | Parámetro FC | Valor actual | Cómo se usa en el twin |
|---|---|---|---|
| Tipo de frame | `FRAME_CLASS=1`, `FRAME_TYPE=1` | QuadX | Geometría de los 4 brazos, matriz de mezcla |
| PWM → empuje | `MOT_PWM_TYPE=0` | PWM 1000-2000 µs | Mapeo lineal de salida; sin DShot |
| Banda muerta inferior | `MOT_SPIN_MIN=0.15` | 15% | Por debajo no hay empuje |
| Banda muerta arming | `MOT_SPIN_ARM=0.10` | 10% | Idle al armar |
| Tope superior | `MOT_SPIN_MAX=0.95` | 95% | Saturación del actuador |
| Punto de hover | `MOT_THST_HOVER=0.35` | 35% | T_hover/T_max ≈ 0.35 → T/W ≈ 2.85 |
| Curva de empuje | `MOT_THST_EXPO=0.65` | 0.65 | `thrust = (1-expo)·x + expo·x²` para linealizar |

## 2. Lazo de control (replicar lo que hace el FC)

Cuando el twin simule "modo STABILIZE" debe usar las mismas ganancias que el FC real:

| Eje | P | I | D | FF | Filtro D | Filtro target |
|---|---|---|---|---|---|---|
| Rate Roll | 0.135 | 0.135 | 0.0036 | 0 | 20 Hz | 20 Hz |
| Rate Pitch | 0.135 | 0.135 | 0.0036 | 0 | 20 Hz | 20 Hz |
| Rate Yaw | 0.18 | 0.018 | 0 | 0 | — | 20 Hz |
| Angle Roll/Pitch/Yaw P | 4.5 | — | — | — | — | — |

Aceleraciones máximas:
- Roll/Pitch: 1100 °/s² (`ATC_ACCEL_R/P_MAX=110000` cdeg/s²)
- Yaw: 270 °/s² (`ATC_ACCEL_Y_MAX=27000`)

## 3. Sensorización (qué señales esperar en el log real)

Cuando el dron vuele y graba un `.bin`, estos serán los streams disponibles:

| Mensaje DataFlash | Frecuencia típica | Campos clave | Destino en el twin |
|---|---|---|---|
| `ATT` | 50–100 Hz | Roll, Pitch, Yaw (target y real) | Validación de modelo de actitud |
| `IMU` | 50–400 Hz | GyrX/Y/Z, AccX/Y/Z, Tmp | Entrada de la dinámica rígida |
| `RCIN` | 50 Hz | C1–C16 (1000-2000 µs) | Comandos del piloto |
| `RCOU` | 50 Hz | C1–C8 (PWM 1000-2000 µs salida) | **Thrust por motor** (convertir vía curva expo) |
| `BARO` | 10 Hz | Alt, Press, Temp | Altitud de referencia |
| `GPS` | 5–10 Hz | Status, NSats, Lat, Lng, Alt, Spd | Posición global (cuando haya fix) |
| `MAG` | 10 Hz | MagX/Y/Z | Yaw absoluto |
| `BAT` | 10 Hz | Volt, Curr, CurrTot | **No estará** (BATT_MONITOR=0) |
| `CTUN` | 10 Hz | ThI, ThO, ThH, DAlt, Alt, BAlt, CRt | Throttle interno y errores de altitud |
| `NKF1`–`NKF5` | 10 Hz | Estados EKF3 | Validación de la estimación |
| `MOT` | bajo | LiftMax, BatVolt, BatRes, ThLimit | Si hay compensación batt |

## 4. Failsafes a replicar en el twin

| Disparador | Acción configurada |
|---|---|
| Pérdida de RC (throttle <975 µs) | Failsafe RC enabled (`FS_THR_ENABLE=1`) |
| Fallo EKF (umbral 0.8) | LAND (`FS_EKF_ACTION=1`) |
| Crash detect | LAND |
| Pérdida GCS | Sin acción (`FS_GCS_ENABLE=0`) |
| Batería baja/crítica | **No configurado** — riesgo en vuelo real |

## 5. Pipeline de ingesta — `.bin` → twin

```
[microSD .BIN] → pymavlink.DFReader.DFReader_binary
                    ↓
            extraer ATT, RCOU, IMU, GPS, CTUN, BARO
                    ↓
            convertir RCOU (1000-2000 µs) a thrust
            (aplicar curva MOT_THST_EXPO=0.65,
             escalar por T_max del frame)
                    ↓
            wide CSV: timestamp, thrust_0..3, altitude,
                      roll, pitch, yaw
                    ↓
        api/src/services/ingest_service.py (existente)
```

**Nota**: el adaptador `.bin` → CSV-wide es lo único nuevo a construir. El resto del pipeline ya existe.

## 6. Huecos a cerrar antes de un vuelo de captura útil

1. **Conectar y configurar batería**: `BATT_MONITOR=4` (Analog Voltage and Current), calibrar divisores.
2. **Asignar canal de modos**: `FLTMODE_CH=5` y mapear FLTMODE1..6 a STABILIZE / ALTHOLD / LOITER / RTL etc.
3. **Asignar switch de arming/RTL**: `RC7_OPTION=153` (Arm/Disarm), `RC8_OPTION=4` (RTL), etc.
4. **Verificar GPS al aire libre**: el live snapshot mostró 0 satélites (estaba indoors).
5. **Hacer AUTOTUNE** una vez todo lo anterior esté listo, para que los PIDs no sean genéricos.
