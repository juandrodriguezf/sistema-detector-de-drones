# Sistema Detector de Drones

Sistema de detección y neutralización acústica de drones. Usa un micrófono conectado al PC para capturar audio en tiempo real, analizarlo mediante FFT en el navegador (Web Audio API), y detectar la firma espectral de un dron. Cuando se confirma la detección, envía una señal de STOP a dos sistemas motorizados (rotacional y traslacional) controlados por PICs independientes vía UART. Al perder la señal del dron, reanuda el barrido de búsqueda automáticamente.

## Componentes

| Carpeta | Descripción |
|---------|-------------|
| [`HMI/`](./HMI) | Frontend React (Web Audio API + Web Serial API) |
| [`m3.X/`](./m3.X) | Firmware PIC — eje rotacional (brushless + ZSX11H + PID) |
| [`tralac.X/`](./tralac.X) | Firmware PIC — eje traslacional (NEMA 17 + A4988) |
| [`ml/`](./ml) | Entrenamiento MLP offline (experimental / WIP) |
| [`cmake/`](./cmake) | Configuración CMake para toolchain XC8 |

## Estructura del repositorio

```
dron_v2/
├── HMI/          # interfaz React + captura de audio + Web Serial
├── m3.X/         # firmware eje rotacional (PIC16F18426)
├── tralac.X/     # firmware eje traslacional (PIC16F18426)
├── ml/           # entrenamiento MLP experimental
├── cmake/        # build CMake para XC8
└── README.md
```

Cada componente tiene su propio README con requisitos, compilación y protocolo.

## Arquitectura del sistema

```
Micrófono MAX4466
      │
      ▼
Tarjeta de audio USB → PC
      │
      ▼
Web Audio API → FFT → Detección (genérica o template)
      │
      ▼
¿Dron detectado? ──SÍ──→ STOP ambos PICs
      │
      NO (reanudar barrido)
      ↓
┌─────────────────────────────────────┐
│         ESTRUCTURA MECÁNICA         │
│                                     │
│  Eje Rotacional (m3.X)             │
│  Motor brushless 57BLDC75E-20730   │
│  Driver ZSX11H + PID a 120Hz       │
│  ● Sostiene todo el sistema        │
│  ● Rota 360°                       │
│  ● Apunta la dirección del mic     │
│         │                          │
│         ▼                          │
│  Eje Traslacional (tralac.X)       │
│  Motor NEMA 17 + A4988             │
│  ● Micrófono montado aquí          │
│  ● Acople: 0mm → 0°, 200mm → 90°  │
│  ● Barrido vertical del mic       │
└─────────────────────────────────────┘
```

### Modos de detección

- **Genérico**: mide la energía en la banda 600–900 Hz
- **Personalizado (template)**: el usuario carga un audio de dron, el sistema extrae su huella espectral (promedio FFT + picos armónicos) y la compara en vivo contra el micrófono usando similitud coseno y coincidencia de armónicos
- **ML (experimental)**: clasificador MLP sobre MFCC. La captura, exportación de dataset y carga de pesos están integradas en la HMI, pero el pipeline **no está validado en campo** (ver [`ml/README.md`](./ml/README.md))

## ML (experimental)

> **WIP:** esta parte del proyecto está incompleta y no debe considerarse funcional para operación real.

- `ml/train.py` entrena un MLP de 2 capas ocultas con features MFCC y exporta `weights.json`.
- La HMI expone `/ml-calibration` para grabar clips etiquetados (`dron` / `no_dron`), exportar el dataset y cargar el modelo.
- Limitaciones conocidas y formato del dataset en [`ml/README.md`](./ml/README.md).

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
- Micrófono MAX4466 con tarjeta de audio USB
- Toolchain: XC8 v3.10, MPLAB X v6.30

## Compilación de firmware

1. Abrir `m3.X/` o `tralac.X/` en MPLAB X (el proyecto se define con el archivo `.mc3`).
2. Verificar que `mcc_generated_files/` esté presente (está versionado).
3. Compilar la configuración `default` y programar el PIC16F18426 por ICSP/SNAP.

`Makefile`, `nbproject/`, `dist/` y `out/` se generan localmente y están ignorados por git. Detalle en [`m3.X/README.md`](./m3.X/README.md) y [`tralac.X/README.md`](./tralac.X/README.md).

## Licencia

Propietaria. Todos los derechos reservados. Ver [`LICENSE`](./LICENSE).
