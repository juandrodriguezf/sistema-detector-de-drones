export interface MLPWeights {
  W1: number[][]
  b1: number[]
  W2: number[][]
  b2: number[]
  W3: number[][]
  b3: number[]
}

function matmul(a: number[], W: number[][]): number[] {
  const result = new Array(W.length).fill(0)
  for (let i = 0; i < W.length; i++) {
    let sum = 0
    for (let j = 0; j < a.length; j++) {
      sum += a[j] * (W[i][j] ?? 0)
    }
    result[i] = sum
  }
  return result
}

function addBias(x: number[], b: number[]): number[] {
  return x.map((v, i) => v + (b[i] ?? 0))
}

function relu(x: number[]): number[] {
  return x.map(v => Math.max(0, v))
}

function softmax(x: number[]): number[] {
  const max = Math.max(...x)
  const exps = x.map(v => Math.exp(v - max))
  const sum = exps.reduce((a, b) => a + b, 0)
  return sum > 0 ? exps.map(v => v / sum) : exps
}

export function predict(mfcc: number[], weights: MLPWeights): number[] {
  let h1 = matmul(mfcc, weights.W1)
  h1 = addBias(h1, weights.b1)
  h1 = relu(h1)

  let h2 = matmul(h1, weights.W2)
  h2 = addBias(h2, weights.b2)
  h2 = relu(h2)

  let out = matmul(h2, weights.W3)
  out = addBias(out, weights.b3)
  out = softmax(out)

  return out
}

export function loadWeights(json: unknown): MLPWeights {
  const w = json as Record<string, unknown>
  if (!w.W1 || !w.b1 || !w.W2 || !w.b2 || !w.W3 || !w.b3) {
    throw new Error('Invalid weights file: missing required keys')
  }
  return json as MLPWeights
}

export function validateWeights(w: MLPWeights, inputSize: number = 13): string | null {
  if (w.W1.length !== w.b1.length) return 'W1/b1 dimension mismatch'
  if (w.W2.length !== w.b2.length) return 'W2/b2 dimension mismatch'
  if (w.W3.length !== w.b3.length) return 'W3/b3 dimension mismatch'
  if ((w.W1[0]?.length ?? 0) !== inputSize) return `W1 input size mismatch: expected ${inputSize}, got ${w.W1[0]?.length}`
  if ((w.W2[0]?.length ?? 0) !== w.W1.length) return 'W1/W2 hidden dimension mismatch'
  if ((w.W3[0]?.length ?? 0) !== w.W2.length) return 'W2/W3 hidden dimension mismatch'
  if (w.W3.length !== 2) return 'Output layer must have 2 classes'
  return null
}
