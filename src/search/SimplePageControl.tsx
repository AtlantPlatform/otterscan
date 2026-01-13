import { FC, memo } from "react";
import PageButton from "./PageButton";

type SimplePageControlProps = {
  pageNumber: number;
  pageSize: number;
  total: number;
};

const SimplePageControl: FC<SimplePageControlProps> = ({ pageNumber, pageSize, total }) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const isFirst = pageNumber === 1;
  const isLast = pageNumber === totalPages;

  return (
    <div className="flex items-baseline space-x-2 text-sm">
      <PageButton goToPage={pageNumber - 1} disabled={isFirst}>
        {"<"}
      </PageButton>
      <PageButton goToPage={pageNumber + 1} disabled={isLast}>
        {">"}
      </PageButton>
    </div>
  );
};

export default memo(SimplePageControl);