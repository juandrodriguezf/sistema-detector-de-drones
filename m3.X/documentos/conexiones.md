# PIC16F18426

## Resumen Completo de Conexiones y Arquitectura del Sistema

---

## Tabla de Contenidos

1. [Descripción General del Sistema](https://claude.ai/chat/f5558bce-50e2-421e-9d98-6c6159d45452#1-descripci%C3%B3n-general-del-sistema)
2. [Tabla General de Pines](https://claude.ai/chat/f5558bce-50e2-421e-9d98-6c6159d45452#2-tabla-general-de-pines)
3. [Alimentación](https://claude.ai/chat/f5558bce-50e2-421e-9d98-6c6159d45452#3-alimentaci%C3%B3n)
4. [Referencia Analógica FVR](https://claude.ai/chat/f5558bce-50e2-421e-9d98-6c6159d45452#4-referencia-anal%C3%B3gica-fvr)
5. [Potenciómetros](https://claude.ai/chat/f5558bce-50e2-421e-9d98-6c6159d45452#5-potenci%C3%B3metros)
6. [POT1 — Setpoint PID](https://claude.ai/chat/f5558bce-50e2-421e-9d98-6c6159d45452#6-pot1--setpoint-pid)
7. [POT2 — Feedback PID](https://claude.ai/chat/f5558bce-50e2-421e-9d98-6c6159d45452#7-pot2--feedback-pid)
8. [Lazo PID](https://claude.ai/chat/f5558bce-50e2-421e-9d98-6c6159d45452#8-lazo-pid)
9. [Salida PWM DAC](https://claude.ai/chat/f5558bce-50e2-421e-9d98-6c6159d45452#9-salida-pwm-dac)
10. [Filtro RC](https://claude.ai/chat/f5558bce-50e2-421e-9d98-6c6159d45452#10-filtro-rc)
11. [Buffer de Salida CTRL](https://claude.ai/chat/f5558bce-50e2-421e-9d98-6c6159d45452#11-buffer-de-salida-ctrl)
12. [CTRL — Driver ZSX11H](https://claude.ai/chat/f5558bce-50e2-421e-9d98-6c6159d45452#12-ctrl--driver-zsx11h)
13. [DIR — Driver ZSX11H](https://claude.ai/chat/f5558bce-50e2-421e-9d98-6c6159d45452#13-dir--driver-zsx11h)
14. [Frecuencia PWM Recomendada](https://claude.ai/chat/f5558bce-50e2-421e-9d98-6c6159d45452#14-frecuencia-pwm-recomendada)
15. [Programación ICSP](https://claude.ai/chat/f5558bce-50e2-421e-9d98-6c6159d45452#15-programaci%C3%B3n-icsp)
16. [Reset](https://claude.ai/chat/f5558bce-50e2-421e-9d98-6c6159d45452#16-reset)
17. [Comunicación Serial UART](https://claude.ai/chat/f5558bce-50e2-421e-9d98-6c6159d45452#17-comunicaci%C3%B3n-serial-uart)
18. [Entradas/Salidas Auxiliares](https://claude.ai/chat/f5558bce-50e2-421e-9d98-6c6159d45452#18-entradassalidas-auxiliares)
19. [MCP6002](https://claude.ai/chat/f5558bce-50e2-421e-9d98-6c6159d45452#19-mcp6002)
20. [Frecuencia de Muestreo del Sistema](https://claude.ai/chat/f5558bce-50e2-421e-9d98-6c6159d45452#20-frecuencia-de-muestreo-del-sistema)
21. [Impacto del Filtro RC en el Control](https://claude.ai/chat/f5558bce-50e2-421e-9d98-6c6159d45452#21-impacto-del-filtro-rc-en-el-control)
22. [Constante de Tiempo del Filtro](https://claude.ai/chat/f5558bce-50e2-421e-9d98-6c6159d45452#22-constante-de-tiempo-del-filtro)
23. [Efectos del Filtro RC](https://claude.ai/chat/f5558bce-50e2-421e-9d98-6c6159d45452#23-efectos-del-filtro-rc)
24. [PID Discreto](https://claude.ai/chat/f5558bce-50e2-421e-9d98-6c6159d45452#24-pid-discreto)
25. [Término Derivativo](https://claude.ai/chat/f5558bce-50e2-421e-9d98-6c6159d45452#25-t%C3%A9rmino-derivativo)
26. [Actualización PWM](https://claude.ai/chat/f5558bce-50e2-421e-9d98-6c6159d45452#26-actualizaci%C3%B3n-pwm)
27. [Telemetría UART](https://claude.ai/chat/f5558bce-50e2-421e-9d98-6c6159d45452#27-telemetr%C3%ADa-uart)
28. [Arquitectura Recomendada de Software](https://claude.ai/chat/f5558bce-50e2-421e-9d98-6c6159d45452#28-arquitectura-recomendada-de-software)
29. [Anti-Windup](https://claude.ai/chat/f5558bce-50e2-421e-9d98-6c6159d45452#29-anti-windup)
30. [Recomendaciones PCB](https://claude.ai/chat/f5558bce-50e2-421e-9d98-6c6159d45452#30-recomendaciones-pcb)
31. [Resumen Final del Sistema](https://claude.ai/chat/f5558bce-50e2-421e-9d98-6c6159d45452#31-resumen-final-del-sistema)
32. [Diagrama de Arquitectura Completo](https://claude.ai/chat/f5558bce-50e2-421e-9d98-6c6159d45452#32-diagrama-de-arquitectura-completo)

---

## 1. Descripción General del Sistema

El sistema implementa un controlador PID digital de posición angular utilizando:

* MCU PIC16F18426
* Referencia interna FVR de 2.048V
* Dos potenciómetros analógicos
* Buffers analógicos MCP6002
* DAC PWM implementado mediante filtro RC
* Driver externo ZSX11H
* Comunicación serial UART

**Arquitectura general:**

```
Setpoint     → ADC → PID → PWM DAC → Driver
Posición Real → ADC → PID
```

---

## 2. Tabla General de Pines

| Pin | Nombre       | Tipo             | Función                               |
| --- | ------------ | ---------------- | -------------------------------------- |
| 1   | VDD          | Power            | Alimentación +5V                      |
| 2   | RA5          | GPIO             | Señal auxiliar externa                |
| 3   | RA4          | GPIO             | Señal auxiliar externa                |
| 4   | RA3/MCLR/VPP | Reset            | Reset e ICSP                           |
| 5   | RC5          | UART RX          | Recepción serial USB_SERIAL           |
| 6   | RC4          | UART TX          | Transmisión serial USB_SERIAL         |
| 7   | RC3          | ADC              | Lectura Setpoint PID                   |
| 8   | RC2          | ADC              | Lectura feedback PID (ángulo real)    |
| 9   | RC1          | GPIO Digital     | Señal DIR hacia driver ZSX11H         |
| 10  | RC0          | PWM              | DAC PWM hacia CTRL ZSX11H              |
| 11  | RA2          | Analog Reference | Salida FVR 2.048V para potenciómetros |
| 12  | RA1/ICSPCLK  | ICSP             | Clock programación                    |
| 13  | RA0/ICSPDAT  | ICSP             | Data programación                     |
| 14  | VSS          | Power            | GND lógica                            |

---

## 3. Alimentación

### Pin 1 — VDD

Conectado a: **+5V lógica (Vin_5v)**

Desacoplo:

* C1 = 100nF cercano al PIC
* Capacitor bulk recomendado de 10uF

### Pin 14 — VSS

Conectado a: **GND lógica**

Recomendaciones:

* Plano de tierra continuo
* Unión estrella con GND potencia

---

## 4. Referencia Analógica FVR

### Pin 11 — RA2

RA2 se utiliza como salida de referencia analógica FVR:

> V_FVR = 2.048V (configuración actual: ganancia 2x)

**Niveles disponibles:**

| Ganancia | Voltaje | Precisión | VDD mínimo |
|----------|---------|-----------|------------|
| 1x | 1.024V | ±4% | 2.5V |
| 2x | 2.048V | ±4% | 2.5V |
| 4x | 4.096V | ±5% | 4.75V |

**Funciones:**

1. Referencia ADC interna (VREF+)
2. Alimentación analógica de ambos potenciómetros

**Ventajas:**

* Sistema completamente ratiométrico
* Máxima utilización del rango ADC
* Eliminación de errores por variación VDD
* Conversión ADC lineal y estable

**Notas:**

* Tiempo de estabilización al habilitar: ~60 µs
* Consumo del módulo FVR: ~40-46 µA (típico a 3V)
* La salida FVR no puede exceder VDD

---

## 5. Potenciómetros

Ambos potenciómetros trabajan entre  **0V → 2.048V** , alimentados directamente desde RA2/FVR.

**Especificaciones:**

* Valor: 10kΩ
* Tipo: 1 vuelta (~270-300° mecánicos)
* Corriente por potenciómetro: 2.048V / 10kΩ ≈ 205 µA
* Corriente total (2 pots): ≈ 410 µA

**Arquitectura general:**

```
RA2(FVR) → POT → MCP6002 → ADC
```

Cada potenciómetro posee:

* Buffer operacional independiente
* Canal ADC independiente
* Baja impedancia hacia el ADC

---

## 6. POT1 — Setpoint PID

### Pin 7 — RC3

**Función:**

* Lectura del setpoint del sistema PID
* Ángulo deseado

**Cadena analógica:**

```
RA2(FVR) → POT1 → MCP6002 → RC3
```

**Funciones del buffer MCP6002:**

* Aislar el potenciómetro
* Reducir errores sample-and-hold
* Entregar baja impedancia al ADC
* Mejorar estabilidad de lectura

---

## 7. POT2 — Feedback PID

### Pin 8 — RC2

**Función:**

* Lectura del ángulo real
* Retroalimentación del lazo PID

**Cadena analógica:**

```
RA2(FVR) → POT2 → MCP6002 → RC2
```

**Funciones:**

* Medición de posición real
* Retroalimentación del sistema
* Cálculo del error PID

---

## 8. Lazo PID

El firmware implementa:

```
e(t) = SP - PV
```

donde:

* **SP** = Setpoint
* **PV** = Process Variable

**Control PID:**

```
u(t) = Kp·e(t) + Ki·∫e(t)dt + Kd·(de(t)/dt)
```

**Salida:** Duty PWM proporcional

---

## 9. Salida PWM DAC

### Pin 10 — RC0

RC0 funciona como:

* Salida PWM
* DAC analógico implementado por software

**Especificaciones:**

* Voltaje de salida: 0V → VDD (5V) según duty cycle
* Frecuencia PWM: 31.25kHz (TMR2, PR2=255, clock FOSC/4)
* Resolución: 8 bits (0-255)
* Período TMR2: 32 µs

**Cadena completa:**

```
RC0 PWM → Filtro RC → MCP6002 → CTRL
```

**Nota:** El PWM oscila entre 0V y VDD(5V). La FVR no afecta esta salida.

---

## 10. Filtro RC

**Componentes:**

* R3 = 13kΩ
* C = 100nF

**Frecuencia de corte:**

```
fc = 1 / (2π·R·C) = 1 / (2π × 13kΩ × 100nF) ≈ 122 Hz
```

**Constante de tiempo:**

```
τ = R·C = 13kΩ × 100nF = 1.3 ms
t_settling (5τ) ≈ 6.5 ms
```

**Objetivos:**

* Convertir PWM de 31.25kHz en voltaje DC
* Reducir ripple residual
* Suavizar señal CTRL
* Introducir amortiguamiento adicional al sistema

---

## 11. Buffer de Salida CTRL

MCP6002 configurado como  **seguidor de tensión**  (ganancia = 1×).

**Conexión:**

```
Filtro RC → MCP6002(+)  MCP6002(out) → MCP6002(-)  → CTRL
```

**Funciones:**

* Aislar el filtro RC
* Mantener estable la frecuencia de corte
* Entregar baja impedancia al driver
* Evitar carga sobre el filtro

**Especificaciones relevantes:**

* Alimentación: VDD = 5V
* Configuración: seguidor (VOUT conectado a VIN-)
* Salida rail-to-rail: VSS+25mV a VDD-25mV

---

## 12. CTRL — Driver ZSX11H

La señal CTRL recibe el voltaje analógico generado por PWM.

**Especificaciones del driver:**

* Rango de entrada CTRL: 0V → 5V
* Alimentación principal (VCC): 6-60VDC
* Jumper J1: debe estar soldado para control externo

**Función:**

* Acción de control del PID
* Control de potencia/salida del ZSX11H

**Nota:** El voltaje en CTRL proviene del filtro RC + MCP6002, no directamente del PWM.

---

## 13. DIR — Driver ZSX11H

### Pin 9 — RC1

RC1 genera la  **señal digital DIR** .

Conectado a: entrada DIR del driver ZSX11H.

**Lógica: active LOW**

| Estado | Nivel | Dirección |
|--------|-------|-----------|
| Normal | HIGH (3.3V-5V) o flotante | Dirección por defecto |
| Inversa | LOW (0V / GND) | Dirección opuesta |

**Funciones:**

* Definir dirección del movimiento
* Control de sentido del actuador

---

## 14. Frecuencia PWM Recomendada

```
20kHz → 62kHz
```

**Objetivos:**

* Reducir ripple residual
* Evitar ruido audible
* Mejorar estabilidad del DAC PWM

---

## 15. Programación ICSP

### Pin 13 — RA0 / ICSPDAT

Conectado a: **SNAP ICSPDAT**

### Pin 12 — RA1 / ICSPCLK

Conectado a: **SNAP ICSPCLK**

---

## 16. Reset

### Pin 4 — RA3 / MCLR / VPP

Conectado a:

* Pulsador RESET
* SNAP VPP
* R serie 100Ω

Recomendado: Pull-up 10kΩ a +5V

---

## 17. Comunicación Serial UART

### Pin 6 — RC4 (TX)

Conectado a: **USB_SERIAL**

**Uso:** UART TX — Transmisión serial desde el PIC

**Funciones:**

* Debug PID
* Telemetría
* Diagnóstico del sistema

### Pin 5 — RC5 (RX)

Conectado a: **USB_SERIAL**

**Uso:** UART RX — Recepción serial hacia el PIC

**Funciones:**

* Configuración PID
* Recepción comandos G-code
* Ajuste de parámetros

---

## 18. Entradas/Salidas Auxiliares

### Pin 3 — RA4

Uso: GPIO auxiliar

### Pin 2 — RA5

Uso: GPIO auxiliar

---

## 19. MCP6002

**Configuraciones utilizadas:**

1. Buffer entrada setpoint (seguidor, U1A)
2. Buffer entrada feedback (seguidor, U1B)
3. Buffer salida CTRL (seguidor, U2A o U2B)

**Especificaciones:**

| Parámetro | Valor |
|-----------|-------|
| Alimentación (VDD) | 1.8V → 5.5V |
| GBWP | 1.0 MHz |
| Slew Rate | 0.6 V/µs |
| Corriente reposo (por amp) | 100 µA (típico) |
| Corriente salida | ±23 mA (a 5.5V) |
| Swing de salida | VSS+25mV → VDD-25mV |
| Entrada | Rail-to-rail (VSS-300mV → VDD+300mV) |
| Fase márgen | 90° (G=+1) |
| Estabilidad cargas capacitivas | Estable hasta 500pF (G=+1) |

**Ventajas:**

* Alta impedancia de entrada
* Baja impedancia de salida
* Aislamiento analógico
* Estabilidad

---

## 20. Frecuencia de Muestreo del Sistema

```
Fs = 120Hz
Ts = 1/Fs = 1/120 ≈ 8.33ms
```

El lazo PID debe ejecutarse exactamente cada **8.33ms** utilizando:

* Interrupciones por timer
* Tiempo de muestreo constante
* Ejecución periódica precisa

---

## 21. Impacto del Filtro RC en el Control

El filtro RC no solamente elimina ripple PWM — también forma parte de la dinámica del sistema.

**Cadena real:**

```
PID → PWM → RC → CTRL → Driver → Motor
```

Por lo tanto:

* El PID no controla directamente el motor
* Existe un retardo analógico
* El RC forma parte de la planta

---

## 22. Constante de Tiempo del Filtro

```
τ = R·C
```

Con R = 13kΩ y C ≈ 100nF:

```
τ ≈ 1.3ms
t_settling ≈ 5τ ≈ 6.5ms
```

Comparado con Ts = 8.33ms → **el filtro RC afecta directamente la dinámica del sistema.**

---

## 23. Efectos del Filtro RC

El filtro introduce:

* Amortiguamiento adicional
* Suavizado de CTRL
* Reducción de ripple
* Reducción de ruido
* Retraso de fase

Sin embargo, dado que el motor BLDC posee inercia y el sistema es relativamente lento, el filtrado ayuda a:

* Mejorar estabilidad
* Reducir oscilaciones
* Facilitar tuning

---

## 24. PID Discreto

**Implementación recomendada:**

```
u[k] = Kp·e[k] + Ki·Σe[k] + Kd·(e[k] - e[k-1])
```

donde:

* `e[k]` es el error actual
* `e[k-1]` es el error anterior

---

## 25. Término Derivativo

El término derivativo `Kd·(de(t)/dt)` es sensible a:

* Ruido ADC
* Cuantización
* Jitter

Debido al filtro RC, el sistema ya posee filtrado natural, por lo que:

* Probablemente se requerirá un valor pequeño de Kd
* Incluso puede funcionar correctamente con **Kd ≈ 0**

---

## 26. Actualización PWM

El PWM debe:

* Operar a frecuencia alta (20kHz–62kHz)
* Actualizarse sincronizado con el loop PID

El **duty PWM** representa la salida digital PID, mientras que el **filtro RC** genera la señal analógica CTRL.

---

## 27. Telemetría UART

La práctica exige transmisión serial a la frecuencia de muestreo.

**Formato de datos (CSV):**

```
sp_deg,fb_deg,error,pwm_output,ctrlk_mv\r\n
```

| Campo | Descripción | Rango |
|-------|-------------|-------|
| sp_deg | Setpoint en grados | 0-360 |
| fb_deg | Feedback en grados | 0-360 |
| error | Diferencia SP - FB | ±360 |
| pwm_output | Duty cycle PID | -255 → +255 |
| ctrlk_mv | Voltaje estimado en CTRLK | 0-2048 mV |

**Ejemplo:**

```
45,30,15,75,150\r\n
```

**Frecuencia de transmisión:** 120Hz

Por lo tanto:

* La UART no debe bloquear el loop PID
* Se recomienda separar control y telemetría

---

## 28. Arquitectura Recomendada de Software

### Interrupción Timer (cada 8.33ms)

1. Leer ADC setpoint
2. Leer ADC feedback
3. Calcular error
4. Ejecutar PID
5. Actualizar PWM
6. Guardar datos UART

### Loop Principal

* Transmisión UART
* Recepción comandos G-code
* Actualización parámetros PID

---

## 29. Anti-Windup

Debido a que CTRL posee dinámica lenta (`PWM → RC → MCP6002 → CTRL`), el integrador puede saturarse.

Se recomienda:

* Limitación integral
* Anti-windup
* Saturación de salida PID

---

## 30. Recomendaciones PCB

**Separar:**

* Señales PWM
* Señales ADC
* Potencia 24V
* Retornos analógicos

**Mantener:**

* Trazas ADC cortas
* PWM alejado del ADC
* Desacoplos cercanos

---

## 31. Resumen Final del Sistema

**Entradas:**

```
Setpoint  → RC3
Feedback  → RC2
```

**Procesamiento:**

```
ADC → PID
```

**Salidas:**

```
RC0 → CTRL
RC1 → DIR
```

El sistema implementa un lazo cerrado PID de posición angular utilizando:

* Referencia FVR precisa
* Entradas ADC bufferizadas
* DAC PWM analógico
* Control digital DIR
* Driver externo ZSX11H
* Control discreto a 120Hz

---

## 32. Diagrama de Arquitectura Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                        PIC16F18426 @ 32MHz                       │
│                                                                  │
│  VDD(5V) ──┬── Todo el circuito digital                         │
│            ├── MCP6002 VDD                                       │
│            └── UART, PWM, DIR, etc.                              │
│                                                                  │
│  RA2 ── FVR 2.048V ──┬── POT1(10k) ── MCP6002-A ── RC3 (ADC)  │
│                      └── POT2(10k) ── MCP6002-B ── RC2 (ADC)  │
│                                                                  │
│  RC0 ── PWM 31.25kHz ── R3(13k) + C(100nF) ── MCP6002 ── CTRL │
│                                                                  │
│  RC1 ── DIR ─────────────────────────────────────────── DIR    │
│                                                                  │
│  RC4 ── UART TX ─────────────────────────── USB_SERIAL          │
│  RC5 ── UART RX ─────────────────────────── USB_SERIAL          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     Driver ZSX11H                                │
│                                                                  │
│  CTRL ← MCP6002 (0-5V DC)                                       │
│  DIR  ← RC1 (HIGH=CW, LOW=CCW)                                  │
│  VCC  ← 6-60VDC (motor power)                                   │
│  J1   ← Soldado (control externo habilitado)                    │
└─────────────────────────────────────────────────────────────────┘
```

**Separación de dominios de voltaje:**

| Dominio | Voltaje | Componentes |
|---------|---------|-------------|
| FVR | 2.048V | Solo referencia ADC + alimentación de pots |
| VDD | 5V | PIC, MCP6002, UART, PWM, DIR |
| VCC | 6-60VDC | Driver ZSX11H, motor BLDC |

**Nota importante:** El PWM oscila entre 0V y VDD(5V), NO entre 0V y FVR. La FVR solo afecta las entradas ADC, no la salida PWM.
