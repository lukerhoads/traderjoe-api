# TraderJoe Analytics Backend

Backend that actively monitors and calculates data points needed in the Trader Joe frontend.

Submission for the [Moralis Hackathon](https://moralis.io/avalanche-hackathon/) (12/6/21 - 1/31/22)

## Requirements

-   Can be any backend but preferably Python or Node.js based
-   Can refer to https://github.com/traderjoe-xyz/joe-api for current implementation; must be backwards compatible.
-   Must have API documentation, e.g., Swagger
-   Must have testnet configuration
-   Must return JSON
-   Must have rate limiting config; for distribution to partners
-   Must have versioning support
-   Trader Joe is prioritizing speed and readability of docs and code.

For more questions
Join Trader Joe’s Discord chat: https://discord.gg/3yqPe7QQHg

Useful GraphQL reference:

-   https://thegraph.com/legacy-explorer/subgraph/traderjoe-xyz/exchange
-   https://thegraph.com/hosted-service/subgraph/traderjoe-xyz/dexcandles

## Features

-   Containerized, with docker-compose which requires all components
-   Metrics with (Prometheus)[https://prometheus.io/] and visualization with [Grafana](https://grafana.com/)
-   All metrics, including:
    -   TVL (platform, pair, pool, market)
    -   Volume (pair)
    -   APR (user, pair, pool, market)
-   Backwards compatible with (TraderJoe API)[https://github.com/traderjoe-xyz/joe-api] (mostly)
-   Swagger documentation
-   Per IP and path rate limiting
-   React client library for easy integration
