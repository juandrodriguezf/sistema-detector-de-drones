# m3.X — Eje rotacional

Firmware del eje rotacional del sistema detector de drones. Controla un motor brushless mediante un driver **ZSX11H** y un lazo **PID de posición angular** ejecutado a **120 Hz** sobre un **PIC16F18426**.

## Hardware

| Elemento | Modelo |
|----------|--------|
| MCU | PIC16F18426 @ 32 MHz |
| Motor | Brushless 57BLDC75E-20730 |
| Driver | ZSX11H (control externo por CTRL/DIR) |
| Referencia analógica | FVR interna 2.048 V |
| Buffer analógico | MCP6002 |
| Feedback | Potenciómetro de posición (POT2) |
| Enlace | USB-UART 115200 bps, 8N1 |

> El jumper **J1 del ZSX11H debe estar soldado** para habilitar el control externo y el potenciómetro de velocidad del driver debe quedar al mínimo (antihorario).

## Mapa de pines

| Pin PIC | Puerto | Función | Conecta a |
|---------|--------|---------|-----------|
| 10 | RC0 | PWM6OUT (31.25 kHz) → R 13k + C 100nF → MCP6002 | ZSX11H CTRL |
| 9 | RC1 | DIR | ZSX11H DIR |
| 8 | RC2 | ADC feedback (ángulo real) | POT2 vía MCP6002 |
| 7 | RC3 | ADC setpoint (no usado por el firmware) | POT1 vía MCP6002 |
| 6 | RC4 | UART TX | USB Serial |
| 5 | RC5 | UART RX | USB Serial |
| 11 | RA2 | FVR_OUT 2.048 V | Alimentación de potenciómetros |
| 3 | RA4 | AUX2 | Libre |
| 2 | RA5 | AUX1 | Libre |

Detalle completo de la cadena analógica, filtro RC, PID y recomendaciones de PCB en [`documentos/conexiones.md`](./documentos/conexiones.md). Configuración de MCC en [`documentos/mcc_config.md`](./documentos/mcc_config.md).

## Compilación

Requisitos:

- MPLAB X IDE v6.30
- XC8 v3.10
- MCC Classic (para regenerar periféricos si hace falta)

Pasos:

1. Abrir `m3.X` en MPLAB X (el proyecto se define con `m3.mc3`).
2. Verificar que `mcc_generated_files/` esté presente (está versionado).
3. Compilar con la configuración `default`.

`Makefile`, `nbproject/`, `dist/` y `out/` son generados por MPLAB localmente y no se versionan.

## Protocolo serie

Comandos en mayúsculas, terminados en `\n` o `\r`.

| Comando | Descripción |
|---------|-------------|
| `START` | Inicia barrido entre 10° y 350° |
| `STOP` | Detiene el motor y fija el objetivo en el ángulo actual |
| `HOME` | Mueve a la posición mínima (10°) |
| `G0 X<n>` | Mueve a ángulo absoluto `n` |
| `G0 X+<n>` | Mueve relativo positivo |
| `G0 X-<n>` | Mueve relativo negativo |
| `M114` | Solicita telemetría |
| `P<n>` | Ajusta Kp (0–200) |
| `I<n>` | Ajusta Ki (0–100) |
| `D<n>` | Ajusta Kd (0–100) |

Telemetría:

```
ANG:<ángulo>, TARGET:<objetivo>, STATE:<IDLE|HOMING|SWEEP>
```

## Estructura

```
m3.X/
├── main.c                  # lazo PID, parser de comandos, telemetría
├── mcc_generated_files/    # periféricos generados por MCC (versionados)
├── documentos/             # conexiones y configuración MCC
└── m3.mc3                  # configuración del proyecto MCC
```

Ver también el [README raíz](../README.md).
