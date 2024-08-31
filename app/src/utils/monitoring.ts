// src/utils/monitoring.ts
import client from 'prom-client';

// Create a Registry to register the metrics
const register = new client.Registry();

// Create a histogram metric
const httpRequestDurationMicroseconds = new client.Histogram({
    name: 'http_request_duration_ms',
    help: 'Duration of HTTP requests in ms',
    labelNames: ['method', 'route', 'code'],
    buckets: [0.1, 5, 15, 50, 100, 300, 500, 1000],  // Buckets for response time in ms
});

// Register the histogram
register.registerMetric(httpRequestDurationMicroseconds);

// Enable the collection of default metrics
client.collectDefaultMetrics({ register });

export { httpRequestDurationMicroseconds, register };
