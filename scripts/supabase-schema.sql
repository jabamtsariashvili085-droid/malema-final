-- ============================================================
-- საწყობის მართვის სისტემა - Supabase SQL Schema
-- ============================================================
-- გაუშვით ეს SQL Supabase Dashboard > SQL Editor-ში
-- ============================================================

-- ============================================================
-- 1. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 2. CUSTOM TYPES (ENUMS)
-- ============================================================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'accountant', 'seller');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- 3. TABLES
-- ============================================================

-- ----- პროფილები (Supabase Auth-თან დაკავშირებული) -----
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  role user_role NOT NULL DEFAULT 'seller',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE profiles IS 'მომხმარებლების პროფილები';
COMMENT ON COLUMN profiles.username IS 'მომხმარებლის უნიკალური სახელი';
COMMENT ON COLUMN profiles.display_name IS 'საჩვენებელი სახელი';
COMMENT ON COLUMN profiles.role IS 'მომხმარებლის როლი: admin, accountant, seller';

-- ----- კატეგორიები -----
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE categories IS 'პროდუქციის კატეგორიები';

-- ----- პროდუქცია (საწყობი) -----
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  category_name TEXT NOT NULL DEFAULT '',
  purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  sale_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 0,
  client TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE products IS 'საწყობის პროდუქცია';
COMMENT ON COLUMN products.purchase_price IS 'შესყიდვის ფასი';
COMMENT ON COLUMN products.sale_price IS 'გაყიდვის ფასი';
COMMENT ON COLUMN products.quantity IS 'რაოდენობა საწყობში (ნაშთი)';
COMMENT ON COLUMN products.client IS 'მომწოდებელი / კლიენტი (არასავალდებულო)';

-- ----- გაყიდვები -----
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  category_name TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL,
  sale_price NUMERIC(12,2) NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  purchase_price_at_sale NUMERIC(12,2) NOT NULL DEFAULT 0,
  client TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE sales IS 'გაყიდვების ჩანაწერები';
COMMENT ON COLUMN sales.product_name IS 'პროდუქციის სახელი (დენორმალიზებული)';
COMMENT ON COLUMN sales.total_amount IS 'ჯამური თანხა (sale_price * quantity)';
COMMENT ON COLUMN sales.purchase_price_at_sale IS 'შესყიდვის ფასი გაყიდვის მომენტში (მოგების გამოთვლისთვის)';

-- ----- შესყიდვების ისტორია -----
CREATE TABLE IF NOT EXISTS purchase_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  category_name TEXT NOT NULL DEFAULT '',
  purchase_price NUMERIC(12,2) NOT NULL,
  sale_price NUMERIC(12,2) NOT NULL,
  quantity INTEGER NOT NULL,
  client TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE purchase_history IS 'შესყიდვების ისტორია';

-- ----- სისტემის პარამეტრები -----
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE settings IS 'სისტემის პარამეტრები (key-value)';

-- ============================================================
-- 4. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_name);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sales_product_id ON sales(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_client ON sales(client);

CREATE INDEX IF NOT EXISTS idx_purchase_history_product_id ON purchase_history(product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_history_created_at ON purchase_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- ============================================================
-- 5. FUNCTIONS
-- ============================================================

-- ავტომატური updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at ტრიგერები
DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ახალი მომხმარებლის რეგისტრაციისას პროფილის ავტომატური შექმნა
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'seller')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- გაყიდვის დროს ავტომატური სტოკის შემცირება
CREATE OR REPLACE FUNCTION handle_sale_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- შევამციროთ სტოკი
    UPDATE products
    SET quantity = quantity - NEW.quantity
    WHERE id = NEW.product_id;

    -- შევამოწმოთ რომ სტოკი უარყოფითი არ გახდეს
    IF (SELECT quantity FROM products WHERE id = NEW.product_id) < 0 THEN
      RAISE EXCEPTION 'არასაკმარისი რაოდენობა საწყობში';
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    -- დავაბრუნოთ ძველი რაოდენობა და გამოვაკლოთ ახალი
    UPDATE products
    SET quantity = quantity + OLD.quantity - NEW.quantity
    WHERE id = NEW.product_id;

    IF (SELECT quantity FROM products WHERE id = NEW.product_id) < 0 THEN
      RAISE EXCEPTION 'არასაკმარისი რაოდენობა საწყობში';
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    -- დავაბრუნოთ სტოკი
    UPDATE products
    SET quantity = quantity + OLD.quantity
    WHERE id = OLD.product_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sales_stock_trigger ON sales;
CREATE TRIGGER sales_stock_trigger
  AFTER INSERT OR UPDATE OR DELETE ON sales
  FOR EACH ROW EXECUTE FUNCTION handle_sale_stock();

-- შესყიდვის ისტორიის ავტომატური ჩაწერა
CREATE OR REPLACE FUNCTION log_purchase_history()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO purchase_history (product_id, product_name, category_name, purchase_price, sale_price, quantity, client, created_by)
    VALUES (NEW.id, NEW.name, NEW.category_name, NEW.purchase_price, NEW.sale_price, NEW.quantity, NEW.client, NEW.created_by);
  ELSIF TG_OP = 'UPDATE' AND NEW.quantity > OLD.quantity THEN
    -- ახალი შესყიდვა (რაოდენობა გაიზარდა)
    INSERT INTO purchase_history (product_id, product_name, category_name, purchase_price, sale_price, quantity, client, created_by)
    VALUES (NEW.id, NEW.name, NEW.category_name, NEW.purchase_price, NEW.sale_price, NEW.quantity - OLD.quantity, NEW.client, NEW.created_by);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_purchase_log ON products;
CREATE TRIGGER products_purchase_log
  AFTER INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION log_purchase_history();

-- ============================================================
-- 6. VIEWS (ანალიტიკა)
-- ============================================================

-- საწყობის მიმოხილვა
CREATE OR REPLACE VIEW v_inventory_summary AS
SELECT
  p.id,
  p.name,
  p.category_name,
  p.purchase_price,
  p.sale_price,
  p.quantity,
  (p.purchase_price * p.quantity) AS total_purchase_value,
  (p.sale_price * p.quantity) AS total_sale_value,
  ((p.sale_price - p.purchase_price) * p.quantity) AS potential_profit,
  CASE WHEN p.purchase_price > 0
    THEN ROUND(((p.sale_price - p.purchase_price) / p.purchase_price * 100)::numeric, 1)
    ELSE 0
  END AS margin_percent,
  p.client,
  p.created_at,
  p.updated_at
FROM products p
ORDER BY p.name;

-- გაყიდვების ანალიტიკა თვეების მიხედვით
CREATE OR REPLACE VIEW v_sales_by_month AS
SELECT
  TO_CHAR(s.created_at, 'YYYY-MM') AS month,
  COUNT(*) AS sales_count,
  SUM(s.quantity) AS total_quantity,
  SUM(s.total_amount) AS total_revenue,
  SUM((s.sale_price - s.purchase_price_at_sale) * s.quantity) AS total_profit
FROM sales s
GROUP BY TO_CHAR(s.created_at, 'YYYY-MM')
ORDER BY month DESC;

-- ტოპ პროდუქცია (გაყიდვების მიხედვით)
CREATE OR REPLACE VIEW v_top_products AS
SELECT
  s.product_name,
  SUM(s.quantity) AS total_sold,
  SUM(s.total_amount) AS total_revenue,
  SUM((s.sale_price - s.purchase_price_at_sale) * s.quantity) AS total_profit
FROM sales s
GROUP BY s.product_name
ORDER BY total_revenue DESC;

-- კატეგორიების განაწილება
CREATE OR REPLACE VIEW v_category_distribution AS
SELECT
  COALESCE(NULLIF(p.category_name, ''), 'სხვა') AS category,
  COUNT(*) AS product_count,
  SUM(p.quantity) AS total_quantity,
  SUM(p.sale_price * p.quantity) AS total_value
FROM products p
GROUP BY COALESCE(NULLIF(p.category_name, ''), 'სხვა')
ORDER BY total_value DESC;

-- ============================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- -------- profiles --------
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- -------- products --------
CREATE POLICY "Authenticated users can view products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- -------- sales --------
CREATE POLICY "Authenticated users can view sales"
  ON sales FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert sales"
  ON sales FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sales"
  ON sales FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete sales"
  ON sales FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- -------- purchase_history --------
CREATE POLICY "Authenticated users can view purchase history"
  ON purchase_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert purchase history"
  ON purchase_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- -------- categories --------
CREATE POLICY "Authenticated users can view categories"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage categories"
  ON categories FOR ALL
  TO authenticated
  USING (true);

-- -------- settings --------
CREATE POLICY "Authenticated users can view settings"
  ON settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage settings"
  ON settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- 8. SEED DATA (საწყისი მონაცემები)
-- ============================================================

-- საწყისი პარამეტრები
INSERT INTO settings (key, value) VALUES
  ('company_name', 'საწყობი'),
  ('currency', '₾'),
  ('language', 'ქართული')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- DONE! სქემა წარმატებით შეიქმნა.
-- ============================================================
--
-- შემდეგი ნაბიჯები:
-- 1. Supabase Dashboard > Authentication > Settings-ში
--    ჩართეთ Email Auth.
-- 2. შექმენით პირველი ადმინ მომხმარებელი:
--    Supabase Dashboard > Authentication > Users > Add User
--    metadata-ში მიუთითეთ: {"username": "admin", "display_name": "ადმინისტრატორი", "role": "admin"}
-- 3. აპლიკაციაში მიუთითეთ Environment Variables:
--    NEXT_PUBLIC_SUPABASE_URL=<your-url>
--    NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
-- ============================================================
