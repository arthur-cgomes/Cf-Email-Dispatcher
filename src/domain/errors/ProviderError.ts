export class ProviderError extends Error {
  public readonly provider: string;

  constructor(provider: string, message: string) {
    super(`[${provider}] ${message}`);
    this.name = 'ProviderError';
    this.provider = provider;
    Object.setPrototypeOf(this, ProviderError.prototype);
  }
}
