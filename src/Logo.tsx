import { FC, memo, useContext } from "react";
import ETHScanLogoSingle from "./ethscanlogosingle.png";
import ETHScanLogoSingleText from "./LogoText.png";
import ETHScanLogoSingleTextDark from "./LogoTextDark.png";
import { RuntimeContext } from "./useRuntime";

const Logo: FC = () => {
  const { config } = useContext(RuntimeContext);

  return (
    <div className="flex cursor-default items-center justify-center space-x-4 font-title text-6xl font-bol">
      <img
        className="rounded-full"
        src={ETHScanLogoSingle}
        width={80}
        height={80}
        alt="Ethscan logo"
        title="Ethscan logo"
      />
      <img
        className="logo-text-dark"
        src={ETHScanLogoSingleText}
        width={160}
        alt="Ethscan logo text"
        title="Ethscan logo text"
      />
      <img
        className="logo-text-white"
        src={ETHScanLogoSingleTextDark}
        width={160}
        alt="Ethscan logo text"
        title="Ethscan logo text"
      />
    </div>
  );
};

export default memo(Logo);
