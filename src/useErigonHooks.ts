import { useQuery } from "@tanstack/react-query";
import {
  AbiCoder,
  BlockParams,
  BlockTag,
  Contract,
  JsonRpcApiProvider,
  Log,
  TransactionReceiptParams,
  TransactionResponseParams,
  ZeroAddress,
  dataSlice,
  getAddress,
  getBytes,
  isHexString,
  toNumber,
} from "ethers";
import { useEffect, useMemo, useState } from "react";
import useSWR, { Fetcher } from "swr";
import useSWRImmutable from "swr/immutable";
import erc20 from "./abi/erc20.json";
import { panicCodeMessages } from "./execution/panic-codes";
import {
  ChecksummedAddress,
  InternalOperation,
  OperationType,
  ProcessedTransaction,
  TokenMeta,
  TokenTransfer,
  TransactionData,
} from "./types";
import { formatter } from "./utils/formatter";

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export interface ExtendedBlock extends BlockParams {
  size: number;
  sha3Uncles: string;
  stateRoot: string;
  totalDifficulty?: bigint;
  transactionCount: number;
}

export const readBlock = async (
  provider: JsonRpcApiProvider,
  blockNumberOrHash: string,
): Promise<ExtendedBlock | null> => {
  let blockPromise: Promise<any>;
  if (isHexString(blockNumberOrHash, 32)) {
    blockPromise = provider.send("eth_getBlockByHash", [
      blockNumberOrHash,
      false, // Don't include full transaction objects
    ]);
  } else {
    const blockNumber = parseInt(blockNumberOrHash);
    if (isNaN(blockNumber) || blockNumber < 0) {
      return null;
    }
    blockPromise = provider.send("eth_getBlockByNumber", [
      "0x" + blockNumber.toString(16), // Convert to hex
      false, // Don't include full transaction objects
    ]);
  }

  const _rawBlock = await blockPromise;
  if (_rawBlock === null) {
    return null;
  }
  const _block: BlockParams = formatter.blockParams(_rawBlock);

  const extBlock: ExtendedBlock = {
    size: formatter.number(_rawBlock.size),
    sha3Uncles: _rawBlock.sha3Uncles,
    stateRoot: _rawBlock.stateRoot,
    totalDifficulty:
      _rawBlock.totalDifficulty &&
      formatter.bigInt(_rawBlock.totalDifficulty),
    transactionCount: _rawBlock.transactions ? _rawBlock.transactions.length : 0,
    ..._block,
  };
  return extBlock;
};

export type BlockTransactionsPage = {
  total: number;
  txs: ProcessedTransaction[];
};

const blockTransactionsFetcher: Fetcher<
  BlockTransactionsPage,
  [JsonRpcApiProvider, number, number, number]
> = async ([provider, blockNumber, pageNumber, pageSize]) => {
  try {
    // Use standard eth_getBlockByNumber with full transactions
    const _block = await provider.send("eth_getBlockByNumber", [
      "0x" + blockNumber.toString(16),
      true, // Include full transaction objects
    ]);

    if (!_block || !_block.transactions) {
      return { total: 0, txs: [] };
    }

  const formattedBlock = formatter.blockParamsWithTransactions(_block);
  const totalTxs = _block.transactions.length;

  // Apply pagination first to limit the number of transactions we process
  const startIdx = pageNumber * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalTxs);
  const pageTransactions = _block.transactions.slice(startIdx, endIdx);

  // Only get receipts for the transactions in this page
  const receiptPromises = pageTransactions.map((tx: any) =>
    provider.send("eth_getTransactionReceipt", [tx.hash])
  );
  const receipts = await Promise.all(receiptPromises);

  const rawTxs = pageTransactions
    .map((t: TransactionResponseParams, i: number): ProcessedTransaction => {
      const _rawReceipt = receipts[i];
      if (!_rawReceipt) {
        throw new Error("blockTransactionsFetcher: receipt not found");
      }

      // Empty logs on purpose because of ethers formatter requires it
      _rawReceipt.logs = [];
      const _receipt: TransactionReceiptParams =
        formatter.transactionReceiptParams(_rawReceipt);

      if (t.hash === null) {
        throw new Error("blockTransactionsFetcher: unknown tx hash");
      }

      let fee: bigint;
      let effectiveGasPrice: bigint;

      try {
        if (t.type === 2 || t.type === 3) {
          // EIP-1559 transaction
          const maxFeePerGas = formatter.bigInt(t.maxFeePerGas || 0);
          const maxPriorityFeePerGas = formatter.bigInt(t.maxPriorityFeePerGas || 0);
          const baseFeePerGas = formatter.bigInt(formattedBlock.baseFeePerGas || 0);

          const tip = maxFeePerGas - baseFeePerGas < maxPriorityFeePerGas
            ? maxFeePerGas - baseFeePerGas
            : maxPriorityFeePerGas;
          effectiveGasPrice = baseFeePerGas + tip;
        } else {
          // Legacy transaction
          effectiveGasPrice = formatter.bigInt(t.gasPrice || 0);
        }

        // Standard Ethereum fee calculation
        fee = formatter.bigInt(_receipt.gasUsed || 0) * effectiveGasPrice;
      } catch (error) {
        console.error("Error calculating fee for transaction:", t.hash, error);
        fee = 0n;
        effectiveGasPrice = 0n;
      }

      return {
        blockNumber: blockNumber,
        timestamp: Number(formattedBlock.timestamp || 0),
        miner: formattedBlock.miner || "",
        idx: startIdx + i, // Adjust index for pagination
        hash: t.hash,
        from: t.from ?? undefined,
        to: t.to ?? null,
        createdContractAddress: _receipt.contractAddress ?? undefined,
        value: formatter.bigInt(t.value || 0),
        type: Number(t.type || 0),
        fee,
        gasPrice: effectiveGasPrice,
        data: t.data || "0x",
        status: formatter.number(_receipt.status || 0),
      };
    });

    return { total: totalTxs, txs: rawTxs };
  } catch (error) {
    console.error("Error fetching block transactions:", error);
    return { total: 0, txs: [] };
  }
};

export const useBlockTransactions = (
  provider: JsonRpcApiProvider,
  blockNumber: number | undefined,
  pageNumber: number,
  pageSize: number,
): { data: BlockTransactionsPage | undefined; isLoading: boolean } => {
  const { data, error, isLoading } = useSWRImmutable(
    blockNumber !== undefined
      ? [provider, blockNumber, pageNumber, pageSize]
      : null,
    blockTransactionsFetcher,
    { keepPreviousData: true },
  );
  if (error) {
    return { data: undefined, isLoading: false };
  }
  return { data, isLoading };
};

const blockDataFetcher: Fetcher<
  ExtendedBlock | null,
  [JsonRpcApiProvider, string]
> = async ([provider, blockNumberOrHash]) => {
  return readBlock(provider, blockNumberOrHash);
};

// TODO: some callers may use only block headers?
export const useBlockData = (
  provider: JsonRpcApiProvider,
  blockNumberOrHash: string | undefined,
): { data: ExtendedBlock | null | undefined; isLoading: boolean } => {
  const { data, error, isLoading } = useSWRImmutable(
    blockNumberOrHash !== undefined ? [provider, blockNumberOrHash] : null,
    blockDataFetcher,
    { keepPreviousData: true },
  );
  if (error) {
    return { data: undefined, isLoading: false };
  }
  return { data, isLoading };
};

export const useBlockDataFromTransaction = (
  provider: JsonRpcApiProvider,
  txData: TransactionData | null | undefined,
): ExtendedBlock | null | undefined => {
  const { data: block } = useBlockData(
    provider,
    txData?.confirmedData
      ? txData.confirmedData.blockNumber.toString()
      : undefined,
  );
  return block;
};

export const useTxData = (
  provider: JsonRpcApiProvider,
  txhash: string,
): TransactionData | undefined | null => {
  const [txData, setTxData] = useState<TransactionData | undefined | null>();

  useEffect(() => {
    const readTxData = async () => {
      try {
        const [_response, _receipt] = await Promise.all([
          provider.getTransaction(txhash),
          provider.getTransactionReceipt(txhash),
        ]);
        if (_response === null) {
          setTxData(null);
          return;
        }

        let fee: bigint;
        let gasPrice: bigint;

        // Handle Optimism-specific values
        // Standard Ethereum fee calculation
        fee = _response.gasPrice! * _receipt!.gasUsed!;
        gasPrice = _response.gasPrice!;

        setTxData({
          transactionHash: _response.hash,
          from: _response.from,
          to: _response.to ?? undefined,
          value: _response.value,
          type: _response.type ?? 0,
          maxFeePerGas: _response.maxFeePerGas ?? undefined,
          maxPriorityFeePerGas: _response.maxPriorityFeePerGas ?? undefined,
          gasPrice,
          gasLimit: _response.gasLimit,
          nonce: BigInt(_response.nonce),
          data: _response.data,
          maxFeePerBlobGas: _response.maxFeePerBlobGas ?? undefined,
          blobVersionedHashes: _response.blobVersionedHashes ?? undefined,
          confirmedData:
            _receipt === null
              ? undefined
              : {
                  status: _receipt.status === 1,
                  blockNumber: _receipt.blockNumber,
                  transactionIndex: _receipt.index,
                  // TODO: Does awaiting this Promise induce another RPC call?
                  confirmations: await _receipt.confirmations(),
                  createdContractAddress: _receipt.contractAddress ?? undefined,
                  fee,
                  gasUsed: _receipt.gasUsed,
                  logs: Array.from(_receipt.logs),
                  blobGasPrice: _receipt.blobGasPrice ?? undefined,
                  blobGasUsed: _receipt.blobGasUsed ?? undefined,
                },
        });
      } catch (err) {
        console.error(err);
        setTxData(null);
      }
    };

    readTxData();
  }, [provider, txhash]);

  return txData;
};

export const findTokenTransfersInLogs = (
  logs: readonly Log[],
): TokenTransfer[] => {
  return logs
    .filter((l) => l.topics.length === 3 && l.topics[0] === TRANSFER_TOPIC)
    .map((l) => ({
      token: l.address,
      from: getAddress(dataSlice(getBytes(l.topics[1]), 12)),
      to: getAddress(dataSlice(getBytes(l.topics[2]), 12)),
      value: BigInt(l.data),
    }));
};

export const useTokenTransfers = (
  txData?: TransactionData | null,
): TokenTransfer[] | undefined => {
  const transfers = useMemo(() => {
    if (txData === undefined || txData === null) {
      return undefined;
    }
    if (!txData.confirmedData) {
      return undefined;
    }

    return findTokenTransfersInLogs(txData.confirmedData.logs);
  }, [txData]);

  return transfers;
};

export const useInternalOperations = (
  provider: JsonRpcApiProvider,
  txHash: string | undefined,
): InternalOperation[] | undefined => {
  const { data, error } = useSWRImmutable(
    txHash !== undefined ? ["ots_getInternalOperations", txHash] : null,
    providerFetcher(provider),
  );

  const _transfers = useMemo(() => {
    if (error || data === undefined) {
      return undefined;
    }

    const _t: InternalOperation[] = [];
    for (const t of data) {
      _t.push({
        type: t.type,
        from: formatter.address(getAddress(t.from)),
        to: formatter.address(getAddress(t.to)),
        value: formatter.bigInt(t.value),
      });
    }
    return _t;
  }, [data]);
  return _transfers;
};

export const useSendsToMiner = (
  provider: JsonRpcApiProvider,
  txHash: string | undefined,
  miner: string | undefined,
): [boolean, InternalOperation[]] | [undefined, undefined] => {
  const ops = useInternalOperations(provider, txHash);
  if (ops === undefined) {
    return [undefined, undefined];
  }

  const send =
    ops.findIndex(
      (op) =>
        op.type === OperationType.TRANSFER &&
        miner !== undefined &&
        miner === getAddress(op.to),
    ) !== -1;
  return [send, ops];
};

export type StateDiffElement = {
  type: string;
  from: string | null;
  to: string | null;

  // "+": new
  // "*": modified
  // "-": removed
  storageChange: string;
};

export type StateDiffGroup = {
  title: string;
  diffs: (StateDiffElement | StateDiffGroup)[];
};

export const useStateDiffTrace = (
  provider: JsonRpcApiProvider,
  txHash: string,
): StateDiffGroup[] | undefined => {
  const [traceGroups, setTraceGroups] = useState<
    StateDiffGroup[] | undefined
  >();

  useEffect(() => {
    const stateDiffTrace = async () => {
      const results = await provider.send("trace_replayTransaction", [
        txHash,
        ["stateDiff"],
      ]);
      const entries: StateDiffGroup[] = [];
      let address: string;
      let highLevelChange: any;

      // Iterate over each address with a state change
      for ([address, highLevelChange] of Object.entries(results.stateDiff)) {
        const sdGroup: StateDiffGroup = {
          title: address,
          diffs: [],
        };
        let changeType: string;
        let changes: any;

        function addChangeType(
          changeType: string,
          changes: any,
        ): StateDiffGroup | StateDiffElement | null {
          if (changes === "=") {
            // No change
            return null;
          }

          if (changeType === "storage") {
            // Create a "storage" subgroup and a subgroup for each storage slot
            let group: StateDiffGroup = {
              title: "storage",
              diffs: [],
            };
            for (const [storageSlot, storageChange] of Object.entries(
              changes,
            )) {
              let storageGroup: StateDiffGroup = {
                title: storageSlot,
                diffs: [],
              };
              let change = addChangeType("storageChange", storageChange);
              if (change !== null) {
                storageGroup.diffs.push(change);
                group.diffs.push(storageGroup);
              }
            }
            // Only return storage group if it has non-empty slot groups
            return group.diffs.length > 0 ? group : null;
          }

          let storageChanges = Object.keys(changes);
          if (storageChanges.length !== 1) {
            throw new Error("More than one storage change type found");
          }
          // storageChange is "*", "+", or "-"
          let storageChange = storageChanges[0];

          if (storageChange === "+") {
            // Just the new value is stored
            return {
              type: changeType,
              from: null,
              to: changes[storageChange],
              storageChange,
            };
          } else if (storageChange === "-") {
            return {
              type: changeType,
              from: changes[storageChange],
              to: null,
              storageChange,
            };
          }

          return {
            type: changeType,
            from: changes[storageChange].from,
            to: changes[storageChange].to,
            storageChange,
          };
        }

        // Add each of the state changes from this address
        for ([changeType, changes] of Object.entries(highLevelChange)) {
          let change = addChangeType(changeType, changes);
          if (change !== null) {
            sdGroup.diffs.push(change);
          }
        }
        // Only add address group if it has non-empty diffs
        if (sdGroup.diffs.length > 0) {
          entries.push(sdGroup);
        }
      }
      setTraceGroups(entries);
    };
    stateDiffTrace();
  }, [provider, txHash]);
  return traceGroups;
};

export type TraceEntry = {
  type: string;
  depth: number;
  from: string;
  to: string;
  value: bigint;
  input: string;
  output?: string;
};

export type TraceGroup = TraceEntry & {
  children: TraceGroup[] | null;
};

export const useTraceTransaction = (
  provider: JsonRpcApiProvider,
  txHash: string,
): TraceGroup[] | undefined => {
  const [traceGroups, setTraceGroups] = useState<TraceGroup[] | undefined>();

  useEffect(() => {
    const traceTx = async () => {
      const results = await provider.send("ots_traceTransaction", [txHash]);

      // Implement better formatter
      for (let i = 0; i < results.length; i++) {
        results[i].from = formatter.address(results[i].from);
        results[i].to = formatter.address(results[i].to);
        results[i].value =
          results[i].value === null ? null : formatter.bigInt(results[i].value);
      }

      // Build trace tree
      const buildTraceTree = (
        flatList: TraceEntry[],
        depth: number = 0,
      ): TraceGroup[] => {
        const entries: TraceGroup[] = [];

        let children: TraceEntry[] | null = null;
        for (let i = 0; i < flatList.length; i++) {
          if (flatList[i].depth === depth) {
            if (children !== null) {
              const childrenTree = buildTraceTree(children, depth + 1);
              const prev = entries.pop();
              if (prev) {
                prev.children = childrenTree;
                entries.push(prev);
              }
            }

            entries.push({
              ...flatList[i],
              children: null,
            });
            children = null;
          } else {
            if (children === null) {
              children = [];
            }
            children.push(flatList[i]);
          }
        }
        if (children !== null) {
          const childrenTree = buildTraceTree(children, depth + 1);
          const prev = entries.pop();
          if (prev) {
            prev.children = childrenTree;
            entries.push(prev);
          }
        }

        return entries;
      };

      const traceTree = buildTraceTree(results);
      setTraceGroups(traceTree);
    };
    traceTx();
  }, [provider, txHash]);

  return traceGroups;
};

export type TxErrorType = "string" | "panic" | "custom";

// Error(string)
const ERROR_MESSAGE_SELECTOR = "0x08c379a0";
// Panic(uint256)
const PANIC_CODE_SELECTOR = "0x4e487b71";

function intToHex(num: bigint): string {
  return "0x" + num.toString(16).padStart(2, "0");
}

export const useTransactionError = (
  provider: JsonRpcApiProvider,
  txHash: string,
): [string | undefined, string | undefined, TxErrorType | undefined] => {
  const [errorMsg, setErrorMsg] = useState<string | undefined>();
  const [data, setData] = useState<string | undefined>();
  const [errorType, setErrorType] = useState<TxErrorType | undefined>();

  useEffect(() => {
    // Reset
    setErrorMsg(undefined);
    setData(undefined);
    setErrorType(undefined);

    const readCodes = async () => {
      // Transaction error details are not available in standard Ethereum API
      // This feature is disabled to maintain compatibility
      const result = null;

      // Standard Ethereum API doesn't provide error details
      setErrorMsg(undefined);
      setData(undefined);
      setErrorType(undefined);
    };
    readCodes();
  }, [provider, txHash]);

  return [errorMsg, data, errorType];
};

export const useTransactionCount = (
  provider: JsonRpcApiProvider,
  sender: ChecksummedAddress | undefined,
): bigint | undefined => {
  const { data, error } = useSWR(
    sender ? { provider, sender } : null,
    async ({ provider, sender }): Promise<bigint | undefined> =>
      provider.getTransactionCount(sender).then(BigInt),
  );

  if (error) {
    return undefined;
  }
  return data;
};

type TransactionBySenderAndNonceKey = {
  network: bigint;
  sender: ChecksummedAddress;
  nonce: bigint;
};

const getTransactionBySenderAndNonceFetcher =
  (provider: JsonRpcApiProvider) =>
  async ({
    network,
    sender,
    nonce,
  }: TransactionBySenderAndNonceKey): Promise<string | null | undefined> => {
    if (nonce < 0) {
      return undefined;
    }

    // Transaction by sender and nonce is not available in standard Ethereum API
    // This feature is disabled to maintain compatibility
    const result = null;

    // Empty or success
    return result;
  };

export const useTransactionBySenderAndNonce = (
  provider: JsonRpcApiProvider,
  sender: ChecksummedAddress | undefined,
  nonce: bigint | undefined,
): string | null | undefined => {
  const { data, error } = useSWR<
    string | null | undefined,
    any,
    TransactionBySenderAndNonceKey | null
  >(
    sender && nonce !== undefined
      ? {
          network: provider._network.chainId,
          sender,
          nonce,
        }
      : null,
    getTransactionBySenderAndNonceFetcher(provider),
  );

  if (error) {
    return undefined;
  }
  return data;
};

type ContractCreatorKey = {
  type: "cc";
  network: bigint;
  address: ChecksummedAddress;
};

type ContractCreator = {
  hash: string;
  creator: ChecksummedAddress;
};

export const useContractCreator = (
  provider: JsonRpcApiProvider,
  address: ChecksummedAddress | undefined,
): ContractCreator | null | undefined => {
  const { data, error } = useSWR<
    ContractCreator | null | undefined,
    any,
    ContractCreatorKey | null
  >(
    address
      ? {
          type: "cc",
          network: provider._network.chainId,
          address,
        }
      : null,
    getContractCreatorFetcher(provider!),
  );

  if (error) {
    return undefined;
  }
  return data as ContractCreator;
};

const getContractCreatorFetcher =
  (provider: JsonRpcApiProvider) =>
  async ({
    network,
    address,
  }: ContractCreatorKey): Promise<ContractCreator | null | undefined> => {
    const result = (await provider.send("ots_getContractCreator", [
      address,
    ])) as ContractCreator;

    // Empty or success
    if (result) {
      result.creator = formatter.address(result.creator);
    }
    return result;
  };

export const getBalanceQuery = (
  provider: JsonRpcApiProvider,
  address: ChecksummedAddress,
) => ({
  queryKey: ["eth_getBalance", address],
  queryFn: () => provider.getBalance(address),
});

/**
 * This is a generic fetch for SWR, where the key is an array, whose
 * element 0 is the JSON-RPC method, and the remaining are the method
 * arguments.
 */
export const providerFetcher =
  (provider: JsonRpcApiProvider): Fetcher<any | undefined, [string, ...any]> =>
  async (key) => {
    for (const a of key) {
      if (a === undefined) {
        return undefined;
      }
    }

    const method = key[0];
    const args = key.slice(1);
    const result = await provider.send(method, args);
    return result;
  };

export const useHasCode = (
  provider: JsonRpcApiProvider,
  address: ChecksummedAddress | undefined,
  blockTag: BlockTag = "latest",
): boolean | undefined => {
  const { data: hasCode } = useQuery(hasCodeQuery(provider, address, blockTag));
  return hasCode;
};

export const hasCodeQuery = (
  provider: JsonRpcApiProvider,
  address: ChecksummedAddress | undefined,
  blockTag: BlockTag = "latest",
) => ({
  queryKey: ["ots_hasCode", address, blockTag],
  queryFn: () => {
    return provider.send("ots_hasCode", [address, blockTag]);
  },
});

export const getCodeQuery = (
  provider: JsonRpcApiProvider,
  address: ChecksummedAddress | undefined,
  blockTag: BlockTag = "latest",
) => ({
  queryKey: ["eth_getCode", address, blockTag],
  queryFn: () => {
    return provider.send("eth_getCode", [address, blockTag]);
  },
});

const ERC20_PROTOTYPE = new Contract(ZeroAddress, erc20);

const tokenMetadataFetcher =
  (
    provider: JsonRpcApiProvider,
  ): Fetcher<TokenMeta | null, ["tokenmeta", ChecksummedAddress]> =>
  async ([_, address]) => {
    // TODO: workaround for https://github.com/ethers-io/ethers.js/issues/4183
    const erc20Contract: Contract = ERC20_PROTOTYPE.connect(provider).attach(
      address,
    ) as Contract;
    try {
      const name = (await erc20Contract.name()) as string;
      if (!name.trim()) {
        return null;
      }

      const [symbol, decimals] = (await Promise.all([
        erc20Contract.symbol(),
        erc20Contract.decimals(),
      ])) as [string, number];

      // Prevent faulty tokens with empty name/symbol
      if (!symbol.trim()) {
        return null;
      }

      return {
        name,
        symbol,
        decimals: Number(decimals),
      };
    } catch (err) {
      // Ignore on purpose; this indicates the probe failed and the address
      // is not a token
      return null;
    }
  };

export const useTokenMetadata = (
  provider: JsonRpcApiProvider,
  address: ChecksummedAddress | undefined,
): TokenMeta | null | undefined => {
  const fetcher = tokenMetadataFetcher(provider);
  const { data, error } = useSWRImmutable(
    address !== undefined ? ["tokenmeta", address] : null,
    fetcher,
  );
  if (error) {
    return undefined;
  }
  return data;
};

export const useL1Epoch = (
  provider: JsonRpcApiProvider,
  blockTag: BlockTag | null,
): bigint | null | undefined => {
  // L1 Epoch is Optimism-specific and not available in standard Ethereum
  return null;
};
