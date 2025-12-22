import React, { FC, memo } from "react";
import { Link } from "react-router";
import Copy from "../../components/Copy";

type LogEntrySSRProps = {
  log: {
    index: number;
    address: string;
    topics: readonly string[];
    data: string;
  };
};

/**
 * SSR-safe LogEntry component.
 * Shows basic log information without requiring RuntimeContext.
 * Decoded parameters require RuntimeContext and are shown on client-side.
 */
const LogEntrySSR: FC<LogEntrySSRProps> = ({ log }) => {
  return (
    <div className="flex space-x-10 py-5 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      <div>
        <span
          className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-500 dark:bg-emerald-900 dark:text-emerald-300"
          id={log.index.toString()}
        >
          {log.index}
        </span>
      </div>
      <div className="w-full space-y-2">
        {/* Address */}
        <div className="flex flex-col sm:flex-row sm:space-x-4">
          <span className="font-bold text-sm text-gray-600 dark:text-gray-400 sm:w-24">Address</span>
          <div className="flex items-baseline space-x-2">
            <Link
              className="text-link-blue hover:text-link-blue-hover font-mono text-sm break-all"
              to={`/address/${log.address}`}
            >
              {log.address}
            </Link>
            <Copy value={log.address} />
          </div>
        </div>

        {/* Topics */}
        <div className="flex flex-col sm:flex-row sm:space-x-4">
          <span className="font-bold text-sm text-gray-600 dark:text-gray-400 sm:w-24">Topics</span>
          <div className="flex-1 space-y-1">
            {log.topics.map((topic, i) => (
              <div key={i} className="flex items-baseline space-x-2">
                <span className="text-xs text-gray-400">[{i}]</span>
                <span className="font-mono text-sm break-all text-gray-700 dark:text-gray-300">
                  {topic}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Data */}
        <div className="flex flex-col sm:flex-row sm:space-x-4">
          <span className="font-bold text-sm text-gray-600 dark:text-gray-400 sm:w-24">Data</span>
          <div className="flex-1">
            {log.data === "0x" ? (
              <span className="text-gray-400 text-sm">No data</span>
            ) : (
              <div className="max-h-32 overflow-auto rounded bg-gray-50 dark:bg-gray-800 p-2 font-mono text-xs break-all text-gray-700 dark:text-gray-300">
                {log.data}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(LogEntrySSR);
