# Notas Técnicas — m3.X (PIC16F18426)

## Resumen

Este documento contiene el análisis técnico, especificaciones de datasheets, tradeoffs de diseño y observaciones derivadas del cruce entre el hardware implementado y los datasheets de los componentes.

---

## 1. PIC16F18426

### 1.1 Oscilador

| Parámetro | Valor |
|-----------|-------|
| Tipo | HFINTOSC interno |
| Frecuencia | 32 MHz |
| FCY (instrucciones) | 8 MHz (FOSC/4) |
| Precisión | ±2% (calibración de fábrica) |

### 1.2 FVR (Fixed Voltage Reference)

| Parámetro | Valor |
|-----------|-------|
| Niveles | 1.024V (1x), 2.048V (2x), 4.096V (4x) |
| Precisión | ±4% (1x, 2x), ±5% (4x) |
| Tiempo de estabilización | 60 µs típico |
| Consumo del módulo | 40-46 µA (típico a 3V) |
| VDD mínimo | 2.5V (1x/2x), 4.75V (4x) |

**Uso actual:** FVR a 2.048V solo como alimentación de potenciómetros (la referencia ADC se cambió a VDD vía `ADREF=0x00`).

**Observación:** El datasheet no especifica corriente máxima de salida del FVR. Está diseñado como referencia para circuitos de alta impedancia (ADC, comparadores, DAC). En este diseño alimenta dos potenciómetros de 10kΩ que consumen ~205 µA cada uno (410 µA total).

**Riesgo potencial:** Si la FVR no puede entregar 410 µA, el voltaje de alimentación de los pots puede caer. Ya no hay compensación ratiométrica porque la referencia ADC es VDD (5V), no FVR. Una caída en FVR ahora se traduce directamente en error de medición. Se recomienda monitorear la estabilidad de las lecturas ADC.

### 1.3 ADC

| Parámetro | Valor |
|-----------|-------|
| Resolución | 10 bits (0-1023) |
| Referencia positiva | **VDD (5V)** — `ADREF=0x00` en firmware (override MCC) |
| Referencia negativa | VSS (GND) |
| Clock | FOSC/32 = 1 MHz |
| Modo | Basic (una conversión a la vez) |

**Nota:** Originalmente configurado con FVR 2.048V como referencia positiva en MCC. `main.c` sobrescribe con `ADREF=0x00` para usar VDD (5V). Esto reduce la resolución efectiva (el rango del potenciómetro 0-2.048V se mapea a ~0-419 de 1023) pero evita problemas de estabilidad del FVR al suministrar corriente a los pots.

---

## 2. PWM como DAC

### 2.1 Especificaciones

| Parámetro | Valor |
|-----------|-------|
| Frecuencia PWM | 31.25 kHz (TMR2, PR2=255) |
| Período TMR2 | 32 µs |
| Resolución | 8 bits (0-255) |
| Voltaje de oscilación | 0V → VDD (5V) |

### 2.2 Relación duty → voltaje

```
V_PWM_promedio = (duty / 255) × VDD
```

| Duty | Voltaje promedio |
|------|-----------------|
| 0 | 0.00V |
| 64 | 1.25V |
| 128 | 2.51V |
| 192 | 3.76V |
| 255 | 5.00V |

**Nota importante:** El PWM oscila entre 0V y VDD(5V), **NO** entre 0V y FVR. La FVR solo afecta las entradas ADC. Son circuitos completamente independientes.

### 2.3 Frecuencia PWM vs driver ZSX11H

El driver ZSX11H soporta PWM de 50Hz a 20kHz. Nuestra frecuencia de 31.25kHz está **fuera de este rango**, pero **no es un problema** porque:

- El PWM se filtra a DC mediante el filtro RC (fc ≈ 122Hz)
- Al driver solo llega el voltaje DC suavizado, no la señal PWM
- La frecuencia del PWM solo afecta el ripple residual, no el control

---

## 3. MCP6002 — Especificaciones Completas

| Parámetro | Valor |
|-----------|-------|
| Tipo | Op-amp dual, CMOS |
| Alimentación (VDD) | 1.8V → 5.5V |
| GBWP | 1.0 MHz |
| Slew Rate | 0.6 V/µs |
| Corriente reposo (por amp) | 100 µA (típico a 5.5V) |
| Corriente cortocircuito | ±23 mA (a 5.5V) |
| Corriente máxima absoluta | ±30 mA |
| Swing de salida | VSS+25mV → VDD-25mV (RL=10k a VDD/2) |
| Entrada | Rail-to-rail (VSS-300mV → VDD+300mV) |
| Fase márgen | 90° (G=+1) |
| Estabilidad cargas capacitivas | Estable hasta 500pF (G=+1) |
| Temperatura | -40°C → +85°C (industrial) |

### 3.1 Configuraciones en el sistema

| U | Configuración | Función |
|---|--------------|---------|
| U1A | Seguidor (G=1) | Buffer POT1 → RC3 |
| U1B | Seguidor (G=1) | Buffer POT2 → RC2 |
| U2A o U2B | Seguidor (G=1) | Buffer filtro RC → CTRL |

### 3.2 Por qué el seguidor es adecuado

- **Impedancia de entrada:** ~10¹² Ω → no carga la fuente
- **Impedancia de salida:** ~100 Ω → puede cargar el ADC o el driver
- **Rail-to-rail:** reproduce fielmente 0-2.048V (inputs) y 0-5V (output CTRL)
- **GBWP 1MHz:** sobrado para señales DC y filtro de 122Hz

---

## 4. ZSX11H — Especificaciones Completas

| Parámetro | Valor |
|-----------|-------|
| Tipo | Driver para motor BLDC (hoverboard) |
| Alimentación (VCC) | 6-60VDC |
| CTRL analógico | 0-5V (potenciómetro o DAC) |
| CTRL PWM | 50Hz-20kHz, amplitud 2.5-5V |
| DIR | Active LOW (0 = reversa, 1/flotante = normal) |
| BRAKE | Active HIGH (1 = freno, 0/flotante = libre) |
| STOP | Active LOW (0 = disable/coast, 1/flotante = enable) |
| Hall sensors | Conector dedicado (Ha, Hb, Hc, GND) |
| Regulador 5V | 78L05 onboard (para potenciómetro externo) |

### 4.1 Jumper J1

Para usar control externo (PWM o analógico):

1. **Soldar jumper J1** — conecta la señal de control al circuito interno
2. **Ajustar potenciómetro de velocidad al mínimo** (antihorario) — evita interferencia

### 4.2 Nota sobre corriente máxima

El datasheet del driver no especifica corriente continua máxima. Se sabe que es un driver para motores de hoverboard, típicamente capaces de entregar 10-30A pico.

---

## 5. Filtro RC y su Impacto en el Control

### 5.1 Parámetros

| Parámetro | Valor |
|-----------|-------|
| R | 13kΩ |
| C | 100nF |
| τ (constante de tiempo) | 1.3 ms |
| fc (frecuencia de corte) | 122 Hz |
| t_settling (5τ) | 6.5 ms |

### 5.2 Relación con el período de muestreo

```
Ts = 8.33 ms (120 Hz)
t_settling = 6.5 ms
t_settling / Ts = 78%
```

El filtro tarda **78% del período de muestreo** en estabilizarse. Esto significa:

1. El filtro **forma parte de la planta**, no es solo un filtro de ruido
2. El PID no controla el motor directamente — controla el voltaje después del filtro
3. Hay un **retardo de fase** adicional que afecta la estabilidad del lazo

### 5.3 Función de transferencia del filtro

```
H(s) = 1 / (1 + s·τ) = 1 / (1 + s·0.0013)
```

En frecuencia de muestreo (120 Hz ≈ 754 rad/s):

```
|H(jω)| = 1 / √(1 + (ω·τ)²) = 1 / √(1 + (754 × 0.0013)²) ≈ 0.72
```

El filtro atenúa la señal de control a ~72% a la frecuencia de Nyquist.

### 5.4 Implicaciones para el tuning

- **Kd ≈ 0 es adecuado:** el filtro ya suaviza la señal, el término derivativo amplificaría ruido innecesariamente
- **Ki moderado:** el integrador compensa el retardo del filtro, pero demasiado Ki causa windup
- **Kp conservador:** cambios bruscos de Kp no se reflejan instantáneamente en el motor

---

## 6. Rate Limiting del Firmware

### 6.1 Implementación

```c
#define PID_SCALE       100
#define OUTPUT_MAX_DELTA 100

int32_t delta = scaled - prev_scaled;
if (delta > OUTPUT_MAX_DELTA) scaled = prev_scaled + OUTPUT_MAX_DELTA;
else if (delta < -OUTPUT_MAX_DELTA) scaled = prev_scaled - OUTPUT_MAX_DELTA;
```

### 6.2 Justificación

Sin rate limiting, el PID podría saltar de 0 a 255 en un solo ciclo (8.33ms). Pero el filtro RC tarda 6.5ms en responder. Esto causa:

1. El integrador acumula error durante la transición del filtro
2. Windup parcial aunque existan límites
3. Respuesta del sistema más agresiva de lo necesario

Con `OUTPUT_MAX_DELTA = 100`:

- Cambio máximo por ciclo: 100/255 ≈ 39% del rango
- Tiempo mínimo para ir de 0 a 255: ~3 ciclos = ~25ms
- Esto es compatible con el settling time del filtro (6.5ms)

### 6.3 Cambio seguro de dirección

```c
if (duty_sign != prev_duty_sign && prev_duty_sign != 0) {
    PWM6_LoadDutyValue(0);        // Paso 1: PWM = 0
    dir_change_pending = true;    // Paso 2: esperar 1 ciclo (8.33ms)
    prev_duty_sign = 0;
    return;
}
// En siguiente ciclo:
if (dir_change_pending) {
    DIR_SetHigh/Low();            // Paso 3: cambiar DIR
    dir_change_pending = false;   // Paso 4: restaurar PWM normalmente
}
```

Los 8.33ms permiten que el filtro RC (τ=1.3ms) se descargue a ~0.1% y que el driver ZSX11H complete su dead-time interno.

### 6.4 Derivativa sobre medición

En lugar de `derivative = error - prev_error` (que causa derivative kick), se usa:

```c
derivative = -(fb_deg - prev_fb_deg);
```

Esto elimina los pulsos espurios cuando el usuario cambia el setpoint abruptamente.

### 6.5 Anti-windup condicional

```c
if ((scaled < PWM_MAX && scaled > -PWM_MAX) ||
    (error > 0 && integral < 0) ||
    (error < 0 && integral > 0)) {
    integral += error;
}
```

Solo acumula integral si el output NO está saturado, o si el error va en dirección de reducir la saturación.

### 6.6 Lectura atómica de ganancias

```c
INTCONbits.GIE = 0;
kp = kp_val; ki = ki_val; kd = kd_val;
INTCONbits.GIE = 1;
```

PIC16 es arquitectura de 8 bits. Leer un `int16_t` requiere dos accesos a memoria. Sin protección, un cambio de ganancia desde el HMI durante la lectura produce un valor corrupto.

---

## 7. Telemetría UART

### 7.1 Formato actual

```
sp_deg,fb_deg,error,pwm_output,ctrlk_mv\r\n
```

### 7.2 Voltaje CTRLK estimado

```
ctrlk_mv = (|duty| / 255) × VDD = (|duty| / 255) × 5000
```

**Nota:** Este valor es una **estimación** basada en el duty cycle. El voltaje real en CTRLK depende de:

- Precisión del filtro RC (tolerancia de R y C)
- Offset del MCP6002
- Carga del driver ZSX11H

Para medición precisa, se requiere un multímetro u osciloscopio en la salida del MCP6002.

---

## 8. Observaciones de Diseño

### 8.1 Sistema no-ratiométrico (cambio en firmware)

Originalmente el sistema era ratiométrico (FVR = ref. ADC + alimentación pots). Con `ADREF=0x00` la referencia ADC es VDD (5V):

- FVR alimenta los pots (0-2.048V) pero el ADC mide contra VDD (0-5V)
- Una variación en FVR **ya no se cancela** en la conversión
- Rango útil del ADC: ~0-419 de 1023 (wasted resolution)
- La conversión `grados = (adc_raw - ADC_0) * 360 / (ADC_360 - ADC_0)` sigue siendo lineal porque tanto ADC_0 como ADC_360 se miden con la misma referencia VDD

### 8.2 FVR alimentando potenciómetros (solo alimentación)

**Pros:**
- Sigue siendo útil como fuente de 2.048V limpia para los pots
- Aísla la referencia de los pots del ruido de VDD digital

**Contras:**
- Ya no hay compensación ratiométrica
- Resolución efectiva reducida (~41% del rango ADC)
- Uso no convencional del FVR (diseñado para alta impedancia)
- Corriente total de pots (410 µA) excede el consumo del módulo FVR (46 µA)

**Verificación práctica:** Si las lecturas ADC son estables, el diseño funciona. Se perdió la inmunidad a variaciones de VDD.

### 8.3 PWM 31.25kHz vs 20kHz del driver

No es un problema porque el PWM se filtra a DC antes de llegar al driver. La frecuencia alta del PWM solo beneficia:

- Menor ripple residual después del filtro
- Mejor resolución efectiva del DAC
- Sin ruido audible (fuera del rango humano)

---

## 9. Resumen de Especificaciones del Sistema

| Parámetro | Valor |
|-----------|-------|
| MCU | PIC16F18426 @ 32MHz |
| PID frequency | 120 Hz (Ts = 8.33ms) |
| ADC resolution | 10 bits, VDD 5V (`ADREF=0x00`) |
| PWM frequency | 31.25 kHz |
| PWM resolution | 8 bits (0-255) |
| Filtro RC | τ = 1.3ms, fc = 122Hz |
| CTRL range | 0-5V (después del filtro) |
| DIR logic | Active LOW |
| UART | 115200 baud, 8N1 |
| Driver | ZSX11H (6-60VDC) |
| Motor | 57BLDC75E-20730 |
| Pots | 10kΩ, 1 vuelta, bufferizados |
| Op-amps | MCP6002 (dual, rail-to-rail) |
