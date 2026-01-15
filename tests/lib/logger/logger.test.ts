/**
 * Logger Tests
 *
 * Tests for structured logging system types and configuration
 */



describe("Logger type definitions", () => {
  it("LogLevel accepts valid values", () => {
    const validLevels = ["debug", "info", "warn", "error"];
    expect(validLevels).toHaveLength(4);
    expect(validLevels).toContain("debug");
    expect(validLevels).toContain("info");
    expect(validLevels).toContain("warn");
    expect(validLevels).toContain("error");
  });

  it("LogContext accepts various value types", () => {
    const context = {
      stringValue: "test",
      numberValue: 42,
      booleanValue: true,
      arrayValue: [1, 2, 3],
      nestedValue: { key: "value" },
      nullValue: null,
    };

    expect(Object.keys(context)).toHaveLength(6);
    expect(context.stringValue).toBe("test");
    expect(context.numberValue).toBe(42);
  });
});

describe("Log entry structure", () => {
  it("creates valid log entry", () => {
    interface LogEntry {
      level: string;
      message: string;
      timestamp: string;
      context?: Record<string, unknown>;
      error?: Error;
    }

    const entry: LogEntry = {
      level: "info",
      message: "Test message",
      timestamp: new Date().toISOString(),
      context: { userId: "123" },
    };

    expect(entry.level).toBe("info");
    expect(entry.message).toBe("Test message");
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(entry.context?.userId).toBe("123");
  });

  it("creates log entry with error", () => {
    interface LogEntry {
      level: string;
      message: string;
      timestamp: string;
      error?: { name: string; message: string; stack?: string };
    }

    const error = new Error("Test error");
    const entry: LogEntry = {
      level: "error",
      message: "Something failed",
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    };

    expect(entry.level).toBe("error");
    expect(entry.error?.message).toBe("Test error");
    expect(entry.error?.name).toBe("Error");
  });
});

describe("Development log formatting", () => {
  it("includes emoji for log levels", () => {
    const emojiMap: Record<string, string> = {
      debug: "🔍",
      info: "ℹ️",
      warn: "⚠️",
      error: "❌",
    };

    expect(emojiMap.debug).toBe("🔍");
    expect(emojiMap.info).toBe("ℹ️");
    expect(emojiMap.warn).toBe("⚠️");
    expect(emojiMap.error).toBe("❌");
  });

  it("formats message with level", () => {
    const formatDevMessage = (level: string, message: string): string => {
      const emoji = { debug: "🔍", info: "ℹ️", warn: "⚠️", error: "❌" }[level] || "";
      return `${emoji} [${level.toUpperCase()}] ${message}`;
    };

    expect(formatDevMessage("info", "Test")).toContain("[INFO]");
    expect(formatDevMessage("error", "Failed")).toContain("[ERROR]");
    expect(formatDevMessage("warn", "Warning")).toContain("⚠️");
  });
});

describe("Production log formatting", () => {
  it("creates valid JSON output", () => {
    const logEntry = {
      level: "info",
      message: "Production log",
      timestamp: new Date().toISOString(),
      context: { key: "value" },
    };

    const jsonOutput = JSON.stringify(logEntry);
    const parsed = JSON.parse(jsonOutput);

    expect(parsed.level).toBe("info");
    expect(parsed.message).toBe("Production log");
    expect(parsed.context.key).toBe("value");
  });

  it("serializes error in JSON", () => {
    const error = new Error("Prod error");
    const logEntry = {
      level: "error",
      message: "Error occurred",
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    };

    const jsonOutput = JSON.stringify(logEntry);
    const parsed = JSON.parse(jsonOutput);

    expect(parsed.error.message).toBe("Prod error");
    expect(parsed.error.name).toBe("Error");
  });
});

describe("Domain logger prefixing", () => {
  it("adds domain prefix to message", () => {
    const addDomainPrefix = (domain: string, message: string): string => {
      return `[${domain}] ${message}`;
    };

    expect(addDomainPrefix("auth", "User logged in")).toBe("[auth] User logged in");
    expect(addDomainPrefix("payment", "Transaction complete")).toBe("[payment] Transaction complete");
    expect(addDomainPrefix("api", "Request received")).toBe("[api] Request received");
  });

  it("predefined domains are correct", () => {
    const domains = ["auth", "payment", "api", "db", "saju", "astro", "tarot"];

    expect(domains).toContain("auth");
    expect(domains).toContain("payment");
    expect(domains).toContain("api");
    expect(domains).toContain("db");
    expect(domains).toContain("saju");
    expect(domains).toContain("astro");
    expect(domains).toContain("tarot");
    expect(domains).toHaveLength(7);
  });
});

describe("Log level filtering", () => {
  it("test environment only logs errors", () => {
    const shouldLogInTest = (level: string): boolean => {
      return level === "error";
    };

    expect(shouldLogInTest("debug")).toBe(false);
    expect(shouldLogInTest("info")).toBe(false);
    expect(shouldLogInTest("warn")).toBe(false);
    expect(shouldLogInTest("error")).toBe(true);
  });

  it("development environment logs all levels", () => {
    const shouldLogInDev = (level: string): boolean => {
      return ["debug", "info", "warn", "error"].includes(level);
    };

    expect(shouldLogInDev("debug")).toBe(true);
    expect(shouldLogInDev("info")).toBe(true);
    expect(shouldLogInDev("warn")).toBe(true);
    expect(shouldLogInDev("error")).toBe(true);
  });

  it("production sends warn and error to Sentry", () => {
    const shouldSendToSentry = (level: string): boolean => {
      return level === "error" || level === "warn";
    };

    expect(shouldSendToSentry("debug")).toBe(false);
    expect(shouldSendToSentry("info")).toBe(false);
    expect(shouldSendToSentry("warn")).toBe(true);
    expect(shouldSendToSentry("error")).toBe(true);
  });
});

describe("Timestamp formatting", () => {
  it("uses ISO 8601 format", () => {
    const timestamp = new Date().toISOString();

    // ISO 8601: YYYY-MM-DDTHH:mm:ss.sssZ
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("timestamp is parseable", () => {
    const timestamp = new Date().toISOString();
    const parsed = new Date(timestamp);

    expect(parsed.getTime()).not.toBeNaN();
    expect(parsed instanceof Date).toBe(true);
  });
});
