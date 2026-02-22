"use client";

import { useState, useMemo, useEffect } from "react";
import { Download, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useWarehouseStore } from "@/hooks/use-store";
import { PageHeader } from "@/components/page-header";
import { exportToExcel } from "@/lib/excel";
import { toast } from "sonner";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export function AccountingPage() {
  const store = useWarehouseStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);


  const totalPurchaseCost = store.products.reduce(
    (acc, p) => acc + p.purchasePrice * p.quantity,
    0
  );
  const totalStockSaleValue = store.products.reduce(
    (acc, p) => acc + p.salePrice * p.quantity,
    0
  );
  const unrealizedProfit = totalStockSaleValue - totalPurchaseCost;
  const totalSoldQuantity = store.sales.reduce(
    (acc, s) => acc + s.quantity,
    0
  );

  // Inventory Table State
  const [invSortColumn, setInvSortColumn] = useState("name");
  const [invSortDirection, setInvSortDirection] = useState<"asc" | "desc">("asc");
  const [invCurrentPage, setInvCurrentPage] = useState(1);
  const invItemsPerPage = 10;

  // Sales Table State
  const [salesSortColumn, setSalesSortColumn] = useState("createdAt");
  const [salesSortDirection, setSalesSortDirection] = useState<"asc" | "desc">("desc");
  const [salesCurrentPage, setSalesCurrentPage] = useState(1);
  const salesItemsPerPage = 10;

  // Inventory Sorting Logic
  const sortedProducts = useMemo(() => {
    return [...store.products].sort((a, b) => {
      const aVal = a[invSortColumn as keyof typeof a];
      const bVal = b[invSortColumn as keyof typeof b];
      if (aVal === bVal) return 0;
      const order = invSortDirection === "asc" ? 1 : -1;
      return (aVal ?? "") < (bVal ?? "") ? -1 * order : 1 * order;
    });
  }, [store.products, invSortColumn, invSortDirection]);

  // Inventory Pagination Logic
  const invTotalPages = Math.ceil(sortedProducts.length / invItemsPerPage);
  const paginatedProducts = useMemo(() => {
    const start = (invCurrentPage - 1) * invItemsPerPage;
    return sortedProducts.slice(start, start + invItemsPerPage);
  }, [sortedProducts, invCurrentPage]);

  // Sales Sorting Logic
  const sortedSales = useMemo(() => {
    return [...store.sales].sort((a, b) => {
      const aVal = a[salesSortColumn as keyof typeof a];
      const bVal = b[salesSortColumn as keyof typeof b];
      if (aVal === bVal) return 0;
      const order = salesSortDirection === "asc" ? 1 : -1;
      return (aVal ?? "") < (bVal ?? "") ? -1 * order : 1 * order;
    });
  }, [store.sales, salesSortColumn, salesSortDirection]);

  // Sales Pagination Logic
  const salesTotalPages = Math.ceil(sortedSales.length / salesItemsPerPage);
  const paginatedSales = useMemo(() => {
    const start = (salesCurrentPage - 1) * salesItemsPerPage;
    return sortedSales.slice(start, start + salesItemsPerPage);
  }, [sortedSales, salesCurrentPage]);

  const handleInvSort = (column: string) => {
    if (invSortColumn === column) {
      setInvSortDirection(invSortDirection === "asc" ? "desc" : "asc");
    } else {
      setInvSortColumn(column);
      setInvSortDirection("asc");
    }
  };

  const handleSalesSort = (column: string) => {
    if (salesSortColumn === column) {
      setSalesSortDirection(salesSortDirection === "asc" ? "desc" : "asc");
    } else {
      setSalesSortColumn(column);
      setSalesSortDirection("asc");
    }
  };

  const getSortIcon = (currentCol: string, targetCol: string, direction: "asc" | "desc") => {
    if (currentCol !== targetCol) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return direction === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  const handleExportInventory = () => {
    if (store.products.length === 0) {
      toast.error("ექსპორტისთვის მონაცემები არ არის");
      return;
    }
    exportToExcel(
      store.products.map((p) => {
        const totalPurchase = p.purchasePrice * p.quantity;
        const totalSale = p.salePrice * p.quantity;
        const margin = totalSale - totalPurchase;
        return {
          name: p.name,
          category: p.category || "",
          quantity: p.quantity,
          purchasePrice: p.purchasePrice,
          salePrice: p.salePrice,
          totalPurchase,
          totalSale,
          margin,
          marginPercent:
            totalPurchase > 0
              ? ((margin / totalPurchase) * 100).toFixed(1) + "%"
              : "0%",
        };
      }),
      [
        { header: "პროდუქცია", key: "name" },
        { header: "კატეგორია", key: "category" },
        { header: "ნაშთი", key: "quantity" },
        { header: "შესყიდვის ფასი", key: "purchasePrice" },
        { header: "გაყიდვის ფასი", key: "salePrice" },
        { header: "მთლიანი შესყიდვა", key: "totalPurchase" },
        { header: "მთლიანი გაყიდვა", key: "totalSale" },
        { header: "მარჟა", key: "margin" },
        { header: "მარჟა %", key: "marginPercent" },
      ],
      "საწყობის_ანგარიშგება"
    );
    toast.success("ექსპორტი წარმატებით დასრულდა");
  };

  const handleExportSalesHistory = () => {
    if (store.sales.length === 0) {
      toast.error("ექსპორტისთვის მონაცემები არ არის");
      return;
    }
    exportToExcel(
      store.sales.map((s) => ({
        date: new Date(s.createdAt).toLocaleDateString("ka-GE"),
        productName: s.productName,
        category: s.category || "",
        quantity: s.quantity,
        salePrice: s.salePrice,
        totalAmount: s.totalAmount,
        client: s.client || "",
      })),
      [
        { header: "თარიღი", key: "date" },
        { header: "პროდუქცია", key: "productName" },
        { header: "კატეგორია", key: "category" },
        { header: "რაოდენობა", key: "quantity" },
        { header: "ფასი", key: "salePrice" },
        { header: "ჯამი", key: "totalAmount" },
        { header: "მყიდველი", key: "client" },
      ],
      "გაყიდვების_ისტორია"
    );
    toast.success("ექსპორტი წარმატებით დასრულდა");
  };

  if (!mounted) return null;

  return (
    <div>
      <PageHeader
        title="ბუღალტერია"
        description="ფინანსური ინფორმაცია და საწყობის ანგარიშგება"
        printTitle="ბუღალტრული ანგარიშგება"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleExportInventory}
            >
              <Download className="h-4 w-4" />
              საწყობი
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleExportSalesHistory}
            >
              <Download className="h-4 w-4" />
              გაყიდვები
            </Button>
          </>
        }
      />

      <div id="print-area">
        {/* Financial Overview */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                შესყიდვის ღირებულება
              </p>
              <p className="text-xl font-bold mt-1 text-card-foreground">
                {totalPurchaseCost.toLocaleString()} GEL
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                საწყობში არსებული მარაგი
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                საწყობის სარეალიზაციო ღირებულება
              </p>
              <p className="text-xl font-bold mt-1 text-card-foreground">
                {totalStockSaleValue.toLocaleString()} GEL
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                გაყიდვის ფასებით
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                რეალიზებული შემოსავალი
              </p>
              <p className="text-xl font-bold mt-1 text-card-foreground">
                {store.totalRevenue.toLocaleString()} GEL
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                გაყიდული პროდუქციის ჯამი
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                რეალიზებული მოგება
              </p>
              <p
                className={`text-xl font-bold mt-1 ${store.totalProfit >= 0 ? "text-chart-2" : "text-destructive"
                  }`}
              >
                {store.totalProfit.toLocaleString()} GEL
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                გაყიდვა - შესყიდვა
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Accounting Info */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Profit & Loss Statement */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-card-foreground">
                მოგება-ზარალის ანგარიშგება
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-card-foreground">
                  გაყიდვების შემოსავალი
                </span>
                <span className="text-sm font-semibold text-card-foreground">
                  {store.totalRevenue.toLocaleString()} GEL
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-card-foreground">
                  გაყიდვების თვითღირებულება
                </span>
                <span className="text-sm font-semibold text-card-foreground">
                  -{(store.totalRevenue - store.totalProfit).toLocaleString()}{" "}
                  GEL
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-card-foreground">
                  საერთო მოგება
                </span>
                <span
                  className={`text-sm font-bold ${store.totalProfit >= 0
                    ? "text-chart-2"
                    : "text-destructive"
                    }`}
                >
                  {store.totalProfit.toLocaleString()} GEL
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-card-foreground">
                  ნარჩენი მარაგის ღირებულება (შესყიდვის)
                </span>
                <span className="text-sm font-semibold text-card-foreground">
                  {totalPurchaseCost.toLocaleString()} GEL
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-card-foreground">
                  ნარჩენი მარაგის ღირებულება (გაყიდვის)
                </span>
                <span className="text-sm font-semibold text-card-foreground">
                  {totalStockSaleValue.toLocaleString()} GEL
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-card-foreground">
                  არარეალიზებული მოგება (მარაგის)
                </span>
                <span
                  className={`text-sm font-bold ${unrealizedProfit >= 0
                    ? "text-chart-2"
                    : "text-destructive"
                    }`}
                >
                  {unrealizedProfit.toLocaleString()} GEL
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Warehouse Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-card-foreground">
                საწყობის ზოგადი ინფორმაცია
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-card-foreground">
                  პროდუქციის ტიპი
                </span>
                <span className="text-sm font-semibold text-card-foreground">
                  {store.totalProducts}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-card-foreground">
                  მთლიანი სტოკი (ნაშთი)
                </span>
                <span className="text-sm font-semibold text-card-foreground">
                  {store.totalStock} ერთეული
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-card-foreground">
                  კატეგორიების რაოდენობა
                </span>
                <span className="text-sm font-semibold text-card-foreground">
                  {store.categories.length}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-card-foreground">
                  მთლიანი გაყიდვების რაოდენობა
                </span>
                <span className="text-sm font-semibold text-card-foreground">
                  {store.sales.length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-card-foreground">
                  გაყიდული ერთეულები
                </span>
                <span className="text-sm font-semibold text-card-foreground">
                  {totalSoldQuantity}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-card-foreground">
                  საშუალო გაყიდვის თანხა
                </span>
                <span className="text-sm font-semibold text-card-foreground">
                  {store.sales.length > 0
                    ? (
                      store.totalRevenue / store.sales.length
                    ).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })
                    : "0"}{" "}
                  GEL
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Inventory Detail Table */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-card-foreground">
              საწყობის დეტალური ანგარიშგება
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-foreground w-12">#</TableHead>
                  <TableHead
                    className="text-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleInvSort("name")}
                  >
                    <div className="flex items-center">
                      პროდუქცია
                      {getSortIcon(invSortColumn, "name", invSortDirection)}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleInvSort("category")}
                  >
                    <div className="flex items-center">
                      კატეგორია
                      {getSortIcon(invSortColumn, "category", invSortDirection)}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleInvSort("quantity")}
                  >
                    <div className="flex items-center">
                      ნაშთი
                      {getSortIcon(invSortColumn, "quantity", invSortDirection)}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleInvSort("purchasePrice")}
                  >
                    <div className="flex items-center">
                      შესყიდვის ფასი
                      {getSortIcon(invSortColumn, "purchasePrice", invSortDirection)}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleInvSort("salePrice")}
                  >
                    <div className="flex items-center">
                      გაყიდვის ფასი
                      {getSortIcon(invSortColumn, "salePrice", invSortDirection)}
                    </div>
                  </TableHead>
                  <TableHead className="text-foreground">
                    მთლიანი შესყიდვა
                  </TableHead>
                  <TableHead className="text-foreground">
                    მთლიანი გაყიდვა
                  </TableHead>
                  <TableHead className="text-foreground">მარჟა</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProducts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center py-12 text-muted-foreground"
                    >
                      მონაცემები არ არის
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedProducts.map((product, index) => {
                    const totalPurchase =
                      product.purchasePrice * product.quantity;
                    const totalSale = product.salePrice * product.quantity;
                    const margin = totalSale - totalPurchase;
                    const marginPercent =
                      totalPurchase > 0
                        ? ((margin / totalPurchase) * 100).toFixed(1)
                        : "0";
                    return (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium text-foreground">
                          {(invCurrentPage - 1) * invItemsPerPage + index + 1}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {product.name}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {product.category || "-"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${product.quantity > 10
                              ? "bg-chart-2/10 text-chart-2"
                              : product.quantity > 0
                                ? "bg-chart-3/10 text-chart-3"
                                : "bg-destructive/10 text-destructive"
                              }`}
                          >
                            {product.quantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-foreground">
                          {product.purchasePrice.toLocaleString()} GEL
                        </TableCell>
                        <TableCell className="text-foreground">
                          {product.salePrice.toLocaleString()} GEL
                        </TableCell>
                        <TableCell className="text-foreground">
                          {totalPurchase.toLocaleString()} GEL
                        </TableCell>
                        <TableCell className="text-foreground">
                          {totalSale.toLocaleString()} GEL
                        </TableCell>
                        <TableCell>
                          <span
                            className={`font-semibold ${margin >= 0
                              ? "text-chart-2"
                              : "text-destructive"
                              }`}
                          >
                            {margin.toLocaleString()} GEL ({marginPercent}%)
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
                {/* Totals row */}
                {store.products.length > 0 && (
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={3} className="text-foreground">
                      ჯამი
                    </TableCell>
                    <TableCell className="text-foreground">
                      {store.totalStock}
                    </TableCell>
                    <TableCell className="text-foreground"></TableCell>
                    <TableCell className="text-foreground"></TableCell>
                    <TableCell className="text-foreground">
                      {totalPurchaseCost.toLocaleString()} GEL
                    </TableCell>
                    <TableCell className="text-foreground">
                      {totalStockSaleValue.toLocaleString()} GEL
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          unrealizedProfit >= 0
                            ? "text-chart-2"
                            : "text-destructive"
                        }
                      >
                        {unrealizedProfit.toLocaleString()} GEL
                      </span>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Inventory Pagination */}
        {invTotalPages > 1 && (
          <div className="mt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setInvCurrentPage((p) => Math.max(1, p - 1))}
                    className={
                      invCurrentPage === 1
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>
                {Array.from({ length: invTotalPages }).map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink
                      isActive={invCurrentPage === i + 1}
                      onClick={() => setInvCurrentPage(i + 1)}
                      className="cursor-pointer"
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    onClick={() =>
                      setInvCurrentPage((p) => Math.min(invTotalPages, p + 1))
                    }
                    className={
                      invCurrentPage === invTotalPages
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}


        {/* Sales History for Accounting */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-card-foreground">
              გაყიდვების ბუღალტრული ჩანაწერები
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-foreground w-12">#</TableHead>
                  <TableHead
                    className="text-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSalesSort("createdAt")}
                  >
                    <div className="flex items-center">
                      თარიღი
                      {getSortIcon(salesSortColumn, "createdAt", salesSortDirection)}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSalesSort("productName")}
                  >
                    <div className="flex items-center">
                      პროდუქცია
                      {getSortIcon(salesSortColumn, "productName", salesSortDirection)}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSalesSort("quantity")}
                  >
                    <div className="flex items-center">
                      რაოდენობა
                      {getSortIcon(salesSortColumn, "quantity", salesSortDirection)}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSalesSort("salePrice")}
                  >
                    <div className="flex items-center">
                      ფასი
                      {getSortIcon(salesSortColumn, "salePrice", salesSortDirection)}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSalesSort("totalAmount")}
                  >
                    <div className="flex items-center">
                      ჯამი
                      {getSortIcon(salesSortColumn, "totalAmount", salesSortDirection)}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSalesSort("client")}
                  >
                    <div className="flex items-center">
                      მყიდველი
                      {getSortIcon(salesSortColumn, "client", salesSortDirection)}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSales.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-12 text-muted-foreground"
                    >
                      გაყიდვების ჩანაწერები არ არის
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedSales.map((sale, index) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium text-foreground">
                        {(salesCurrentPage - 1) * salesItemsPerPage + index + 1}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {new Date(sale.createdAt).toLocaleDateString("ka-GE")}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {sale.productName}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {sale.quantity}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {sale.salePrice.toLocaleString()} GEL
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {sale.totalAmount.toLocaleString()} GEL
                      </TableCell>
                      <TableCell className="text-foreground">
                        {sale.client || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {store.sales.length > 0 && (
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={4} className="text-foreground">
                      ჯამი
                    </TableCell>
                    <TableCell className="text-foreground"></TableCell>
                    <TableCell className="text-foreground">
                      {store.totalRevenue.toLocaleString()} GEL
                    </TableCell>
                    <TableCell className="text-foreground"></TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Sales Pagination */}
        {salesTotalPages > 1 && (
          <div className="mt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setSalesCurrentPage((p) => Math.max(1, p - 1))}
                    className={
                      salesCurrentPage === 1
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>
                {Array.from({ length: salesTotalPages }).map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink
                      isActive={salesCurrentPage === i + 1}
                      onClick={() => setSalesCurrentPage(i + 1)}
                      className="cursor-pointer"
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    onClick={() =>
                      setSalesCurrentPage((p) => Math.min(salesTotalPages, p + 1))
                    }
                    className={
                      salesCurrentPage === salesTotalPages
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </div>
  );
}
