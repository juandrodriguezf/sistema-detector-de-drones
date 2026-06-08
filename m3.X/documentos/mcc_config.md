# Configuración MCC Classic

## PIC16F18426

---

## Clock del Sistema

| Parámetro         | Valor    |
| ------------------ | -------- |
| Clock Source       | HFINTOSC |
| Internal Frequency | 32 MHz   |
| Clock Divider      | 1        |
| FOSC               | 32 MHz   |
| FCY                | 8 MHz    |

---

## FVR — Fixed Voltage Reference

| Parámetro                 | Valor    |
| -------------------------- | -------- |
| Enable FVR                 | Enabled  |
| FVR Buffer 1 Gain (ADFVR)  | 2x       |
| Voltaje FVR                | 2.048V   |
| FVR Buffer 2 Gain (CDAFVR) | Disabled |
| Enable Temperature Sensor  | Disabled |

---

## ADCC

| Parámetro         | Valor           |
| ------------------ | --------------- |
| Enable ADC         | Enabled         |
| Operating Mode     | Basic           |
| Result Alignment   | Right Justified |
| Positive Reference | ~~FVR~~ VDD (ver nota) |
| Negative Reference | VSS             |
| ADC Clock          | FOSC/32         |
| TAD                | 1 µs           |
| Acquisition Count  | 12              |
| Acquisition Time   | 12 µs          |
| Continuous Mode    | Disabled        |
| Repeat Mode        | Disabled        |
| Burst Average      | Disabled        |
| Auto Trigger       | Disabled        |
| ADC Interrupt      | Disabled        |

> **Nota:** En `main.c` se sobrescribe la referencia positiva a VDD mediante `ADREF = 0x00`. MCC genera FVR como referencia predeterminada, pero el firmware cambia a VDD post-inicialización para evitar dependencia de la corriente de salida del FVR.

---

## PWM6

| Parámetro         | Valor        |
| ------------------ | ------------ |
| Enable PWM6        | Enabled      |
| Clock Source       | TMR2         |
| PWM Mode           | Left Aligned |
| Output Polarity    | Active High  |
| Initial Duty Cycle | 0            |
| PWM Output         | Enabled      |
| PWM Frequency      | 31.25 kHz    |

---

## TMR2

| Parámetro                 | Valor    |
| -------------------------- | -------- |
| Enable Timer2              | Enabled  |
| Clock Source               | FOSC/4   |
| Prescaler                  | 1:1      |
| Postscaler                 | 1:1      |
| Timer Period               | 32 µs   |
| PR2                        | 255      |
| Interrupt                  | Disabled |
| Start After Initialization | Enabled  |

---

## TMR0

| Parámetro                 | Valor   |
| -------------------------- | ------- |
| Enable Timer0              | Enabled |
| Timer Mode                 | 16-bit  |
| Clock Source               | FOSC/4  |
| Prescaler                  | 1:256   |
| Postscaler                 | 1:1     |
| Timer Period               | 8.33 ms |
| Interrupt                  | Enabled |
| Callback Function Rate     | 1       |
| Start After Initialization | Enabled |

---

## EUSART1

| Parámetro              | Valor        |
| ----------------------- | ------------ |
| Mode                    | Asynchronous |
| Enable EUSART           | Enabled      |
| Enable Transmit         | Enabled      |
| Enable Receive          | Enabled      |
| Baud Rate               | 115200       |
| Baud Error              | 0.644%       |
| Transmission Bits       | 8-bit        |
| Reception Bits          | 8-bit        |
| Data Polarity           | Non-Inverted |
| Enable Wake-up          | Disabled     |
| Auto-Baud Detection     | Disabled     |
| Enable Address Detect   | Disabled     |
| Redirect STDIO to USART | Disabled     |
| TX Interrupt            | Disabled     |
| RX Interrupt            | Disabled     |

---

## Interrupt Manager

### Configuración de Interrupciones por Módulo

| Módulo    | Interrupción | Estado   |
| ---------- | ------------- | -------- |
| EUSART1    | TXI           | Disabled |
| EUSART1    | RCI           | Disabled |
| ADCC       | ADI           | Disabled |
| ADCC       | ADTI          | Disabled |
| TMR0       | TMRI          | Enabled  |
| TMR2       | TMRI          | Disabled |
| Pin Module | IOCI          | Disabled |

### Configuración General del Interrupt Manager

| Parámetro                  | Valor    |
| --------------------------- | -------- |
| Global Interrupt Enable     | Enabled  |
| Peripheral Interrupt Enable | Enabled  |
| Single ISR per Interrupt    | Enabled  |
| Interrupt Priority          | Disabled |

# Configuración de Pines — Pin Manager MCC Classic

A continuación se presenta la configuración completa de los pines utilizada en el sistema de control PID basado en el microcontrolador PIC16F18426 utilizando MPLAB Code Configurator (MCC Classic).

---

## Tabla General de Configuración

| Pin | Module | Function | Custom Name | Start High | Analog | Output | WPU | OD | IOC |
|---|---|---|---|---|---|---|---|---|---|
| RC3 | ADCC | ANC3 | SETPOINT | No | Yes | No | No | No | None |
| RC2 | ADCC | ANC2 | FEEDBACK | No | Yes | No | No | No | None |
| RA2 | Pin Module | GPIO | FVR_OUT | No | Yes | Yes | No | No | None |
| RC0 | PWM6 | PWM6OUT | --- | No | No | Yes | No | No | None |
| RC1 | Pin Module | GPIO | DIR | No | No | Yes | No | No | None |
| RA5 | Pin Module | GPIO | AUX1 | No | No | Yes | No | No | None |
| RC4 | EUSART1 | TX1 | --- | No | No | Yes | No | No | None |
| RC5 | EUSART1 | RX1 | --- | No | No | No | No | No | None |
| RA4 | Pin Module | GPIO | AUX2 | No | No | Yes | No | No | None |

---

## Descripción de los Pines

| Pin | Descripción |
|---|---|
| RC3 | Entrada ADC del setpoint PID |
| RC2 | Entrada ADC de feedback PID |
| RA2 | Salida de referencia FVR 2.048V |
| RC0 | Salida PWM6 utilizada como DAC PWM |
| RC1 | Señal digital DIR hacia el driver ZSX11H |
| RA5 | GPIO auxiliar |
| RC4 | UART TX hacia USB_SERIAL |
| RC5 | UART RX desde USB_SERIAL |
| RA4 | GPIO auxiliar |

---

## Descripción de Campos del Pin Manager

| Campo | Descripción |
|---|---|
| Start High | Estado inicial HIGH del pin |
| Analog | Habilita el modo analógico |
| Output | Configura el pin como salida |
| WPU | Weak Pull-Up interno |
| OD | Open Drain |
| IOC | Interrupt-On-Change |

---

## Configuración IOC

| Opción IOC | Descripción |
|---|---|
| none | Sin interrupción por cambio |
| positive | Interrupción por flanco ascendente |
| negative | Interrupción por flanco descendente |
| any | Interrupción por ambos flancos |

En este proyecto todos los pines utilizan: **IOC = none**

Esto se debe a que el sistema utiliza:
- TMR0 como scheduler principal del PID
- PWM6 como generación hardware PWM
- ADCC mediante lectura manual
- UART inicialmente sin interrupciones

---

## Notas Importantes

### RC0 — Salida PWM

RC0 utiliza la función **PWM6OUT**, la cual corresponde a una salida PWM digital hardware.

Aunque posteriormente el sistema genere una señal analógica mediante filtro RC, el pin permanece configurado como digital.

### RC3 y RC2 — Entradas Analógicas

RC3 y RC2 utilizan funciones **ANC3** y **ANC2**, nomenclaturas generadas automáticamente por MCC para entradas analógicas ADCC configuradas mediante la opción `ANx`.

Internamente corresponden a:

```
RC3 → AN7
RC2 → AN6
```

del PIC16F18426.

### RA2 — Referencia FVR

RA2 se utiliza como salida analógica de referencia FVR de:

```
VFVR = 2.048V
```

empleada simultáneamente como:
- Referencia ADC
- Alimentación analógica de los potenciómetros

### RC4 y RC5 — Comunicación UART

Las señales UART utilizan **TX1** y **RX1**, correspondientes al periférico EUSART1.

---

## Arquitectura General Asociada a los Pines

### Entradas Analógicas

```
RC3 → SETPOINT
RC2 → FEEDBACK
```

### Salida de Control

```
RC0 → PWM6OUT → RC Filter → MCP6002 → CTRL
```

### Dirección del Driver

```
RC1 → DIR
```

### Comunicación Serial

```
RC4 → TX1
RC5 → RX1
```

### Referencia Analógica

```
RA2 → FVR → 2.048V
```