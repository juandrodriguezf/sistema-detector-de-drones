# ml — Entrenamiento MLP (experimental)

> **Estado: experimental / WIP.** Pipeline no validado en campo. La integración en la HMI aparece como `ML CALIB (WIP)`.

Script offline para entrenar un perceptrón multicapa (MLP) de 2 capas ocultas que clasifica audio en `dron` / `no_dron` a partir de coeficientes MFCC. Exporta `weights.json`, consumido por la inferencia del navegador en [`HMI/src/utils/mlp.ts`](../HMI/src/utils/mlp.ts).

## Estructura

```
ml/
├── train.py                        # entrenador (numpy puro)
├── requirements.txt
├── weights.json                    # pesos de ejemplo compatibles con la HMI
└── datasets/
    └── sample_dataset.json         # muestra del formato (21 clips)
```

## Requisitos

- Python 3.10+
- numpy (`pip install -r ml/requirements.txt`)

## Formato del dataset

Se exporta desde la HMI (`/ml-calibration` → pestaña Dataset). Cada clip contiene los MFCC ya calculados, no audio crudo:

```json
{
  "sampleRate": 44100,
  "fftSize": 4096,
  "numFilters": 26,
  "numCoeffs": 13,
  "clips": [
    {
      "id": "clip-1",
      "label": "dron",
      "timestamp": 0,
      "mfcc": [2.31, -1.04, 0.55]
    }
  ]
}
```

- `label`: `dron` o `no_dron`.
- `mfcc`: vector de `numCoeffs` valores (13 por defecto).
- `datasets/sample_dataset.json` es solo una muestra para probar el script; no es un dataset de entrenamiento real.

## Entrenamiento

```bash
pip install -r ml/requirements.txt
python ml/train.py ml/datasets/sample_dataset.json --epochs 100
```

Para escribir los pesos junto al resto del pipeline:

```bash
python ml/train.py ml/datasets/sample_dataset.json --output ml/weights.json
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
2. Ir a la pestaña **Model** y arrastrar `weights.json`.
3. Activar el modo `ML` para que la inferencia use el modelo cargado.

## Limitaciones conocidas (WIP)

- `mlp.ts` no aplica `_mean` / `_std` en la inferencia, mientras que `train.py` sí normaliza las features. Ambos lados deben alinearse antes de usar el modelo en serio.
- Sin validación con audio real de campo.
- El dataset de muestra es muy pequeño (21 clips); sus métricas no son representativas.
- El flujo de captura, etiquetado y evaluación sigue en desarrollo.

Ver también el [README raíz](../README.md).
