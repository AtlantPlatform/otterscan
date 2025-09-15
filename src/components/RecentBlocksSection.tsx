import { faAngleRight, faCube, faGasPump } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { formatEther } from "ethers";
import React, { useContext } from "react";
import { NavLink } from "react-router";
import { useChainInfo } from "../useChainInfo";
import { useRecentBlocks } from "../useRecentData";
import { RuntimeContext } from "../useRuntime";
import { commify } from "../utils/utils";
import DecoratedAddressLink from "../execution/components/DecoratedAddressLink";
import BlockLink from "./BlockLink";

const RecentBlocksSection: React.FC = () => {
  const { provider } = useContext(RuntimeContext);
  const recentBlocks = useRecentBlocks(provider, 5);
  const {
    nativeCurrency: { symbol },
  } = useChainInfo();

  if (recentBlocks.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2">
          <FontAwesomeIcon icon={faCube} className="text-gray-500" />
          <span>Latest Blocks</span>
        </h2>
        <div className="text-gray-500 text-center py-8">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center mb-4">
        <h2 className="text-lg font-semibold flex items-center space-x-2">
          <FontAwesomeIcon icon={faCube} className="text-gray-500" />
          <span>Latest Blocks</span>
        </h2>
      </div>
      
      {/* Desktop Table */}
      <div className="hidden sm:block overflow-x-scroll">
        <table className="w-full table-auto border-gray-200 px-2 py-2 text-left text-sm [&>*>tr]:items-baseline">
          <thead>
            <tr className="bg-gray-100 text-gray-500 [&>th]:truncate [&>th:first-child]:pl-2 [&>th:last-child]:pr-2 [&>th]:px-1 [&>th]:py-2">
              <th>Block</th>
              <th className="w-36">Age</th>
              <th>Txns</th>
              <th>Miner</th>
              <th>Gas Used</th>
              <th>Gas Limit</th>
              <th>Reward</th>
            </tr>
          </thead>
          <tbody className="[&>tr>td]:truncate [&>tr>td]:px-1 [&>tr>td:first-child]:pl-2 [&>tr>td:last-child]:pr-2 [&>tr>td]:py-3 [&>tr]:border-t [&>tr]:border-gray-200 hover:[&>tr]:bg-skin-table-hover">
            {recentBlocks.map((block) => {
              const gasUsedPercent = block.gasLimit ? (Number(block.gasUsed) * 100 / Number(block.gasLimit)).toFixed(2) : "0";
              const blockReward = block.blockReward + block.feeReward;
              const timestamp = new Date(block.timestamp * 1000);
              const formattedTime = timestamp.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
              });
              
              return (
                <tr key={block.hash}>
                  <td>
                    <BlockLink blockTag={block.number} />
                  </td>
                  <td className="text-gray-600" title={formattedTime}>
                    {formattedTime}
                  </td>
                  <td>
                    <span className="text-blue-600">{commify(block.transactionCount)}</span>
                  </td>
                  <td>
                    <DecoratedAddressLink address={block.miner} />
                  </td>
                  <td>
                    <div className="flex items-center space-x-1">
                      <span>{commify(block.gasUsed.toString())}</span>
                      <span className="text-xs text-gray-500">({gasUsedPercent}%)</span>
                    </div>
                  </td>
                  <td className="py-3 text-gray-600">
                    {commify(block.gasLimit.toString())}
                  </td>
                  <td>
                    {formatEther(blockReward).substring(0, 8)} {symbol}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Mobile Cards */}
      <div className="block sm:hidden space-y-3">
        {recentBlocks.map((block) => {
          const gasUsedPercent = block.gasLimit ? (Number(block.gasUsed) * 100 / Number(block.gasLimit)).toFixed(2) : "0";
          const blockReward = block.blockReward + block.feeReward;
          const timestamp = new Date(block.timestamp * 1000);
          const formattedTime = timestamp.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          });
          
          return (
            <div key={block.hash} className="bg-gray-50 rounded p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-700">Block</span>
                <BlockLink blockTag={block.number} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Age</span>
                <span className="text-sm text-gray-800" title={formattedTime}>{formattedTime}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Txns</span>
                <span className="text-sm text-blue-600">{commify(block.transactionCount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Gas Used</span>
                <div className="text-sm text-gray-800">
                  <span>{commify(block.gasUsed.toString())}</span>
                  <span className="text-xs text-gray-500 ml-1">({gasUsedPercent}%)</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Reward</span>
                <span className="text-sm text-gray-800">{formatEther(blockReward).substring(0, 8)} {symbol}</span>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* View More Button at Bottom */}
      <div className="flex justify-center mt-4">
        <NavLink
          to="/blocks/recent"
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1 px-4 py-2 border border-blue-600 rounded hover:bg-blue-50"
        >
          <span>View more blocks</span>
          <FontAwesomeIcon icon={faAngleRight} className="text-xs" />
        </NavLink>
      </div>
    </div>
  );
};

export default RecentBlocksSection;