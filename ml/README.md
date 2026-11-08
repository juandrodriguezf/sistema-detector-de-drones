# ml — Entrenamiento MLP (experimental)

> **Estado: experimental / WIP.** Pipeline no validado en campo. La integración en la HMI aparece como `ML CALIB (WIP)`.

Pipeline para entrenar un perceptrón multicapa (MLP) de 2 capas ocultas que clasifica audio en `dron` / `no_dron` a partir de coeficientes MFCC. Exporta `weights.json`, consumido por la inferencia del navegador en [`HMI/src/utils/mlp.ts`](../HMI/src/utils/mlp.ts).

Hay dos rutas de entrenamiento:

1. **Kaggle (principal, gratis / CPU):** `ml/kaggle/train_drone_audio.py` entrena con audio crudo de datasets públicos y replica *exactamente* la extracción MFCC de `HMI/src/utils/audioFeatures.ts` para que los pesos sean compatibles con la inferencia del navegador.
2. **Local (fallback / smoke test):** `ml/train.py` entrena desde el JSON exportado por la HMI (pestaña Dataset de `/ml-calibration`). El dataset de muestra (21 clips) no es representativo; solo sirve para verificar el formato.

## Estructura

```
ml/
├── train.py                        # entrenador local (numpy puro, JSON de la HMI)
├── requirements.txt
├── weights.json                    # pesos entrenados en Kaggle (run v9)
├── kaggle/
│   └── train_drone_audio.py        # kernel: MFCC-parity + MLP sobre audio crudo
└── datasets/
    └── sample_dataset.json         # muestra del formato (21 clips)
```

## Entrenamiento en Kaggle

Kernel privado: [`juandrodriguezf/dron-hmi-ml-train-v1`](https://www.kaggle.com/code/juandrodriguezf/dron-hmi-ml-train-v1). No requiere GPU ni cuota de accelerator (CPU estándar del free tier). Sin credenciales ni llamadas a la API de Kaggle dentro del kernel.

Pasos (una vez cargado el source):

1. En el editor del kernel, **+ Add Input** y adjuntar:
   - `amineipad/drone-sound-audio-detection`
   - `gautamdhawan55/merged-drone`
2. Settings: Internet **off**, Accelerator **None**.
3. **Save Version → Save & Run All** (≈ 8 min totales: ~4 min de MFCC + ~3 min de entrenamiento).
4. Al completar, descargar `weights.json` desde la pestaña Output y copiarlo a `ml/weights.json`.

El kernel busca las raíces de los datasets con `find_mounts()` (no asume rotas fijas: si el montaje cambia, se re-descubre por nombre de directorio) e imprime el árbol de `/kaggle/input` al log para diagnosticar montajes faltantes. El fallback `kagglehub` solo funciona con internet activado; con los datasets bien adjuntados no es necesario.

### Parametrización (defaults del kernel)

| Opción | Default | Descripción |
|--------|---------|-------------|
| `--epochs` | 60 | Épocas (early stopping a 15) |
| `--lr` | 0.01 | Learning rate (SGD por muestra) |
| `--hidden1` | 32 | Neuronas de la primera capa oculta |
| `--hidden2` | 16 | Neuronas de la segunda capa oculta |
| `--output` | `weights.json` | Ruta de salida en `/kaggle/working` |

## Datasets y licencias

| Dataset | Licencia | Uso |
|---------|----------|-----|
| [`amineipad/drone-sound-audio-detection`](https://www.kaggle.com/datasets/amineipad/drone-sound-audio-detection) (29↑, 290 MB) | **MIT** | Entrenamiento + validación. `Binary_Drone_Audio/`: `yes_drone/` (1332 wavs, clase 1) y `unknown/` (10372 wavs, clase 0, **subsample 3:1** → 3996 clips para balancear). |
| [`gautamdhawan55/merged-drone`](https://www.kaggle.com/datasets/gautamdhawan55/merged-drone) (273 wavs: `drone/` 148, `noise/` 125, 16 kHz mic array) | **Desconocida** | **Solo test externo**, nunca entrenamiento. Por la licencia no se redistribuye ni se commitea: úsalo dentro de Kaggle, no hagas fork de los wavs. |

## Resultado del último run (kernel v9, 2026-11-07)

- 109.019 frames MFCC (dron = 27.193, no_dron = 81.826).
- Early stop en epoch 31; **best acc_va = 95.70%** (recall n0 = 97.35%, recall n1 = 90.32%).
- `weights.json` incluye `_mean`/`_std` del train set → `HMI/src/utils/mlp.ts` los aplica en `predict()`.
- Test externo merged-drone: **acc 46.5%** (recall drone 2.48%, recall noise 98.67%). Gap de dominio documentado: el dataset es 16 kHz mic array mientras la HMI captura streaming del `AudioContext` a 44.1 kHz con espectro suavizado por el `AnalyserNode`. Datos experimentales, no representativos de la inferencia en campo.

## Entrenamiento local (fallback)

```bash
pip install -r ml/requirements.txt
python ml/train.py ml/datasets/sample_dataset.json --epochs 100
```

| Opción | Default | Descripción |
|--------|---------|-------------|
| `--epochs` | 100 | Épocas de entrenamiento |
| `--lr` | 0.01 | Learning rate |
| `--hidden1` | 32 | Neuronas de la primera capa oculta |
| `--hidden2` | 16 | Neuronas de la segunda capa oculta |
| `--output` | `weights.json` | Ruta del archivo de salida |

El script normaliza las features (media/desviación estándar), hace split 80/20, aplica early stopping y guarda los pesos con mejor accuracy de validación. El JSON resultante contiene `W1`, `b1`, `W2`, `b2`, `W3`, `b3`, `_mean` y `_std`.

## Uso en la HMI

1. Abrir `/ml-calibration` en Chrome o Edge.
2. Ir a la pestaña **Model** y arrastrar `weights.json` (los entrenados en Kaggle incluyen la normalización).
3. Activar el modo `ML` para que la inferencia use el modelo cargado.

## Limitaciones conocidas (WIP)

- Sin validación con audio real de campo.
- El dataset local de muestra es muy pequeño (21 clips); sus métricas no son representativas.
- El flujo de captura, etiquetado y evaluación sigue en desarrollo.
- El kernel replica la cadena del `AnalyserNode` sin el smoothing que aplica Web Audio a tiempo real (aproximación aceptada y documentada).

Ver también el [README raíz](../README.md).
