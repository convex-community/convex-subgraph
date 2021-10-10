# Convex Subgraph

---

### Overview

Historical data for the Convex platform (https://convexfinance.com/)
The subgraphs included in this repository index various on-chain events and entities that can be useful to produce analytics for the platform.

There are several subgraphs, each indexing a different aspect of the platform.

Currently available subgraphs:

- **curve-pools**: Indexes events around the Booster contract where users deposit their Curve LP tokens. Allows, for instance, to query a pool's historical TVL and APR or a user's deposits and withdrawals.
- **locker**: Indexes the vlCVX locker contract, allows to track the amount of CVX locked, the amount of rewards paid out over time.
- **votium**: Indexes bribes deposited on the <a href="https://votium.app">Votium</a> platform.

More to come!

---

### Set up and deployment:

You will need to install <a href="https://classic.yarnpkg.com/lang/en/docs/install/#debian-stable">yarn</a>, then run:

`yarn install`

To create the necessary files from the GraphQL schema and ABIs: 

`yarn run codegen`

You may opt to only run the command for a specific subgraph by specifying its name, e.g. `yarn run codegen:locker`

To compile before deployment: 

`yarn run build`

or specify a specific subgraph: `yarn run build:locker`

Authenticate to the graph with the `graph auth` command, making sure that the auth token matches the platform where you'll deploy (studio vs. hosted for instance)

Use `yarn run deploy`, `yarn run deploy local` or `yarn run deploy-hosted` or `yarn run deploy-studio` to deploy.
The `package.json` files will have to be updated to point to your own account on the Graph.

---

### Sample queries

Notebooks with sample queries are available at: <a href="https://github.com/convex-community/graph_queries">here</a>