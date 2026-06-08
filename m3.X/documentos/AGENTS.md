# AGENTS.md — m3.X (PIC16F18426)

## Project

Firmware embebido para controlador PID de posición angular con dashboard HMI web.
- **MCU**: PIC16F18426 @ 32MHz (HFINTOSC)
- **IDE**: MPLAB X v6.00
- **Compiler**: XC8 2.36+
- **MCC**: PIC10/12/16/18 MCUs v1.81.8
- **HMI**: React + Vite (Web Serial API, sin backend)

## Build

### Firmware
```
make build          # via MPLAB X Makefile
make clean          # remove build artifacts
```
Project file: `m3.mc3` (MPLAB X IDE)

### HMI (Dashboard Web)
```
cd HMI
npm install         # primera vez
npm run dev         # desarrollo
npm run build       # producción
```

## Critical Constraints

- **NO modificar archivos en `mcc_generated_files/`** — son generados por MCC y se sobrescriben
- **Solo modificar `main.c` y `calibracion/`** en firmware salvo casos especiales explícitos
- **NO hacer commits** hasta que el usuario lo indique explícitamente

## Architecture

### Pin Mapping
| Pin | Function | Direction |
|-----|----------|-----------|
| RC3 | SETPOINT (ADC) | Input |
| RC2 | FEEDBACK (ADC) | Input |
| RC0 | PWM6OUT → driver ZSX11H | Output |
| RC1 | DIR (driver ZSX11H) | Output |
| RC4 | UART TX (115200 baud) | Output |
| RC5 | UART RX (115200 baud) | Input |
| RA2 | FVR_OUT 2.048V (ref analógica) | Output |

### Modules (MCC-generated)
- **ADCC**: Basic mode, VDD reference (5V, `ADREF=0x00`), right-justified, FOSC/32
  - Channels: `FEEDBACK` (0x12), `SETPOINT` (0x13)
- **PWM6**: 31.25kHz, left-aligned, TMR2 clock, active high
- **TMR0**: 16-bit, prescaler 1:256, interrupt every 8.33ms (120Hz) — **PID scheduler**
- **TMR2**: PR2=255, 32µs period — PWM6 clock source
- **EUSART1**: 115200 baud, 8-bit, async, no interrupts
- **ADREF override**: `main.c` sobrescribe la referencia ADC a VDD (`ADREF=0x00`) post-init. FVR sigue alimentando los pots en hardware pero ya no es ref. ADC.

### Control Loop
- PID se ejecuta en interrupción de TMR0 cada **8.33ms (120Hz)**
- Rango angular: **0-360°** (potenciómetros de 1 vuelta)
- Conversión ADC → grados: `grados = (adc_raw - ADC_0) * 360 / (ADC_360 - ADC_0)`
- Formato telemetría UART: **CSV** (`setpoint_deg,feedback_deg,error,pid_output,ctrlk_mv\r\n`)
- Señal DIR (RC1): HIGH = dirección positiva (CW), LOW = negativa (CCW)
- PWM duty representa salida PID (0-255)
- **Anti-windup**: integral limitada a ±800 con integración condicional (solo acumula si output no saturado en la dirección del error)
- **Setpoint limits**: `SP_MIN_DEG=10`, `SP_MAX_DEG=350` para evitar inversión en extremos
- **PID discreto**: `u[k] = (Kp·e[k] + Ki·Σe[k] + Kd·ΔFB[k]) / PID_SCALE` con `PID_SCALE=100`
- **Derivativa sobre medición**: `ΔFB[k] = -(fb[k] - fb[k-1])` para evitar derivative kick en cambios de setpoint
- **Anti-windup condicional**: integral solo se acumula si output no saturado o error va en dirección de reducir saturación
- **Cambio seguro de dirección**: PWM=0 → esperar 1 ciclo (8.33ms) → cambiar DIR → restaurar PWM
- **Lectura atómica de ganancias**: `GIE=0` durante lectura de `kp_val`, `ki_val`, `kd_val` en ISR (PIC16 es 8-bit)
- **Rate limiting**: cambio máximo de output = 100 por ciclo (respeta dinámica del filtro RC τ=1.3ms)
- **CTRLK voltaje estimado**: `ctrlk_mv = (|duty| / 255) × 5000` (enviado como 5to campo CSV)

### Ganancias PID por Defecto
| Parámetro | Valor | Rango HMI | Escala |
|-----------|-------|-----------|--------|
| Kp | 50 | 0-200 | Kp/100 → 0.50 |
| Ki | 10 | 0-100 | Ki/100 → 0.10 |
| Kd | 0 | 0-100 | Kd/100 → 0.00 |

### Protocolo de Comandos HMI → PIC
| Comando | Acción | Ejemplo |
|---------|--------|---------|
| `P<valor>\n` | Actualizar Kp | `P100\n` → Kp=100 |
| `I<valor>\n` | Actualizar Ki | `I5\n` → Ki=5 |
| `D<valor>\n` | Actualizar Kd | `D1\n` → Kd=1 |

## Calibration

### Herramienta: `calibracion/calib_pote.c`
- Captura valores ADC a **0° y 360°** directamente para cada potenciómetro
- Detecta dirección del pote (normal/invertido)
- Imprime defines listos para copiar en `main.c`:
  ```c
  #define SP_ADC_0    <valor>
  #define FB_ADC_0    <valor>
  #define SP_ADC_360  <valor>
  #define FB_ADC_360  <valor>
  ```
- Luego entra en modo **monitoreo en vivo** mostrando ADC y grados de ambos potes (`ADC_SP,ADC_FB,DEG_SP,DEG_FB\r\n`)

## HMI Dashboard

### Stack
- React 19 + Vite
- Chart.js (gráficas en tiempo real)
- Web Serial API (Chrome/Edge únicamente)
- lucide-react (iconos)

### Componentes
| Componente | Función |
|------------|---------|
| `ConnectionPanel` | Selección de puerto serial + botón conectar/desconectar |
| `PidTuner` | Sliders para ajustar Kp, Ki, Kd en tiempo real |
| `MotorIndicator` | Disco animado con dirección (CW/CCW/STOP) y velocidad proporcional a PWM |
| `MetricsBar` | Tarjetas: Setpoint, Feedback, Error, PWM, CTRLK (V), Sample Rate (Hz) |
| `RealtimeChart` | Gráfica principal de ángulo vs tiempo (Setpoint + Feedback) |
| `PwmChart` | Gráfica secundaria de señal PWM (0-255) vs tiempo |
| `PidAnalyzer` | Análisis de respuesta al escalón con scoring y recomendaciones |
| `ThemeToggle` | Switch entre tema oscuro y claro |

### Tema
- **Oscuro** (default): fondo negro, acentos amarillos
- **Claro**: fondo blanco/gris, acentos azul oscuro
- Persistencia visual vía `data-theme` en `<html>`

### Flujo de Datos
```
PIC ──UART CSV──► HMI parser ──► chartData + latestData
HMI PidTuner ──► comandos P/I/D ──► UART ──► PIC
```

## Key APIs (from mcc_generated_files)

```c
// ADC
ADCC_GetSingleConversion(adcc_channel_t channel)  // returns adc_result_t (uint16_t)

// PWM
PWM6_LoadDutyValue(uint16_t dutyValue)

// UART
EUSART1_Write(uint8_t txData)
EUSART1_is_tx_ready(void)
EUSART1_is_rx_ready(void)
EUSART1_Read(void)

// TMR0 ISR callback
TMR0_SetInterruptHandler(void (*handler)(void))

// DIR pin
DIR_SetHigh() / DIR_SetLow()
```

## Documentation

- `documentos/conexiones.md` — conexiones hardware completas (pines, componentes, señales)
- `documentos/notas_tecnicas.md` — análisis técnico, datasheets, tradeoffs de diseño
- `documentos/mcc_config.md` — configuración MCC Classic detallada
- `calibracion/README.md` — guía de calibración de potenciómetros
- `HMI/README.md` — documentación del dashboard web
