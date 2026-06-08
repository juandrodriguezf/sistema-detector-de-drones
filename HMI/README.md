# Detector de Dron — HMI

> Interfaz humano-máquina (HMI) web para el sistema de detección y neutralización acústica de drones.
> Monitoreo en tiempo real de dos ejes (rotacional y traslacional) y adquisición de audio con análisis FFT.

![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-2.15-ff7300)
![License](https://img.shields.io/badge/license-Proprietary-red)

---

## Tabla de contenidos

- [Descripción general](#descripción-general)
- [Características](#características)
- [Arquitectura](#arquitectura)
- [Requisitos previos](#requisitos-previos)
- [Instalación](#instalación)
- [Desarrollo](#desarrollo)
- [Build y deploy](#build-y-deploy)
- [Protocolo serie](#protocolo-serie)
- [Comandos soportados](#comandos-soportados)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Atajos de teclado](#atajos-de-teclado)
- [Solución de problemas](#solución-de-problemas)
- [Equipo](#equipo)

---

## Descripción general

Este HMI es el panel de control de un **sistema de detección y neutralización acústica de drones**. Se compone de tres subsistemas:

1. **Eje rotacional (`rota`)** — Motor brushless 57BLDC75E-20730 con driver ZSX11H controlado por un PIC16F18426. Movimiento angular de 10° a 350°. Controlado por PID con auto-frenado regenerativo.
2. **Eje traslacional (`trans`l)** — Actuador lineal con su propio firmware (PIC16F18426). Movimiento en milímetros de 0 a 200 mm, al cual se puso un acople para convertirlo en un sistema angular. O sea, en 0 mm hay 0 grados, y en 200mm hay 90 grados.
3. **Adquisición de audio** — Micrófono del navegador (Web Audio API) con análisis FFT, spectrograma y correlación espectral con plantillas acústicas de drones conocidos. Cuando se detecta un dron con suficiente similitud, los motores se detienen automáticamente.

El HMI se comunica con ambos PICs por **Web Serial API** a 115200 bps. La latencia de telemetría es ~8 ms por frame.

---

## Características

- **Conexión dual** — dos puertos serie simultáneos (rota + transl) usando la Web Serial API del navegador.
- **Telemetría en tiempo real** — gráficos de forma de onda, FFT, espectrograma y línea de tiempo.
- **Visualización de posición** — vista 2D de los dos ejes con marcadores en tiempo real.
- **Detección acústica de drones** — correlación espectral entre 100 Hz y 5 kHz contra plantillas pregrabadas.
- **Alerta automática** — al confirmar detección, envía `STOP` a ambos ejes. Al perder la señal, envía `START` para reanudar el barrido.
- **Control por teclado** — jog incremental con flechas, modificadores Ctrl/Shift para paso fino/grueso.
- **Sintonización de PID en vivo** — enviar `P<valor>`, `I<valor>`, `D<valor>` para ajustar ganancias.
- **Sweep automático** — al iniciar, los motores barren todo el rango en busca del dron.

---

## Arquitectura

```
┌──────────────────────────────────────────────────────────────┐
│                       Navegador (HMI)                        │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐             │
│  │   Header   │  │   Audio    │  │  Position  │             │
│  │  (Status)  │  │  Engine    │  │  Drawings  │             │
│  └────────────┘  └────────────┘  └────────────┘             │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐             │
│  │    FFT     │  │  Spectro-  │  │   Wave-    │  Timeline   │
│  │  Display   │  │  gram      │  │   form     │  Display    │
│  └────────────┘  └────────────┘  └────────────┘             │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │            SerialContext (Web Serial API)            │    │
│  │   rota ←─USB─→ PIC16F18426 (axis rota)               │    │
│  │   trans ←─USB─→ PIC16F18426 (axis trans)             │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

| Capa      | Tecnología                  |
| --------- | ---------------------------- |
| UI        | React 19 + Vite 6            |
| Lenguaje  | TypeScript 5.7               |
| Gráficos | Recharts 2.15                |
| Audio     | Web Audio API nativa         |
| Serial    | Web Serial API (Chrome/Edge) |
| Estado    | React Context (sin Redux)    |

---

## Requisitos previos

| Requisito         | Versión mínima                | Notas                                       |
| ----------------- | ------------------------------- | ------------------------------------------- |
| Node.js           | 18.x                            | Probado con 20 LTS                          |
| npm               | 9.x                             | o pnpm/yarn equivalentes                    |
| Navegador         | Chrome 89+ / Edge 89+           | Solo navegadores con Web Serial API         |
| Sistema operativo | Windows 10+ / macOS 11+ / Linux | Drivers USB-Serial instalados               |
| Hardware          | 2 × PIC16F18426 programados    | Firmware en `../m3.X/` y `../tralac.X/` |

> **Firefox y Safari no soportan Web Serial API.** Usa Chrome o Edge.

## Desarrollo

Inicia el servidor de desarrollo con HMR en `http://localhost:5173`:

```bash
npm run dev
```

Al abrir la URL, conecta los dos puertos serie desde el **panel de control. Selecciona cada puerto COM/USB dispositivo desde el diálogo nativo del navegador.**

---

## **Build y deploy**

**El output queda en `dist/` y puede desplegarse en cualquier static host (Vercel, Netlify, GitHub Pages, S3, etc).**

### **Deploy a Vercel**

**El proyecto ya está vinculado a Vercel (ver `.vercel/project.json`). Para desplegar:**

---

## **Protocolo serie**

**Ambos PICs se comunican a **115200 bps, 8N1, sin control de flujo**.**

### **Telemetría (PIC → HMI)**

**Emitida a ~120 Hz por cada firmware. Formato clave-valor separado por comas:**

| Campo      | Tipo | Rango                      | Descripción                                          |
| ---------- | ---- | -------------------------- | ----------------------------------------------------- |
| `ANG`    | int  | 0–360                     | Ángulo medido por el potenciómetro de feedback (°) |
| `TARGET` | int  | 0–360                     | Setpoint actual (°)                                  |
| `STATE`  | enum | IDLE, HOMING, SWEEP, LATCH | Estado de la máquina                                 |

****Ejemplo:****

### **Handshake al conectar**

**Al abrir un puerto, el HMI envía `M114` después de 100 ms. El firmware no responde con un ack explícito — el `M114` solo fuerza la siguiente trama de telemetría desde el ciclo del PID.**

---

## **Comandos soportados**

| Comando        | Dirección | Descripción                                        | Respuesta                     |
| -------------- | ---------- | --------------------------------------------------- | ----------------------------- |
| `HOME`       | HMI → PIC | Inicia rutina de homing hacia `SP_MIN_DEG` (10°) | Cambia `STATE: HOMING`      |
| `START`      | HMI → PIC | Inicia barrido automático entre 10° y 350°       | Cambia `STATE: SWEEP`       |
| `STOP`       | HMI → PIC | Detiene el motor, fija target = posición actual    | Cambia `STATE: IDLE`        |
| `G0 X<abs>`  | HMI → PIC | Mueve a posición absoluta (°)                     | Sin ack, telemetría continua |
| `G0 X+<rel>` | HMI → PIC | Incremento relativo (°)                            | Sin ack, telemetría continua |
| `G0 X-<rel>` | HMI → PIC | Decremento relativo (°)                            | Sin ack, telemetría continua |
| `M114`       | HMI → PIC | Solicita frame de telemetría                       | Trama `ANG, TARGET, STATE`  |
| `P<0-200>`   | HMI → PIC | Ajusta Kp (proporcional)                            | Aplica en próximo ciclo ISR  |
| `I<0-100>`   | HMI → PIC | Ajusta Ki (integral)                                | Aplica en próximo ciclo ISR  |
| `D<0-100>`   | HMI → PIC | Ajusta Kd (derivativo)                              | Aplica en próximo ciclo ISR  |

**Todos los comandos terminan en `\n` (LF) o `\r\n` (CRLF). Los valores fuera de rango se descartan silenciosamente.**

---

## **Estructura del proyecto**

---

## **Atajos de teclado**

| Tecla              | Acción                          |
| ------------------ | -------------------------------- |
| `←` / `→`    | Eje rota: jog -3° / +3°        |
| `↓` / `↑`    | Eje trans: jog -3 mm / +3 mm     |
| `Ctrl + flecha`  | Paso fino: 1° / 1 mm            |
| `Shift + flecha` | Paso grueso: 45° / 25 mm        |
| `Espacio`        | STOP de emergencia en ambos ejes |
| `H`              | Enviar HOME al eje rota          |
| `S`              | Enviar START (iniciar barrido)   |

---

## **Solución de problemas**

### **El navegador no muestra el puerto serie**

- **Verifica que estés en **Chrome o Edge** (no Firefox/Safari).**
- **El sitio debe servirse por **HTTPS o localhost** — la Web Serial API no funciona en HTTP plano.**
- **Revisa que los drivers USB-Serial (CH340, FTDI, CP210x) estén instalados.**

### **El motor se detiene y no responde**

**El driver ZSX11H puede entrar en **protección por sobrecorriente (OCP)** si se cambia la dirección con el motor en movimiento. En ese estado requiere un **ciclo de apagado/encendido de la fuente** para resetearse. El firmware incluye una secuencia de frenado regenerativo + confirmación de dirección para minimizar este caso.**

### **La telemetría se congela**

- **Verifica que el cable USB no esté suelto.**
- **El firmware transmite a 120 Hz; si la UI no actualiza, revisa la consola del navegador (`F12`).**

### **El drag detection dispara falsos positivos**

- **Ajusta el umbral de similitud en `useTracker.ts` (línea con `THRESHOLD`).**
- **Verifica que el micrófono seleccionado sea el correcto (no el del sistema).**

<div align="center">

**[⬆ Volver arriba](#detector-de-dron--hmi)**

</div>

**
