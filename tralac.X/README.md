# tralac.X — Eje traslacional

Firmware del eje traslacional del sistema detector de drones. Controla un motor **NEMA 17** con driver **A4988**, generando los pulsos STEP por hardware con el **NCO1** del **PIC16F18426** y aplicando una rampa trapezoidal de aceleración/desaceleración.

## Hardware

| Elemento | Modelo |
|----------|--------|
| MCU | PIC16F18426 @ 32 MHz |
| Motor | NEMA 17 |
| Driver | A4988 (Full Step) |
| Recorrido | 0–200 mm |
| Resolución | 40 pasos/mm (`STEPS_PER_MM`) |
| Enlace | USB-UART 115200 bps, 8N1 |

Conexiones del driver:

- `ENABLE` del A4988 a **GND** (siempre habilitado).
- `MS1 = MS2 = MS3 = 0` → **Full Step**, configurado en `main.c` al iniciar.

## Mapa de pines

| Pin PIC | Puerto | Función | Conecta a |
|---------|--------|---------|-----------|
| 10 | RC0 | STEP (NCO1OUT) | A4988 STEP |
| 9 | RC1 | DIR | A4988 DIR |
| 7 | RC2 | MS1 | A4988 MS1 |
| 8 | RC3 | MS2 | A4988 MS2 |
| 2 | RA5 | MS3 | A4988 MS3 |
| 6 | RC4 | UART TX | USB Serial |
| 5 | RC5 | UART RX | USB Serial |

## Compilación

Requisitos:

- MPLAB X IDE v6.30
- XC8 v3.10
- MCC Classic (para regenerar periféricos si hace falta)

Pasos:

1. Abrir `tralac.X` en MPLAB X (el proyecto se define con `tralac.mc3`).
2. Verificar que `mcc_generated_files/` esté presente (está versionado).
3. Compilar con la configuración `default`.

`Makefile`, `nbproject/`, `dist/` y `out/` son generados por MPLAB localmente y no se versionan.

## Protocolo serie

Los comandos se normalizan a mayúsculas antes de parsearse.

| Comando | Descripción |
|---------|-------------|
| `G0 X<n>` / `G1 X<n>` | Mueve a posición absoluta `n` mm (0–200) |
| `G0 X+<n>` | Mueve relativo positivo |
| `G0 X-<n>` | Mueve relativo negativo |
| `G28` | Inicia homing |
| `G92 X<n>` | Fija la posición actual en `n` mm sin mover el motor |
| `START` | Inicia barrido continuo entre 0 y 200 mm |
| `STOP` | Detiene el motor |
| `HOME` | Alterna: primer envío inicia homing, segundo fija posición en 0 |
| `M114` | Solicita posición y estado |
| `M203 S<n>` | Ajusta velocidad máxima en mm/min (1–90000) |

Telemetría:

```
ANG:<posición>.<centésimas>, STATE:<IDLE|HOME|SCAN|STOP>
```

## Estructura

```
tralac.X/
├── main.c                  # NCO1, rampa trapezoidal, parser G-code, telemetría
├── mcc_generated_files/    # periféricos generados por MCC (versionados)
└── tralac.mc3              # configuración del proyecto MCC
```

Ver también el [README raíz](../README.md).
