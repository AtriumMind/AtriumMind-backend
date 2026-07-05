import { getLogger } from "../lib/logger.js";

type State = "CLOSED" | "OPEN" | "HALF_OPEN";

export class CircuitBreaker {
  private state: State = "CLOSED";
  private failures = 0;
  private successes = 0;
  private nextAttempt = 0;
  private readonly log = getLogger();

  constructor(
    private readonly name: string,
    private readonly threshold = 5,
    private readonly successThreshold = 2,
    private readonly timeout = 30_000,
  ) {}

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() < this.nextAttempt) throw new Error(`Circuit [${this.name}] OPEN`);
      this.state = "HALF_OPEN";
      this.log.warn({ circuit: this.name }, "circuit HALF_OPEN");
    }
    try {
      const r = await fn();
      this.onSuccess();
      return r;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess() {
    this.failures = 0;
    if (this.state === "HALF_OPEN" && ++this.successes >= this.successThreshold) {
      this.state = "CLOSED";
      this.successes = 0;
      this.log.info({ circuit: this.name }, "circuit CLOSED");
    }
  }

  private onFailure() {
    this.successes = 0;
    if (++this.failures >= this.threshold || this.state === "HALF_OPEN") {
      this.state = "OPEN";
      this.nextAttempt = Date.now() + this.timeout;
      this.log.error({ circuit: this.name, next: new Date(this.nextAttempt) }, "circuit OPEN");
    }
  }

  getState() { return this.state; }
}
