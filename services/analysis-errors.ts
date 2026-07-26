export class AnalysisPipelineError extends Error {
  constructor(
    public readonly stage: string,
    public readonly userMessage: string,
    message: string,
  ) {
    super(message);
    this.name = "AnalysisPipelineError";
  }
}
