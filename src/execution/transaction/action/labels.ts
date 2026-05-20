// Hardcoded labels for high-traffic mainnet infrastructure addresses.
// Covers what Etherscan shows for "easy" annotations: stablecoins, major
// DEX routers/factories, LSTs, MEV builders, well-known multisig/protocols.
// Keys are lowercase. Use `addressLabel()` to look up.

const LABELS: Record<string, string> = {
  // ─── Native / stable / LST tokens ───
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": "WETH",
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "USDC",
  "0xdac17f958d2ee523a2206206994597c13d831ec7": "USDT",
  "0x6b175474e89094c44da98b954eedeac495271d0f": "DAI",
  "0xdc035d45d973e3ec169d2276ddab16f1e407384f": "USDS",
  "0x4c9edd5852cd905f086c759e8383e09bff1e68b3": "USDe",
  "0x853d955acef822db058eb8505911ed77f175b99e": "FRAX",
  "0x57ab1ec28d129707052df4df418d58a2d46d5f51": "sUSD",
  "0x68749665ff8d2d112fa859aa293f07a622782f38": "PYUSD",
  "0xae78736cd615f374d3085123a210448e74fc6393": "rETH",
  "0xae7ab96520de3a18e5e111b5eaab095312d7fe84": "stETH",
  "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0": "wstETH",
  "0xbe9895146f7af43049ca1c1ae358b0541ea49704": "cbETH",
  "0x5e8422345238f34275888049021821e8e08caa1f": "frxETH",
  "0xac3e018457b222d93114458476f3e3416abbe38f": "sfrxETH",
  "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": "WBTC",
  "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2": "MKR",
  "0x514910771af9ca656af840dff83e8264ecf986ca": "LINK",
  "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984": "UNI",
  "0x6982508145454ce325ddbe47a25d4ec3d2311933": "PEPE",
  "0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce": "SHIB",

  // ─── Lido ───
  "0x388c818ca8b9251b393131c08a736a67ccb19297": "Lido: Execution Layer Rewards Vault",
  "0x442af784a788a5bd6f42a01ebe9f287a871243fb": "Lido: Oracle",
  "0xb8ffc3cd6e7cf5a098a1c92f48009765b24088dc": "Lido: Locator",
  "0xb280e33812c0b09353180e92e27b8ad399b07f26": "Lido: Withdrawal Queue",

  // ─── Uniswap ───
  "0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f": "Uniswap V2: Factory",
  "0x7a250d5630b4cf539739df2c5dacb4c659f2488d": "Uniswap V2: Router 2",
  "0x1f98431c8ad98523631ae4a59f267346ea31f984": "Uniswap V3: Factory",
  "0xe592427a0aece92de3edee1f18e0157c05861564": "Uniswap V3: Router",
  "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45": "Uniswap V3: Router 2",
  "0xc36442b4a4522e871399cd717abdd847ab11fe88": "Uniswap V3: Positions NFT",
  "0xef1c6e67703c7bd7107eed8303fbe6ec2554bf6b": "Uniswap: Universal Router",
  "0x66a9893cc07d91d95644aedd05d03f95e1dba8af": "Uniswap V4: Universal Router",
  "0x000000000022d473030f116ddee9f6b43ac78ba3": "Permit2",

  // ─── DEX aggregators / market makers ───
  "0x1111111254eeb25477b68fb85ed929f73a960582": "1inch V5: Router",
  "0x111111125421ca6dc452d289314280a0f8842a65": "1inch V6: Router",
  "0xdef1c0ded9bec7f1a1670819833240f027b25eff": "0x: Exchange Proxy",
  "0x0000000000001ff3684f28c67538d4d072c22734": "0x: Settler",
  "0x9008d19f58aabd9ed0d60971565aa8510560ab41": "CoW Protocol: Settlement",
  "0x6131b5fae19ea4f9d964eac0408e4408b66337b5": "KyberSwap: Meta Aggregator",
  "0xdef171fe48cf0115b1d80b88dc8eab59176fee57": "Paraswap V5: Router",

  // ─── NFT marketplaces ───
  "0x00000000000000adc04c56bf30ac9d3c0aaf14dc": "OpenSea: Seaport 1.5",
  "0x0000000000000068f116a894984e2db1123eb395": "OpenSea: Seaport 1.6",
  "0x00000000000001ad428e4906ae43d8f9852d0dd6": "Blur: Marketplace V3",
  "0x000000000000ad05ccc4f10045630fb830b95127": "Blend: Lending",

  // ─── Safe (Gnosis) ───
  "0xd9db270c1b5e3bd161e8c8503c55ceabee709552": "Safe: Singleton 1.3.0",
  "0x41675c099f32341bf84bfc5382af534df5c7461a": "Safe: Singleton 1.4.1",
  "0xa6b71e26c5e0845f74c812102ca7114b6a896ab2": "Safe: Proxy Factory 1.3.0",
  "0x4e1dcf7ad4e460cfd30791ccc4f9c8a4f820ec67": "Safe: Proxy Factory 1.4.1",

  // ─── MEV builders / relays ───
  "0x1f9090aae28b8a3dceadf281b0f12828e676c326": "rsync-builder",
  "0x4838b106fce9647bdf1e7877bf73ce8b0bad5f97": "Titan Builder",
  "0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5": "beaverbuild",
  "0xdadb0d80178819f2319190d340ce9a924f783711": "BuilderNet",
  "0x7e2a2fa2a064f693f0a55c5639476d913ff12d05": "MEV Builder",
  "0xa1defa73d08e7f1c1e4d54df9d40dd3e0a3e0c89": "MEV Builder",
  "0x6adb3bab5730852eb53987ea89d8e8f16393c200": "MEV Builder: 0x6adb…200",

  // ─── Aave V3 ───
  "0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2": "Aave V3: Pool",
  "0x2f39d218133afab8f2b819b1066c7e434ad94e9e": "Aave V3: ACL Manager",

  // ─── Curve ───
  "0xbabe61887f1de2713c6f97e567623453d3c79f67": "Curve: Router",

  // ─── Misc protocols ───
  "0x00000000219ab540356cbb839cbe05303d7705fa": "ETH 2.0: Deposit",
  "0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85": "ENS: Base Registrar",
  "0x253553366da8546fc250f225fe3d25d0c782303b": "ENS: ETH Registrar Controller",
  "0x4976a4a02f38326660d17bf34b431dc6e2eb2327": "Wormhole: Token Bridge",
  "0x3ee18b2214aff97000d974cf647e54347fd0e3ee": "Wormhole: Core Bridge",
  "0x0000000000000000000000000000000000000000": "Null Address",
  "0x000000000000000000000000000000000000dead": "Burn Address",
};

/**
 * Look up a human label for a known infrastructure address.
 * Returns `undefined` when the address isn't in the curated set.
 */
export const addressLabel = (address: string | undefined): string | undefined => {
  if (!address) return undefined;
  return LABELS[address.toLowerCase()];
};
