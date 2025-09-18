import {
  faCheckCircle,
  faTimesCircle,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { formatUnits } from "ethers";
import React, { FC, memo, useContext, useState } from "react";
import BlockConfirmations from "../../components/BlockConfirmations";
import BlockLink from "../../components/BlockLink";
import ContentFrame from "../../components/ContentFrame";
import Copy from "../../components/Copy";
import ExpanderSwitch from "../../components/ExpanderSwitch";
import ExternalLink from "../../components/ExternalLink";
import { feePreset } from "../../components/FiatValue";
import FormattedBalance from "../../components/FormattedBalance";
import HelpButton from "../../components/HelpButton";
import InfoRow from "../../components/InfoRow";
import InternalTransactionOperation from "../../components/InternalTransactionOperation";
import MethodName from "../../components/MethodName";
import ModeTab from "../../components/ModeTab";
import NativeTokenAmountAndFiat from "../../components/NativeTokenAmountAndFiat";
import NativeTokenPrice from "../../components/NativeTokenPrice";
import NavBlock from "../../components/NavBlock";
import Nonce from "../../components/Nonce";
import PercentageBar from "../../components/PercentageBar";
import PercentagePosition from "../../components/PercentagePosition";
import RelativePosition from "../../components/RelativePosition";
import StandardTextarea from "../../components/StandardTextarea";
import Timestamp from "../../components/Timestamp";
import TransactionType from "../../components/TransactionType";
import SolidityLogo from "../../sourcify/SolidityLogo";
import {
  useError,
  useSourcifyMetadata,
  useTransactionDescription as useSourcifyTransactionDescription,
} from "../../sourcify/useSourcify";
import { TransactionData } from "../../types";
import { blockTxURL } from "../../url";
import {
  extract4Bytes,
  use4Bytes,
  useTransactionDescription,
} from "../../use4Bytes";
import { useChainInfo } from "../../useChainInfo";
import {
  useBlockDataFromTransaction,
  useSendsToMiner,
  useTokenTransfers,
  useTransactionError,
} from "../../useErigonHooks";
import { RuntimeContext } from "../../useRuntime";
import { commify } from "../../utils/utils";
import TransactionAddressWithCopy from "../components/TransactionAddressWithCopy";
import { calculateFee } from "../feeCalc";
import { isOptimisticChain } from "../op-tx-calculation";
import NavNonce from "./NavNonce";
import RewardSplit from "./RewardSplit";
import TokenTransferItem from "./TokenTransferItem";
import DecodedParamsTable from "./decoder/DecodedParamsTable";
import InputDecoder from "./decoder/InputDecoder";
import {Helmet} from 'react-helmet-async';
import {formatValue} from '../../components/formatter';

type DetailsProps = {
  txData: TransactionData;
};

const Details: FC<DetailsProps> = ({ txData }) => {
  const { provider } = useContext(RuntimeContext);
  const block = useBlockDataFromTransaction(provider, txData);

  const hasEIP1559 =
    block?.baseFeePerGas !== undefined && block?.baseFeePerGas !== null;

  const fourBytes =
    txData.to !== null ? (extract4Bytes(txData.data) ?? "0x") : "0x";
  const fourBytesEntry = use4Bytes(fourBytes, txData.to ?? undefined);
  const fourBytesTxDesc = useTransactionDescription(
    fourBytesEntry,
    txData.data,
    txData.value,
  );

  const [sendsEthToMiner, internalOps] = useSendsToMiner(
    provider,
    txData.confirmedData ? txData.transactionHash : undefined,
    block?.miner,
  );

  const tokenTransfers = useTokenTransfers(txData);

  const match = useSourcifyMetadata(txData?.to, provider._network.chainId);
  const metadata = match?.metadata;

  const txDesc = useSourcifyTransactionDescription(metadata, txData);
  const userDoc = metadata?.output.userdoc;
  const devDoc = metadata?.output.devdoc;
  const resolvedTxDesc = txDesc ?? fourBytesTxDesc;
  const userMethod = txDesc ? userDoc?.methods[txDesc.signature] : undefined;
  const devMethod = txDesc ? devDoc?.methods[txDesc.signature] : undefined;

  const {
    nativeCurrency: { name, symbol },
  } = useChainInfo();

  const [errorMsg, outputData, errorType] = useTransactionError(
    provider,
    txData.transactionHash,
  );
  const errorDescription = useError(
    metadata,
    errorType === "custom" ? outputData : undefined,
  );
  const userError = errorDescription
    ? userDoc?.errors?.[errorDescription.signature]?.[0]
    : undefined;
  const devError = errorDescription
    ? devDoc?.errors?.[errorDescription.signature]?.[0]
    : undefined;
  const [expanded, setExpanded] = useState<boolean>(false);
  const [showFunctionHelp, setShowFunctionHelp] = useState<boolean>(false);
  const isOptimistic = isOptimisticChain(provider._network.chainId);

  const { totalFees } = calculateFee(txData, block);


  const description = `Overview of Ethereum transaction ${txData ? txData.transactionHash : ''}, including sender, recipient, value, gas price, and confirmations.`

  const {
    nativeCurrency: { decimals },
  } = useChainInfo();
  const formattedValue = formatValue(txData.value || 0, decimals);
  const formattedGasPriceValue = formatValue(txData.gasPrice || 0, 18);

  const payloadSchemaWebPage = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebPage",
      "url": `https://ethscan.org/tx/${txData ? txData.transactionHash : ''}`,
      "name": `Ethereum Transaction ${txData ? txData.transactionHash.substring(0, 10) : ''}...`,
      "description": `Ethereum transaction details including sender, recipient, value of ${formattedValue} ETH and gas information`,
      "mainEntity": {
        "@type": "DigitalDocument",
        "identifier": `${txData ? txData.transactionHash : ''}`,
        "name": `Transaction ${txData ? txData.transactionHash.substring(0, 10) : ''}...`,
        "description": `Transfer of ${formattedValue} ETH on Ethereum blockchain`
      }
    }
  )

  const payloadSchemaFaqPage = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Why does this transaction include multiple internal calls and how are they decoded?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Internal calls result from smart contract executions that trigger additional calls or value transfers. Ethscan uses trace_transaction data to visualize these operations, decoding input/output using verified contract ABIs when available. If the contract is unverified, decoding may be limited to function signatures and raw calldata."
          }
        },
        {
          "@type": "Question",
          "name": "What factors influence the effective gas price shown, and how does it differ from the base fee?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The effective gas price reflects the total amount paid per unit of gas and includes both the base fee (as dictated by EIP-1559) and the priority fee (tip to miners). Variability in base fee depends on network congestion at the time of inclusion. Ethscan displays all components: baseFeePerGas, maxFeePerGas, and maxPriorityFeePerGas."
          }
        },
        {
          "@type": "Question",
          "name": "How can I determine whether a transaction interacted with a proxy contract or an implementation contract?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Ethscan detects common proxy patterns (e.g., OpenZeppelin Transparent Proxy, EIP-1967) and flags transactions accordingly. Users can inspect the to and input fields alongside delegatecall traces to confirm if the call was routed through a proxy. When available, contract verification metadata is used to label implementation addresses."
          }
        }
      ]
    }
  )

  return (
    <>
      <ContentFrame tabs>
        <Helmet>
          <meta name="description" content={description}/>
          <script type="application/ld+json">{payloadSchemaWebPage}</script>
          <script type="application/ld+json">{payloadSchemaFaqPage}</script>
        </Helmet>
        <InfoRow title="Transaction Hash">
          <div className="flex items-baseline space-x-2 break-all">
          <span className="font-hash" data-test="tx-hash">
            {txData.transactionHash}
          </span>
            <div>
              <Copy value={txData.transactionHash}/>
            </div>
          </div>
        </InfoRow>
        <InfoRow title="Status">
          {txData.confirmedData === undefined ? (
            <span className="italic text-gray-400">Pending</span>
          ) : txData.confirmedData.status ? (
            <span
              className="flex w-min items-baseline space-x-1 rounded-lg bg-emerald-50 px-3 py-1 text-xs text-emerald-500">
            <FontAwesomeIcon
              className="self-center"
              icon={faCheckCircle}
              size="1x"
            />
            <span data-test="status">Success</span>
          </span>
          ) : (
            <>
              <div className="flex items-baseline space-x-1">
                <div className="flex items-baseline space-x-1 rounded-lg bg-red-50 px-3 py-1 text-xs text-red-500">
                  <FontAwesomeIcon
                    className="self-center"
                    icon={faTimesCircle}
                    size="1x"
                  />
                  <span>
                  {errorType === "string" && errorMsg && (
                    <>
                      Fail with revert message: '
                      <span className="font-bold underline">{errorMsg}</span>'
                    </>
                  )}
                    {errorType === "custom" && (
                      <>
                        Fail with custom error
                        {errorDescription && (
                          <>
                            {" '"}
                            <span className="font-code font-bold underline">
                            {errorDescription.name}
                          </span>
                            {"'"}
                          </>
                        )}
                      </>
                    )}
                    {errorType === "panic" && (
                      <>
                        <SolidityLogo/> Panic {errorMsg}{" "}
                        <ExternalLink
                          href="https://docs.soliditylang.org/en/latest/control-structures.html#panic-via-assert-and-error-via-require">
                          (docs)
                        </ExternalLink>
                      </>
                    )}
                </span>
                </div>
                {errorType === "custom" && (
                  <ExpanderSwitch expanded={expanded} setExpanded={setExpanded}/>
                )}
              </div>
              {expanded && (
                <TabGroup>
                  <TabList className="mb-1 mt-2 flex space-x-1">
                    <ModeTab disabled={!errorDescription}>Decoded</ModeTab>
                    <ModeTab>Raw</ModeTab>
                  </TabList>
                  <TabPanels>
                    <TabPanel>
                      {errorDescription === undefined ? (
                        <>Waiting for data...</>
                      ) : errorDescription === null ? (
                        <>Can't decode data</>
                      ) : errorDescription.args.length === 0 ? (
                        <>No parameters</>
                      ) : (
                        <DecodedParamsTable
                          args={errorDescription.args}
                          paramTypes={errorDescription.fragment.inputs}
                          hasParamNames
                          userMethod={userError}
                          devMethod={devError}
                        />
                      )}
                    </TabPanel>
                    <TabPanel>
                      <StandardTextarea value={outputData}/>
                    </TabPanel>
                  </TabPanels>
                </TabGroup>
              )}
            </>
          )}
        </InfoRow>
        {txData.confirmedData && (
          <>
            <InfoRow title="Block / Position">
              <div className="flex flex-wrap gap-y-2 items-baseline divide-x-2 divide-dotted divide-gray-300">
                <div className="flex items-baseline space-x-1">
                  <BlockLink blockTag={txData.confirmedData.blockNumber}/>
                  <BlockConfirmations
                    confirmations={txData.confirmedData.confirmations}
                  />
                </div>
                {block && (
                  <div className="ml-3 flex items-baseline space-x-2 pl-3">
                    <RelativePosition
                      pos={txData.confirmedData.transactionIndex}
                      total={block.transactionCount - 1}
                    />
                    <PercentagePosition
                      perc={
                        txData.confirmedData.transactionIndex /
                        (block.transactionCount - 1)
                      }
                    />
                    <div>
                      <NavBlock
                        entityNum={txData.confirmedData.transactionIndex}
                        latestEntityNum={block.transactionCount - 1}
                        urlBuilder={(txIndex: number) =>
                          blockTxURL(txData.confirmedData!.blockNumber, txIndex)
                        }
                        showFirstLink
                      />
                    </div>
                  </div>
                )}
              </div>
            </InfoRow>
            <InfoRow title="Timestamp">
              {block && <Timestamp value={block.timestamp}/>}
            </InfoRow>
          </>
        )}
        <InfoRow title="From / Nonce">
          <div className="flex flex-wrap gap-y-2 divide-x-2 divide-dotted divide-gray-300">
            <TransactionAddressWithCopy address={txData.from}/>
            <div className="ml-3 flex items-baseline pl-3">
              <Nonce value={txData.nonce}/>
              <NavNonce sender={txData.from} nonce={txData.nonce}/>
            </div>
          </div>
        </InfoRow>
        <InfoRow title={txData.to ? "Interacted With (To)" : "Contract Created"}>
          {txData.to ? (
            <TransactionAddressWithCopy address={txData.to} showCodeIndicator/>
          ) : txData.confirmedData === undefined ? (
            <span className="italic text-gray-400">
            Pending contract creation
          </span>
          ) : (
            <TransactionAddressWithCopy
              address={txData.confirmedData?.createdContractAddress!}
            />
          )}
          {internalOps && internalOps.length > 0 && (
            <div className="mt-2 space-y-1 overflow-x-auto">
              {internalOps.map((op, i) => (
                <InternalTransactionOperation
                  key={i}
                  txData={txData}
                  internalOp={op}
                />
              ))}
            </div>
          )}
        </InfoRow>
        {txData.to && (
          <InfoRow title="Transaction Action">
            <div className="flex space-x-1">
              <MethodName data={txData.data} to={txData.to}/>{" "}
              {(userMethod || devMethod) && (
                <HelpButton
                  checked={showFunctionHelp}
                  onChange={setShowFunctionHelp}
                />
              )}
            </div>
            {(userMethod || devMethod) && showFunctionHelp && (
              <div className="mt-1 text-gray-800">
                {userMethod && userMethod.notice && (
                  <div className="col-span-12 gap-x-2 pt-1 px-1 font-normal">
                    {userMethod.notice}
                  </div>
                )}
                {devMethod && devMethod.details && (
                  <div className="col-span-12 gap-x-2 pt-1 px-1 font-normal">
                  <span className="font-bold italic text-xs mr-2 select-none">
                    dev{" "}
                  </span>
                    {devMethod.details}
                  </div>
                )}
              </div>
            )}
          </InfoRow>
        )}
        {tokenTransfers && tokenTransfers.length > 0 && (
          <InfoRow title={`Tokens Transferred (${tokenTransfers.length})`}>
            {tokenTransfers.map((t, i) => (
              <TokenTransferItem key={i} t={t}/>
            ))}
          </InfoRow>
        )}
        <InfoRow title="Value">
          <NativeTokenAmountAndFiat
            value={txData.value}
            blockTag={txData.confirmedData?.blockNumber}
            {...feePreset}
          />
        </InfoRow>
        <InfoRow
          title={
            <>
              Type (
              <ExternalLink href="https://eips.ethereum.org/EIPS/eip-2718">
                EIP-2718
              </ExternalLink>
              )
            </>
          }
        >
          <TransactionType type={txData.type}/>
        </InfoRow>
        {(txData.type === 2 || txData.type === 3) && (
          <>
            <InfoRow title="Max Priority Fee Per Gas">
              <FormattedBalance
                value={txData.maxPriorityFeePerGas!}
                symbol={symbol}
              />{" "}
              (
              <FormattedBalance
                value={txData.maxPriorityFeePerGas!}
                decimals={9}
                symbol="Gwei"
              />
              )
            </InfoRow>
            <InfoRow title="Max Fee Per Gas">
              <FormattedBalance value={txData.maxFeePerGas!} symbol={symbol}/> (
              <FormattedBalance
                value={txData.maxFeePerGas!}
                decimals={9}
                symbol="Gwei"
              />
              )
            </InfoRow>
          </>
        )}
        {txData.gasPrice !== undefined && (
          <InfoRow title="Gas Price">
            <div className="flex items-baseline space-x-1">
            <span>
              <FormattedBalance value={txData.gasPrice} symbol={symbol}/> (
              <FormattedBalance
                value={txData.gasPrice}
                decimals={9}
                symbol="Gwei"
              />
              )
            </span>
              {sendsEthToMiner && (
                <span className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-500">
                Flashbots
              </span>
              )}
            </div>
          </InfoRow>
        )}
        {txData.confirmedData && (
          <>
            <InfoRow title="Gas Used / Limit">
              <div className="flex items-baseline space-x-3">
                <div>
                  <RelativePosition
                    pos={commify(formatUnits(txData.confirmedData.gasUsed, 0))}
                    total={commify(formatUnits(txData.gasLimit, 0))}
                  />
                </div>
                <PercentageBar
                  perc={
                    Number(
                      (txData.confirmedData.gasUsed * 10000n) / txData.gasLimit,
                    ) / 100
                  }
                />
              </div>
            </InfoRow>
            {txData.confirmedData &&
              txData.confirmedData.l1GasUsed !== undefined && (
                <InfoRow title="L1 Gas Used by Txn">
                  <span>{commify(txData.confirmedData.l1GasUsed)}</span>
                </InfoRow>
              )}
            {txData.confirmedData &&
              txData.confirmedData.l1FeeScalar !== undefined && (
                <InfoRow title="L1 Fee Scalar">
                  <span>{txData.confirmedData.l1FeeScalar}</span>
                </InfoRow>
              )}
            {txData.confirmedData &&
              txData.confirmedData.l1GasPrice !== undefined && (
                <InfoRow title="L1 Gas Price">
                  <div className="flex items-baseline space-x-1">
                  <span>
                    <FormattedBalance value={txData.confirmedData.l1GasPrice}/>{" "}
                    {symbol} (
                    <FormattedBalance
                      value={txData.confirmedData.l1GasPrice}
                      decimals={9}
                    />{" "}
                    Gwei)
                  </span>
                  </div>
                </InfoRow>
              )}
          </>
        )}
        {block && hasEIP1559 && (
          <InfoRow title="Block Base Fee">
            <FormattedBalance
              value={block.baseFeePerGas!}
              decimals={9}
              symbol="Gwei"
            />{" "}
            (
            <FormattedBalance
              value={block.baseFeePerGas!}
              decimals={0}
              symbol="wei"
            />
            )
          </InfoRow>
        )}
        {txData.maxFeePerBlobGas !== undefined && (
          <InfoRow title="Max Fee Per Blob Gas">
            <FormattedBalance value={txData.maxFeePerBlobGas!} symbol={symbol}/>{" "}
            (
            <FormattedBalance
              value={txData.maxFeePerBlobGas!}
              decimals={9}
              symbol="Gwei"
            />
            )
          </InfoRow>
        )}
        {txData.confirmedData !== undefined &&
          txData.confirmedData.blobGasPrice !== undefined && (
            <InfoRow title="Blob Gas Price">
              <div className="flex items-baseline space-x-1">
              <span>
                <FormattedBalance
                  value={txData.confirmedData.blobGasPrice}
                  symbol={symbol}
                />{" "}
                (
                <FormattedBalance
                  value={txData.confirmedData.blobGasPrice}
                  decimals={9}
                  symbol="Gwei"
                />
                )
              </span>
              </div>
            </InfoRow>
          )}
        {txData.blobVersionedHashes && (
          <InfoRow title="Blob Versioned Hashes">
            <div className="space-y-1">
              {txData.blobVersionedHashes.map(
                (blobVersionedHash: string, i: number) => (
                  <div key={i} className="flex items-baseline space-x-2">
                  <span className="font-hash" data-test="tx-hash">
                    {blobVersionedHash}
                  </span>
                    <Copy value={blobVersionedHash}/>
                  </div>
                ),
              )}
            </div>
          </InfoRow>
        )}
        {txData.confirmedData && (
          <>
            <InfoRow title="Transaction Fee">
              <div className="space-y-3">
                <div>
                  <NativeTokenAmountAndFiat
                    value={totalFees}
                    blockTag={txData.confirmedData.blockNumber}
                    {...feePreset}
                  />
                </div>
                {hasEIP1559 && (!isOptimistic || txData.type !== 126) && (
                  <RewardSplit txData={txData}/>
                )}
              </div>
            </InfoRow>
            <InfoRow title={`${name} Price`}>
              <NativeTokenPrice blockTag={txData.confirmedData.blockNumber}/>
            </InfoRow>
          </>
        )}
        <InfoRow title="Input Data">
          <InputDecoder
            fourBytes={fourBytes}
            resolvedTxDesc={resolvedTxDesc}
            hasParamNames={resolvedTxDesc === txDesc}
            data={txData.data}
            userMethod={userMethod}
            devMethod={devMethod}
          />
        </InfoRow>
      </ContentFrame>
      {/* SEO Summary Section */}
      <div className="px-3 lg:px-9 mt-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Transaction Summary</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Ethereum transaction {txData.transactionHash} {txData.confirmedData ?
              `was confirmed in block #${txData.confirmedData.blockNumber} with status ${txData.confirmedData.status ? 'success' : 'failed'}.
              The transaction was sent from ${txData.from} to ${txData.to || 'contract creation'} with a value of ${txData.value} wei.
              Gas used was ${txData.confirmedData.gasUsed} out of ${txData.gasLimit} gas limit, with a gas price of ${txData.gasPrice} wei.
              The transaction includes ${txData.confirmedData.logs?.length || 0} log events.` :
              'is pending confirmation.'}
          </p>
        </div>
      </div>
    </>
  );
};

export default memo(Details);
