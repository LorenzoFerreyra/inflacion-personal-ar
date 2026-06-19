"use client";

import { useState, useEffect, useCallback } from "react";
import { Product, Category } from "@/lib/types";
import { PERIODS, PAGE_SIZE } from "@/lib/constants";
import { usePeriod } from "@/lib/PeriodContext";
import { useDebounce } from "@/lib/useDebounce";

interface UseProductsReturn {
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  category: string;
  setCategory: React.Dispatch<React.SetStateAction<string>>;
  cadena: string;
  setCadena: React.Dispatch<React.SetStateAction<string>>;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  products: Product[];
  totalCount: number;
  categories: Category[];
  chains: string[];
  loading: boolean;
  categoriesError: boolean;
  chainsError: boolean;
}

export function useProducts(): UseProductsReturn {
  const { period } = usePeriod();

  const [search, setSearchRaw] = useState("");
  const [category, setCategoryRaw] = useState("");
  const [cadena, setCadenaRaw] = useState("");
  const [page, setPageRaw] = useState(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [chains, setChains] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState(false);
  const [chainsError, setChainsError] = useState(false);

  // Reset page when period changes.
  useEffect(() => {
    setPageRaw(1);
  }, [period]);

  // Wrapped setters: changing a filter resets page to 1.
  const setSearch = useCallback((val: React.SetStateAction<string>) => {
    setSearchRaw(val);
    setPageRaw(1);
  }, []);

  const setCategory = useCallback((val: React.SetStateAction<string>) => {
    setCategoryRaw(val);
    setPageRaw(1);
  }, []);

  const setCadena = useCallback((val: React.SetStateAction<string>) => {
    setCadenaRaw(val);
    setPageRaw(1);
  }, []);

  const setPage = useCallback((val: React.SetStateAction<number>) => {
    setPageRaw(val);
  }, []);

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    const abort = new AbortController();

    fetch("/api/categories", { signal: abort.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setCategories(data);
        setCategoriesError(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Failed to load categories:", err);
          setCategoriesError(true);
        }
      });

    fetch("/api/chains-list", { signal: abort.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setChains(data);
        setChainsError(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Failed to load chains:", err);
          setChainsError(true);
        }
      });

    return () => abort.abort();
  }, []);

  useEffect(() => {
    const abort = new AbortController();

    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          search: debouncedSearch,
          category,
          cadena,
          dias: String(PERIODS[period].dias),
          page: String(page),
          pageSize: String(PAGE_SIZE),
        });
        const res = await fetch(`/api/products?${params}`, {
          signal: abort.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setProducts(data.products);
        setTotalCount(data.total);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setProducts([]);
          setTotalCount(0);
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => abort.abort();
  }, [debouncedSearch, category, cadena, period, page]);

  return {
    search,
    setSearch,
    category,
    setCategory,
    cadena,
    setCadena,
    page,
    setPage,
    products,
    totalCount,
    categories,
    chains,
    loading,
    categoriesError,
    chainsError,
  };
}
