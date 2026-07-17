import util from 'node:util';
import winston from 'winston';
import { config } from '../config/env.js'; 

const sensitiveKeyPattern =
  /authorization|cookie|password|secret|token|otp|api[-_]?key|access[-_]?key|refresh/i;

function redactValue(value: unknown, depth = 0): unknown {
  if (depth > 6) {
    return '[MaxDepth]';
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: config.env === 'production' ? undefined : value.stack
    };
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactValue(entry, depth + 1));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        sensitiveKeyPattern.test(key) ? '[REDACTED]' : redactValue(entry, depth + 1)
      ])
    );
  }

  return value;
}

const redactFormat = winston.format((info) => {
  const redacted = redactValue(info) as winston.Logform.TransformableInfo;
  
  redacted.level = info.level;
  const levelSymbol = Symbol.for('level');
  const messageSymbol = Symbol.for('message');
  
  if (info[levelSymbol]) redacted[levelSymbol] = info[levelSymbol];
  if (info[messageSymbol]) redacted[messageSymbol] = info[messageSymbol];
  
  return redacted;
});

const prettyFormat = winston.format.printf((info) => {
  const { timestamp, level, message, ...meta } = info;

  if (level.includes('http') || meta.method || meta.path) {
    const method = meta.method || '';
    const path = meta.path || '';
    const statusCode = meta.statusCode || '';
    const duration = meta.durationMs !== undefined ? `${meta.durationMs} ms` : '';
    
    const msgString = typeof message === 'string' ? message : '';

    const logLine = msgString && msgString !== 'http_request' 
      ? msgString 
      : `${method} ${path} ${statusCode} - ${duration}`;
      
    return `${timestamp} ${level}: ${logLine.trim()}`;
  }

  const suffix = Object.keys(meta).length > 0
    ? ` ${util.inspect(meta, { colors: true, depth: 6, breakLength: 120 })}`
    : '';

  return `${timestamp} ${level}: ${message}${suffix}`;
});

export const logger = winston.createLogger({
  level: config.log.level,
  levels: winston.config.npm.levels,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: config.env !== 'production' }),
    redactFormat(),
    config.log.format === 'pretty'
      ? winston.format.combine(winston.format.colorize(), prettyFormat)
      : winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      stderrLevels: ['error']
    })
  ],
  exitOnError: false
});

export function redactLogData<T>(value: T): T {
  return redactValue(value) as T;
}