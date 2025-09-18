import { FC, PropsWithChildren } from "react";

type ContentFrameProps = {
  tabs?: boolean;
  isLoading?: boolean;
};

const ContentFrame: FC<PropsWithChildren<ContentFrameProps>> = ({
  tabs,
  isLoading,
  children,
}) => {
  return tabs ? (
    <div className="mx-3 lg:mx-9">
      <div
        className={`divide-y rounded-b-lg border bg-white px-3 ${
          isLoading && "opacity-50 transition-opacity"
        }`}
      >
        {children}
      </div>
    </div>
  ) : (
    <div className="mx-3 lg:mx-9">
      <div
        className={`divide-y rounded-lg border bg-white px-3 ${
          isLoading && "opacity-50 transition-opacity"
        }`}
      >
        {children}
      </div>
    </div>
  );
};

export default ContentFrame;
