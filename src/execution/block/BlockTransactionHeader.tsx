import { BlockTag } from "ethers";
import React, { useContext } from "react";
import BlockLink from "../../components/BlockLink";
import NavBlock from "../../components/NavBlock";
import StandardSubtitle from "../../components/StandardSubtitle";
import { blockTxsURL } from "../../url";
import { useLatestBlockNumber } from "../../useLatestBlock";
import { RuntimeContext } from "../../useRuntime";

type BlockTransactionHeaderProps = {
  blockTag: BlockTag;
};

const BlockTransactionHeader: React.FC<BlockTransactionHeaderProps> = ({
  blockTag,
}) => {
  const { provider } = useContext(RuntimeContext);
  const latestBlockNumber = useLatestBlockNumber(provider);

  return (
    <StandardSubtitle>
      <h1 className="flex flex-col sm:flex-row sm:items-baseline sm:space-x-1 space-y-1 sm:space-y-0">
        <span>Transactions</span>
        <div className="flex items-center space-x-1 text-sm text-gray-500">
          <span>For Block</span>
          <BlockLink blockTag={blockTag} />
          <NavBlock
            entityNum={blockTag as number}
            latestEntityNum={latestBlockNumber}
            urlBuilder={blockTxsURL}
          />
        </div>
      </h1>
    </StandardSubtitle>
  );
};

export default React.memo(BlockTransactionHeader);
