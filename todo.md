# TODO

-   Load test (https://blog.appsignal.com/2021/11/10/a-guide-to-load-testing-nodejs-apis-with-artillery.html)

# Required Information

### Pools

-   Liquidity (TVL of pool, balanceof token0 and token1 combined)
-   24h volume
-   24h fees
-   APR

### Farms

-   Weight
-   Liquidity
-   APR
-   Bonus APR

### Money markets

-   Net APY of user
-   Rewards APR of user
-   APY of lend/borrow pool
-   Deposits (in market token)
-   Avax and JOE rewards?

### Pool Calculations

Requirements

-   Pool balance
-   Pool AllocPoint (from masterchef poolInfo contract) need an index though, this is probably the id on the subgraph (https://snowtrace.io/address/0x188bED1968b795d5c9022F6a0bb5931Ac4c18F00#readContract)
-   Pool TotalAllocPoint (from masterchef contract)
-   Pool JoePerSec (from masterchef poolInfo contract, with allocPoint)
-   Pair totalSupply (straight from pairContract, totalSupply of ERC20 LP)
-   Pair reserveUSD (tvl of pair, already implemented with a checkprice of token0, token1, sum the reserves times price)
