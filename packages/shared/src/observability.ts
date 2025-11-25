import { randomUUID } from "node:crypto";

export interface LogContext {
  correlationId?: string;
  workspaceId?: string;
  userId?: string;
  requestId?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  level: "info" | "warn" | "error" | "debug";
  message: string;
  context?: LogContext;
  timestamp: string;
  duration?: number;
  statusCode?: number;
  eventType?: string;
}

class ObservabilityLogger {
  private correlationId: string | null = null;

  setCorrelationId(id: string): void {
    this.correlationId = id;
  }

  generateCorrelationId(): string {
    const id = randomUUID();
    this.correlationId = id;
    return id;
  }

  getCorrelationId(): string | null {
    return this.correlationId;
  }

  log(entry: Omit<LogEntry, "timestamp" | "correlationId">): void {
    const logEntry: LogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      context: {
        ...entry.context,
        correlationId: this.correlationId || this.generateCorrelationId(),
      },
    };

    // In production, send to logging service
    // For now, use console with structured format
    const logMethod = entry.level === "error" ? console.error : entry.level === "warn" ? console.warn : console.log;
    logMethod(JSON.stringify(logEntry));
  }

  info(message: string, context?: LogContext): void {
    this.log({ level: "info", message, context });
  }

  warn(message: string, context?: LogContext): void {
    this.log({ level: "warn", message, context });
  }

  error(message: string, context?: LogContext): void {
    this.log({ level: "error", message, context });
  }

  debug(message: string, context?: LogContext): void {
    this.log({ level: "debug", message, context });
  }

  trackEvent(
    eventType: string,
    context?: LogContext & {
      duration?: number;
      statusCode?: number;
    }
  ): void {
    this.log({
      level: "info",
      message: `Event: ${eventType}`,
      eventType,
      context,
      duration: context?.duration,
      statusCode: context?.statusCode,
    });
  }
}

export const observability = new ObservabilityLogger();

// Fastify plugin helper
export function createObservabilityPlugin() {
  return async function (fastify: any) {
    fastify.addHook("onRequest", async (request: any, reply: any) => {
      const correlationId = request.headers["x-correlation-id"] || observability.generateCorrelationId();
      observability.setCorrelationId(correlationId);
      reply.header("x-correlation-id", correlationId);
    });

    fastify.addHook("onResponse", async (request: any, reply: any) => {
      const startTime = (request as any).startTime || Date.now();
      const duration = Date.now() - startTime;

      observability.trackEvent("http_request", {
        correlationId: observability.getCorrelationId() || undefined,
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        duration,
      });
    });
  };
}


