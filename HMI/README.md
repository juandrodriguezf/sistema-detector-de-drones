# Detector de Dron — HMI

Interfaz humano-máquina para sistema de detección y neutralización acústica de drones. Monitoreo en tiempo real de dos ejes (rotacional y traslacional) con análisis FFT, espectrograma y detección por template matching espectral.

> Incluye un módulo de calibración ML en `/ml-calibration`, marcado como **experimental / WIP**. No está validado en campo; ver [`../ml/README.md`](../ml/README.md).

## Requisitos

| Requisito | Versión |
|-----------|---------|
| Node.js | 18+ (20 LTS recomendado) |
| npm | 9+ |
| Navegador | Chrome 89+ / Edge 89+ (requiere Web Serial API) |
| Hardware | 2 × PIC16F18426 (firmware en `../m3.X/` y `../tralac.X/`) |

> Firefox y Safari no soportan Web Serial API. Usa Chrome o Edge.

## Quick start

```bash
git clone https://github.com/juandrodriguezf/sistema-detector-de-drones.git
cd sistema-detector-de-drones/HMI
nvm use        # si tienes nvm, o asegúrate de usar Node 18+
npm install
npm run dev    # http://localhost:5173
```

## Build & deploy

```bash
npm run build           # dist/
npx vercel --prod       # o deploy manual a cualquier static host
```

## Producción

Desplegado en [https://dron-pi.vercel.app](https://dron-pi.vercel.app).

## Tecnologías

React 19 · TypeScript 5.7 · Vite 6 · React Router 7 · Recharts 2.15 · Web Audio API · Web Serial API

## Calibración ML (experimental)

Ruta `/ml-calibration`. Permite:

- Grabar clips etiquetados como `dron` o `no_dron` y extraer sus MFCC.
- Exportar el dataset en JSON (compatible con `ml/train.py`).
- Cargar un `weights.json` entrenado offline y probar la confianza en vivo.

> **WIP:** el pipeline no está validado y la inferencia aún no aplica la normalización `_mean` / `_std` usada en el entrenamiento. Ver [`../ml/README.md`](../ml/README.md).

## Atajos de teclado

| Tecla | Acción |
|-------|--------|
| `←` / `→` | Rota: jog -3° / +3° |
| `↓` / `↑` | Trans: jog -3mm / +3mm |
| `Ctrl + flecha` | Paso fino (1° / 1mm) |
| `Shift + flecha` | Paso grueso (45° / 25mm) |
| `Espacio` | STOP emergencia ambos ejes |
| `H` | HOME eje rota |
| `S` | START barrido |

## Protocolo serie

115200 bps, 8N1. Formato clave-valor:

```
ANG:35.2,TARGET:30.0,STATE:SWEEP
```

### Comandos

| Comando | Descripción |
|---------|-------------|
| `START` | Iniciar barrido |
| `STOP` | Detener motor |
| `HOME` | Homing (2 pulsos) |
| `G0 X<n>` | Mover a posición absoluta |
| `G0 X+<n>` | Mover relativo positivo |
| `G0 X-<n>` | Mover relativo negativo |
| `M114` | Solicitar telemetría |
| `P<n>` | Ajustar Kp |
| `I<n>` | Ajustar Ki |
| `D<n>` | Ajustar Kd |

## Solución de problemas

- **Puerto serie no aparece**: Chrome/Edge con HTTPS requerido. Verifica drivers USB-Serial (CH340, FTDI, CP210x).
- **Telemetría congelada**: Revisa cable USB y consola del navegador (F12).
- **Falsos positivos**: Ajusta umbral de similitud en modo Custom, o verifica el micrófono seleccionado.
