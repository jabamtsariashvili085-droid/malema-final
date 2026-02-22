"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, AlertCircle, Package, Download, FileText, Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useWarehouseStore } from "@/hooks/use-store";
import { Product, Sale, warehouseStore } from "@/lib/store";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";
import { exportToExcel } from "@/lib/excel";
import { printInvoice } from "@/lib/invoice";

export function SalesPage() {
  const store = useWarehouseStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [form, setForm] = useState({
    quantity: "",
    salePrice: "",
    client: "",
  });
  const [editForm, setEditForm] = useState({
    quantity: "",
    salePrice: "",
    client: "",
  });

  // Sorting and Pagination state
  const [sortColumn, setSortColumn] = useState<string>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Get selected product details including stock
  const selectedProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return store.products.find((p: Product) => p.id === selectedProductId) || null;
  }, [selectedProductId, store.products]);

  // Filter products by category
  const filteredProductsForSelect = useMemo(() => {
    if (!selectedCategory || selectedCategory === "all") return store.products;
    return store.products.filter((p: Product) => p.category === selectedCategory);
  }, [selectedCategory, store.products]);

  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    const product = store.products.find((p: Product) => p.id === productId);
    if (product) {
      setForm((prev) => ({ ...prev, salePrice: String(product.salePrice) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !form.quantity || !form.salePrice) {
      toast.error("შეავსეთ სავალდებულო ველები");
      return;
    }

    try {
      const product = store.products.find((p: Product) => p.id === selectedProductId);
      if (!product) {
        toast.error("პროდუქცია ვერ მოიძებნა");
        return;
      }

      await store.addSale({
        productId: selectedProductId,
        productName: product.name,
        category: product.category,
        quantity: parseInt(form.quantity),
        salePrice: parseFloat(form.salePrice),
        client: form.client.trim(),
      });

      toast.success("გაყიდვა წარმატებით დაფიქსირდა");
      setForm({ quantity: "", salePrice: "", client: "" });
      setSelectedProductId("");
      setSelectedCategory("");
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "შეცდომა გაყიდვისას"
      );
    }
  };

  const filteredSales = useMemo(() => {
    return store.sales.filter(
      (s: Sale) =>
        s.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.client.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [store.sales, searchTerm]);

  // Sorting logic
  const sortedSales = useMemo(() => {
    const sorted = [...filteredSales].sort((a: Sale, b: Sale) => {
      const aVal = a[sortColumn as keyof typeof a];
      const bVal = b[sortColumn as keyof typeof b];

      if (aVal === bVal) return 0;
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      const order = sortDirection === "asc" ? 1 : -1;
      return aVal < bVal ? -1 * order : 1 * order;
    });
    return sorted;
  }, [filteredSales, sortColumn, sortDirection]);

  // Pagination logic
  const totalPages = Math.ceil(sortedSales.length / itemsPerPage);
  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedSales.slice(start, start + itemsPerPage);
  }, [sortedSales, currentPage]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  const handleExportExcel = () => {
    if (store.sales.length === 0) {
      toast.error("ექსპორტისთვის მონაცემები არ არის");
      return;
    }
    exportToExcel(
      store.sales.map((s: Sale) => ({
        productName: s.productName,
        category: s.category || "",
        quantity: s.quantity,
        salePrice: s.salePrice,
        totalAmount: s.totalAmount,
        client: s.client || "",
        createdAt: new Date(s.createdAt).toLocaleDateString("ka-GE"),
      })),
      [
        { header: "პროდუქცია", key: "productName" },
        { header: "კატეგორია", key: "category" },
        { header: "რაოდენობა", key: "quantity" },
        { header: "ფასი", key: "salePrice" },
        { header: "ჯამი", key: "totalAmount" },
        { header: "მყიდველი", key: "client" },
        { header: "თარიღი", key: "createdAt" },
      ],
      "გაყიდვები"
    );
    toast.success("ექსპორტი წარმატებით დასრულდა");
  };

  const handlePrintInvoice = (saleId: string) => {
    const sale = store.sales.find((s: Sale) => s.id === saleId);
    if (!sale) return;
    const product = store.products.find((p: Product) => p.id === sale.productId);
    printInvoice(sale, product?.purchasePrice);
  };

  const handleEditOpen = (saleId: string) => {
    const sale = store.sales.find((s: Sale) => s.id === saleId);
    if (!sale) return;
    setEditingId(saleId);
    setEditForm({
      quantity: String(sale.quantity),
      salePrice: String(sale.salePrice),
      client: sale.client,
    });
    setEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editForm.quantity || !editForm.salePrice) {
      toast.error("შეავსეთ სავალდებულო ველები");
      return;
    }
    try {
      await store.updateSale(editingId, {
        quantity: parseInt(editForm.quantity),
        salePrice: parseFloat(editForm.salePrice),
        client: editForm.client.trim(),
      });
      toast.success("გაყიდვა წარმატებით განახლდა");
      setEditOpen(false);
      setEditingId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "შეცდომა");
    }
  };

  const handleDeleteSale = async (id: string) => {
    await store.deleteSale(id);
    toast.success("გაყიდვა წაიშალა და სტოკი აღდგა");
  };

  if (!mounted) return null;

  return (
    <div>
      <PageHeader
        title="გაყიდვა"
        description="პროდუქციის გაყიდვა და რეალიზაცია"
        printTitle="გაყიდვების რეესტრი"
        actions={
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleExportExcel}
          >
            <Download className="h-4 w-4" />
            ექსპორტი
          </Button>
        }
      >
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              ახალი გაყიდვა
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle className="text-foreground">ახალი გაყიდვა</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {/* Category filter - optional */}
              <div>
                <Label className="text-foreground">კატეგორიის არჩევა</Label>
                <Select
                  value={selectedCategory}
                  onValueChange={(val) => {
                    setSelectedCategory(val);
                    setSelectedProductId("");
                  }}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="ყველა კატეგორია" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ყველა კატეგორია</SelectItem>
                    {store.categories.map((cat: string) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Product Select */}
              <div>
                <Label className="text-foreground">პროდუქცია *</Label>
                <Select
                  value={selectedProductId}
                  onValueChange={handleProductSelect}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="აირჩიეთ პროდუქცია" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredProductsForSelect.map((p: Product) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} (სტოკი: {p.quantity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Stock Info - Shows when product is selected */}
              {selectedProduct && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">
                      საწყობის ინფორმაცია
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        ��როდუქცია
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {selectedProduct.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        კატეგორია
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {selectedProduct.category || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        ნაშთი საწყობში
                      </p>
                      <p
                        className={`text-lg font-bold ${selectedProduct.quantity > 10
                          ? "text-chart-2"
                          : selectedProduct.quantity > 0
                            ? "text-chart-3"
                            : "text-destructive"
                          }`}
                      >
                        {selectedProduct.quantity} ერთეული
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        გაყიდვის ფასი
                      </p>
                      <p className="text-lg font-bold text-foreground">
                        {selectedProduct.salePrice.toLocaleString()} GEL
                      </p>
                    </div>
                  </div>
                  {selectedProduct.quantity === 0 && (
                    <div className="flex items-center gap-2 mt-3 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-xs font-medium">
                        ეს პროდუქცია ამოწურულია!
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="saleQty" className="text-foreground">
                    რაოდენობა *
                  </Label>
                  <Input
                    id="saleQty"
                    type="number"
                    min="1"
                    max={selectedProduct?.quantity || undefined}
                    value={form.quantity}
                    onChange={(e) =>
                      setForm({ ...form, quantity: e.target.value })
                    }
                    placeholder="1"
                    className="mt-1.5"
                    required
                  />
                  {selectedProduct &&
                    form.quantity &&
                    parseInt(form.quantity) > selectedProduct.quantity && (
                      <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        მაქსიმუმ: {selectedProduct.quantity}
                      </p>
                    )}
                </div>
                <div>
                  <Label htmlFor="salePriceInput" className="text-foreground">
                    გაყიდვის ფასი (GEL) *
                  </Label>
                  <Input
                    id="salePriceInput"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.salePrice}
                    onChange={(e) =>
                      setForm({ ...form, salePrice: e.target.value })
                    }
                    placeholder="0.00"
                    className="mt-1.5"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="saleClient" className="text-foreground">
                  მყიდველი
                </Label>
                <Input
                  id="saleClient"
                  value={form.client}
                  onChange={(e) =>
                    setForm({ ...form, client: e.target.value })
                  }
                  placeholder="არასავალდებულო"
                  className="mt-1.5"
                />
              </div>

              {/* Total calculation */}
              {form.quantity && form.salePrice && (
                <div className="rounded-lg bg-muted p-3 text-center">
                  <p className="text-xs text-muted-foreground">
                    ჯამური თანხა
                  </p>
                  <p className="text-xl font-bold text-foreground">
                    {(
                      parseFloat(form.salePrice) * parseInt(form.quantity)
                    ).toLocaleString()}{" "}
                    GEL
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  გაუქმება
                </Button>
                <Button
                  type="submit"
                  disabled={
                    !selectedProductId ||
                    !form.quantity ||
                    !form.salePrice ||
                    (selectedProduct
                      ? parseInt(form.quantity) > selectedProduct.quantity
                      : false)
                  }
                >
                  გაყიდვა
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog >
      </PageHeader >

      <div id="print-area">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                გაყიდვების რაოდენობა
              </p>
              <p className="text-xl font-bold mt-1 text-card-foreground">
                {store.sales.length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                მთლიანი შემოსავალი
              </p>
              <p className="text-xl font-bold mt-1 text-card-foreground">
                {store.totalRevenue.toLocaleString()} GEL
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                მოგება
              </p>
              <p className="text-xl font-bold mt-1 text-card-foreground">
                {store.totalProfit.toLocaleString()} GEL
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Input
              placeholder="ძიება პროდუქციით, კატეგორიით ან მყიდველით..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pr-10"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Sales Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-card-foreground">
              გაყიდვების ისტორია ({filteredSales.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-foreground w-12">#</TableHead>
                  <TableHead
                    className="text-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort("productName")}
                  >
                    <div className="flex items-center">
                      პროდუქცია
                      {getSortIcon("productName")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort("category")}
                  >
                    <div className="flex items-center">
                      კატეგორია
                      {getSortIcon("category")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort("quantity")}
                  >
                    <div className="flex items-center">
                      რაოდენობა
                      {getSortIcon("quantity")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort("salePrice")}
                  >
                    <div className="flex items-center">
                      ფასი
                      {getSortIcon("salePrice")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort("totalAmount")}
                  >
                    <div className="flex items-center">
                      ჯამი
                      {getSortIcon("totalAmount")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort("client")}
                  >
                    <div className="flex items-center">
                      მყიდველი
                      {getSortIcon("client")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort("createdAt")}
                  >
                    <div className="flex items-center">
                      თარიღი
                      {getSortIcon("createdAt")}
                    </div>
                  </TableHead>
                  <TableHead className="text-foreground w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSales.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center py-12 text-muted-foreground"
                    >
                      გაყიდვები არ არის
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedSales.map((sale, index) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium text-foreground">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {sale.productName}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {sale.category || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {sale.quantity} ერთ.
                      </TableCell>
                      <TableCell className="text-foreground">
                        {sale.salePrice.toLocaleString()} GEL
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {sale.totalAmount.toLocaleString()} GEL
                      </TableCell>
                      <TableCell className="text-foreground">
                        {sale.client || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(sale.createdAt).toLocaleDateString("ka-GE")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => handlePrintInvoice(sale.id)}
                          title="ინვოისი"
                        >
                          <FileText className="h-4 w-4" />
                          <span className="sr-only">ინვოისი</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination UI */}
        {totalPages > 1 && (
          <div className="mt-6">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className={
                      currentPage === 1
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>

                {Array.from({ length: totalPages }).map((_, i) => {
                  const page = i + 1;
                  // Basic logic to show current, first, last and arrows/dots would be better but simple for now
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          isActive={currentPage === page}
                          onClick={() => setCurrentPage(page)}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return (
                      <PaginationItem key={page}>
                        <span className="px-2">...</span>
                      </PaginationItem>
                    );
                  }
                  return null;
                })}

                <PaginationItem>
                  <PaginationNext
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    className={
                      currentPage === totalPages
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
    </div >
  );
}
