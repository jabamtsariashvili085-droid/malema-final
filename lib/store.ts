import { supabase } from "./supabase";
import { toast } from "sonner";

export interface Product {
  id: string;
  name: string;
  category: string;
  purchasePrice: number;
  salePrice: number;
  quantity: number;
  client: string;
  createdAt: string;
}

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  category: string;
  quantity: number;
  salePrice: number;
  totalAmount: number;
  client: string;
  createdAt: string;
}

export interface PurchaseHistory {
  id: string;
  productId: string;
  productName: string;
  category: string;
  purchasePrice: number;
  salePrice: number;
  quantity: number;
  client: string;
  createdAt: string;
}

export type StoreListener = () => void;

export interface StoreSnapshot {
  products: Product[];
  sales: Sale[];
  totalProducts: number;
  totalStock: number;
  totalPurchaseValue: number;
  totalSaleValue: number;
  totalRevenue: number;
  totalProfit: number;
  categories: string[];
  salesByMonth: { month: string; revenue: number; profit: number }[];
  topProducts: { name: string; sold: number; revenue: number }[];
  categoryDistribution: { category: string; count: number; value: number }[];
  lowStockProducts: Product[];
  purchaseHistory: PurchaseHistory[];
}

class WarehouseStore {
  private products: Product[] = [];
  private sales: Sale[] = [];
  private purchaseHistory: PurchaseHistory[] = [];
  private listeners: Set<StoreListener> = new Set();
  private _cachedSnapshot: StoreSnapshot | null = null;
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    if (typeof window === "undefined") return;

    try {
      // Parallel fetch products, sales, and purchase history
      const [{ data: productsData }, { data: salesData }, { data: purchaseData }] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('sales').select('*'),
        supabase.from('purchase_history').select('*')
      ]);

      if (productsData) {
        this.products = productsData.map((p: any) => ({
          id: p.id,
          name: p.name,
          category: p.category_name,
          purchasePrice: Number(p.purchase_price),
          salePrice: Number(p.sale_price),
          quantity: p.quantity,
          client: p.client,
          createdAt: p.created_at
        }));
      }

      if (salesData) {
        this.sales = salesData.map((s: any) => ({
          id: s.id,
          productId: s.product_id,
          productName: s.product_name,
          category: s.category_name,
          quantity: s.quantity,
          salePrice: Number(s.sale_price),
          totalAmount: Number(s.total_amount),
          client: s.client,
          createdAt: s.created_at
        }));
      }

      if (purchaseData) {
        this.purchaseHistory = purchaseData.map((ph: any) => ({
          id: ph.id,
          productId: ph.product_id,
          productName: ph.product_name,
          category: ph.category_name,
          purchasePrice: Number(ph.purchase_price),
          salePrice: Number(ph.sale_price),
          quantity: ph.quantity,
          client: ph.client,
          createdAt: ph.created_at
        }));
      }

      this.initialized = true;
      this.notify();

      // Subscribe to changes
      supabase
        .channel('schema-db-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
          this.handleRealtimeProduct(payload);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, (payload) => {
          this.handleRealtimeSale(payload);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_history' }, (payload) => {
          this.handleRealtimePurchase(payload);
        })
        .subscribe();

    } catch (error) {
      console.error("Supabase init error:", error);
    }
  }

  private handleRealtimeProduct(payload: any) {
    const { eventType, new: newRow, old: oldRow } = payload;

    const mapProduct = (p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category_name,
      purchasePrice: Number(p.purchase_price),
      salePrice: Number(p.sale_price),
      quantity: p.quantity,
      client: p.client,
      createdAt: p.created_at
    });

    if (eventType === 'INSERT') {
      if (!this.products.find(p => p.id === newRow.id)) {
        this.products.push(mapProduct(newRow));
      }
    } else if (eventType === 'UPDATE') {
      const idx = this.products.findIndex(p => p.id === newRow.id);
      if (idx !== -1) this.products[idx] = mapProduct(newRow);
    } else if (eventType === 'DELETE') {
      this.products = this.products.filter(p => p.id !== oldRow.id);
    }
    this.notify();
  }

  private handleRealtimeSale(payload: any) {
    const { eventType, new: newRow, old: oldRow } = payload;

    const mapSale = (s: any) => ({
      id: s.id,
      productId: s.product_id,
      productName: s.product_name,
      category: s.category_name,
      quantity: s.quantity,
      salePrice: Number(s.sale_price),
      totalAmount: Number(s.total_amount),
      client: s.client,
      createdAt: s.created_at
    });

    if (eventType === 'INSERT') {
      if (!this.sales.find(s => s.id === newRow.id)) {
        this.sales.push(mapSale(newRow));
      }
    } else if (eventType === 'UPDATE') {
      const idx = this.sales.findIndex(s => s.id === newRow.id);
      if (idx !== -1) this.sales[idx] = mapSale(newRow);
    } else if (eventType === 'DELETE') {
      this.sales = this.sales.filter(s => s.id !== oldRow.id);
    }
    this.notify();
  }

  private handleRealtimePurchase(payload: any) {
    const { eventType, new: newRow, old: oldRow } = payload;

    const mapPurchase = (ph: any) => ({
      id: ph.id,
      productId: ph.product_id,
      productName: ph.product_name,
      category: ph.category_name,
      purchasePrice: Number(ph.purchase_price),
      salePrice: Number(ph.sale_price),
      quantity: ph.quantity,
      client: ph.client,
      createdAt: ph.created_at
    });

    if (eventType === 'INSERT') {
      if (!this.purchaseHistory.find(ph => ph.id === newRow.id)) {
        this.purchaseHistory.push(mapPurchase(newRow));
      }
    } else if (eventType === 'DELETE') {
      this.purchaseHistory = this.purchaseHistory.filter(ph => ph.id !== oldRow.id);
    }
    this.notify();
  }

  private invalidateSnapshot() {
    this._cachedSnapshot = null;
  }

  private notify() {
    this.invalidateSnapshot();
    this.listeners.forEach((l) => l());
  }

  getSnapshot(): StoreSnapshot {
    if (this._cachedSnapshot) return this._cachedSnapshot;

    this._cachedSnapshot = {
      products: this.getProducts(),
      sales: this.getSales(),
      totalProducts: this.getTotalProducts(),
      totalStock: this.getTotalStock(),
      totalPurchaseValue: this.getTotalPurchaseValue(),
      totalSaleValue: this.getTotalSaleValue(),
      totalRevenue: this.getTotalRevenue(),
      totalProfit: this.getTotalProfit(),
      categories: this.getCategories(),
      salesByMonth: this.getSalesByMonth(),
      topProducts: this.getTopProducts(),
      categoryDistribution: this.getCategoryDistribution(),
      lowStockProducts: this.getLowStockProducts(),
      purchaseHistory: this.getPurchaseHistory(),
    };

    return this._cachedSnapshot;
  }

  subscribe(listener: StoreListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Products
  getProducts(): Product[] {
    return [...this.products];
  }

  getProductById(id: string): Product | undefined {
    return this.products.find((p) => p.id === id);
  }

  async addProduct(product: Omit<Product, "id" | "createdAt">) {
    // Check if product with same name exists - update quantity
    const existing = this.products.find(
      (p) => p.name.toLowerCase() === product.name.toLowerCase()
    );

    if (existing) {
      const newQuantity = existing.quantity + product.quantity;
      const updates = {
        quantity: newQuantity,
        purchase_price: product.purchasePrice,
        sale_price: product.salePrice,
        category_name: product.category || existing.category,
        client: product.client || existing.client,
      };

      // Optimistic update
      existing.quantity = newQuantity;
      existing.purchasePrice = product.purchasePrice;
      existing.salePrice = product.salePrice;
      existing.category = product.category || existing.category;
      existing.client = product.client || existing.client;
      this.notify();

      // Supabase update
      const { error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', existing.id);

      if (error) {
        console.error("Error updating product:", error);
        toast.error("შეცდომა პროდუქტის განახლებისას");
      }
    } else {
      const newProduct = {
        id: crypto.randomUUID(),
        name: product.name,
        category_name: product.category,
        purchase_price: product.purchasePrice,
        sale_price: product.salePrice,
        quantity: product.quantity,
        client: product.client,
        created_at: new Date().toISOString(),
      };

      // Optimistic update - map to internal interface
      this.products.push({
        ...product,
        id: newProduct.id,
        createdAt: newProduct.created_at
      });
      this.notify();

      // Supabase insert
      const { error } = await supabase
        .from('products')
        .insert(newProduct);

      if (error) {
        console.error("Error adding product:", error);
        this.products = this.products.filter(p => p.id !== newProduct.id);
        this.notify();
        toast.error("შეცდომა პროდუქტის დამატებისას");
      }
    }
  }

  async updateProduct(id: string, updates: Partial<Omit<Product, "id" | "createdAt">>) {
    const product = this.products.find((p) => p.id === id);
    if (!product) throw new Error("პროდუქცია ვერ მოიძებნა");

    const oldProduct = { ...product };
    // Optimistic update
    Object.assign(product, updates);
    this.notify();

    // Map to snake_case for DB
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.category !== undefined) dbUpdates.category_name = updates.category;
    if (updates.purchasePrice !== undefined) dbUpdates.purchase_price = updates.purchasePrice;
    if (updates.salePrice !== undefined) dbUpdates.sale_price = updates.salePrice;
    if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
    if (updates.client !== undefined) dbUpdates.client = updates.client;

    // Supabase update
    const { error } = await supabase
      .from('products')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      console.error("Error updating product:", error);
      Object.assign(product, oldProduct);
      this.notify();
      toast.error("შეცდომა განახლებისას");
    }
  }

  async deleteProduct(id: string) {
    const oldProducts = [...this.products];
    // Optimistic delete
    this.products = this.products.filter((p) => p.id !== id);
    this.notify();

    // Supabase delete
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Error deleting product:", error);
      this.products = oldProducts;
      this.notify();
      toast.error("შეცდომა წაშლისას");
    }
  }

  // Sales
  getSales(): Sale[] {
    return [...this.sales];
  }

  async updateSale(id: string, updates: { quantity?: number; salePrice?: number; client?: string }) {
    const sale = this.sales.find((s) => s.id === id);
    if (!sale) throw new Error("გაყიდვა ვერ მოიძებნა");

    const product = this.products.find((p) => p.id === sale.productId);
    const oldSale = { ...sale };
    const oldProductQuantity = product ? product.quantity : 0;

    // Optimistic UI update for quantity change
    if (updates.quantity !== undefined && updates.quantity !== sale.quantity) {
      const diff = updates.quantity - sale.quantity;
      if (product) {
        if (product.quantity < diff) {
          throw new Error(`არასაკმარისი რაოდენობა. საწყობში არის: ${product.quantity}`);
        }
        product.quantity -= diff;
      }
      sale.quantity = updates.quantity;
    }

    if (updates.salePrice !== undefined) sale.salePrice = updates.salePrice;
    if (updates.client !== undefined) sale.client = updates.client;
    sale.totalAmount = sale.salePrice * sale.quantity;

    this.notify();

    // Supabase update - DB Trigger will handle product stock
    try {
      const { error } = await supabase
        .from('sales')
        .update({
          quantity: sale.quantity,
          sale_price: sale.salePrice,
          total_amount: sale.totalAmount,
          client: sale.client
        })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating sale:", error);
      Object.assign(sale, oldSale);
      if (product) product.quantity = oldProductQuantity;
      this.notify();
      toast.error("შეცდომა განახლებისას");
    }
  }

  async deleteSale(id: string) {
    const sale = this.sales.find((s) => s.id === id);
    if (!sale) return;

    const product = this.products.find((p) => p.id === sale.productId);
    const oldSales = [...this.sales];
    const oldProductQuantity = product ? product.quantity : 0;

    // Optimistic return quantity back to product
    if (product) product.quantity += sale.quantity;
    this.sales = this.sales.filter((s) => s.id !== id);
    this.notify();

    // Supabase delete - DB Trigger will handle product stock return
    try {
      const { error } = await supabase.from('sales').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error("Error deleting sale:", error);
      this.sales = oldSales;
      if (product) product.quantity = oldProductQuantity;
      this.notify();
      toast.error("შეცდომა წაშლისას");
    }
  }

  async addSale(sale: Omit<Sale, "id" | "createdAt" | "totalAmount">) {
    const product = this.products.find((p) => p.id === sale.productId);
    if (!product) throw new Error("პროდუქცია ვერ მოიძებნა");
    if (product.quantity < sale.quantity)
      throw new Error(`არასაკმარისი რაოდენობა. საწყობში არის: ${product.quantity}`);

    const oldProductQuantity = product.quantity;
    const newSale = {
      id: crypto.randomUUID(),
      product_id: sale.productId,
      product_name: sale.productName,
      category_name: sale.category,
      quantity: sale.quantity,
      sale_price: sale.salePrice,
      total_amount: sale.salePrice * sale.quantity,
      created_at: new Date().toISOString(),
      client: sale.client
    };

    // Optimistic update
    product.quantity -= sale.quantity;
    this.sales.push({
      ...sale,
      id: newSale.id,
      totalAmount: newSale.total_amount,
      createdAt: newSale.created_at
    });
    this.notify();

    // Supabase insert - DB Trigger will handle product stock
    try {
      const { error } = await supabase.from('sales').insert(newSale);
      if (error) throw error;
    } catch (error) {
      console.error("Error adding sale:", error);
      product.quantity = oldProductQuantity;
      this.sales = this.sales.filter(s => s.id !== newSale.id);
      this.notify();
      toast.error("შეცდომა გაყიდვისას");
    }
  }

  // Analytics
  getTotalProducts(): number {
    return this.products.length;
  }

  getTotalStock(): number {
    return this.products.reduce((acc, p) => acc + p.quantity, 0);
  }

  getTotalPurchaseValue(): number {
    return this.products.reduce(
      (acc, p) => acc + p.purchasePrice * p.quantity,
      0
    );
  }

  getTotalSaleValue(): number {
    return this.products.reduce((acc, p) => acc + p.salePrice * p.quantity, 0);
  }

  getTotalRevenue(): number {
    return this.sales.reduce((acc, s) => acc + s.totalAmount, 0);
  }

  getTotalProfit(): number {
    return this.sales.reduce((acc, s) => {
      const product = this.products.find((p) => p.id === s.productId);
      const purchasePrice = product?.purchasePrice ?? 0;
      return acc + (s.salePrice - purchasePrice) * s.quantity;
    }, 0);
  }

  getCategories(): string[] {
    const cats = new Set(
      this.products.map((p) => p.category).filter(Boolean)
    );
    return Array.from(cats);
  }

  getSalesByMonth(): { month: string; revenue: number; profit: number }[] {
    const map = new Map<string, { revenue: number; profit: number }>();
    this.sales.forEach((s) => {
      const date = new Date(s.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const existing = map.get(key) || { revenue: 0, profit: 0 };
      const product = this.products.find((p) => p.id === s.productId);
      const purchasePrice = product?.purchasePrice ?? 0;
      existing.revenue += s.totalAmount;
      existing.profit += (s.salePrice - purchasePrice) * s.quantity;
      map.set(key, existing);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));
  }

  getTopProducts(limit = 5): { name: string; sold: number; revenue: number }[] {
    const map = new Map<string, { sold: number; revenue: number }>();
    this.sales.forEach((s) => {
      const existing = map.get(s.productName) || { sold: 0, revenue: 0 };
      existing.sold += s.quantity;
      existing.revenue += s.totalAmount;
      map.set(s.productName, existing);
    });
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  getCategoryDistribution(): { category: string; count: number; value: number }[] {
    const map = new Map<string, { count: number; value: number }>();
    this.products.forEach((p) => {
      const cat = p.category || "სხვა";
      const existing = map.get(cat) || { count: 0, value: 0 };
      existing.count += p.quantity;
      existing.value += p.salePrice * p.quantity;
      map.set(cat, existing);
    });
    return Array.from(map.entries()).map(([category, data]) => ({
      category,
      ...data,
    }));
  }

  getLowStockProducts(threshold = 5): Product[] {
    return this.products.filter(p => p.quantity < threshold);
  }

  getPurchaseHistory(): PurchaseHistory[] {
    return [...this.purchaseHistory];
  }

  // Data management
  async clearAll() {
    this.products = [];
    this.sales = [];
    this.purchaseHistory = [];
    this.notify();

    try {
      await Promise.all([
        supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('sales').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('purchase_history').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      ]);
    } catch (error) {
      console.error("Error clearing data:", error);
      toast.error("შეცდომა მონაცემების წაშლისას");
    }
  }

  async importData(products: Product[], sales: Sale[]) {
    this.products = products;
    this.sales = sales;
    this.notify();

    const dbProducts = products.map(p => ({
      id: p.id,
      name: p.name,
      category_name: p.category,
      purchase_price: p.purchasePrice,
      sale_price: p.salePrice,
      quantity: p.quantity,
      client: p.client,
      created_at: p.createdAt
    }));

    const dbSales = sales.map(s => ({
      id: s.id,
      product_id: s.productId,
      product_name: s.productName,
      category_name: s.category,
      quantity: s.quantity,
      sale_price: s.salePrice,
      total_amount: s.totalAmount,
      client: s.client,
      created_at: s.createdAt
    }));

    try {
      await Promise.all([
        supabase.from('products').upsert(dbProducts),
        supabase.from('sales').upsert(dbSales)
      ]);
    } catch (error) {
      console.error("Error importing data:", error);
      toast.error("შეცდომა იმპორტისას");
    }
  }

  exportData(): { products: Product[]; sales: Sale[] } {
    return {
      products: [...this.products],
      sales: [...this.sales],
    };
  }
}

// Singleton - lazy init to avoid SSR issues
let _instance: WarehouseStore | null = null;
function getWarehouseStore(): WarehouseStore {
  if (!_instance) {
    _instance = new WarehouseStore();
  }
  return _instance;
}

export const warehouseStore = typeof window !== "undefined"
  ? getWarehouseStore()
  : new WarehouseStore();
