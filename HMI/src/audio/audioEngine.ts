export class AudioEngine {
  private context: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private stream: MediaStream | null = null
  private source: MediaStreamAudioSourceNode | null = null

  async start(deviceId?: string): Promise<void> {
    const constraints: MediaStreamConstraints = {
      audio: deviceId ? { deviceId: { exact: deviceId } } : true
    }
    this.stream = await navigator.mediaDevices.getUserMedia(constraints)
    this.context = new AudioContext()
    this.analyser = this.context.createAnalyser()
    this.analyser.fftSize = 4096
    this.analyser.smoothingTimeConstant = 0
    this.source = this.context.createMediaStreamSource(this.stream)
    this.source.connect(this.analyser)
  }

  stop(): void {
    this.source?.disconnect()
    this.stream?.getTracks().forEach(t => t.stop())
    this.context?.close()
    this.source = null
    this.stream = null
    this.analyser = null
    this.context = null
  }

  getFrequencyData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(0)
    const data = new Uint8Array(this.analyser.frequencyBinCount)
    this.analyser.getByteFrequencyData(data)
    return data
  }

  getFloatFrequencyData(): Float32Array {
    if (!this.analyser) return new Float32Array(0)
    const data = new Float32Array(this.analyser.frequencyBinCount)
    this.analyser.getFloatFrequencyData(data)
    return data
  }

  getTimeDomainData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(0)
    const data = new Uint8Array(this.analyser.fftSize)
    this.analyser.getByteTimeDomainData(data)
    return data
  }

  getSampleRate(): number {
    return this.context?.sampleRate ?? 44100
  }

  isActive(): boolean {
    return this.analyser !== null
  }
}
