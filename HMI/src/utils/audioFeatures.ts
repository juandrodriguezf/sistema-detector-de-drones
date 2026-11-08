function hzToMel(hz: number): number {
  return 2595 * Math.log10(1 + hz / 700)
}

function melToHz(mel: number): number {
  return 700 * (Math.pow(10, mel / 2595) - 1)
}

const filterBankCache = new Map<string, Float32Array[]>()

function createMelFilterBank(
  numFilters: number,
  fftSize: number,
  sampleRate: number,
  lowHz: number,
  highHz: number
): Float32Array[] {
  const nyquist = sampleRate / 2
  const high = Math.min(highHz, nyquist)
  const numBins = fftSize / 2
  const lowMel = hzToMel(lowHz)
  const highMel = hzToMel(high)

  const melPoints = new Array(numFilters + 2)
  for (let i = 0; i < numFilters + 2; i++) {
    melPoints[i] = lowMel + (i * (highMel - lowMel)) / (numFilters + 1)
  }

  const binIndices = melPoints.map(m => Math.floor((melToHz(m) / sampleRate) * fftSize))

  const filters: Float32Array[] = []
  for (let m = 0; m < numFilters; m++) {
    const filter = new Float32Array(numBins)
    const startBin = binIndices[m]
    const centerBin = binIndices[m + 1]
    const endBin = binIndices[m + 2]

    for (let i = Math.max(0, startBin); i <= Math.min(centerBin, numBins - 1); i++) {
      const denom = centerBin - startBin
      if (denom > 0) filter[i] = (i - startBin) / denom
    }
    for (let i = Math.max(0, centerBin); i <= Math.min(endBin, numBins - 1); i++) {
      const denom = endBin - centerBin
      if (denom > 0) filter[i] = (endBin - i) / denom
    }
    filters.push(filter)
  }

  return filters
}

export function getMelFilterBank(
  numFilters: number,
  fftSize: number,
  sampleRate: number,
  lowHz: number = 100,
  highHz?: number
): Float32Array[] {
  const nyquist = sampleRate / 2
  const high = highHz ?? nyquist
  const key = `${fftSize}:${sampleRate}:${numFilters}:${lowHz}:${high}`
  if (!filterBankCache.has(key)) {
    filterBankCache.set(key, createMelFilterBank(numFilters, fftSize, sampleRate, lowHz, high))
  }
  return filterBankCache.get(key)!
}

export function applyMelFilterBank(
  powerSpectrum: Float32Array,
  filters: Float32Array[]
): Float32Array {
  const melEnergies = new Float32Array(filters.length)
  for (let m = 0; m < filters.length; m++) {
    let energy = 0
    const len = Math.min(powerSpectrum.length, filters[m].length)
    for (let i = 0; i < len; i++) {
      energy += powerSpectrum[i] * filters[m][i]
    }
    melEnergies[m] = Math.log(Math.max(energy, 1e-10))
  }
  return melEnergies
}

export function applyDCT(melEnergies: Float32Array, numCoeffs: number): Float32Array {
  const N = melEnergies.length
  const mfcc = new Float32Array(numCoeffs)

  for (let k = 0; k < numCoeffs; k++) {
    let sum = 0
    for (let n = 0; n < N; n++) {
      sum += melEnergies[n] * Math.cos((Math.PI * k * (n + 0.5)) / N)
    }
    mfcc[k] = sum
  }

  return mfcc
}

export function extractMFCC(
  floatFreqData: Float32Array,
  sampleRate: number,
  fftSize: number = 4096,
  numFilters: number = 26,
  numCoeffs: number = 13
): Float32Array {
  const powerSpectrum = new Float32Array(floatFreqData.length)
  for (let i = 0; i < floatFreqData.length; i++) {
    const db = isFinite(floatFreqData[i]) ? floatFreqData[i] : -100
    powerSpectrum[i] = Math.pow(10, db / 10)
  }

  const filters = getMelFilterBank(numFilters, fftSize, sampleRate)
  const melEnergies = applyMelFilterBank(powerSpectrum, filters)
  const mfcc = applyDCT(melEnergies, numCoeffs)

  return mfcc
}

export function mfccToArray(mfcc: Float32Array): number[] {
  return Array.from(mfcc)
}

interface FFTPlan {
  size: number
  window: Float64Array
  rev: Uint32Array
}

let fftPlan: FFTPlan | null = null

function getFFTPlan(fftSize: number): FFTPlan {
  if (fftPlan && fftPlan.size === fftSize) return fftPlan
  const window = new Float64Array(fftSize)
  for (let i = 0; i < fftSize; i++) {
    window[i] =
      0.42 -
      0.5 * Math.cos((2 * Math.PI * i) / (fftSize - 1)) +
      0.08 * Math.cos((4 * Math.PI * i) / (fftSize - 1))
  }
  const bits = Math.round(Math.log2(fftSize))
  const rev = new Uint32Array(fftSize)
  for (let i = 0; i < fftSize; i++) {
    let r = 0
    for (let b = 0; b < bits; b++) {
      r |= ((i >> b) & 1) << (bits - 1 - b)
    }
    rev[i] = r
  }
  fftPlan = { size: fftSize, window, rev }
  return fftPlan
}

function fftInPlace(re: Float64Array, im: Float64Array, rev: Uint32Array): void {
  const n = re.length
  for (let i = 0; i < n; i++) {
    const j = rev[i]
    if (i < j) {
      let t = re[i]
      re[i] = re[j]
      re[j] = t
      t = im[i]
      im[i] = im[j]
      im[j] = t
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len
    const wr = Math.cos(ang)
    const wi = Math.sin(ang)
    const half = len >> 1
    for (let i = 0; i < n; i += len) {
      let cr = 1
      let ci = 0
      for (let k = 0; k < half; k++) {
        const a = i + k
        const b = a + half
        const vr = re[b] * cr - im[b] * ci
        const vi = re[b] * ci + im[b] * cr
        re[b] = re[a] - vr
        im[b] = im[a] - vi
        re[a] += vr
        im[a] += vi
        const ncr = cr * wr - ci * wi
        ci = cr * wi + ci * wr
        cr = ncr
      }
    }
  }
}

/**
 * MFCC a partir de muestras de tiempo (misma cadena que el kernel de Kaggle
 * ml/kaggle/train_drone_audio.py: ventana Blackman (n-1), FFT de fftSize,
 * potencia |X|^2 de los primeros fftSize/2 bins, bank mel HTK de 26 filtros
 * (100 Hz -> Nyquist), log con piso 1e-10 (tambien sobre el log, como el
 * kernel) y DCT-II sin normalizacion de 13 coeficientes).
 */
export function mfccFromTimeDomain(
  samples: Float32Array | Float64Array,
  sampleRate: number,
  fftSize: number = 4096,
  numFilters: number = 26,
  numCoeffs: number = 13
): Float32Array {
  const plan = getFFTPlan(fftSize)
  const re = new Float64Array(fftSize)
  const im = new Float64Array(fftSize)
  const n = Math.min(samples.length, fftSize)
  for (let i = 0; i < n; i++) {
    re[i] = samples[i] * plan.window[i]
  }
  fftInPlace(re, im, plan.rev)

  const power = new Float32Array(fftSize / 2)
  for (let k = 0; k < power.length; k++) {
    const p = re[k] * re[k] + im[k] * im[k]
    power[k] = isFinite(p) ? Math.max(p, 1e-10) : 1e-10
  }

  const filters = getMelFilterBank(numFilters, fftSize, sampleRate)
  const melEnergies = new Float32Array(filters.length)
  for (let m = 0; m < filters.length; m++) {
    let energy = 0
    const len = Math.min(power.length, filters[m].length)
    for (let i = 0; i < len; i++) {
      energy += power[i] * filters[m][i]
    }
    melEnergies[m] = Math.max(Math.log(Math.max(energy, 1e-10)), 1e-10)
  }

  return applyDCT(melEnergies, numCoeffs)
}
