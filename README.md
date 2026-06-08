# Sistema Detector de Drones

Sistema de detección acústica de drones con PIC16F18426 y frontend React.

## Componentes

| Carpeta | Descripción |
|---------|-------------|
| [`HMI/`](./HMI) | Frontend React (Web Audio API + Web Serial API) |
| [`m3.X/`](./m3.X) | Firmware PIC — eje rotacional (brushless + ZSX11H + PID) |
| [`tralac.X/`](./tralac.X) | Firmware PIC — eje traslacional (NEMA 17 + A4988) |
| [`cmake/`](./cmake) | Configuración CMake para toolchain XC8 |

## Arquitectura

```
Micrófono (USB → PC)
     │
     ▼
Web Audio API → FFT → Detección (genérica o template)
     │
     ▼
¿Dron detectado? ──SÍ──→ STOP ambos PICs
     │
     NO (reanudar barrido)
     ↓
PIC Rotacional (USB)     PIC Traslacional (USB)
   m3.X                     tralac.X
```

## Mapa de conexiones

### `m3.X` — Rotacional (Brushless 57BLDC75E-20730 + ZSX11H)

| Pin PIC | Puerto | Señal | Conecta a |
|---------|--------|-------|-----------|
| 10 | RC0 | PWM6OUT → R13k+C100nF → MCP6002 | ZSX11H CTRL |
| 9 | RC1 | DIR | ZSX11H DIR |
| 8 | RC2 | ADC FEEDBACK (ángulo real) | POT2 vía MCP6002 |
| 7 | RC3 | ADC SETPOINT (no usado por SW) | POT1 vía MCP6002 |
| 6 | RC4 | UART TX | USB Serial |
| 5 | RC5 | UART RX | USB Serial |
| 11 | RA2 | FVR_OUT 2.048V | Alimentación pots |
| 3 | RA4 | AUX2 | Libre |
| 2 | RA5 | AUX1 | Libre |

Cadena analógica:

```
RA2(FVR 2.048V) ──┬── POT1(10k) ── MCP6002 ── RC3 (setpoint)
                   └── POT2(10k) ── MCP6002 ── RC2 (feedback)

RC0(PWM 31.25kHz) ── R13k + C100nF ── MCP6002 ── ZSX11H CTRL
RC1(DIR) ─────────────────────────────────────── ZSX11H DIR
```

> **J1 del ZSX11H debe estar soldado** para habilitar control externo.  
> **Pot de velocidad del ZSX11H al mínimo** (antihorario).

### `tralac.X` — Traslacional (NEMA 17 + A4988)

| Pin PIC | Puerto | Señal | Conecta a |
|---------|--------|-------|-----------|
| 10 | RC0 | STEP (NCO1OUT) | A4988 STEP |
| 9 | RC1 | DIR | A4988 DIR |
| 7 | RC2 | MS1 | A4988 MS1 |
| 8 | RC3 | MS2 | A4988 MS2 |
| 2 | RA5 | MS3 | A4988 MS3 |
| 6 | RC4 | UART TX | USB Serial |
| 5 | RC5 | UART RX | USB Serial |

Configuración de microstepping (inicialización en `main.c`):

```
MS1=0  MS2=0  MS3=0  →  Full Step
```

ENABLE del A4988 va a GND (siempre habilitado).

## Requisitos de hardware

- 2 × PIC16F18426 (programados con los firmwares respectivos)
- 2 × cables USB-UART
- Micrófono direccional con salida USB
- Toolchain: XC8 v3.10, MPLAB X v6.30

## Licencia

Propietaria.
