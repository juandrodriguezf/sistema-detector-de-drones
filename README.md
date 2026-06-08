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

## Requisitos de hardware

- 2 × PIC16F18426 (programados con los firmwares respectivos)
- 2 × cables USB-UART
- Micrófono direccional con salida USB
- Toolchain: XC8 v3.10, MPLAB X v6.30

## Licencia

Propietaria.
