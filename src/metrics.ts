import client from 'prom-client'

export const httpRequestTimer = new client.Histogram({
    name: 'http_request_duration_ms',
    help: 'Duration of HTTP requests in milliseconds',
    labelNames: ['method', 'route', 'code'],
    buckets: [100, 300, 500, 700, 1000, 3000, 5000, 7000, 10000],
})

export const customMetrics = [httpRequestTimer]
