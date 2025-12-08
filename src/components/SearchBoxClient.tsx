"use client";

import { FC, useRef, useState, FormEvent, ChangeEvent } from "react";
import { useNavigate } from "react-router";
import { parseSearch } from "../search/search";

/**
 * Client-side search box component that hydrates the SSR placeholder.
 * Provides full search functionality after hydration.
 */
const SearchBoxClient: FC<{ className?: string }> = ({ className = "" }) => {
  const [searchString, setSearchString] = useState<string>("");
  const [canSubmit, setCanSubmit] = useState<boolean>(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const searchTerm = e.target.value.trim();
    setCanSubmit(searchTerm.length > 0);
    setSearchString(searchTerm);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) {
      return;
    }

    const redir = parseSearch(searchString);
    if (redir !== undefined) {
      if (searchRef.current) {
        searchRef.current.value = "";
      }
      navigate(redir);
    }
  };

  return (
    <form
      className={`flex ${className}`}
      onSubmit={handleSubmit}
      autoComplete="off"
      spellCheck={false}
    >
      <input
        className="flex-1 min-w-0 rounded-l border-b border-l border-t px-2 py-1 text-sm focus:outline-none"
        type="text"
        placeholder="Search by address / txn hash / block / ENS"
        onChange={handleChange}
        ref={searchRef}
      />
      <button
        className="rounded-r border-b border-r border-t bg-skin-button-fill px-2 py-1 text-sm text-skin-button hover:bg-skin-button-hover-fill focus:outline-none"
        type="submit"
      >
        Search
      </button>
    </form>
  );
};

export default SearchBoxClient;
