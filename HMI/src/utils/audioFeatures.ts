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
