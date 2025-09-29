import { faCube } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FixedNumber } from "ethers";
import React, { useContext, useMemo } from "react";
import { useSearchParams } from "react-router";
import { Helmet } from "react-helmet-async";
import BlockLink from "../components/BlockLink";
import StandardFrame from "../components/StandardFrame";
import SimplePageControl from "../search/SimplePageControl";
import { ExtendedBlock, readBlock } from "../useErigonHooks";
import { useLatestBlockHeader } from "../useLatestBlock";
import { RuntimeContext } from "../useRuntime";
import { commify } from "../utils/utils";

const ELASTICITY_MULTIPLIER = 2n;
const BLOCKS_PER_PAGE = 30;

const RecentBlocks: React.FC = () => {
  const { provider } = useContext(RuntimeContext);

  const [searchParams] = useSearchParams();
  let pageNumber = 1;
  const p = searchParams.get("p");
  if (p) {
    try {
      pageNumber = parseInt(p);
    } catch (err) {}
  }

  const latestBlock = useLatestBlockHeader(provider);

  // Store the initial block number to prevent reloading when new blocks arrive
  const [initialBlockNumber, setInitialBlockNumber] = React.useState<number | undefined>(undefined);

  // Calculate which blocks to show based on page
  const [blocks, setBlocks] = React.useState<ExtendedBlock[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    // Reset when page changes
    setInitialBlockNumber(undefined);
  }, [pageNumber]);

  React.useEffect(() => {
    // Set the initial block number once when latestBlock is first available
    if (latestBlock && initialBlockNumber === undefined) {
      setInitialBlockNumber(latestBlock.number);
    }
  }, [latestBlock, initialBlockNumber]);

  const totalBlocks = initialBlockNumber || 0;
  const startBlock = Math.max(0, totalBlocks - (pageNumber - 1) * BLOCKS_PER_PAGE);
  const endBlock = Math.max(0, startBlock - BLOCKS_PER_PAGE + 1);

  React.useEffect(() => {
    if (!initialBlockNumber) return;

    const fetchBlocks = async () => {
      setIsLoading(true);
      const blockPromises = [];

      for (let i = startBlock; i >= endBlock; i--) {
        if (i >= 0) {
          blockPromises.push(readBlock(provider, i.toString()));
        }
      }

      const fetchedBlocks = await Promise.all(blockPromises);
      const validBlocks = fetchedBlocks.filter((block): block is ExtendedBlock => block !== null);
      setBlocks(validBlocks);
      setIsLoading(false);
    };

    fetchBlocks();
  }, [provider, initialBlockNumber, startBlock, endBlock]);

  const BlockRow: React.FC<{ block: ExtendedBlock }> = ({ block }) => {
    const gasTarget = block.gasLimit / ELASTICITY_MULTIPLIER;

    return (
      <tr>
        <td>
          <BlockLink blockTag={block.number} />
        </td>
        <td
          className={`col-span-2 text-right ${
            block.gasUsed > gasTarget
              ? "text-emerald-500"
              : block.gasUsed < gasTarget
                ? "text-red-500"
                : ""
          }`}
        >
          {commify(block.gasUsed.toString())} (
          {block.gasUsed > gasTarget ? "+" : ""}
          {FixedNumber.fromValue(block.gasUsed)
            .subUnsafe(FixedNumber.fromValue(gasTarget))
            .mulUnsafe(FixedNumber.fromValue(100))
            .divUnsafe(FixedNumber.fromValue(gasTarget))
            .round(2)
            .toUnsafeFloat()}
          %)
        </td>
        <td className="text-right">
          <span>
            {FixedNumber.fromValue(block.baseFeePerGas ?? 0n)
              .divUnsafe(FixedNumber.fromValue(1_000_000_000n))
              .toUnsafeFloat()
              .toFixed(2)}{" "}
            Gwei
          </span>
        </td>
        <td className="text-right text-gray-400" title={new Date(block.timestamp * 1000).toLocaleString()}>
          {new Date(block.timestamp * 1000).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          })}
        </td>
      </tr>
    );
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <StandardFrame>
        <Helmet>
          <title>Recent Blocks | Ethscan</title>
          <meta name="description" content="Browse the latest Ethereum blocks with detailed information about gas usage and fees." />
          <link rel="canonical" href="https://ethscan.org/blocks/recent" />

          {/* Open Graph tags */}
          <meta property="og:title" content="Recent Blocks | Ethscan" />
          <meta property="og:description" content="Browse the latest Ethereum blocks with detailed information about gas usage and fees." />
          <meta property="og:url" content="https://ethscan.org/blocks/recent" />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Ethscan" />

          {/* Twitter tags */}
          <meta name="twitter:card" content="summary" />
          <meta name="twitter:title" content="Recent Blocks | Ethscan" />
          <meta name="twitter:description" content="Browse the latest Ethereum blocks with detailed information about gas usage and fees." />
        </Helmet>

        <div className="py-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6 px-3 lg:px-9">
            <h1 className="text-2xl font-bold flex items-center space-x-3">
              <FontAwesomeIcon icon={faCube} className="text-gray-500" />
              <span>Recent Blocks</span>
            </h1>
            {!isLoading && (
              <SimplePageControl
                pageNumber={pageNumber}
                pageSize={BLOCKS_PER_PAGE}
                total={totalBlocks}
              />
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-8 px-3 lg:px-9">
              <div className="text-gray-500">Loading blocks...</div>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block bg-white sm:rounded-lg sm:shadow-sm border overflow-hidden mx-3 lg:mx-9">
                <div className="overflow-x-scroll">
                  <table className="w-full table-auto border-gray-200 px-2 py-2 text-left text-sm [&>*>tr]:items-baseline">
                    <thead>
                      <tr className="bg-gray-100 text-gray-500 [&>th]:truncate [&>th:first-child]:pl-2 [&>th:last-child]:pr-2 [&>th]:px-1 [&>th]:py-2">
                        <th>Block</th>
                        <th className="text-right">Gas used</th>
                        <th className="text-right">Base fee</th>
                        <th className="text-right">Date/Time</th>
                      </tr>
                    </thead>
                    <tbody className="[&>tr>td]:truncate [&>tr>td]:px-1 [&>tr>td:first-child]:pl-2 [&>tr>td:last-child]:pr-2 [&>tr>td]:py-3 [&>tr]:border-t [&>tr]:border-gray-200">
                      {blocks.map((block) => (
                        <BlockRow key={block.hash} block={block} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Cards */}
              <div className="block sm:hidden space-y-3 px-3">
                {blocks.map((block) => {
                  const gasTarget = block.gasLimit / ELASTICITY_MULTIPLIER;
                  const gasUsedPercent = block.gasLimit ? (Number(block.gasUsed) * 100 / Number(block.gasLimit)).toFixed(2) : "0";

                  return (
                    <div key={block.hash} className="bg-white rounded-lg shadow-sm border p-4 space-y-3 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-700">Block</span>
                        <BlockLink blockTag={block.number} />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Date/Time</span>
                        <span className="text-sm text-gray-800" title={new Date(block.timestamp * 1000).toLocaleString()}>
                          {new Date(block.timestamp * 1000).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Gas Used</span>
                        <div className="text-sm text-right">
                          <div className={`${
                            block.gasUsed > gasTarget
                              ? "text-emerald-500"
                              : block.gasUsed < gasTarget
                                ? "text-red-500"
                                : ""
                          }`}>
                            {commify(block.gasUsed.toString())} ({gasUsedPercent}%)
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Base Fee</span>
                        <span className="text-sm text-gray-800">
                          {(Number(block.baseFeePerGas ?? 0n) / 1_000_000_000).toFixed(2)} Gwei
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {blocks.length > 0 && (
                <div className="flex justify-center mt-6 px-3 lg:px-9">
                  <SimplePageControl
                    pageNumber={pageNumber}
                    pageSize={BLOCKS_PER_PAGE}
                    total={totalBlocks}
                  />
                </div>
              )}
            </>
          )}

          {/* SEO Content Section */}
          <div className="mt-12 px-3 lg:px-9">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Ethereum Blocks</h2>
            <div className="h-96 overflow-y-auto border border-gray-200 rounded-lg p-6 bg-gray-50 dark:bg-gray-900">
              <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300 space-y-4">
                <p>The history of Ethereum starts with its creator, Vitalik Buterin. He proposed Ethereum in 2013 and launched it in 2015 as an open-source blockchain platform that extends beyond simple transactions to enable smart contracts and decentralized applications without any central authority or intermediary involvement.</p>

                <p>The Ethereum blockchain is a digital ledger of all transactions and smart contract executions that have ever been processed on the network. It is constantly growing as "completed" blocks are added to it with a new set of recordings. Each block contains a cryptographic hash of the previous block, a timestamp, transaction data, and state changes resulting from smart contract execution.</p>

                <p>Ethereum users utilize blockchain explorers to track ETH transactions and smart contract interactions when they send or receive funds. Following Ethereum's transition to Proof of Stake (The Merge) in September 2022, the network became more energy-efficient while maintaining its position as the leading smart contract platform.</p>

                <p>The ETH blockchain is maintained by a network of validators who stake their ETH to participate in block production and validation. These validators are distributed globally, ensuring the network remains decentralized and secure. Unlike Bitcoin's fixed supply, Ethereum's supply is dynamic, with new ETH issued as rewards and ETH burned through the EIP-1559 fee mechanism.</p>

                <p>The Ethereum blockchain is considered highly secure because of its decentralized nature and cryptographic foundations. Transactions and smart contract executions are validated by the network's consensus mechanism, and once confirmed, they become an immutable part of the blockchain. This makes it virtually impossible to tamper with the Ethereum blockchain without detection.</p>

                <p>Since the implementation of EIP-1559 in August 2021, Ethereum uses a dynamic fee market with base fees that are burned, reducing the overall supply of ETH. Validators receive priority fees (tips) and block rewards for proposing and attesting to blocks. New blocks are produced approximately every 12 seconds, a significant improvement from the previous ~13-second block time under Proof of Work.</p>

                <h3 className="text-lg font-semibold mt-6 mb-3 text-gray-900 dark:text-gray-100">Ethereum Last Block</h3>
                <p>Ethereum block explorers can be used to view information about the most recent block produced on the Ethereum network. This block is also known as the "last block" or "latest block" and represents the current head of the blockchain. To view information about the last block, simply navigate to the blocks section on Ethscan, where you can see real-time updates of newly produced blocks including their validators, gas usage, and transaction counts.</p>

                <h3 className="text-lg font-semibold mt-6 mb-3 text-gray-900 dark:text-gray-100">The ETH Explorer</h3>
                <p>Details about blocks including Block Height, Validator, Gas Used, Base Fee, and Burnt Fees can be viewed publicly on the ETH blockchain explorer. An explorer is a tool that allows you to search and browse the Ethereum blockchain for transactions, addresses, blocks, and smart contracts. It contains a search bar where you can input the information you're looking for, and it returns the results in real-time, providing transparency into all network activities including DeFi transactions, NFT transfers, and smart contract interactions.</p>
              </div>
            </div>
          </div>
        </div>
      </StandardFrame>
    </div>
  );
};

export default RecentBlocks;