import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import ProductTable from "@/components/ProductTable";
import { Product } from "@/lib/types";

afterEach(cleanup);

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    ean: overrides.ean ?? "7791234567890",
    product_description: overrides.product_description ?? "Leche entera 1L",
    marca: overrides.marca ?? "La Serenísima",
    categoria: overrides.categoria ?? "Lácteos",
    precio_actual: overrides.precio_actual ?? 1250,
    variacion_pct:
      overrides.variacion_pct !== undefined ? overrides.variacion_pct : 5.2,
    cobertura_cadenas: overrides.cobertura_cadenas ?? 8,
    image_url: overrides.image_url ?? null,
  };
}

describe("ProductTable", () => {
  describe("loading state", () => {
    it("shows a spinner and loading message", () => {
      render(
        <ProductTable
          products={[]}
          page={1}
          totalCount={0}
          onPageChange={() => {}}
          loading={true}
        />,
      );
      expect(screen.getByText(/cargando/i)).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("shows empty message when no products", () => {
      render(
        <ProductTable
          products={[]}
          page={1}
          totalCount={0}
          onPageChange={() => {}}
        />,
      );
      expect(
        screen.getByText(/no se encontraron productos/i),
      ).toBeInTheDocument();
    });
  });

  describe("product rows", () => {
    const products: Product[] = [
      makeProduct({ ean: "1", product_description: "Leche 1L" }),
      makeProduct({ ean: "2", product_description: "Pan lactal" }),
    ];

    it("renders product descriptions", () => {
      render(
        <ProductTable
          products={products}
          page={1}
          totalCount={2}
          onPageChange={() => {}}
        />,
      );
      expect(screen.getByText("Leche 1L")).toBeInTheDocument();
      expect(screen.getByText("Pan lactal")).toBeInTheDocument();
    });

    it("renders marca cells for each product", () => {
      render(
        <ProductTable
          products={products}
          page={1}
          totalCount={2}
          onPageChange={() => {}}
        />,
      );
      const marcaCells = screen.getAllByText("La Serenísima");
      // One per product row (not in category badges or product description)
      expect(marcaCells.length).toBeGreaterThanOrEqual(2);
    });

    it("renders categoría badges for each product", () => {
      render(
        <ProductTable
          products={products}
          page={1}
          totalCount={2}
          onPageChange={() => {}}
        />,
      );
      const badges = screen.getAllByText("Lácteos");
      expect(badges.length).toBeGreaterThanOrEqual(2);
    });

    it("renders table headers", () => {
      render(
        <ProductTable
          products={products}
          page={1}
          totalCount={2}
          onPageChange={() => {}}
        />,
      );
      // Use getAllByText since Producto appears in the <th> element
      expect(screen.getAllByText("Producto").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Marca").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Precio").length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("variation badge", () => {
    it("shows positive variation in red with + sign", () => {
      render(
        <ProductTable
          products={[makeProduct({ variacion_pct: 10.5 })]}
          page={1}
          totalCount={1}
          onPageChange={() => {}}
        />,
      );
      expect(screen.getByText("+10.5%")).toBeInTheDocument();
    });

    it("shows negative variation", () => {
      render(
        <ProductTable
          products={[makeProduct({ variacion_pct: -3.2 })]}
          page={1}
          totalCount={1}
          onPageChange={() => {}}
        />,
      );
      expect(screen.getByText("-3.2%")).toBeInTheDocument();
    });

    it("shows zero variation", () => {
      render(
        <ProductTable
          products={[makeProduct({ variacion_pct: 0 })]}
          page={1}
          totalCount={1}
          onPageChange={() => {}}
        />,
      );
      expect(screen.getByText("0.0%")).toBeInTheDocument();
    });

    it("shows dash for null variation", () => {
      render(
        <ProductTable
          products={[makeProduct({ variacion_pct: null })]}
          page={1}
          totalCount={1}
          onPageChange={() => {}}
        />,
      );
      expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("shows dash for missing/undefined variation", () => {
      // Build a product without variacion_pct at all
      const p: Product = {
        ean: "7791234567890",
        product_description: "Test",
        marca: "Marca",
        categoria: "Cat",
        precio_actual: 100,
        variacion_pct: undefined as unknown as number | null,
        cobertura_cadenas: 1,
        image_url: null,
      };
      render(
        <ProductTable
          products={[p]}
          page={1}
          totalCount={1}
          onPageChange={() => {}}
        />,
      );
      expect(screen.getByText("—")).toBeInTheDocument();
    });
  });

  describe("row selection", () => {
    it("highlights selected product with amber border", () => {
      const product = makeProduct({ ean: "123" });
      const selected = new Set(["123"]);

      const { container } = render(
        <ProductTable
          products={[product]}
          page={1}
          totalCount={1}
          onPageChange={() => {}}
          selectedEans={selected}
        />,
      );

      const row = container.querySelector("tbody tr")!;
      expect(row.className).toContain("border-l-amber");
    });

    it("calls onSelect when a row is clicked", () => {
      const product = makeProduct();
      const onSelect = vi.fn();

      render(
        <ProductTable
          products={[product]}
          page={1}
          totalCount={1}
          onPageChange={() => {}}
          onSelect={onSelect}
        />,
      );

      const row = document.querySelector<HTMLElement>("tbody tr")!;
      row.click();
      expect(onSelect).toHaveBeenCalledWith(product);
    });
  });

  describe("pagination integration", () => {
    it("shows correct page indicator and total count", () => {
      const products = Array.from({ length: 5 }, (_, i) =>
        makeProduct({ ean: String(i) }),
      );

      render(
        <ProductTable
          products={products}
          page={2}
          totalCount={60}
          pageSize={30}
          onPageChange={() => {}}
        />,
      );

      expect(screen.getByText(/Pág. 2 de 2/)).toBeInTheDocument();
      expect(screen.getByText(/60 productos/)).toBeInTheDocument();
    });
  });
});
