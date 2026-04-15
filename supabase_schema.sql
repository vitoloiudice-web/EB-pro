-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. EB-PRO ADMINS
create table eb_pro_admins (
  id uuid default uuid_generate_v4() primary key,
  email text not null unique,
  role text default 'ADMIN',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. CLIENTS (The industrial entities managed by EB-pro)
create table clients (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  logo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. SUPPLIERS
create table suppliers (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references clients(id) on delete cascade,
  name text not null,
  rating numeric(3,1) default 3.0,
  email text,
  payment_terms text,
  address text,
  phone text,
  status text default 'PENDING', -- QUALIFIED, PENDING, EXPIRED, REJECTED
  qualification_data jsonb, -- Flexible JSON for dynamic criteria
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. ITEMS (Inventory)
create table items (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references clients(id) on delete cascade,
  sku text not null,
  name text not null,
  description text,
  category text, -- Idraulica, Carpenteria, etc.
  family text,
  group_name text,
  
  -- Stock Data
  stock numeric default 0,
  safety_stock numeric default 0,
  unit text default 'pz',
  weight_kg numeric default 0,
  
  -- Costing & Purchasing
  cost numeric default 0,
  currency text default 'EUR',
  preferred_supplier_id uuid references suppliers(id),
  lead_time_days integer default 7,
  
  -- Technical
  revision text default '1.0',
  variant text default 'A',
  progressive text default '001',
  customer_code text,
  manufacturer_info jsonb,
  technical_specs jsonb,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. CUSTOMERS
create table customers (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references clients(id) on delete cascade,
  name text not null,
  email text,
  vat_number text,
  address text,
  region text,
  payment_terms text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. PURCHASE ORDERS
create table purchase_orders (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references clients(id) on delete cascade,
  po_number text not null, -- Human readable ID (PO-2024-001)
  supplier_id uuid references suppliers(id),
  date date default current_date,
  status text default 'DRAFT', -- DRAFT, SENT, CONFIRMED, SHIPPED, RECEIVED
  total_amount numeric default 0,
  notes text,
  tracking_code text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table purchase_order_items (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references purchase_orders(id) on delete cascade,
  item_id uuid references items(id),
  sku text, -- Denormalized for history
  description text,
  qty numeric not null,
  unit_price numeric not null,
  total numeric generated always as (qty * unit_price) stored
);

-- 7. LOGISTICS EVENTS
create table logistics_events (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references clients(id) on delete cascade,
  type text not null, -- INBOUND, OUTBOUND
  reference_id text, -- PO Number or Order ID
  event_date timestamp with time zone default now(),
  courier text,
  tracking_code text,
  status text, -- TRANSIT, DELIVERED, EXCEPTION
  items_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS POLICIES (Simple setup for now)
alter table eb_pro_admins enable row level security;
alter table clients enable row level security;
alter table suppliers enable row level security;
alter table items enable row level security;
alter table customers enable row level security;
alter table purchase_orders enable row level security;
alter table purchase_order_items enable row level security;
alter table logistics_events enable row level security;

-- Allow public access for this demo (In production, restrict to authenticated users)
create policy "Public access" on eb_pro_admins for all using (true);
create policy "Public access" on clients for all using (true);
create policy "Public access" on suppliers for all using (true);
create policy "Public access" on items for all using (true);
create policy "Public access" on customers for all using (true);
create policy "Public access" on purchase_orders for all using (true);
create policy "Public access" on purchase_order_items for all using (true);
create policy "Public access" on logistics_events for all using (true);
