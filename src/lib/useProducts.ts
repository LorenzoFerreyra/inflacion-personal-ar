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
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  products: Product[];
  totalCount: number;
  categories: Category[];
  loading: boolean;
}

export function useProducts(): UseProductsReturn {
  const { period } = usePeriod();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => data && setCategories(data))
      .catch(() => {});
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: debouncedSearch,
        category,
        dias: String(PERIODS[period].dias),
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      const res = await fetch(`/api/products?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProducts(data.products);
      setTotalCount(data.total);
    } catch {
      setProducts([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, category, period, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, category, period]);

  return { search, setSearch, category, setCategory, page, setPage, products, totalCount, categories, loading };
}
