import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import StandardFrame from "../../components/StandardFrame";
import { useSlot } from "../../useConsensus";
import SlotNotFound from "./SlotNotFound";
import {usePageTitle} from '../../useTitle';
import {Helmet} from 'react-helmet-async';

const SlotByBlockRoot: React.FC = () => {
  const { blockRoot } = useParams();
  if (blockRoot === undefined) {
    throw new Error("SlotByBlockRoot: blockRoot is undefined");
  }
  const { slot, error, isLoading } = useSlot(blockRoot);
  const navigate = useNavigate();
  useEffect(() => {
    if (slot && slot.data.message.slot) {
      navigate("/slot/" + slot.data.message.slot, {
        replace: true,
      });
    }
  }, [slot]);

  usePageTitle(` Slot Details for Block Root ${slot && slot.data.message.slot ? slot.data.message.slot : ''}`);
  const description = `View slot details for Ethereum block root ${slot && slot.data.message.slot ? slot.data.message.slot : ''}, including proposer, timestamp, and block hash.`

  return (
    <StandardFrame>
      <Helmet>
        <meta name="description" content={description}/>
      </Helmet>
      {(!slot && !isLoading) || error ? (
        <SlotNotFound slot={blockRoot} />
      ) : (
        <></>
      )}
    </StandardFrame>
  );
};

export default React.memo(SlotByBlockRoot);
