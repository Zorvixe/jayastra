import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { Pool } from "pg";
import multer from "multer";
import path from "path";
import fs from "fs";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import validator from "validator";
import { fileURLToPath } from "url";
import http from 'http';
import { Server } from 'socket.io';
import sgMail from '@sendgrid/mail';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import PDFDocument from 'pdfkit';

// ================= APP CONFIG =================
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    credentials: true
  }
});

// Setup SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Initialize Razorpay Safely
let razorpay;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
} else {
  console.warn("⚠️ Razorpay keys missing. Payment endpoints might fail if accessed.");
}

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Admin Email Notification Helper
const sendAdminNotification = async (order) => {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn("⚠️ SendGrid API Key missing. Skipping email notification.");
      return;
    }

    const msg = {
      to: process.env.ADMIN_EMAIL,
      from: process.env.FROM_EMAIL,
      subject: "🚀 New Order Received",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee;">
          <h2 style="color: #8E2139;">New Order #${order.id}</h2>
          <p><strong>Customer:</strong> ${order.customer_name}</p>
          <p><strong>Email:</strong> ${order.email}</p>
          <p><strong>Phone:</strong> ${order.phone}</p>
          <p><strong>Address:</strong> ${order.address}</p>
          <hr/>
          <h3 style="color: #333;">Total Amount: ₹${order.total_amount}</h3>
          <p><strong>Payment Method:</strong> ${order.payment_method}</p>
          <p>Verify this order in your dashboard.</p>
        </div>
      `,
    };

    await sgMail.send(msg);
    console.log("✅ Admin notification email sent");
  } catch (err) {
    console.error("❌ Email notification failed:", err.message);
  }
};

// ================= MIDDLEWARE =================
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);
app.use(express.json({ limit: '50mb' }));

// ================= DATABASE =================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.connect()
  .then(() => console.log("✅ PostgreSQL Connected"))
  .catch(err => console.error("❌ DB Connection Error", err));
export default pool;

// ================= FILE UPLOAD (ENHANCED) =================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_BASE_PATH = process.env.UPLOAD_PATH || path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_BASE_PATH)) fs.mkdirSync(UPLOAD_BASE_PATH, { recursive: true });

// Helper: validate image files
const validateImageFile = (file) => {
  const allowedExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExt.includes(ext)) throw new Error(`Invalid image extension. Allowed: ${allowedExt.join(', ')}`);
  if (!allowedMime.includes(file.mimetype)) throw new Error(`Invalid image MIME type. Allowed: ${allowedMime.join(', ')}`);
  return true;
};

// Helper: validate video files
const validateVideoFile = (file) => {
  const allowedExt = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.wmv', '.flv', '.m4v'];
  const allowedMime = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm', 'video/x-ms-wmv', 'video/x-flv'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExt.includes(ext)) throw new Error(`Invalid video extension. Allowed: ${allowedExt.join(', ')}`);
  if (!allowedMime.includes(file.mimetype)) throw new Error(`Invalid video MIME type. Allowed: ${allowedMime.join(', ')}`);
  return true;
};

const productStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'products';
    if (file.fieldname === 'video') folder = 'products/videos';
    else if (file.fieldname === 'image') folder = 'products/images';
    const dir = path.join(UPLOAD_BASE_PATH, folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const uploadProductMedia = multer({
  storage: productStorage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    try {
      if (file.fieldname === 'image') validateImageFile(file);
      else if (file.fieldname === 'video') validateVideoFile(file);
      else throw new Error('Unexpected field');
      cb(null, true);
    } catch (err) {
      cb(err);
    }
  }
});

const bannerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_BASE_PATH, 'banners');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'banner-' + uniqueSuffix + ext);
  }
});

const uploadBannerMedia = multer({
  storage: bannerStorage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    try {
      if (file.fieldname === 'image') validateImageFile(file);
      else if (file.fieldname === 'video') validateVideoFile(file);
      else throw new Error('Unexpected field');
      cb(null, true);
    } catch (err) {
      cb(err);
    }
  }
});

const returnStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_BASE_PATH, 'returns');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'return-' + uniqueSuffix + ext);
  }
});

const uploadReturnVideo = multer({
  storage: returnStorage,
  limits: { fileSize: 150 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    try {
      validateVideoFile(file);
      cb(null, true);
    } catch (err) {
      cb(err);
    }
  }
});

app.use("/uploads", express.static(UPLOAD_BASE_PATH));

const legacyStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(UPLOAD_BASE_PATH)) fs.mkdirSync(UPLOAD_BASE_PATH, { recursive: true });
    cb(null, UPLOAD_BASE_PATH);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: legacyStorage, limits: { fileSize: 1000 * 1024 * 1024 } });

// ================= AUTH MIDDLEWARE =================
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "No token provided" });
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userResult = await pool.query("SELECT id, role FROM users WHERE id = $1", [decoded.id]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: "User no longer exists. Please login again." });
    }
    req.user = { ...decoded, ...userResult.rows[0] };
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

const verifyAdmin = (req, res, next) => {
  if (!req.user.role || req.user.role.toLowerCase() !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

const verifyAdminOrSuperAdmin = (req, res, next) => {
  const role = req.user.role?.toLowerCase();
  if (role !== "super_admin" && role !== "admin") {
    return res.status(403).json({ message: "Admin or Super Admin access required" });
  }
  next();
};

const verifySuperAdmin = (req, res, next) => {
  if (!req.user.role || req.user.role.toLowerCase() !== "super_admin") {
    return res.status(403).json({ message: "Super Admin access required" });
  }
  next();
};

const verifyAnyAdmin = (req, res, next) => {
  const role = req.user.role?.toLowerCase();
  if (role !== "super_admin" && role !== "vendor" && role !== "admin") {
    return res.status(403).json({ message: "Vendor or Admin access required" });
  }
  next();
};

// ISOLATION MIDDLEWARE
const verifyAdminVendorIndividualAccess = (req, res, next) => {
  const role = req.user.role?.toLowerCase();
  if (role === "super_admin") {
    return next();
  }
  if (role === "admin" || role === "vendor") {
    req.vendorId = req.user.id;
    return next();
  }
  return res.status(403).json({ message: "Admin or Vendor access required" });
};

// ================= DATABASE INIT =================
const initDatabase = async () => {
  try {
    // 1. users
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        phone VARCHAR(20),
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active'`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS provider VARCHAR(50);`);
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS gender VARCHAR(10),
      ADD COLUMN IF NOT EXISTS address TEXT,
      ADD COLUMN IF NOT EXISTS city VARCHAR(100),
      ADD COLUMN IF NOT EXISTS state VARCHAR(100),
      ADD COLUMN IF NOT EXISTS pincode VARCHAR(10),
      ADD COLUMN IF NOT EXISTS store_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS balance DECIMAL(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS gst_number VARCHAR(50);
    `);
    await pool.query(`
      ALTER TABLE users 
      ALTER COLUMN email DROP NOT NULL,
      ALTER COLUMN password DROP NOT NULL;
    `);

    await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS pickup_address_line1 TEXT,
        ADD COLUMN IF NOT EXISTS pickup_address_line2 TEXT,
        ADD COLUMN IF NOT EXISTS pickup_city VARCHAR(100),
        ADD COLUMN IF NOT EXISTS pickup_state VARCHAR(100),
        ADD COLUMN IF NOT EXISTS pickup_pincode VARCHAR(10),
        ADD COLUMN IF NOT EXISTS pickup_location_name VARCHAR(255)
      `);



    await pool.query(`
        CREATE TABLE IF NOT EXISTS vendor_pickup_addresses (
          id SERIAL PRIMARY KEY,
          vendor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          location_name VARCHAR(255) NOT NULL,
          address_line1 TEXT NOT NULL,
          address_line2 TEXT,
          city VARCHAR(100) NOT NULL,
          state VARCHAR(100) NOT NULL,
          pincode VARCHAR(10) NOT NULL,
          is_default BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

    await pool.query(`
        INSERT INTO vendor_pickup_addresses (vendor_id, location_name, address_line1, address_line2, city, state, pincode, is_default)
        SELECT id, pickup_location_name, pickup_address_line1, pickup_address_line2, pickup_city, pickup_state, pickup_pincode, true
        FROM users
        WHERE pickup_pincode IS NOT NULL AND pickup_location_name IS NOT NULL
        ON CONFLICT DO NOTHING
      `);

    // 2. addresses
    await pool.query(`
      CREATE TABLE IF NOT EXISTS addresses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255),
        phone VARCHAR(20),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        pincode VARCHAR(10),
        type VARCHAR(20) DEFAULT 'HOME',
        house_no VARCHAR(255),
        street_area VARCHAR(255),
        landmark VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`
      ALTER TABLE addresses 
      ADD COLUMN IF NOT EXISTS house_no VARCHAR(255),
      ADD COLUMN IF NOT EXISTS street_area VARCHAR(255),
      ADD COLUMN IF NOT EXISTS landmark VARCHAR(255);
    `);

    // 3. categories
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        image_url VARCHAR(500),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      ALTER TABLE categories 
      ADD COLUMN IF NOT EXISTS image_url VARCHAR(500),
      ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS vendor_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
    `);

    // 4. sub_categories
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sub_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name, category_id)
      )
    `);
    await pool.query(`
      ALTER TABLE sub_categories 
      ADD COLUMN IF NOT EXISTS vendor_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
    `);

    // 5. products
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        old_price DECIMAL(10,2),
        price DECIMAL(10,2) NOT NULL,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        sub_category_id INTEGER REFERENCES sub_categories(id) ON DELETE SET NULL,
        main_image_url VARCHAR(500),
        video_url VARCHAR(500),
        sku VARCHAR(100) UNIQUE,
        stock_quantity INTEGER DEFAULT 0,
        is_featured BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        vendor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        platform_fee_percent DECIMAL(5,2) DEFAULT 10.00
      )
    `);
    await pool.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS video_url VARCHAR(500),
      ADD COLUMN IF NOT EXISTS color VARCHAR(50),
      ADD COLUMN IF NOT EXISTS product_code VARCHAR(100) UNIQUE,
      ADD COLUMN IF NOT EXISTS weight DECIMAL(10,2) DEFAULT 0.7,
      ADD COLUMN IF NOT EXISTS length DECIMAL(10,2) DEFAULT 30,
      ADD COLUMN IF NOT EXISTS width DECIMAL(10,2) DEFAULT 20,
      ADD COLUMN IF NOT EXISTS height DECIMAL(10,2) DEFAULT 5,
      ADD COLUMN IF NOT EXISTS vendor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS platform_fee_percent DECIMAL(5,2) DEFAULT 10.00
    `);

    await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
    await pool.query(`
          ALTER TABLE products 
          ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE
        `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_products_uuid ON products(uuid)`);
    await pool.query(`UPDATE products SET uuid = gen_random_uuid() WHERE uuid IS NULL`);

    // 6. product_images
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_images (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        image_url VARCHAR(500) NOT NULL,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 7. cart_items
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cart_items (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, product_id)
      )
    `);

    // 8. wishlist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wishlist (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, product_id)
      )
    `);

    // 9. coupons 
    await pool.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        discount_type VARCHAR(20) CHECK (discount_type IN ('percentage','flat')),
        discount_value DECIMAL(10,2) NOT NULL,
        min_order_amount DECIMAL(10,2) DEFAULT 0,
        max_discount DECIMAL(10,2),
        usage_limit INTEGER DEFAULT 0,
        used_count INTEGER DEFAULT 0,
        expiry_date TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        is_hidden BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;`);
    await pool.query(`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS vendor_id INTEGER REFERENCES users(id) ON DELETE CASCADE;`);

    // 10. orders 
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        customer_name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20) NOT NULL,
        address TEXT NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS coupon_id INTEGER REFERENCES coupons(id),
      ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'COD',
      ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'Pending',
      ADD COLUMN IF NOT EXISTS order_status VARCHAR(50) DEFAULT 'Placed',
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS shiprocket_order_id VARCHAR(100),
      ADD COLUMN IF NOT EXISTS shiprocket_shipment_id VARCHAR(100),
      ADD COLUMN IF NOT EXISTS awb_code VARCHAR(100),
      ADD COLUMN IF NOT EXISTS house_no VARCHAR(255),
      ADD COLUMN IF NOT EXISTS street_area VARCHAR(255),
      ADD COLUMN IF NOT EXISTS landmark VARCHAR(255),
      ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(255);
    `);

    // 11. order_items
    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id),
        quantity INTEGER NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        vendor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        vendor_earning DECIMAL(10,2) DEFAULT 0
      )
    `);
    await pool.query(`
      ALTER TABLE order_items 
      ADD COLUMN IF NOT EXISTS vendor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS vendor_earning DECIMAL(10,2) DEFAULT 0;
    `);

    // PAYOUTS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payouts (
        id SERIAL PRIMARY KEY,
        vendor_id INTEGER REFERENCES users(id),
        amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending',
        bank_details TEXT,
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP
      );
    `);

    await pool.query(`
      ALTER TABLE payouts 
      ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
      ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);

    // 12. inventory
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        stock_quantity INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 13. banners
    await pool.query(`
      CREATE TABLE IF NOT EXISTS banners (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255),
        image_url VARCHAR(500),
        link VARCHAR(500),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`ALTER TABLE banners ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;`);
    await pool.query(`ALTER TABLE banners ALTER COLUMN image_url DROP NOT NULL;`);
    await pool.query(`ALTER TABLE banners ADD COLUMN IF NOT EXISTS subtitle VARCHAR(255);`);
    await pool.query(`ALTER TABLE banners ADD COLUMN IF NOT EXISTS button_text VARCHAR(255);`);
    await pool.query(`ALTER TABLE banners ADD COLUMN IF NOT EXISTS video_url VARCHAR(500);`);
    await pool.query(`ALTER TABLE banners ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'hero';`);
    await pool.query(`ALTER TABLE banners ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;`);
    await pool.query(`ALTER TABLE banners ADD COLUMN IF NOT EXISTS vendor_id INTEGER REFERENCES users(id) ON DELETE CASCADE;`);

    // 14. reviews
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      ALTER TABLE reviews 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS images TEXT[],
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'approved';
    `);
    await pool.query(`
      ALTER TABLE reviews 
      DROP CONSTRAINT IF EXISTS unique_user_product_review,
      ADD CONSTRAINT unique_user_product_review UNIQUE (user_id, product_id)
    `);

    // 15. returns
    await pool.query(`
      CREATE TABLE IF NOT EXISTS returns (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        video_url VARCHAR(500) NOT NULL,
        reason TEXT,
        status VARCHAR(50) DEFAULT 'Pending',
        admin_comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 16. menus & menu_items
    await pool.query(`
      CREATE TABLE IF NOT EXISTS menus (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id SERIAL PRIMARY KEY,
        menu_id INTEGER REFERENCES menus(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        link VARCHAR(255) NOT NULL,
        parent_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
        position INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 17. stock_notifications
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stock_notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        email VARCHAR(255),
        phone VARCHAR(20),
        status VARCHAR(20) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, product_id, email, phone)
      )
    `);
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stock_notifications' AND column_name='customer_name') THEN
          ALTER TABLE stock_notifications ADD COLUMN customer_name VARCHAR(255);
        END IF;
      END $$;
    `);
    await pool.query(`ALTER TABLE stock_notifications ADD COLUMN IF NOT EXISTS vendor_id INTEGER REFERENCES users(id);`);


    await pool.query(`
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id SERIAL PRIMARY KEY,
        vendor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        transaction_type VARCHAR(50) NOT NULL, -- 'credit', 'debit'
        amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'completed',
        description TEXT,
        order_id INTEGER REFERENCES orders(id),
        payout_id INTEGER REFERENCES payouts(id),
        platform_fee DECIMAL(10,2) DEFAULT 0,
        coupon_discount_applied DECIMAL(10,2) DEFAULT 0,
        original_amount DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);


    // SETTINGS TABLE
    await pool.query(`
          CREATE TABLE IF NOT EXISTS settings (
            id SERIAL PRIMARY KEY,
            key VARCHAR(100) UNIQUE NOT NULL,
            value TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

    await pool.query(`
        INSERT INTO settings (key, value)
        VALUES ('platform_fee_percent', '10.00')
        ON CONFLICT (key) DO NOTHING
      `);

    const defaultSettings = [
      { key: 'online_payment_discount', value: '0' },
      { key: 'cod_fee', value: '0' }
    ];

    for (const setting of defaultSettings) {
      await pool.query(`
        INSERT INTO settings (key, value)
        VALUES ($1, $2)
        ON CONFLICT (key) DO NOTHING
      `, [setting.key, setting.value]);
    }

    // SILENT SEED
    const adminEmail = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase().trim();
    const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "Admin@123";

    const userWithEmail = await pool.query("SELECT * FROM users WHERE LOWER(email) = $1", [adminEmail]);

    if (userWithEmail.rows.length > 0) {
      const existingUser = userWithEmail.rows[0];
      if (existingUser.role?.toLowerCase() !== 'super_admin') {
        await pool.query("UPDATE users SET role = 'super_admin' WHERE id = $1", [existingUser.id]);
        console.log(`✅ User ${adminEmail} promoted to super_admin`);
      }
      const hashedPassword = await bcrypt.hash(defaultAdminPassword, 10);
      await pool.query("UPDATE users SET password = $1 WHERE id = $2", [hashedPassword, existingUser.id]);
    } else {
      const hashedPassword = await bcrypt.hash(defaultAdminPassword, 10);
      await pool.query(`
        INSERT INTO users (name, email, password, role, status) 
        VALUES ($1, $2, $3, $4, $5)
      `, ["Super Admin", adminEmail, hashedPassword, "super_admin", "Active"]);
    }

  } catch (error) {
    console.error("❌ Database initialization error:", error);
  }
};

// ================= AUTH ROUTES =================
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || name.length < 3) return res.status(400).json({ message: "Name must be at least 3 characters" });
    if (!validator.isEmail(email)) return res.status(400).json({ message: "Invalid email" });
    if (!validator.isStrongPassword(password, { minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 })) {
      return res.status(400).json({ message: "Password must contain uppercase, lowercase, number and symbol" });
    }
    if (phone && !validator.isMobilePhone(phone, 'any')) return res.status(400).json({ message: "Invalid phone number" });

    const [first_name, ...rest] = name.trim().split(" ");
    const last_name = rest.join(" ");

    const userExists = await pool.query("SELECT * FROM users WHERE email=$1 OR phone=$2", [email, phone]);
    if (userExists.rows.length > 0) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await pool.query(
      `INSERT INTO users (name, email, password, phone, first_name, last_name) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id,name,email,phone,first_name,last_name,role`,
      [name, email, hashedPassword, phone, first_name, last_name]
    );

    res.json({ success: true, message: "User registered successfully", user: { ...newUser.rows[0], role: newUser.rows[0].role ? newUser.rows[0].role.toLowerCase() : "user" } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/api/auth/simple-login", async (req, res) => {
  try {
    const { phone, name } = req.body;
    if (!phone) return res.status(400).json({ message: "Phone number is required" });
    let userResult = await pool.query("SELECT * FROM users WHERE phone = $1", [phone]);
    let user;
    if (userResult.rows.length === 0) {
      if (!name) return res.status(400).json({ message: "User not found, please provide name to register" });
      const [first_name, ...rest] = name.trim().split(" ");
      const last_name = rest.join(" ");
      const newUserRes = await pool.query(`INSERT INTO users (name, phone, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING *`, [name, phone, first_name, last_name]);
      user = newUserRes.rows[0];
    } else {
      user = userResult.rows[0];
    }
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ success: true, token, user: { id: user.id, name: user.name, phone: user.phone, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: "Authentication failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    let { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });
    email = email.trim().toLowerCase();
    if (!validator.isEmail(email)) return res.status(400).json({ message: "Invalid email" });

    const userResult = await pool.query("SELECT * FROM users WHERE LOWER(email) = $1", [email]);
    if (userResult.rows.length === 0) return res.status(400).json({ message: "Invalid email or password" });

    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

    const role = user.role ? user.role.toLowerCase() : "user";
    const token = jwt.sign({ id: user.id, role }, JWT_SECRET, { expiresIn: "7d" });

    res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, role } });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

app.post("/api/auth/google-login", async (req, res) => {
  const { name, email } = req.body;
  const [first_name, ...rest] = name.split(" ");
  const last_name = rest.join(" ");
  let user = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
  if (user.rows.length === 0) {
    user = await pool.query(`INSERT INTO users(name,email,password,first_name,last_name) VALUES($1,$2,$3,$4,$5) RETURNING *`, [name, email, "google_auth", first_name, last_name]);
  }
  const token = jwt.sign({ id: user.rows[0].id, role: user.rows[0].role }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: user.rows[0] });
});

// ================= ADMIN WISHLIST ROUTES =================
app.get("/api/admin/wishlist", verifyToken, verifyAnyAdmin, async (req, res) => {
  try {
    let query = `
      SELECT w.id as wishlist_entry_id, w.user_id, w.product_id, w.created_at, u.name as user_name, u.phone as user_phone, p.name as product_name, p.main_image_url as product_image, p.price, p.stock_quantity
      FROM wishlist w
      JOIN users u ON w.user_id = u.id
      JOIN products p ON w.product_id = p.id
      WHERE 1=1
    `;
    let params = [];
    if (req.user.role !== 'super_admin') {
      query += ` AND p.vendor_id = $1`;
      params.push(req.user.id);
    }
    query += ` ORDER BY w.created_at DESC`;

    const result = await pool.query(query, params);
    res.json({ success: true, wishlist: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

app.delete("/api/admin/wishlist/:id", verifyToken, verifyAnyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM wishlist WHERE id = $1", [id]);
    res.json({ success: true, message: "Wishlist entry removed" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ================= PROFILE / ADDRESS ROUTES =================
app.get("/api/user/profile", verifyToken, async (req, res) => {
  const user = await pool.query(`SELECT id,first_name,last_name,email,phone,gender,address,city,state,pincode,balance,store_name FROM users WHERE id=$1`, [req.user.id]);
  res.json(user.rows[0]);
});

app.put("/api/user/profile", verifyToken, async (req, res) => {
  const { first_name, last_name, gender, address, city, state, pincode } = req.body;
  const fullName = `${first_name} ${last_name}`.trim();
  const result = await pool.query(
    `UPDATE users SET first_name=$1, last_name=$2, name=$3, gender=$4, address=$5, city=$6, state=$7, pincode=$8 WHERE id=$9 RETURNING *`,
    [first_name, last_name, fullName || "User", gender, address, city, state, pincode, req.user.id]
  );
  res.json(result.rows[0]);
});

app.post("/api/user/address", verifyToken, async (req, res) => {
  try {
    const { name, phone, address, city, state, pincode, type } = req.body;
    let finalAddress = address;
    if (!finalAddress && req.body.house_no && req.body.street_area) {
      finalAddress = `${req.body.house_no}, ${req.body.street_area}`;
    }
    if (!name || !phone || !finalAddress) return res.status(400).json({ message: "Required fields missing" });
    const result = await pool.query(
      `INSERT INTO addresses (user_id, name, phone, address, city, state, pincode, type, house_no, street_area, landmark) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [req.user.id, name, phone, finalAddress, city, state, pincode, type || "HOME", req.body.house_no || "", req.body.street_area || "", req.body.landmark || ""]
    );
    res.json({ success: true, message: "Address saved successfully", address: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: "Failed to save address" });
  }
});

app.get("/api/user/address", verifyToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM addresses WHERE user_id=$1 ORDER BY id DESC", [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch addresses" });
  }
});

app.put("/api/user/address/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, address, city, state, pincode, type } = req.body;
    let finalAddress = address;
    if (!finalAddress && req.body.house_no && req.body.street_area) finalAddress = `${req.body.house_no}, ${req.body.street_area}`;
    if (!name || !phone || !finalAddress) return res.status(400).json({ message: "Required fields missing" });
    const result = await pool.query(
      `UPDATE addresses SET name=$1, phone=$2, address=$3, city=$4, state=$5, pincode=$6, type=$7, house_no=$8, street_area=$9, landmark=$10 WHERE id=$11 AND user_id=$12 RETURNING *`,
      [name, phone, finalAddress, city, state, pincode, type || "HOME", req.body.house_no || "", req.body.street_area || "", req.body.landmark || "", id, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Update failed" });
  }
});

app.delete("/api/user/address/:id", verifyToken, async (req, res) => {
  try {
    await pool.query("DELETE FROM addresses WHERE id=$1 AND user_id=$2", [req.params.id, req.user.id]);
    res.json({ message: "Address deleted" });
  } catch (error) {
    res.status(500).json({ message: "Delete failed" });
  }
});

// ================= VENDOR PICKUP ADDRESS =================
app.get("/api/vendor/pickup-address", verifyToken, async (req, res) => {
  try {
    const user = await pool.query(
      `SELECT pickup_address_line1, pickup_address_line2, pickup_city, pickup_state, pickup_pincode, pickup_location_name 
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    const address = user.rows[0] || {};
    res.json({ success: true, address });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch pickup address" });
  }
});

app.put("/api/vendor/pickup-address", verifyToken, async (req, res) => {
  try {
    const {
      pickup_address_line1,
      pickup_address_line2,
      pickup_city,
      pickup_state,
      pickup_pincode,
      pickup_location_name
    } = req.body;
    await pool.query(
      `UPDATE users SET 
        pickup_address_line1 = $1,
        pickup_address_line2 = $2,
        pickup_city = $3,
        pickup_state = $4,
        pickup_pincode = $5,
        pickup_location_name = $6
       WHERE id = $7`,
      [pickup_address_line1, pickup_address_line2, pickup_city, pickup_state, pickup_pincode, pickup_location_name, req.user.id]
    );
    res.json({ success: true, message: "Pickup address updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Update failed" });
  }
});

app.get("/api/vendor/pickup-addresses", verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM vendor_pickup_addresses WHERE vendor_id = $1 ORDER BY is_default DESC, created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, addresses: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch addresses" });
  }
});

app.post("/api/vendor/pickup-addresses", verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { location_name, address_line1, address_line2, city, state, pincode, is_default } = req.body;
    await client.query("BEGIN");

    if (is_default) {
      await client.query(
        `UPDATE vendor_pickup_addresses SET is_default = false WHERE vendor_id = $1`,
        [req.user.id]
      );
    }

    const result = await client.query(
      `INSERT INTO vendor_pickup_addresses 
        (vendor_id, location_name, address_line1, address_line2, city, state, pincode, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [req.user.id, location_name, address_line1, address_line2, city, state, pincode, is_default || false]
    );

    await client.query("COMMIT");
    res.json({ success: true, address: result.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ success: false, message: "Failed to create address" });
  } finally {
    client.release();
  }
});

app.put("/api/vendor/pickup-addresses/:id", verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { location_name, address_line1, address_line2, city, state, pincode, is_default } = req.body;

    const check = await client.query(
      `SELECT id FROM vendor_pickup_addresses WHERE id = $1 AND vendor_id = $2`,
      [id, req.user.id]
    );
    if (check.rows.length === 0) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    await client.query("BEGIN");

    if (is_default) {
      await client.query(
        `UPDATE vendor_pickup_addresses SET is_default = false WHERE vendor_id = $1 AND id != $2`,
        [req.user.id, id]
      );
    }

    const result = await client.query(
      `UPDATE vendor_pickup_addresses SET
         location_name = $1,
         address_line1 = $2,
         address_line2 = $3,
         city = $4,
         state = $5,
         pincode = $6,
         is_default = $7,
         updated_at = NOW()
       WHERE id = $8 AND vendor_id = $9
       RETURNING *`,
      [location_name, address_line1, address_line2, city, state, pincode, is_default, id, req.user.id]
    );

    await client.query("COMMIT");
    res.json({ success: true, address: result.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ success: false, message: "Update failed" });
  } finally {
    client.release();
  }
});

app.delete("/api/vendor/pickup-addresses/:id", verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const check = await client.query(
      `SELECT id, is_default FROM vendor_pickup_addresses WHERE id = $1 AND vendor_id = $2`,
      [id, req.user.id]
    );
    if (check.rows.length === 0) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const isDefault = check.rows[0].is_default;

    await client.query("BEGIN");
    await client.query(`DELETE FROM vendor_pickup_addresses WHERE id = $1`, [id]);

    if (isDefault) {
      const newDefault = await client.query(
        `SELECT id FROM vendor_pickup_addresses WHERE vendor_id = $1 ORDER BY created_at ASC LIMIT 1`,
        [req.user.id]
      );
      if (newDefault.rows.length > 0) {
        await client.query(
          `UPDATE vendor_pickup_addresses SET is_default = true WHERE id = $2`,
          [newDefault.rows[0].id]
        );
      }
    }

    await client.query("COMMIT");
    res.json({ success: true, message: "Address deleted" });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ success: false, message: "Delete failed" });
  } finally {
    client.release();
  }
});

app.put("/api/vendor/pickup-addresses/:id/default", verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const check = await client.query(
      `SELECT id FROM vendor_pickup_addresses WHERE id = $1 AND vendor_id = $2`,
      [id, req.user.id]
    );
    if (check.rows.length === 0) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    await client.query("BEGIN");
    await client.query(
      `UPDATE vendor_pickup_addresses SET is_default = false WHERE vendor_id = $1`,
      [req.user.id]
    );
    await client.query(
      `UPDATE vendor_pickup_addresses SET is_default = true WHERE id = $1`,
      [id]
    );
    await client.query("COMMIT");

    res.json({ success: true, message: "Default address updated" });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ success: false, message: "Failed to set default" });
  } finally {
    client.release();
  }
});

// ================= ADMIN DASHBOARD =================
app.get("/api/admin/dashboard", verifyToken, verifyAnyAdmin, (req, res) => {
  res.json({ message: "Welcome Admin Dashboard" });
});

// ================= USER MANAGEMENT =================
app.get("/api/admin/users", verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const users = await pool.query(`SELECT id,name,email,phone,role,status,created_at FROM users ORDER BY created_at DESC`);
    res.json({ success: true, users: users.rows });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

app.put("/api/admin/users/role/:id", verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await pool.query("SELECT role FROM users WHERE id=$1", [id]);
    if (user.rows.length === 0) return res.status(404).json({ message: "User not found" });
    const currentRole = user.rows[0].role ? user.rows[0].role.toLowerCase() : "user";
    const newRole = currentRole === "vendor" ? "user" : "vendor";
    await pool.query("UPDATE users SET role=$1 WHERE id=$2", [newRole, id]);
    res.json({ success: true, message: "Role updated", role: newRole });
  } catch (err) {
    res.status(500).json({ message: "Failed to update role" });
  }
});

app.put("/api/admin/users/status/:id", verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await pool.query("SELECT status FROM users WHERE id=$1", [id]);
    if (user.rows.length === 0) return res.status(404).json({ message: "User not found" });
    const newStatus = user.rows[0].status === "Active" ? "Blocked" : "Active";
    await pool.query("UPDATE users SET status=$1 WHERE id=$2", [newStatus, id]);
    res.json({ success: true, status: newStatus });
  } catch (err) {
    res.status(500).json({ message: "Status update failed" });
  }
});

app.post("/api/admin/users/create-admin", verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const { name, email, password, phone, store_name, role } = req.body;

    if (!name || name.length < 3) return res.status(400).json({ success: false, message: "Name must be at least 3 characters" });
    if (!email || !validator.isEmail(email)) return res.status(400).json({ success: false, message: "Valid email is required" });
    if (!password || !validator.isStrongPassword(password, { minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 })) {
      return res.status(400).json({ success: false, message: "Password must be strong (min 8 chars, uppercase, lowercase, number, symbol)" });
    }
    if (phone && !validator.isMobilePhone(phone, 'any')) return res.status(400).json({ success: false, message: "Invalid phone number" });

    let finalRole = 'vendor';
    if (role && ['admin', 'vendor', 'super_admin'].includes(role)) {
      finalRole = role;
    } else if (req.body.is_super_admin) {
      finalRole = 'super_admin';
    }

    const existing = await pool.query("SELECT * FROM users WHERE LOWER(email) = $1 OR phone = $2", [email.toLowerCase(), phone]);
    if (existing.rows.length > 0) return res.status(400).json({ success: false, message: "User with this email or phone already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const [first_name, ...rest] = name.trim().split(" ");
    const last_name = rest.join(" ");

    const result = await pool.query(
      `INSERT INTO users (name, email, password, phone, role, first_name, last_name, status, store_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'Active', $8)
       RETURNING id, name, email, phone, role, status`,
      [name, email.toLowerCase(), hashedPassword, phone, finalRole, first_name, last_name, store_name || null]
    );

    res.json({ success: true, message: "Account created successfully", user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create account" });
  }
});

app.get("/api/admin/vendors", verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const users = await pool.query(`
      SELECT id, name, email, phone, role, status, created_at, store_name
      FROM users
      WHERE LOWER(role) = 'vendor'
      ORDER BY created_at DESC
    `);
    res.json({ success: true, users: users.rows });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch vendors" });
  }
});

app.get("/api/vendor/customers", verifyToken, verifyAnyAdmin, async (req, res) => {
  try {
    const users = await pool.query(`
      SELECT u.id, u.name, u.email, u.phone, u.role, u.status, u.created_at,
             COALESCE(orders.total_orders, 0)::int AS total_orders,
             COALESCE(orders.total_purchase, 0)::float AS total_purchase
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS total_orders, SUM(total_amount) AS total_purchase
        FROM orders
        GROUP BY user_id
      ) orders ON u.id = orders.user_id
      WHERE LOWER(u.role) = 'user'
      ORDER BY u.created_at DESC
    `);
    res.json({ success: true, users: users.rows });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch customers" });
  }
});

// ================= REVIEWS =================
app.get("/api/admin/reviews", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    let query = `SELECT r.*, u.name as user_name, u.email as user_email, p.name as product_name, p.main_image_url FROM reviews r JOIN users u ON r.user_id = u.id JOIN products p ON r.product_id = p.id WHERE 1=1`;
    let params = [];
    if (req.user.role !== 'super_admin') {
      query += ` AND p.vendor_id = $1`;
      params.push(req.user.id);
    }
    query += ` ORDER BY r.created_at DESC`;
    const result = await pool.query(query, params);
    res.json({ success: true, reviews: result.rows });
  } catch (error) { res.status(500).json({ message: "Failed to fetch reviews" }); }
});

app.put("/api/admin/reviews/:id/status", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      const check = await pool.query("SELECT p.vendor_id FROM reviews r JOIN products p ON r.product_id = p.id WHERE r.id = $1", [req.params.id]);
      if (check.rows.length === 0 || check.rows[0].vendor_id !== req.user.id) {
        return res.status(403).json({ success: false, message: "Unauthorized" });
      }
    }
    const { status } = req.body;
    const result = await pool.query("UPDATE reviews SET status=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *", [status, req.params.id]);
    res.json({ success: true, review: result.rows[0] });
  } catch (error) { res.status(500).json({ message: "Failed to update review status" }); }
});

app.delete("/api/admin/reviews/:id", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      const check = await pool.query("SELECT p.vendor_id FROM reviews r JOIN products p ON r.product_id = p.id WHERE r.id = $1", [req.params.id]);
      if (check.rows.length === 0 || check.rows[0].vendor_id !== req.user.id) {
        return res.status(403).json({ success: false, message: "Unauthorized" });
      }
    }
    await pool.query("DELETE FROM reviews WHERE id = $1", [req.params.id]);
    res.json({ success: true, message: "Review deleted successfully" });
  } catch (error) { res.status(500).json({ success: false, message: "Failed to delete review" }); }
});

// ================= CATEGORIES =================
app.post("/api/admin/categories", verifyToken, verifyAdminVendorIndividualAccess, upload.single("image"), async (req, res) => {
  try {
    const { name, description } = req.body;
    const vendor_id = req.user.role === 'super_admin' ? null : req.user.id;

    if (!name) return res.status(400).json({ message: "Category name is required" });
    const existing = await pool.query("SELECT * FROM categories WHERE name=$1", [name]);
    if (existing.rows.length > 0) return res.status(400).json({ message: "Category already exists" });
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;
    const result = await pool.query(
      `INSERT INTO categories (name, description, image_url, vendor_id) VALUES ($1,$2,$3,$4) RETURNING *`,
      [name, description, image_url, vendor_id]
    );
    res.json({ success: true, message: "Category created successfully", category: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Category creation failed" });
  }
});

app.get("/api/categories", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM categories WHERE is_active=true ORDER BY display_order ASC, created_at DESC");
    res.json({ success: true, categories: result.rows });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

app.put("/api/admin/categories/reorder", verifyToken, verifyAdminOrSuperAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { order } = req.body;
    await client.query("BEGIN");
    for (const item of order) {
      await client.query("UPDATE categories SET display_order = $1 WHERE id = $2", [item.display_order, item.id]);
    }
    await client.query("COMMIT");
    res.json({ success: true, message: "Categories reordered" });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Reorder failed" });
  } finally {
    client.release();
  }
});

app.get("/api/admin/categories", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";

    let query = `SELECT * FROM categories WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) FROM categories WHERE 1=1`;
    let params = [];
    let paramIdx = 1;

    if (req.user.role !== 'super_admin') {
      query += ` AND (vendor_id = $${paramIdx} OR vendor_id IS NULL)`;
      countQuery += ` AND (vendor_id = $${paramIdx} OR vendor_id IS NULL)`;
      params.push(req.user.id);
      paramIdx++;
    }

    if (search) {
      query += ` AND name ILIKE $${paramIdx}`;
      countQuery += ` AND name ILIKE $${paramIdx}`;
      params.push(`%${search}%`);
      paramIdx++;
    }
    query += ` ORDER BY display_order ASC, created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;

    const countResult = await pool.query(countQuery, params.slice(0, paramIdx - 1));
    const totalCount = parseInt(countResult.rows[0].count);
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json({ success: true, categories: result.rows, pagination: { totalCount, totalPages: Math.ceil(totalCount / limit), currentPage: page, limit } });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

app.put("/api/admin/categories/:id", verifyToken, verifyAdminVendorIndividualAccess, upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.role !== 'super_admin') {
      const check = await pool.query("SELECT vendor_id FROM categories WHERE id=$1", [id]);
      if (check.rows.length === 0 || check.rows[0].vendor_id !== req.user.id) {
        return res.status(403).json({ error: "Unauthorized to edit this category" });
      }
    }

    const { name, description, is_active } = req.body;
    let image_url = null;
    if (req.file) image_url = `/uploads/${req.file.filename}`;
    const result = await pool.query(
      `UPDATE categories SET name=$1, description=$2, is_active=$3, ${image_url ? "image_url=$4," : ""} updated_at=NOW() WHERE id=${image_url ? "$5" : "$4"} RETURNING *`,
      image_url ? [name, description, is_active, image_url, id] : [name, description, is_active, id]
    );
    res.json({ success: true, category: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Category update failed" });
  }
});

app.delete("/api/admin/categories/:id", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      const check = await pool.query("SELECT vendor_id FROM categories WHERE id=$1", [req.params.id]);
      if (check.rows.length === 0 || check.rows[0].vendor_id !== req.user.id) {
        return res.status(403).json({ error: "Unauthorized to delete this category" });
      }
    }
    await pool.query("DELETE FROM categories WHERE id=$1", [req.params.id]);
    res.json({ success: true, message: "Category deleted" });
  } catch (error) {
    res.status(500).json({ error: "Delete failed" });
  }
});

// ================= SUBCATEGORIES =================
app.post("/api/admin/subcategories", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    const { name, category_id, description } = req.body;
    const vendor_id = req.user.role === 'super_admin' ? null : req.user.id;
    const result = await pool.query(`INSERT INTO sub_categories(name, category_id, description, vendor_id) VALUES($1,$2,$3,$4) RETURNING *`, [name, category_id, description, vendor_id]);
    res.json({ success: true, subcategory: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Subcategory creation failed" });
  }
});

app.get("/api/subcategories", async (req, res) => {
  try {
    const result = await pool.query(`SELECT s.*, c.name as category_name FROM sub_categories s LEFT JOIN categories c ON s.category_id = c.id ORDER BY s.created_at DESC`);
    res.json({ success: true, subcategories: result.rows });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch subcategories" });
  }
});

app.get("/api/admin/subcategories", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    let query = `SELECT s.*, c.name as category_name FROM sub_categories s LEFT JOIN categories c ON s.category_id = c.id WHERE 1=1`;
    let params = [];
    if (req.user.role !== 'super_admin') {
      query += ` AND (s.vendor_id = $1 OR s.vendor_id IS NULL)`;
      params.push(req.user.id);
    }
    query += ` ORDER BY s.created_at DESC`;
    const result = await pool.query(query, params);
    res.json({ success: true, subcategories: result.rows });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch subcategories" });
  }
});

app.get("/api/categories/:id/subcategories", async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM sub_categories WHERE category_id=$1 AND is_active=true`, [req.params.id]);
    res.json({ success: true, subcategories: result.rows });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch subcategories" });
  }
});

app.put("/api/admin/subcategories/:id", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      const check = await pool.query("SELECT vendor_id FROM sub_categories WHERE id=$1", [req.params.id]);
      if (check.rows.length === 0 || check.rows[0].vendor_id !== req.user.id) return res.status(403).json({ error: "Unauthorized" });
    }
    const { name, description, category_id, is_active } = req.body;
    const result = await pool.query(`UPDATE sub_categories SET name=$1, description=$2, category_id=$3, is_active=$4, updated_at=NOW() WHERE id=$5 RETURNING *`, [name, description, category_id, is_active, req.params.id]);
    res.json({ success: true, subcategory: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Update failed" });
  }
});

app.delete("/api/admin/subcategories/:id", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      const check = await pool.query("SELECT vendor_id FROM sub_categories WHERE id=$1", [req.params.id]);
      if (check.rows.length === 0 || check.rows[0].vendor_id !== req.user.id) return res.status(403).json({ error: "Unauthorized" });
    }
    await pool.query("DELETE FROM sub_categories WHERE id=$1", [req.params.id]);
    res.json({ success: true, message: "Subcategory deleted" });
  } catch (error) {
    res.status(500).json({ error: "Delete failed" });
  }
});

// ================= CHECK SKU & PRODUCT CODE =================
app.get("/api/admin/products/check-sku", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    const { sku, excludeId } = req.query;
    if (!sku) return res.status(400).json({ success: false, message: "SKU is required" });

    let query = "SELECT id FROM products WHERE sku ILIKE $1";
    let params = [sku];
    if (excludeId && !isNaN(parseInt(excludeId))) {
      query += " AND id != $2";
      params.push(parseInt(excludeId));
    }
    const existing = await pool.query(query, params);
    res.json({ success: true, exists: existing.rows.length > 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/api/admin/products/suggest-sku", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    let { base = "SKU" } = req.query;
    if (!base || base.trim() === "") base = "SKU";
    base = base.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6);
    if (base.length < 2) base = "SKU";

    let counter = 1;
    let candidate = "";
    let found = false;

    while (!found) {
      candidate = `${base}-${counter.toString().padStart(3, '0')}`;
      const existing = await pool.query("SELECT id FROM products WHERE sku ILIKE $1", [candidate]);
      if (existing.rows.length === 0) {
        found = true;
      } else {
        counter++;
      }
    }
    res.json({ success: true, suggestedSku: candidate });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/api/admin/products/check-product-code", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    const { code, excludeId } = req.query;
    if (!code) return res.status(400).json({ success: false, message: "Product code is required" });

    let query = "SELECT id FROM products WHERE product_code ILIKE $1";
    let params = [code];
    if (excludeId && !isNaN(parseInt(excludeId))) {
      query += " AND id != $2";
      params.push(parseInt(excludeId));
    }
    const existing = await pool.query(query, params);
    res.json({ success: true, exists: existing.rows.length > 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/api/admin/products/next-available-code", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    let basePattern = "JAYA-";
    let counter = 1;
    let found = false;
    let candidate = "";

    while (!found) {
      candidate = `${basePattern}${counter.toString().padStart(3, '0')}`;
      const existing = await pool.query("SELECT id FROM products WHERE product_code = $1", [candidate]);
      if (existing.rows.length === 0) {
        found = true;
      } else {
        counter++;
      }
    }
    res.json({ success: true, nextId: candidate });
  } catch (err) {
    res.json({ success: true, nextId: "JAYA-001" });
  }
});

// ================= PRODUCTS =================
app.post(
  "/api/admin/products",
  verifyToken,
  verifyAdminVendorIndividualAccess,
  uploadProductMedia.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]),
  async (req, res) => {
    const uploadedFiles = [];
    try {
      const { name, description, old_price, price, category_id, sub_category_id, sku, stock_quantity, is_featured, color, product_code, weight, length, width, height } = req.body;
      if (!name || !price || !category_id) throw new Error("Name, price and category required");

      let main_image_url = null; let video_url = null;
      if (req.files?.image) { main_image_url = `/uploads/products/images/${req.files.image[0].filename}`; uploadedFiles.push(req.files.image[0].path); }
      if (req.files?.video) { video_url = `/uploads/products/videos/${req.files.video[0].filename}`; uploadedFiles.push(req.files.video[0].path); }

      const result = await pool.query(
        `INSERT INTO products (name, description, old_price, price, category_id, sub_category_id, main_image_url, video_url, sku, stock_quantity, is_featured, color, product_code, weight, length, width, height, vendor_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
        [name, description, old_price, price, category_id, sub_category_id, main_image_url, video_url, sku, stock_quantity || 0, is_featured === "true" || is_featured === true, color, product_code, weight || 0.7, length || 30, width || 20, height || 5, req.user.id]
      );
      res.json({ success: true, product: result.rows[0] });
    } catch (error) {
      for (const filePath of uploadedFiles) { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); }
      res.status(500).json({ error: error.message || "Product creation failed" });
    }
  }
);

app.get("/api/products", async (req, res) => {
  try {
    const result = await pool.query(`SELECT p.*, c.name AS category_name, s.name AS subcategory_name, (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY display_order ASC LIMIT 1) AS hover_image FROM products p LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN sub_categories s ON p.sub_category_id = s.id WHERE p.is_active = true ORDER BY p.created_at DESC`);
    res.json({ success: true, products: result.rows });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

app.get("/api/product/by-code/:code", async (req, res) => {
  try {
    const result = await pool.query(`SELECT p.*, c.name AS category_name, s.name AS subcategory_name FROM products p LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN sub_categories s ON p.sub_category_id = s.id WHERE p.product_code = $1 AND p.is_active = true`, [req.params.code]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: "Product not found" });
    const images = await pool.query(`SELECT image_url FROM product_images WHERE product_id = $1 ORDER BY display_order`, [result.rows[0].id]);
    res.json({ success: true, product: { ...result.rows[0], images: images.rows.map(r => r.image_url) } });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch by code" });
  }
});

app.get("/api/product/:uuid", async (req, res) => {
  try {
    const { uuid } = req.params; const { product_code } = req.query;
    let product = null;
    if (uuid) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
      if (isUuid) {
        const result = await pool.query(`SELECT p.*, c.name AS category_name, s.name AS subcategory_name FROM products p LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN sub_categories s ON p.sub_category_id = s.id WHERE p.uuid = $1 AND p.is_active = true`, [uuid]);
        if (result.rows.length > 0) product = result.rows[0];
      } else if (!isNaN(uuid)) {
        const result = await pool.query(`SELECT p.*, c.name AS category_name, s.name AS subcategory_name FROM products p LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN sub_categories s ON p.sub_category_id = s.id WHERE p.id = $1 AND p.is_active = true`, [parseInt(uuid)]);
        if (result.rows.length > 0) product = result.rows[0];
      }
    }
    if (!product && product_code) {
      const result = await pool.query(`SELECT p.*, c.name AS category_name, s.name AS subcategory_name FROM products p LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN sub_categories s ON p.sub_category_id = s.id WHERE p.product_code = $1 AND p.is_active = true`, [product_code]);
      if (result.rows.length > 0) product = result.rows[0];
    }
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    const images = await pool.query(`SELECT image_url FROM product_images WHERE product_id = $1 ORDER BY display_order ASC`, [product.id]);
    res.json({ success: true, product: { ...product, images: images.rows.map(row => row.image_url) } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch product" });
  }
});

app.get("/api/admin/products/next-id", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    const result = await pool.query(`SELECT product_code FROM products WHERE product_code LIKE 'JAYA-%' ORDER BY id DESC LIMIT 1`);
    let nextId = "JAYA-001";
    if (result && result.rows.length > 0) {
      const lastId = result.rows[0].product_code;
      if (lastId && lastId.includes("-")) {
        const parts = lastId.split("-");
        const lastNumber = parseInt(parts[1]);
        if (!isNaN(lastNumber)) nextId = `JAYA-${(lastNumber + 1).toString().padStart(3, '0')}`;
      }
    }
    res.json({ success: true, nextId });
  } catch (error) {
    res.json({ success: true, nextId: "JAYA-001" });
  }
});

app.get("/api/admin/products", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { search } = req.query;

    let query = `SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) FROM products p WHERE 1=1`;
    let params = [];
    let paramIdx = 1;

    const userRole = req.user.role?.toLowerCase();
    if (userRole !== 'super_admin') {
      query += ` AND p.vendor_id = $${paramIdx}`;
      countQuery += ` AND p.vendor_id = $${paramIdx}`;
      params.push(req.user.id);
      paramIdx++;
    }

    if (search) {
      query += ` AND p.name ILIKE $${paramIdx}`;
      countQuery += ` AND p.name ILIKE $${paramIdx}`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    const totalRes = await pool.query(countQuery, params.slice(0, paramIdx - 1));
    const totalCount = parseInt(totalRes.rows[0].count);

    const result = await pool.query(query, [...params, limit, offset]);

    res.json({
      success: true,
      products: result.rows,
      pagination: { totalCount, totalPages: Math.ceil(totalCount / limit), currentPage: page }
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

app.put(
  "/api/admin/products/:id",
  verifyToken,
  verifyAdminVendorIndividualAccess,
  uploadProductMedia.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]),
  async (req, res) => {
    const uploadedFiles = [];
    try {
      const { id } = req.params;
      let { name, description, old_price, price, stock_quantity, is_featured, is_active, color, sku, product_code, weight, length, width, height, category_id, sub_category_id } = req.body;

      const existing = await pool.query("SELECT main_image_url, video_url, vendor_id FROM products WHERE id = $1", [id]);
      if (existing.rows.length === 0) throw new Error("Product not found");
      const userRole = req.user.role?.toLowerCase();
      if (userRole !== 'super_admin' && existing.rows[0].vendor_id !== req.user.id) {
        throw new Error("Unauthorized to edit this product");
      }

      price = price !== undefined && price !== "" ? Number(price) : undefined;
      old_price = old_price !== undefined && old_price !== "" ? Number(old_price) : undefined;
      stock_quantity = stock_quantity !== undefined && stock_quantity !== "" ? Number(stock_quantity) : undefined;
      is_featured = is_featured === "true" || is_featured === true || (is_featured === "false" || is_featured === false ? false : undefined);
      is_active = is_active === "true" || is_active === true || (is_active === "false" || is_active === false ? false : undefined);
      const categoryId = category_id !== undefined && category_id !== "" ? Number(category_id) : undefined;
      const subCategoryId = sub_category_id !== undefined && sub_category_id !== "" ? Number(sub_category_id) : undefined;

      let main_image_url = null; let video_url = null;
      if (req.files?.image) { main_image_url = `/uploads/products/images/${req.files.image[0].filename}`; uploadedFiles.push(req.files.image[0].path); }
      if (req.files?.video) { video_url = `/uploads/products/videos/${req.files.video[0].filename}`; uploadedFiles.push(req.files.video[0].path); }

      const updates = []; const values = []; let paramCount = 1;
      const addField = (field, value) => { if (value !== undefined) { updates.push(`${field} = $${paramCount++}`); values.push(value); } };

      addField('name', name); addField('description', description); addField('old_price', old_price); addField('price', price); addField('stock_quantity', stock_quantity); addField('is_featured', is_featured); addField('is_active', is_active); addField('color', color); addField('sku', sku); addField('product_code', product_code); addField('weight', weight !== undefined && weight !== "" ? Number(weight) : undefined); addField('length', length !== undefined && length !== "" ? Number(length) : undefined); addField('width', width !== undefined && width !== "" ? Number(width) : undefined); addField('height', height !== undefined && height !== "" ? Number(height) : undefined); addField('category_id', categoryId); addField('sub_category_id', subCategoryId);
      if (main_image_url) addField('main_image_url', main_image_url);
      if (video_url) addField('video_url', video_url);
      updates.push(`updated_at = NOW()`); values.push(id);

      if (updates.length > 1) {
        const query = `UPDATE products SET ${updates.join(", ")} WHERE id = $${paramCount} RETURNING *`;
        const result = await pool.query(query, values);
        res.json({ success: true, product: result.rows[0] });
      } else {
        res.json({ success: true, message: "No changes detected" });
      }
    } catch (error) {
      res.status(500).json({ success: false, message: error.message || "Update failed" });
    }
  }
);

app.get("/api/admin/products/:id", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    const result = await pool.query(`SELECT p.*, c.name AS category_name, s.name AS subcategory_name FROM products p LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN sub_categories s ON p.sub_category_id = s.id WHERE p.id = $1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: "Product not found" });
    const userRole = req.user.role?.toLowerCase();
    if (userRole !== 'super_admin' && result.rows[0].vendor_id !== req.user.id) return res.status(403).json({ success: false, message: "Unauthorized" });
    res.json({ success: true, product: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch product" });
  }
});

app.delete("/api/admin/products/:id", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    const existing = await pool.query("SELECT vendor_id FROM products WHERE id = $1", [req.params.id]);
    const userRole = req.user.role?.toLowerCase();
    if (userRole !== 'super_admin' && existing.rows[0]?.vendor_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    await pool.query("DELETE FROM products WHERE id=$1", [req.params.id]);
    res.json({ success: true, message: "Product permanently deleted", action: "deleted" });
  } catch (error) {
    if (error.code === '23503') {
      await pool.query("UPDATE products SET is_active = false WHERE id = $1", [req.params.id]);
      return res.json({
        success: true,
        message: "Product cannot be deleted because it has associated orders. It has been marked as hidden (inactive) instead.",
        action: "hidden"
      });
    }
    res.status(500).json({ success: false, error: "Delete failed" });
  }
});

app.post("/api/admin/products/bulk-delete", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    const { ids } = req.body;
    const userRole = req.user.role?.toLowerCase();
    for (const productId of ids) {
      try {
        const existing = await pool.query("SELECT vendor_id FROM products WHERE id = $1", [productId]);
        if (userRole !== 'super_admin' && existing.rows[0]?.vendor_id !== req.user.id) continue;
        await pool.query("DELETE FROM products WHERE id=$1", [productId]);
      } catch (err) {
        if (err.code === '23503') await pool.query("UPDATE products SET is_active=false WHERE id=$1", [productId]);
      }
    }
    res.json({ success: true, message: "Products processed" });
  } catch (error) {
    res.status(500).json({ error: "Bulk delete failed" });
  }
});

app.patch("/api/admin/products/:id/stock", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    const existing = await pool.query("SELECT vendor_id FROM products WHERE id = $1", [req.params.id]);
    const userRole = req.user.role?.toLowerCase();
    if (userRole !== 'super_admin' && existing.rows[0]?.vendor_id !== req.user.id) return res.status(403).json({ success: false, message: "Unauthorized" });
    const result = await pool.query(`UPDATE products SET stock_quantity=$1, updated_at=NOW() WHERE id=$2 RETURNING *`, [req.body.stock_quantity, req.params.id]);
    res.json({ success: true, product: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Stock update failed" });
  }
});

app.post("/api/admin/system/reset", verifyToken, verifySuperAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM order_items");
    await client.query("DELETE FROM orders");
    await client.query("DELETE FROM cart_items");
    await client.query("DELETE FROM wishlist");
    await client.query("DELETE FROM reviews");
    await client.query("DELETE FROM returns");
    await client.query("DELETE FROM users WHERE role != 'admin' AND role != 'Admin' AND role != 'super_admin' AND role != 'Super Admin'");
    await client.query("UPDATE products SET is_active = true");
    await client.query("COMMIT");
    res.json({ success: true, message: "System reset successful. All orders, reviews, and non-admin users cleared." });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "System reset failed" });
  } finally {
    client.release();
  }
});

app.patch("/api/admin/products/:id/price", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { price, old_price } = req.body;
    if (!price) return res.status(400).json({ message: "Price required" });

    const existing = await pool.query("SELECT vendor_id FROM products WHERE id = $1", [id]);
    const userRole = req.user.role?.toLowerCase();
    if (userRole !== 'super_admin' && existing.rows[0]?.vendor_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const result = await pool.query(
      `UPDATE products SET price=$1, old_price=$2, updated_at=NOW() WHERE id=$3 RETURNING *`,
      [price, old_price, id]
    );

    res.json({ success: true, message: "Price updated successfully", product: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Price update failed" });
  }
});

// ================= STOCK NOTIFICATION ROUTES =================
app.post("/api/stock-notification", async (req, res) => {
  try {
    const { product_id, user_id, customer_name, email, phone } = req.body;
    if (!product_id) return res.status(400).json({ success: false, message: "Product ID is required" });

    const prodRes = await pool.query("SELECT vendor_id FROM products WHERE id = $1", [product_id]);
    const vendor_id = prodRes.rows[0]?.vendor_id || null;

    let existingQuery = "SELECT * FROM stock_notifications WHERE product_id = $1 AND (";
    let conditions = []; let params = [product_id]; let paramIdx = 2;
    if (user_id) { conditions.push(`user_id = $${paramIdx++}`); params.push(user_id); }
    if (email) { conditions.push(`email = $${paramIdx++}`); params.push(email); }
    if (phone) { conditions.push(`phone = $${paramIdx++}`); params.push(phone); }

    if (conditions.length > 0) {
      existingQuery += conditions.join(" OR ") + ")";
      const existing = await pool.query(existingQuery, params);
      if (existing.rows.length > 0) return res.status(200).json({ success: true, message: "Notification request already recorded!" });
    }

    await pool.query(
      "INSERT INTO stock_notifications (product_id, user_id, customer_name, email, phone, vendor_id) VALUES ($1::int, $2::int, $3, $4, $5, $6)",
      [parseInt(product_id), (user_id && !isNaN(parseInt(user_id))) ? parseInt(user_id) : null, customer_name || null, email || null, phone || null, vendor_id]
    );
    res.json({ success: true, message: "Notification request saved successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to save notification request" });
  }
});

app.get("/api/stock-notification/admin", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    let query = `
      SELECT sn.*, p.name as product_name, p.main_image_url, p.product_code as sku
      FROM stock_notifications sn
      JOIN products p ON sn.product_id = p.id
      WHERE 1=1`;

    let params = [];
    const userRole = req.user.role?.toLowerCase();
    if (userRole !== 'super_admin') {
      query += ` AND p.vendor_id = $1`;
      params.push(req.user.id);
    }

    const result = await pool.query(query + " ORDER BY sn.created_at DESC", params);
    res.json({ success: true, notifications: result.rows });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

app.delete("/api/stock-notification/admin/:id", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    await pool.query("DELETE FROM stock_notifications WHERE id = $1", [req.params.id]);
    res.json({ success: true, message: "Notification deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete notification" });
  }
});

app.get("/api/stock-notification/check/:productId", verifyToken, async (req, res) => {
  try {
    const productId = req.params.productId;
    const userId = req.user.id;
    const userResult = await pool.query("SELECT phone FROM users WHERE id = $1", [userId]);
    const userPhone = userResult.rows[0]?.phone;

    let query = "SELECT id FROM stock_notifications WHERE product_id = $1 AND (";
    const params = [productId];
    let idx = 2;

    if (userId) { query += `user_id = $${idx++}`; params.push(userId); }
    if (userPhone) {
      if (userId) query += " OR ";
      query += `phone = $${idx++}`;
      params.push(userPhone);
    }
    query += ") LIMIT 1";

    if (!userId && !userPhone) return res.json({ success: true, requested: false });

    const result = await pool.query(query, params);
    res.json({ success: true, requested: result.rows.length > 0 });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to check notification status" });
  }
});

// ================= PRODUCT IMAGES =================
app.post("/api/admin/products/:id/images", verifyToken, verifyAdminVendorIndividualAccess, upload.array("images", 20), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await pool.query("SELECT vendor_id FROM products WHERE id = $1", [id]);
    const userRole = req.user.role?.toLowerCase();
    if (userRole !== 'super_admin' && existing.rows[0]?.vendor_id !== req.user.id) return res.status(403).json({ message: "Unauthorized" });

    for (let i = 0; i < req.files.length; i++) {
      const imageUrl = `/uploads/${req.files[i].filename}`;
      await pool.query(`INSERT INTO product_images(product_id,image_url,display_order) VALUES($1,$2,$3)`, [id, imageUrl, i]);
    }
    res.json({ success: true, message: "Images uploaded successfully" });
  } catch (error) {
    res.status(500).json({ error: "Image upload failed" });
  }
});

app.get("/api/products/:id/images", async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM product_images WHERE product_id=$1 ORDER BY display_order ASC`, [req.params.id]);
    res.json({ success: true, images: result.rows });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch images" });
  }
});

app.delete("/api/admin/product-images/:id", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    await pool.query("DELETE FROM product_images WHERE id=$1", [req.params.id]);
    res.json({ success: true, message: "Image deleted" });
  } catch (error) {
    res.status(500).json({ error: "Delete failed" });
  }
});

app.patch("/api/admin/product-images/:id/order", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { display_order } = req.body;
    const result = await pool.query(`UPDATE product_images SET display_order=$1 WHERE id=$2 RETURNING *`, [display_order, id]);
    res.json({ success: true, image: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Update failed" });
  }
});

// ================= USER ORDER STATS =================
app.get("/api/admin/user-orders/:id", verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount),0) as total_purchase,
        COALESCE(SUM(discount),0) as total_discount,
        MAX(created_at) as last_order_date
      FROM orders
      WHERE user_id=$1
    `, [id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Order stats failed" });
  }
});

// ================= ORDERS =================
app.get("/api/admin/orders", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    const userRole = req.user.role?.toLowerCase();
    let result;

    if (userRole === 'super_admin') {
      result = await pool.query(`
        SELECT o.*, 
          COALESCE(
            (SELECT json_agg(json_build_object('id', oi.id, 'name', p.name, 'price', oi.price, 'quantity', oi.quantity, 'image', p.main_image_url, 'vendor_id', p.vendor_id, 'product_code', p.product_code))
             FROM order_items oi 
             JOIN products p ON oi.product_id = p.id 
             WHERE oi.order_id = o.id),
            '[]'::json
          ) as items
        FROM orders o 
        ORDER BY o.created_at DESC
      `);
    } else {
      result = await pool.query(`
        SELECT o.*, 
          COALESCE(
            (SELECT json_agg(json_build_object('id', oi.id, 'name', p.name, 'price', oi.price, 'quantity', oi.quantity, 'image', p.main_image_url, 'vendor_id', p.vendor_id, 'product_code', p.product_code))
             FROM order_items oi 
             JOIN products p ON oi.product_id = p.id 
             WHERE oi.order_id = o.id AND p.vendor_id = $1),
            '[]'::json
          ) as items
        FROM orders o
        WHERE EXISTS (
          SELECT 1 FROM order_items oi2
          JOIN products p2 ON oi2.product_id = p2.id
          WHERE oi2.order_id = o.id AND p2.vendor_id = $1
        )
        ORDER BY o.created_at DESC
      `, [req.user.id]);
    }

    const orders = result.rows.map(order => ({
      ...order,
      items: order.items || []
    }));

    res.json({ success: true, orders });
  } catch (error) {
    console.error("Orders fetch error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================= ORDER STATUS UPDATE - ADD TO VENDOR BALANCE =================

app.put("/api/admin/orders/:id/status", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  const client = await pool.connect();
  try {
    const { status } = req.body;
    const userRole = req.user.role?.toLowerCase();

    await client.query("BEGIN");

    if (userRole !== 'super_admin') {
      const orderCheck = await client.query(`
        SELECT DISTINCT o.id FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        WHERE o.id = $1 AND p.vendor_id = $2
      `, [req.params.id, req.user.id]);
      if (orderCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(403).json({ success: false, message: "Unauthorized to update this order" });
      }
    }

    await client.query(
      `UPDATE orders SET order_status = $1, updated_at = NOW() WHERE id = $2`,
      [status, req.params.id]
    );

    // When order is Delivered, add earnings to vendor balance
    if (status === 'Delivered') {
      const items = await client.query(`
        SELECT oi.*, p.name as product_name, p.platform_fee_percent, o.discount as order_discount
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN orders o ON oi.order_id = o.id
        WHERE oi.order_id = $1 AND oi.vendor_id IS NOT NULL
      `, [req.params.id]);

      console.log("Adding to vendor balance:", items.rows);

      for (let item of items.rows) {
        if (item.vendor_id && item.vendor_earning > 0) {
          // Add to balance
          await client.query(
            `UPDATE users SET balance = balance + $1 WHERE id = $2`,
            [parseFloat(item.vendor_earning), item.vendor_id]
          );

          // Log wallet transaction for credit
          const platformFeeAmount = (parseFloat(item.price) * item.quantity) * (parseFloat(item.platform_fee_percent) / 100);
          const couponDiscount = parseFloat(item.order_discount || 0);

          await client.query(
            `INSERT INTO wallet_transactions 
              (vendor_id, transaction_type, amount, status, description, order_id, platform_fee, coupon_discount_applied, original_amount) 
             VALUES ($1, 'credit', $2, 'completed', $3, $4, $5, $6, $7)`,
            [
              item.vendor_id,
              parseFloat(item.vendor_earning),
              `Earnings from Order #${req.params.id} - ${item.product_name}`,
              req.params.id,
              platformFeeAmount,
              couponDiscount,
              parseFloat(item.price) * item.quantity
            ]
          );

          console.log(`Added ₹${item.vendor_earning} to vendor ${item.vendor_id}`);
        }
      }
    }

    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Order status update error:", err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});
app.get("/api/orders", verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, 
        (SELECT json_agg(json_build_object('id', oi.id, 'product_id', oi.product_id, 'name', p.name, 'image', p.main_image_url, 'quantity', oi.quantity, 'price', oi.price)) 
        FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id) as items
      FROM orders o WHERE o.user_id = $1 ORDER BY o.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

// ================= ORDERS - FIXED COUPON DISCOUNT FOR VENDOR EARNINGS =================

app.post("/api/orders", verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const {
      customer_name,
      email,
      phone,
      address,
      total_amount,
      discount,
      coupon_id,
      payment_method,
      cartItems,
      house_no,
      street_area,
      landmark
    } = req.body;

    if (!cartItems || cartItems.length === 0) throw new Error("Cart is empty");

    // Calculate original total and discount percentage
    const originalTotal = cartItems.reduce((sum, item) => {
      const price = parseFloat(item.price);
      const qty = parseInt(item.qty || item.quantity || 1);
      return sum + (price * qty);
    }, 0);

    const discountAmount = parseFloat(discount || 0);
    const finalAmount = parseFloat(total_amount);

    // Calculate discount percentage (how much discount was applied overall)
    const discountPercentage = originalTotal > 0 ? (discountAmount / originalTotal) * 100 : 0;

    console.log("Order calculation:", {
      originalTotal,
      discountAmount,
      finalAmount,
      discountPercentage: discountPercentage.toFixed(2) + "%"
    });

    // Insert order with discounted amount
    const orderRes = await client.query(
      `INSERT INTO orders (
        user_id, customer_name, email, phone, address, total_amount, 
        discount, coupon_id, payment_method, house_no, street_area, landmark
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
      [
        req.user.id, customer_name, email, phone, address, finalAmount,
        discountAmount, coupon_id || null, payment_method || 'COD',
        house_no || '', street_area || '', landmark || ''
      ]
    );
    const orderId = orderRes.rows[0].id;

    // Insert order items with PROPORTIONALLY REDUCED vendor earnings based on discount
    for (let item of cartItems) {
      const prodRes = await client.query(
        "SELECT vendor_id, price, platform_fee_percent FROM products WHERE id = $1",
        [item.product_id || item.id]
      );
      const vendor_id = prodRes.rows[0]?.vendor_id || null;
      const original_price = parseFloat(prodRes.rows[0]?.price || item.price);
      const platform_fee_percent = parseFloat(prodRes.rows[0]?.platform_fee_percent || 10);
      const qty = parseInt(item.qty || item.quantity || 1);

      // Calculate discounted price for this item (proportional discount)
      let discounted_price = original_price;

      // Apply proportional discount if there's a coupon discount
      if (discountAmount > 0 && originalTotal > 0) {
        // Each item gets discount proportional to its original price
        const itemOriginalTotal = original_price * qty;
        const itemDiscount = (itemOriginalTotal / originalTotal) * discountAmount;
        discounted_price = original_price - (itemDiscount / qty);
        discounted_price = Math.max(0, discounted_price);
      }

      // Calculate vendor earnings after platform fee on the DISCOUNTED price
      const vendor_earning = (discounted_price * qty) * ((100 - platform_fee_percent) / 100);

      console.log(`Item ${item.name}:`, {
        original_price,
        discounted_price,
        qty,
        platform_fee_percent,
        vendor_earning
      });

      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price, vendor_id, vendor_earning) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orderId, item.product_id || item.id, qty, discounted_price, vendor_id, vendor_earning]
      );

      // Update stock
      await client.query(
        `UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2`,
        [qty, item.product_id || item.id]
      );
    }

    // Update coupon usage count
    if (coupon_id) {
      await client.query(
        `UPDATE coupons SET used_count = used_count + 1 WHERE id = $1`,
        [coupon_id]
      );
    }

    // Clear cart
    await client.query(`DELETE FROM cart_items WHERE user_id = $1`, [req.user.id]);

    await client.query("COMMIT");

    // Send notification
    const fullOrderResult = await pool.query(`SELECT * FROM orders WHERE id = $1`, [orderId]);
    sendAdminNotification(fullOrderResult.rows[0]);

    res.json({ success: true, orderId });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Order creation error:", error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
});

app.get("/api/orders/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT o.*, 
        (SELECT json_agg(json_build_object(
            'id', oi.id,
            'product_id', oi.product_id,
            'product_code', p.product_code,
            'name', p.name,
            'image', p.main_image_url,
            'quantity', oi.quantity,
            'price', oi.price
        )) 
        FROM order_items oi 
        JOIN products p ON oi.product_id = p.id 
        WHERE oi.order_id = o.id) as items
      FROM orders o 
      WHERE o.id = $1 AND o.user_id = $2`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: "Order not found" });
    res.json({ success: true, order: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch top order" });
  }
});

// ================= RAZORPAY ROUTES =================
app.post("/api/razorpay/order", verifyToken, async (req, res) => {
  try {
    if (!razorpay) return res.status(500).json({ success: false, message: "Razorpay is not configured on the server" });
    const { amount } = req.body;
    const order = await razorpay.orders.create({ amount: Math.round(amount * 100), currency: "INR", receipt: `receipt_${Date.now()}`, payment_capture: 1 });
    res.json({ success: true, order: { id: order.id, amount: order.amount, currency: order.currency } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create Razorpay order" });
  }
});

// ================= RAZORPAY VERIFY - FIXED COUPON DISCOUNT =================

app.post("/api/razorpay/verify", verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderDetails } = req.body;
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(body.toString()).digest("hex");
    if (expectedSignature !== razorpay_signature) return res.status(400).json({ success: false, message: "Invalid signature" });

    await client.query("BEGIN");
    const { customer_name, email, phone, address, total_amount, discount, coupon_id, cartItems, house_no, street_area, landmark } = orderDetails;

    // Calculate original total and discount percentage
    const originalTotal = cartItems.reduce((sum, item) => {
      const price = parseFloat(item.price);
      const qty = parseInt(item.qty || item.quantity || 1);
      return sum + (price * qty);
    }, 0);

    const discountAmount = parseFloat(discount || 0);
    const finalAmount = parseFloat(total_amount);

    // Calculate discount percentage
    const discountPercentage = originalTotal > 0 ? (discountAmount / originalTotal) * 100 : 0;

    const orderRes = await client.query(
      `INSERT INTO orders (
        user_id, customer_name, email, phone, address, total_amount, 
        discount, coupon_id, payment_method, payment_status, order_status, 
        house_no, street_area, landmark, razorpay_order_id, razorpay_payment_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING id`,
      [
        req.user.id, customer_name, email, phone, address, finalAmount,
        discountAmount, coupon_id, 'RAZORPAY', 'Completed', 'Placed',
        house_no || '', street_area || '', landmark || '',
        razorpay_order_id, razorpay_payment_id
      ]
    );
    const orderId = orderRes.rows[0].id;

    // Insert order items with PROPORTIONALLY REDUCED vendor earnings
    for (let item of cartItems) {
      const prodRes = await client.query(
        "SELECT vendor_id, price, platform_fee_percent FROM products WHERE id = $1",
        [item.product_id || item.id]
      );
      const vendor_id = prodRes.rows[0]?.vendor_id || null;
      const original_price = parseFloat(prodRes.rows[0]?.price || item.price);
      const platform_fee_percent = parseFloat(prodRes.rows[0]?.platform_fee_percent || 10);
      const qty = parseInt(item.qty || item.quantity || 1);

      // Calculate discounted price for this item (proportional discount)
      let discounted_price = original_price;
      if (discountAmount > 0 && originalTotal > 0) {
        const itemOriginalTotal = original_price * qty;
        const itemDiscount = (itemOriginalTotal / originalTotal) * discountAmount;
        discounted_price = original_price - (itemDiscount / qty);
        discounted_price = Math.max(0, discounted_price);
      }

      // Calculate vendor earnings on discounted price
      const vendor_earning = (discounted_price * qty) * ((100 - platform_fee_percent) / 100);

      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price, vendor_id, vendor_earning) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orderId, item.product_id || item.id, qty, discounted_price, vendor_id, vendor_earning]
      );

      await client.query(
        `UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2`,
        [qty, item.product_id || item.id]
      );
    }

    if (coupon_id) {
      await client.query(`UPDATE coupons SET used_count = used_count + 1 WHERE id = $1`, [coupon_id]);
    }

    await client.query(`DELETE FROM cart_items WHERE user_id = $1`, [req.user.id]);
    await client.query("COMMIT");

    sendAdminNotification({
      id: orderId,
      customer_name,
      email,
      phone,
      address,
      total_amount: finalAmount,
      payment_method: 'RAZORPAY'
    });

    res.json({ success: true, orderId, message: "Payment successful, order placed" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Razorpay verification error:", error);
    res.status(500).json({ success: false, message: error.message || "Payment verification failed" });
  } finally {
    client.release();
  }
});
// ================= PAYOUTS ROUTES (UPDATED) =================

// Get payouts for vendor/admin - FIXED to only show actual balance
app.get("/api/admin/payouts", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    let query = `SELECT p.*, u.store_name, u.email, u.name as vendor_name, u.phone as vendor_phone FROM payouts p JOIN users u ON p.vendor_id = u.id WHERE 1=1`;
    let params = [];
    const userRole = req.user.role?.toLowerCase();
    if (userRole !== 'super_admin') {
      query += ` AND p.vendor_id = $1`;
      params.push(req.user.id);
    }
    query += ` ORDER BY p.requested_at DESC`;
    const result = await pool.query(query, params);

    let balance = 0;
    if (userRole !== 'super_admin') {
      // Calculate actual balance based on PAID payouts only
      const userRes = await pool.query(`SELECT balance FROM users WHERE id = $1`, [req.user.id]);
      balance = parseFloat(userRes.rows[0].balance) || 0;

      // Also get pending payouts to show on hold amount
      const pendingRes = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) as pending_total FROM payouts WHERE vendor_id = $1 AND status = 'Pending'`,
        [req.user.id]
      );
      balance = balance; // This is the actual available balance
    }

    res.json({ success: true, payouts: result.rows, balance });
  } catch (err) {
    console.error("Payouts fetch error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Request payout - FIXED
app.post("/api/admin/payouts/request", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { amount, bank_details } = req.body;
    const vendorId = req.user.id;

    if (!amount || amount <= 0) throw new Error("Invalid amount");

    const userRes = await client.query(`SELECT balance FROM users WHERE id = $1 FOR UPDATE`, [vendorId]);
    const currentBalance = parseFloat(userRes.rows[0].balance) || 0;

    if (currentBalance < amount) throw new Error("Insufficient wallet balance");

    // Deduct from balance
    await client.query(`UPDATE users SET balance = balance - $1 WHERE id = $2`, [amount, vendorId]);

    // Create payout request
    const payoutRes = await client.query(
      `INSERT INTO payouts (vendor_id, amount, bank_details, status, requested_at) 
       VALUES ($1, $2, $3, 'Pending', NOW()) RETURNING id`,
      [vendorId, amount, bank_details]
    );

    const payoutId = payoutRes.rows[0].id;

    // Log wallet transaction for debit
    await client.query(
      `INSERT INTO wallet_transactions 
        (vendor_id, transaction_type, amount, status, description, payout_id, original_amount) 
       VALUES ($1, 'debit', $2, 'pending', $3, $4, $5)`,
      [
        vendorId,
        amount,
        `Withdrawal request #${payoutId} - Pending approval`,
        payoutId,
        amount
      ]
    );

    await client.query("COMMIT");
    res.json({ success: true, message: "Payout requested successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Payout request error:", err);
    res.status(400).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});


// Approve payout (Super Admin only) - FIXED
app.put("/api/admin/payouts/:id/approve", verifyToken, verifySuperAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const payoutCheck = await client.query(
      "SELECT * FROM payouts WHERE id = $1 AND status = 'Pending'",
      [req.params.id]
    );

    if (payoutCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Payout request not found or already processed" });
    }

    const payout = payoutCheck.rows[0];

    await client.query(
      `UPDATE payouts SET status = 'Paid', processed_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );

    // Update wallet transaction status
    await client.query(
      `UPDATE wallet_transactions SET status = 'completed' WHERE payout_id = $1`,
      [req.params.id]
    );

    await client.query("COMMIT");
    res.json({ success: true, message: "Payout approved successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Approve payout error:", err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});
app.get("/api/admin/payouts/summary", verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const summary = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'Pending' THEN amount ELSE 0 END), 0) as total_pending,
        COALESCE(SUM(CASE WHEN status = 'Paid' THEN amount ELSE 0 END), 0) as total_paid,
        COALESCE(SUM(amount), 0) as total_requested
      FROM payouts
    `);
    res.json({ success: true, summary: summary.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/api/admin/payouts/vendor-summary/:vendorId", verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const vendorId = req.params.vendorId;

    // Get vendor's current balance
    const vendorRes = await pool.query(
      "SELECT balance FROM users WHERE id = $1",
      [vendorId]
    );
    const currentBalance = vendorRes.rows[0]?.balance || 0;

    // Get payout summary
    const summary = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'Pending' THEN amount ELSE 0 END), 0) as total_pending,
        COALESCE(SUM(CASE WHEN status = 'Paid' THEN amount ELSE 0 END), 0) as total_paid,
        COALESCE(SUM(amount), 0) as total_requested
      FROM payouts
      WHERE vendor_id = $1
    `, [vendorId]);

    res.json({
      success: true,
      summary: {
        ...summary.rows[0],
        current_balance: currentBalance
      }
    });
  } catch (err) {
    console.error("Vendor summary error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
// Get vendor balances summary - FIXED to show actual available balance
app.get("/api/admin/vendor-balances", verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    // Get all vendors with their current balance
    const result = await pool.query(`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.store_name, 
        COALESCE(u.balance, 0) as balance
      FROM users u
      WHERE u.role = 'vendor'
      ORDER BY u.name ASC
    `);

    res.json({ success: true, vendors: result.rows });
  } catch (err) {
    console.error("Vendor balances error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ================= COUPONS =================
app.post("/api/admin/coupons", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    const vendor_id = req.user.role === 'super_admin' ? null : req.user.id;
    const { code, discount_type, discount_value, min_order_amount = 0, max_discount = null, usage_limit = 0, expiry_date = null, is_hidden = false } = req.body;

    const result = await pool.query(
      `INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, max_discount, usage_limit, expiry_date, is_hidden, vendor_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [code, discount_type, discount_value, min_order_amount, max_discount, usage_limit, expiry_date, is_hidden, vendor_id]
    );
    res.json({ success: true, coupon: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/admin/coupons", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    let query = "SELECT * FROM coupons WHERE 1=1";
    let params = [];
    if (req.user.role !== 'super_admin') {
      query += " AND vendor_id = $1";
      params.push(req.user.id);
    }
    query += " ORDER BY created_at DESC";
    const result = await pool.query(query, params);
    res.json({ success: true, coupons: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put("/api/admin/coupons/:id", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      const check = await pool.query("SELECT vendor_id FROM coupons WHERE id=$1", [req.params.id]);
      if (check.rows.length === 0 || check.rows[0].vendor_id !== req.user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }
    }
    const { code, discount_type, discount_value, min_order_amount = 0, max_discount = null, usage_limit = 0, expiry_date = null, is_active = true, is_hidden = false } = req.body;
    const result = await pool.query(
      `UPDATE coupons SET code=$1, discount_type=$2, discount_value=$3, min_order_amount=$4, max_discount=$5, usage_limit=$6, expiry_date=$7, is_active=$8, is_hidden=$9 WHERE id=$10 RETURNING *`,
      [code, discount_type, discount_value, min_order_amount, max_discount, usage_limit, expiry_date, is_active, is_hidden, req.params.id]
    );
    res.json({ success: true, coupon: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete("/api/admin/coupons/:id", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      const check = await pool.query("SELECT vendor_id FROM coupons WHERE id=$1", [req.params.id]);
      if (check.rows.length === 0 || check.rows[0].vendor_id !== req.user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }
    }
    await pool.query("DELETE FROM coupons WHERE id=$1", [req.params.id]);
    res.json({ success: true, message: "Coupon deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/coupons", async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM coupons WHERE is_active=true AND is_hidden=false AND (expiry_date IS NULL OR expiry_date > NOW())`);
    res.json({ success: true, coupons: result.rows });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

app.post("/api/coupons/apply", verifyToken, async (req, res) => {
  try {
    const { code, totalAmount, cartItems } = req.body;

    console.log("Applying coupon:", { code, totalAmount, cartItemsCount: cartItems?.length });

    // Get coupon from database
    const result = await pool.query("SELECT * FROM coupons WHERE code ILIKE $1 AND is_active = true", [code]);
    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Invalid coupon code" });
    }

    const coupon = result.rows[0];

    // Check expiry
    if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
      return res.status(400).json({ message: "Coupon has expired" });
    }

    // Check usage limit
    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
      return res.status(400).json({ message: "Coupon usage limit reached" });
    }

    let applicableSubtotal = parseFloat(totalAmount);

    // If coupon is vendor-specific, calculate subtotal for that vendor only
    if (coupon.vendor_id) {
      if (!cartItems || cartItems.length === 0) {
        return res.status(400).json({ message: "Cart is empty" });
      }

      const vendorSubtotal = cartItems.reduce((sum, item) => {
        if (item.vendor_id === coupon.vendor_id) {
          const itemPrice = parseFloat(item.price);
          const itemQty = parseInt(item.quantity) || parseInt(item.qty) || 1;
          return sum + (itemPrice * itemQty);
        }
        return sum;
      }, 0);

      if (vendorSubtotal === 0) {
        return res.status(400).json({ message: "Coupon not applicable to any product in your cart" });
      }

      applicableSubtotal = vendorSubtotal;
    }

    // Check minimum order amount
    const minOrderAmount = parseFloat(coupon.min_order_amount);
    if (applicableSubtotal < minOrderAmount) {
      return res.status(400).json({
        message: `Minimum order amount of ₹${minOrderAmount} required for this coupon`
      });
    }

    // Calculate discount
    let discount = 0;
    const discountValue = parseFloat(coupon.discount_value);

    if (coupon.discount_type === "percentage") {
      discount = (applicableSubtotal * discountValue) / 100;
    } else {
      discount = discountValue;
    }

    // Apply max discount limit
    const maxDiscount = parseFloat(coupon.max_discount);
    if (maxDiscount && discount > maxDiscount) {
      discount = maxDiscount;
    }

    // Round discount to 2 decimal places
    discount = Math.round(discount * 100) / 100;

    console.log("Calculated discount:", discount);

    res.json({
      success: true,
      discount: discount,
      finalAmount: totalAmount - discount,
      couponId: coupon.id,
      coupon: coupon
    });

  } catch (error) {
    console.error("Coupon apply error:", error);
    res.status(500).json({ message: "Failed to apply coupon", error: error.message });
  }
});


app.post("/api/coupons/auto-apply", verifyToken, async (req, res) => {
  try {
    const { totalAmount } = req.body;
    const result = await pool.query(`SELECT * FROM coupons WHERE is_active = true AND (expiry_date IS NULL OR expiry_date > NOW())`);
    if (result.rows.length === 0) return res.json({ success: true, message: "No coupons available", discount: 0, finalAmount: totalAmount });

    let bestCoupon = null;
    let bestDiscount = 0;

    for (let coupon of result.rows) {
      if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) continue;
      if (totalAmount < coupon.min_order_amount) continue;

      let discount = coupon.discount_type === "percentage" ? (totalAmount * coupon.discount_value) / 100 : coupon.discount_value;
      if (coupon.max_discount && discount > coupon.max_discount) discount = coupon.max_discount;

      if (discount > bestDiscount) { bestDiscount = discount; bestCoupon = coupon; }
    }

    if (!bestCoupon) return res.json({ success: true, message: "No applicable coupons", discount: 0, finalAmount: totalAmount });
    res.json({ success: true, coupon: bestCoupon, discount: bestDiscount, finalAmount: totalAmount - bestDiscount });
  } catch (error) {
    res.status(500).json({ message: "Auto apply failed" });
  }
});

// ================= REVIEWS (User) =================
app.post("/api/reviews", verifyToken, upload.array("images", 5), async (req, res) => {
  try {
    const { product_id, rating, comment } = req.body;
    const userId = req.user.id;

    let imagePaths = [];
    if (req.files && req.files.length > 0) {
      imagePaths = req.files.map(file => `/uploads/${file.filename}`);
    }

    const result = await pool.query(
      `INSERT INTO reviews (product_id, user_id, rating, comment, images, status)
       VALUES ($1,$2,$3,$4,$5,'pending')
       ON CONFLICT (user_id, product_id)
       DO UPDATE SET
         rating = EXCLUDED.rating,
         comment = EXCLUDED.comment,
         images = EXCLUDED.images,
         status = 'pending',
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [Number(product_id), userId, Number(rating), comment, imagePaths]
    );

    res.json({ success: true, review: result.rows[0] });

  } catch (error) {
    res.status(500).json({ message: error.message || "Review failed" });
  }
});

app.get("/api/reviews/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const result = await pool.query(
      `SELECT r.*, u.name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.product_id=$1 AND r.status='approved'
       ORDER BY r.created_at DESC`,
      [productId]
    );
    res.json({ success: true, reviews: result.rows });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch reviews" });
  }
});

app.get("/api/reviews/can-review/:productId", verifyToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;
    const purchaseCheck = await pool.query(
      `SELECT * FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.user_id = $1 AND oi.product_id = $2`,
      [userId, productId]
    );
    res.json({ canReview: purchaseCheck.rows.length > 0 });
  } catch (error) {
    res.status(500).json({ canReview: false });
  }
});

app.delete("/api/reviews/:id", verifyToken, async (req, res) => {
  await pool.query("DELETE FROM reviews WHERE id=$1 AND user_id=$2", [req.params.id, req.user.id]);
  res.json({ success: true });
});

app.get("/api/reviews/summary/:productId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        COUNT(*)::INT as total_reviews,
        COALESCE(ROUND(AVG(rating),1),0)::FLOAT as avg_rating
       FROM reviews
       WHERE product_id=$1 AND status='approved'`,
      [req.params.productId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ total_reviews: 0, avg_rating: 0 });
  }
});

app.get("/api/reviews/mine/:productId", verifyToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;
    const result = await pool.query(`SELECT r.*, u.name FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.product_id=$1 AND r.user_id=$2`, [productId, userId]);
    res.json({ success: true, review: result.rows[0] || null });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch your review" });
  }
});

app.put("/api/reviews/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;
    const check = await pool.query("SELECT * FROM reviews WHERE id=$1 AND user_id=$2", [id, userId]);
    if (check.rows.length === 0) return res.status(403).json({ message: "Forbidden" });

    const result = await pool.query(
      `UPDATE reviews SET rating=$1, comment=$2, status='pending', updated_at=NOW()
       WHERE id=$3 AND user_id=$4 RETURNING *`,
      [rating, comment, id, userId]
    );
    res.json({ success: true, review: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
});

// ================= BANNERS =================
app.post("/api/admin/banner", verifyToken, verifyAdminVendorIndividualAccess, uploadBannerMedia.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
  const uploadedFiles = [];
  try {
    const { title, subtitle, button_text, link, is_active, type, category_id } = req.body;
    const vendor_id = req.user.role === 'super_admin' ? null : req.user.id;

    let image_url = null, video_url = null;
    if (req.files?.image) { image_url = `/uploads/banners/${req.files.image[0].filename}`; uploadedFiles.push(req.files.image[0].path); }
    if (req.files?.video) { video_url = `/uploads/banners/${req.files.video[0].filename}`; uploadedFiles.push(req.files.video[0].path); }

    let position = req.body.position ? parseInt(req.body.position) : null;
    if (!position) {
      const posResult = await pool.query(`SELECT COALESCE(MAX(position), 0) + 1 AS position FROM banners`);
      position = posResult.rows[0].position;
    }

    let cleanCategoryId = category_id;
    if (!category_id || category_id === 'null' || category_id === '') cleanCategoryId = null;

    const result = await pool.query(
      `INSERT INTO banners 
         (title, subtitle, button_text, link, image_url, video_url, type, category_id, is_active, position, vendor_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING *`,
      [title, subtitle, button_text, link, image_url, video_url, type || 'hero', cleanCategoryId, is_active === "true" || is_active === true, position, vendor_id]
    );

    res.json({ success: true, banner: result.rows[0] });
  } catch (err) {
    for (const filePath of uploadedFiles) { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); }
    res.status(500).json({ message: err.message || "Banner upload failed" });
  }
});

app.put("/api/admin/banner/:id", verifyToken, verifyAdminVendorIndividualAccess, uploadBannerMedia.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subtitle, button_text, link, is_active, type, category_id, position } = req.body;

    const currentRes = await pool.query("SELECT * FROM banners WHERE id = $1", [id]);
    if (currentRes.rows.length === 0) return res.status(404).json({ message: "Banner not found" });
    const currentBanner = currentRes.rows[0];

    if (req.user.role !== 'super_admin' && currentBanner.vendor_id !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    let image_url = currentBanner.image_url;
    let video_url = currentBanner.video_url;

    if (req.files?.image) { image_url = `/uploads/banners/${req.files.image[0].filename}`; }
    if (req.files?.video) { video_url = `/uploads/banners/${req.files.video[0].filename}`; }

    let cleanCategoryId = category_id;
    if (category_id === 'null' || category_id === '') cleanCategoryId = null;

    const result = await pool.query(
      `UPDATE banners SET 
          title=$1, subtitle=$2, button_text=$3, link=$4, 
          image_url=$5, video_url=$6, type=$7, 
          category_id=$8, is_active=$9, position=$10, 
          updated_at=NOW() 
         WHERE id=$11 RETURNING *`,
      [
        title || currentBanner.title, subtitle || currentBanner.subtitle, button_text || currentBanner.button_text, link || currentBanner.link, image_url, video_url, type || currentBanner.type, cleanCategoryId !== undefined ? cleanCategoryId : currentBanner.category_id, is_active === "true" || is_active === true, position ? parseInt(position) : currentBanner.position, id
      ]
    );
    res.json({ success: true, banner: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: "Banner update failed" });
  }
});

app.get("/api/banners", async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM banners WHERE is_active=true ORDER BY position ASC`);
    res.json({ banners: result.rows });
  } catch (err) {
    res.status(500).json({ message: "Fetch banners failed" });
  }
});

app.get("/api/admin/banners", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  let query = "SELECT * FROM banners WHERE 1=1";
  let params = [];
  if (req.user.role !== 'super_admin') {
    query += " AND vendor_id = $1";
    params.push(req.user.id);
  }
  query += " ORDER BY position ASC";
  const result = await pool.query(query, params);
  res.json({ banners: result.rows });
});

app.delete("/api/admin/banner/:id", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  if (req.user.role !== 'super_admin') {
    const check = await pool.query("SELECT vendor_id FROM banners WHERE id=$1", [req.params.id]);
    if (check.rows.length === 0 || check.rows[0].vendor_id !== req.user.id) return res.status(403).json({ message: "Unauthorized" });
  }
  await pool.query("DELETE FROM banners WHERE id=$1", [req.params.id]);
  res.json({ success: true });
});

app.put("/api/admin/banner/:id/toggle", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  if (req.user.role !== 'super_admin') {
    const check = await pool.query("SELECT vendor_id FROM banners WHERE id=$1", [req.params.id]);
    if (check.rows.length === 0 || check.rows[0].vendor_id !== req.user.id) return res.status(403).json({ message: "Unauthorized" });
  }
  await pool.query(`UPDATE banners SET is_active = NOT is_active WHERE id=$1`, [req.params.id]);
  res.json({ success: true });
});

app.put("/api/admin/banners/reorder", verifyToken, verifyAdminOrSuperAdmin, async (req, res) => {
  try {
    const banners = req.body;
    for (let banner of banners) {
      await pool.query(`UPDATE banners SET position=$1 WHERE id=$2`, [banner.position, banner.id]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Reorder failed" });
  }
});

// ================= CART =================
app.post("/api/cart", verifyToken, async (req, res) => {
  try {
    const { product_id, quantity } = req.body;
    const userId = req.user.id;
    const result = await pool.query(
      `INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1,$2,$3) ON CONFLICT (user_id, product_id) DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity RETURNING *`,
      [userId, product_id, quantity || 1]
    );
    res.json({ success: true, item: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: "Add to cart failed" });
  }
});

app.get("/api/cart", verifyToken, async (req, res) => {
  const result = await pool.query(
    `SELECT c.*, p.name, p.price, p.old_price, p.main_image_url, p.uuid, p.product_code, cat.name as category_name, p.vendor_id
     FROM cart_items c
     JOIN products p ON c.product_id = p.id
     LEFT JOIN categories cat ON p.category_id = cat.id
     WHERE c.user_id = $1`, [req.user.id]
  );
  res.json({ cart: result.rows });
});

app.put("/api/cart/:id", verifyToken, async (req, res) => {
  const { quantity } = req.body;
  await pool.query(`UPDATE cart_items SET quantity=$1 WHERE id=$2`, [quantity, req.params.id]);
  res.json({ success: true });
});

app.delete("/api/cart/:id", verifyToken, async (req, res) => {
  await pool.query(`DELETE FROM cart_items WHERE id=$1`, [req.params.id]);
  res.json({ success: true });
});

// ================= WISHLIST =================
app.post("/api/wishlist", verifyToken, async (req, res) => {
  try {
    const { product_id } = req.body;
    const userId = req.user.id;
    if (!product_id) return res.status(400).json({ message: "Product ID is required" });
    const exists = await pool.query(`SELECT * FROM wishlist WHERE user_id=$1 AND product_id=$2`, [userId, product_id]);
    if (exists.rows.length > 0) {
      await pool.query(`DELETE FROM wishlist WHERE user_id=$1 AND product_id=$2`, [userId, product_id]);
      return res.json({ message: "Removed from wishlist", type: "removed" });
    }
    await pool.query(`INSERT INTO wishlist (user_id, product_id) VALUES ($1,$2)`, [userId, product_id]);
    res.json({ message: "Added to wishlist", type: "added" });
  } catch (error) {
    if (error.code === '23503') return res.status(400).json({ message: "Product no longer exists or invalid user session." });
    res.status(500).json({ message: "Wishlist update failed" });
  }
});

app.get("/api/wishlist", verifyToken, async (req, res) => {
  const result = await pool.query(
    `SELECT w.*, p.name, p.price, p.main_image_url, p.uuid, p.product_code, cat.name as category_name
     FROM wishlist w
     JOIN products p ON w.product_id = p.id
     LEFT JOIN categories cat ON p.category_id = cat.id
     WHERE w.user_id = $1`, [req.user.id]
  );
  res.json({ wishlist: result.rows });
});

// ================= RETURN SYSTEM =================
app.post("/api/user/orders/:id/return", verifyToken, uploadReturnVideo.single("video"), async (req, res) => {
  let uploadedFilePath = null;
  try {
    const orderId = req.params.id;
    const { reason } = req.body;
    if (!req.file) throw new Error("Unboxing video is required for returns");
    uploadedFilePath = req.file.path;
    const videoUrl = `/uploads/returns/${req.file.filename}`;

    const orderCheck = await pool.query("SELECT * FROM orders WHERE id=$1 AND user_id=$2 AND order_status='Delivered'", [orderId, req.user.id]);
    if (orderCheck.rows.length === 0) throw new Error("Order not found or not eligible for return");

    const result = await pool.query(`INSERT INTO returns (order_id, user_id, video_url, reason) VALUES ($1, $2, $3, $4) RETURNING *`, [orderId, req.user.id, videoUrl, reason]);
    res.json({ success: true, returnRequest: result.rows[0] });
  } catch (error) {
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath);
    res.status(500).json({ success: false, message: error.message || "Failed to submit return request" });
  }
});

app.get("/api/user/returns", verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`SELECT r.*, o.customer_name, o.total_amount FROM returns r JOIN orders o ON r.order_id = o.id WHERE r.user_id = $1 ORDER BY r.created_at DESC`, [req.user.id]);
    res.json({ success: true, returns: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch returns" });
  }
});

// ================= RETURN SYSTEM =================
app.get("/api/admin/returns", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    let query = `
       SELECT DISTINCT ON (r.id) 
         r.*, 
         o.customer_name, 
         o.phone, 
         u.name as user_name,
         oi.vendor_id
       FROM returns r
       JOIN orders o ON r.order_id = o.id
       JOIN users u ON r.user_id = u.id
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE 1=1
    `;
    let params = [];

    if (req.user.role !== 'super_admin') {
      query += ` AND oi.vendor_id = $1`;
      params.push(req.user.id);
    }

    query += ` GROUP BY r.id, o.customer_name, o.phone, u.name, oi.vendor_id
               ORDER BY r.id, CASE WHEN r.status = 'Pending' THEN 0 ELSE 1 END, r.created_at DESC`;

    const result = await pool.query(query, params);
    res.json({ success: true, returns: result.rows });
  } catch (error) {
    console.error("Returns fetch error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch returns", error: error.message });
  }
});

app.put("/api/admin/returns/:id/status", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      const check = await pool.query(`
        SELECT r.id FROM returns r
        JOIN orders o ON r.order_id = o.id
        JOIN order_items oi ON o.id = oi.order_id
        WHERE r.id = $1 AND oi.vendor_id = $2
        LIMIT 1
      `, [req.params.id, req.user.id]);
      if (check.rows.length === 0) {
        return res.status(403).json({ success: false, message: "Unauthorized" });
      }
    }

    const { status, admin_comment } = req.body;
    const returnId = req.params.id;

    const result = await pool.query(
      `UPDATE returns SET status = $1, admin_comment = $2, updated_at = NOW() 
       WHERE id = $3 RETURNING *`,
      [status, admin_comment, returnId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Return request not found" });
    }

    if (status === 'Approved') {
      await pool.query(
        "UPDATE orders SET order_status = 'Return Approved' WHERE id = (SELECT order_id FROM returns WHERE id = $1)",
        [returnId]
      );
    }

    res.json({ success: true, returnRequest: result.rows[0] });
  } catch (error) {
    console.error("Return status update error:", error);
    res.status(500).json({ success: false, message: "Failed to update return status", error: error.message });
  }
});
// ================= ANALYTICS / REPORTS =================
app.get("/api/admin/reports", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const userRole = req.user.role?.toLowerCase();
    const isVendor = userRole !== 'super_admin';
    const vId = req.user.id;

    const salesTrendRes = await pool.query(`
      SELECT 
        TO_CHAR(o.created_at, 'Dy') as date, 
        SUM(COALESCE(oi.vendor_earning, oi.price * oi.quantity))::float as revenue, 
        COUNT(DISTINCT o.id)::int as orders 
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE o.created_at > (NOW() - ($1 || ' days')::INTERVAL)
      ${isVendor ? 'AND oi.vendor_id = $2' : ''}
      GROUP BY date, DATE_TRUNC('day', o.created_at)
      ORDER BY DATE_TRUNC('day', o.created_at) ASC;
    `, isVendor ? [days, vId] : [days]);

    const topProductsRes = await pool.query(`
      SELECT 
        p.name, 
        SUM(oi.quantity)::int as sold, 
        SUM(COALESCE(oi.vendor_earning, oi.price * oi.quantity))::float as revenue 
      FROM order_items oi 
      JOIN products p ON oi.product_id = p.id 
      JOIN orders o ON oi.order_id = o.id
      WHERE o.created_at > (NOW() - ($1 || ' days')::INTERVAL)
      ${isVendor ? 'AND oi.vendor_id = $2' : ''}
      GROUP BY p.name 
      ORDER BY revenue DESC 
      LIMIT 10;
    `, isVendor ? [days, vId] : [days]);

    const summaryRes = await pool.query(`
      SELECT 
        COALESCE(SUM(COALESCE(vendor_earning, price * quantity)), 0)::float as total_revenue,
        COUNT(DISTINCT order_id)::int as total_orders
      FROM order_items
      WHERE order_id IN (SELECT id FROM orders WHERE created_at > (NOW() - ($1 || ' days')::INTERVAL))
      ${isVendor ? 'AND vendor_id = $2' : ''}
    `, isVendor ? [days, vId] : [days]);

    res.json({
      success: true,
      salesData: salesTrendRes.rows,
      topProducts: topProductsRes.rows,
      summary: summaryRes.rows[0]
    });

  } catch (error) {
    console.error("Reports Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch report data" });
  }
});

// ================= NAVIGATION / MENUS =================
app.get("/api/menus/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const menu = await pool.query("SELECT * FROM menus WHERE slug = $1", [slug]);
    if (menu.rows.length === 0) return res.status(404).json({ message: "Menu not found" });

    const items = await pool.query("SELECT * FROM menu_items WHERE menu_id = $1 AND is_active = true ORDER BY position ASC", [menu.rows[0].id]);
    res.json({ success: true, menu: menu.rows[0], items: items.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/admin/menus", verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM menus ORDER BY name ASC");
    res.json({ success: true, menus: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/admin/menus", verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const { name, slug } = req.body;
    const result = await pool.query("INSERT INTO menus (name, slug) VALUES ($1, $2) RETURNING *", [name, slug]);
    res.json({ success: true, menu: result.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/admin/menus/:id", verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM menus WHERE id = $1", [id]);
    res.json({ success: true, message: "Menu deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/admin/menus/:id/items", verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const items = await pool.query("SELECT * FROM menu_items WHERE menu_id = $1 ORDER BY position ASC", [id]);
    res.json({ success: true, items: items.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/admin/menus/:id/items", verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, link, parent_id, position } = req.body;
    const result = await pool.query("INSERT INTO menu_items (menu_id, title, link, parent_id, position) VALUES ($1, $2, $3, $4, $5) RETURNING *", [id, title, link, parent_id || null, position || 0]);
    res.json({ success: true, item: result.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/admin/menu-items/:id", verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, link, position, is_active } = req.body;
    const result = await pool.query("UPDATE menu_items SET title=$1, link=$2, position=$3, is_active=$4 WHERE id=$5 RETURNING *", [title, link, position, is_active, id]);
    res.json({ success: true, item: result.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/admin/menu-items/:id", verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM menu_items WHERE id = $1", [id]);
    res.json({ success: true, message: "Item deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/admin/dashboard/stats", verifyToken, verifyAnyAdmin, async (req, res) => {
  try {
    const isVendor = req.user.role === 'vendor' || req.user.role === 'admin';
    const vId = req.user.id;

    const prodQuery = isVendor ? "SELECT COUNT(*) FROM products WHERE vendor_id = $1" : "SELECT COUNT(*) FROM products";
    const orderQuery = isVendor ?
      "SELECT COUNT(DISTINCT order_id) FROM order_items WHERE vendor_id = $1" :
      "SELECT COUNT(*) FROM orders";
    const revenueQuery = isVendor ?
      "SELECT SUM(COALESCE(vendor_earning, price * quantity)) FROM order_items WHERE vendor_id = $1" :
      "SELECT SUM(total_amount) FROM orders";

    const pCount = await pool.query(prodQuery, isVendor ? [vId] : []);
    const oCount = await pool.query(orderQuery, isVendor ? [vId] : []);
    const revCount = await pool.query(revenueQuery, isVendor ? [vId] : []);

    res.json({
      success: true,
      stats: {
        totalProducts: parseInt(pCount.rows[0].count),
        totalOrders: parseInt(oCount.rows[0].count),
        totalRevenue: parseFloat(revCount.rows[0].sum || 0),
        totalUsers: isVendor ? 0 : (await pool.query("SELECT COUNT(*) FROM users")).rows[0].count
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Stats failed" });
  }
});

// ================= SHIPROCKET INTEGRATION =================
let shiprocketToken = null;
let tokenExpiry = null;

const authenticateShiprocket = async () => {
  if (shiprocketToken && tokenExpiry && Date.now() < tokenExpiry) return shiprocketToken;
  try {
    const response = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: process.env.SHIPROCKET_EMAIL, password: process.env.SHIPROCKET_PASSWORD })
    });
    const data = await response.json();
    if (data.token) {
      shiprocketToken = data.token;
      tokenExpiry = Date.now() + (9 * 24 * 60 * 60 * 1000);
      return shiprocketToken;
    } else {
      throw new Error(data.message || "Invalid Shiprocket Email or Password config");
    }
  } catch (err) {
    console.error("Shiprocket Auth Error:", err);
    throw err;
  }
};

app.post("/api/admin/orders/:id/shiprocket", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    const orderId = req.params.id;

    if (req.user.role !== 'super_admin') {
      const orderCheck = await pool.query(
        `SELECT DISTINCT o.id FROM orders o
         JOIN order_items oi ON o.id = oi.order_id
         WHERE o.id = $1 AND oi.vendor_id = $2`,
        [orderId, req.user.id]
      );
      if (orderCheck.rows.length === 0) {
        return res.status(403).json({ success: false, message: "Unauthorized" });
      }
    }

    const orderRes = await pool.query(`SELECT * FROM orders WHERE id = $1`, [orderId]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    const order = orderRes.rows[0];

    if (order.shiprocket_order_id) {
      return res.status(400).json({ success: false, message: "Order already pushed to Shiprocket" });
    }

    const vendorIdResult = await pool.query(
      `SELECT vendor_id FROM order_items WHERE order_id = $1 LIMIT 1`,
      [orderId]
    );
    if (vendorIdResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: "No vendor found for this order" });
    }
    const vendorId = vendorIdResult.rows[0].vendor_id;

    const pickupRes = await pool.query(
      `SELECT location_name, address_line1, address_line2, city, state, pincode 
       FROM vendor_pickup_addresses 
       WHERE vendor_id = $1 AND is_default = true 
       LIMIT 1`,
      [vendorId]
    );
    if (pickupRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Vendor has not set a default pickup address. Please add and set a default in Shipping Settings."
      });
    }
    const pickup = pickupRes.rows[0];

    const itemsRes = await pool.query(
      `SELECT oi.*, p.name, p.sku, p.weight, p.length, p.width, p.height
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [orderId]
    );

    const orderItems = itemsRes.rows.map(item => ({
      name: item.name,
      sku: item.sku || `SKU-${item.product_id}`,
      units: item.quantity,
      selling_price: parseFloat(item.price),
      discount: "",
      tax: ""
    }));

    const pkgWeight = itemsRes.rows.reduce((sum, item) => sum + (parseFloat(item.weight || 0.5) * item.quantity), 0);
    const maxLen = Math.max(...itemsRes.rows.map(i => parseFloat(i.length || 10)));
    const maxWid = Math.max(...itemsRes.rows.map(i => parseFloat(i.width || 10)));
    const maxHei = itemsRes.rows.reduce((sum, item) => sum + (parseFloat(item.height || 5) * item.quantity), 0);

    const token = await authenticateShiprocket();

    const pinMatch = order.address.match(/\b\d{6}\b/);
    const customerPincode = pinMatch ? pinMatch[0] : "500001";

    const payload = {
      order_id: `JAYASTRA-${order.id}`,
      order_date: new Date(order.created_at).toISOString().split('T')[0] + " 10:00",
      pickup_location: pickup.location_name,
      billing_customer_name: order.customer_name || "Customer",
      billing_last_name: "JAYA",
      billing_address: order.house_no && order.street_area ? `${order.house_no}, ${order.street_area}` : order.address,
      billing_address_2: order.landmark || "",
      billing_city: order.city || "City",
      billing_pincode: customerPincode,
      billing_state: order.state || "State",
      billing_country: "India",
      billing_email: order.email || "jayastrastore@gmail.com",
      billing_phone: order.phone || "9652896180",
      shipping_is_billing: true,
      order_items: orderItems,
      payment_method: (order.payment_method === 'Prepaid' || order.payment_method === 'RAZORPAY') ? 'Prepaid' : 'COD',
      sub_total: order.total_amount,
      length: maxLen > 0 ? maxLen : 10,
      breadth: maxWid > 0 ? maxWid : 10,
      height: maxHei > 0 ? maxHei : 5,
      weight: pkgWeight
    };

    const fetchRes = await fetch("https://apiv2.shiprocket.in/v1/external/orders/create/adhoc", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const result = await fetchRes.json();

    if (fetchRes.ok && result.order_id) {
      await pool.query(
        `UPDATE orders SET shiprocket_order_id = $1, shiprocket_shipment_id = $2 WHERE id = $3`,
        [result.order_id, result.shipment_id, orderId]
      );

      try {
        const shipmentId = result.shipment_id;
        const awbRes = await fetch("https://apiv2.shiprocket.in/v1/external/courier/assign/awb", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ shipment_id: shipmentId, courier_id: "", status: "" })
        });
        const awbData = await awbRes.json();
        if (awbData.awb_assign_status) {
          const awbCode = awbData.response?.data?.awb_code;
          if (awbCode) {
            await pool.query(`UPDATE orders SET awb_code = $1 WHERE id = $2`, [awbCode, orderId]);
          }
        }
      } catch (awbErr) {
        console.warn("Auto AWB assignment failed:", awbErr.message);
      }

      return res.json({ success: true, message: "Order pushed to Shiprocket successfully!", data: result });
    } else {
      return res.status(400).json({ success: false, message: result.message || "Failed to push to Shiprocket" });
    }
  } catch (error) {
    console.error("Shiprocket push error:", error);
    res.status(500).json({ success: false, message: error.message || "Server error pushing order" });
  }
});

app.post("/api/admin/orders/:id/awb", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    const orderId = req.params.id;
    if (req.user.role !== 'super_admin') {
      const orderCheck = await pool.query(`SELECT DISTINCT o.id FROM orders o JOIN order_items oi ON o.id = oi.order_id WHERE o.id = $1 AND oi.vendor_id = $2`, [req.params.id, req.user.id]);
      if (orderCheck.rows.length === 0) return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const orderRes = await pool.query(`SELECT shiprocket_shipment_id, awb_code FROM orders WHERE id = $1`, [orderId]);
    if (orderRes.rows.length === 0) return res.status(404).json({ success: false, message: "Order not found" });

    const shipmentId = orderRes.rows[0].shiprocket_shipment_id;
    if (!shipmentId) return res.status(400).json({ success: false, message: "Push order to Shiprocket first" });
    if (orderRes.rows[0].awb_code) return res.status(400).json({ success: false, message: "AWB already generated" });

    const token = await authenticateShiprocket();

    const fetchRes = await fetch("https://apiv2.shiprocket.in/v1/external/courier/assign/awb", {
      method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }, body: JSON.stringify({ shipment_id: shipmentId, courier_id: "", status: "" })
    });

    const result = await fetchRes.json();
    let awbCode = null;

    if (result.awb_assign_status) {
      awbCode = result.response?.data?.awb_code;
    } else {
      try {
        const shipDetailRes = await fetch(`https://apiv2.shiprocket.in/v1/external/shipments/${shipmentId}`, { method: "GET", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` } });
        const shipData = await shipDetailRes.json();
        awbCode = shipData.data?.awb_code || shipData.awb_code || shipData.data?.awb;
      } catch (e) { }

      if (!awbCode) {
        try {
          const orderResSR = await pool.query(`SELECT shiprocket_order_id FROM orders WHERE id = $1`, [orderId]);
          const srOrderId = orderResSR.rows[0]?.shiprocket_order_id;
          if (srOrderId) {
            const orderDetailRes = await fetch(`https://apiv2.shiprocket.in/v1/external/orders/show/${srOrderId}`, { method: "GET", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` } });
            const orderData = await orderDetailRes.json();
            awbCode = orderData.data?.shipments?.[0]?.awb || orderData.data?.awb_code;
          }
        } catch (e) { }
      }
    }

    if (awbCode) {
      await pool.query(`UPDATE orders SET awb_code = $1 WHERE id = $2`, [awbCode, orderId]);
      return res.json({ success: true, message: "AWB synchronized successfully!", awb_code: awbCode });
    } else {
      const errorMessage = result.message || "Could not find AWB for this order.";
      return res.status(400).json({ success: false, message: `Shiprocket Sync: ${errorMessage}` });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error generating AWB" });
  }
});

app.post("/api/admin/orders/:id/label", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    const orderId = req.params.id;
    const orderRes = await pool.query(`SELECT shiprocket_shipment_id FROM orders WHERE id = $1`, [orderId]);
    const shipmentId = orderRes.rows[0]?.shiprocket_shipment_id;
    if (!shipmentId) return res.status(400).json({ success: false, message: "No shipment ID found" });

    const token = await authenticateShiprocket();
    const fetchRes = await fetch("https://apiv2.shiprocket.in/v1/external/courier/generate/label", {
      method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }, body: JSON.stringify({ shipment_id: [shipmentId] })
    });
    const result = await fetchRes.json();
    if (result.label_created) return res.json({ success: true, label_url: result.label_url });
    else return res.status(400).json({ success: false, message: "Failed to fetch label" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error fetching label" });
  }
});

app.post("/api/admin/orders/:id/invoice", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    const orderId = req.params.id;
    const orderRes = await pool.query(`SELECT shiprocket_order_id FROM orders WHERE id = $1`, [orderId]);
    const srOrderId = orderRes.rows[0]?.shiprocket_order_id;
    if (!srOrderId) return res.status(400).json({ success: false, message: "No Shiprocket Order ID found" });

    const token = await authenticateShiprocket();
    const fetchRes = await fetch("https://apiv2.shiprocket.in/v1/external/orders/print/invoice", {
      method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }, body: JSON.stringify({ ids: [srOrderId] })
    });
    const result = await fetchRes.json();
    if (result.is_invoice_created) return res.json({ success: true, invoice_url: result.invoice_url });
    else return res.status(400).json({ success: false, message: "Failed to fetch invoice" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error fetching invoice" });
  }
});

app.post("/api/webhooks/logistics", async (req, res) => {
  try {
    const providedToken = req.headers['x-api-key'];
    if (providedToken !== "JayastraWebhookSecure123") return res.status(401).send("Unauthorized");

    const payload = req.body;
    const shipmentId = payload.shipment_id;
    const currentStatus = payload.current_status;

    if (shipmentId && currentStatus) {
      const s = currentStatus.toLowerCase();
      let dbStatus = null;

      if (s.includes("pickup") || s.includes("shipped")) dbStatus = "Shipped";
      if (s.includes("out for delivery")) dbStatus = "Out for Delivery";
      if (s.includes("delivered")) dbStatus = "Delivered";
      if (s.includes("returned") || s.includes("rto")) dbStatus = "Returned";
      if (s.includes("canceled") || s.includes("cancelled")) dbStatus = "Cancelled";

      if (dbStatus) {
        await pool.query("UPDATE orders SET order_status = $1 WHERE shiprocket_shipment_id = $2::varchar", [dbStatus, shipmentId.toString()]);
      }
    }
    res.status(200).send("OK");
  } catch (error) {
    res.status(500).send("Error");
  }
});

app.get("/api/shiprocket/pincode/:pincode", async (req, res) => {
  try {
    const deliveryPincode = req.params.pincode;
    if (!/^[1-9][0-9]{5}$/.test(deliveryPincode)) return res.status(400).json({ success: false, message: "Invalid pincode format" });

    const token = await authenticateShiprocket();
    const pickupPincode = process.env.SHIPROCKET_PICKUP_PINCODE || "581322";
    const weight = req.query.weight || 0.5;

    const url = `https://apiv2.shiprocket.in/v1/external/courier/serviceability?pickup_postcode=${pickupPincode}&delivery_postcode=${deliveryPincode}&weight=${weight}&cod=0`;

    const fetchRes = await fetch(url, { method: "GET", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` } });
    const result = await fetchRes.json();

    if (result.status === 200 && result.data && result.data.available_courier_companies.length > 0) {
      const fastest = result.data.available_courier_companies.reduce((prev, current) => { return (prev.etd_hours < current.etd_hours) ? prev : current; });
      return res.json({ success: true, serviceable: true, estimated_days: Math.ceil(fastest.etd_hours / 24) || 5, courier: fastest.courier_name });
    } else {
      return res.json({ success: true, serviceable: false, message: "Delivery not available to this pincode." });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not fetch serviceability details" });
  }
});

app.post("/api/razorpay/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];
    const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(JSON.stringify(req.body)).digest('hex');

    if (signature !== expectedSignature) return res.status(400).json({ success: false, message: 'Invalid webhook signature' });

    const event = req.body;
    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;
      await pool.query(
        `UPDATE orders SET payment_status = 'Completed', razorpay_payment_id = $1, updated_at = NOW() WHERE razorpay_order_id = $2 AND payment_status != 'Completed'`,
        [payment.id, orderId]
      );
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/admin/admins", verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, email, phone, role, status, created_at, store_name
      FROM users
      WHERE role = 'admin'
      ORDER BY created_at DESC
    `);
    res.json({ success: true, users: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch admins" });
  }
});

app.get("/api/admin/customers", verifyToken, verifyAdminOrSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, u.email, u.phone, u.role, u.status, u.created_at,
             COALESCE(orders.total_orders, 0)::int AS total_orders,
             COALESCE(orders.total_purchase, 0)::float AS total_purchase
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS total_orders, SUM(total_amount) AS total_purchase
        FROM orders
        GROUP BY user_id
      ) orders ON u.id = orders.user_id
      WHERE u.role = 'user'
      ORDER BY u.created_at DESC
    `);
    res.json({ success: true, users: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch customers" });
  }
});

app.delete("/api/admin/admins/:id", verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }

    const userCheck = await pool.query("SELECT role FROM users WHERE id = $1", [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const role = userCheck.rows[0].role;
    if (role !== 'admin' && role !== 'vendor') {
      return res.status(400).json({ message: "Only admin or vendor accounts can be deleted via this endpoint" });
    }

    await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    res.json({ success: true, message: `${role} deleted successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Delete failed" });
  }
});

app.get("/api/products/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json({ success: true, products: [] });
    const searchTerm = `%${q.trim()}%`;
    const result = await pool.query(
      `SELECT id, uuid, name, product_code, main_image_url, price, old_price FROM products WHERE is_active = true AND (name ILIKE $1 OR product_code ILIKE $1) ORDER BY CASE WHEN product_code ILIKE $2 THEN 1 WHEN name ILIKE $2 THEN 2 ELSE 3 END, name ASC LIMIT 10`,
      [searchTerm, `${q.trim()}%`]
    );
    res.json({ success: true, products: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Search failed" });
  }
});

// ================= SETTINGS ROUTES =================
app.get("/api/settings", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM settings");
    const settings = {};
    result.rows.forEach(row => { settings[row.key] = row.value; });
    res.json({ success: true, settings });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/settings", verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const { settings } = req.body;
    for (const key in settings) {
      await pool.query("INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP", [key, settings[key].toString()]);
    }
    res.json({ success: true, message: "Settings updated successfully" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/settings/platform-fee", async (req, res) => {
  try {
    const result = await pool.query("SELECT value FROM settings WHERE key = 'platform_fee_percent'");
    const fee = result.rows[0] ? parseFloat(result.rows[0].value) : 10.00;
    res.json({ success: true, platform_fee_percent: fee });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put("/api/admin/settings/platform-fee", verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const { platform_fee_percent } = req.body;
    if (platform_fee_percent === undefined || isNaN(platform_fee_percent) || platform_fee_percent < 0 || platform_fee_percent > 100) {
      return res.status(400).json({ success: false, message: "Invalid fee percentage (0-100)" });
    }
    await pool.query(
      "UPDATE settings SET value = $1, updated_at = NOW() WHERE key = 'platform_fee_percent'",
      [platform_fee_percent.toString()]
    );
    res.json({ success: true, message: "Platform fee updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// Get earning stats - FIXED to only count Paid payouts
app.get("/api/admin/payouts/earning-stats", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    const userRole = req.user.role?.toLowerCase();
    const vendorId = req.user.id;

    let query = `
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'Paid' AND DATE_TRUNC('month', processed_at) = DATE_TRUNC('month', NOW()) THEN amount ELSE 0 END), 0) as current_month,
        COALESCE(SUM(CASE WHEN status = 'Paid' AND DATE_TRUNC('month', processed_at) = DATE_TRUNC('month', NOW() - INTERVAL '1 month') THEN amount ELSE 0 END), 0) as last_month,
        COALESCE(SUM(CASE WHEN status = 'Paid' THEN amount ELSE 0 END), 0) as total_earned,
        COALESCE(SUM(CASE WHEN status = 'Pending' THEN amount ELSE 0 END), 0) as pending_settlement
      FROM payouts
      WHERE 1=1
    `;

    let params = [];
    if (userRole !== 'super_admin') {
      query += ` AND vendor_id = $1`;
      params.push(vendorId);
    }

    const result = await pool.query(query, params);
    res.json({ success: true, stats: result.rows[0] });
  } catch (err) {
    console.error("Earning stats error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
// Add this to your existing routes in the backend file

// ================= INVOICES ROUTES WITH PROPER PDF =================

app.get("/api/admin/invoices", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    const userRole = req.user.role?.toLowerCase();
    const vendorId = req.user.id;

    let query = `
      SELECT 
        p.id,
        p.vendor_id,
        p.amount,
        p.status,
        p.requested_at as created_at,
        p.processed_at,
        u.store_name,
        u.name as vendor_name,
        u.email,
        u.phone,
        u.address,
        u.gst_number
      FROM payouts p
      JOIN users u ON p.vendor_id = u.id
      WHERE p.status = 'Paid'
    `;

    let params = [];
    if (userRole !== 'super_admin') {
      query += ` AND p.vendor_id = $1`;
      params.push(vendorId);
    }

    query += ` ORDER BY p.processed_at DESC`;

    const result = await pool.query(query, params);

    const invoices = result.rows.map(row => ({
      id: row.id,
      vendor_id: row.vendor_id,
      store_name: row.store_name,
      vendor_name: row.vendor_name,
      email: row.email,
      phone: row.phone,
      address: row.address,
      gst_number: row.gst_number,
      amount: parseFloat(row.amount),
      status: row.status,
      created_at: row.created_at,
      processed_at: row.processed_at,
      description: `Settlement for payout request #${row.id}`
    }));

    res.json({ success: true, invoices });
  } catch (err) {
    console.error("Invoices fetch error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ================= SETTLEMENT REPORT DOWNLOAD (CSV/Excel) =================
app.get("/api/admin/payouts/report/download", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    const userRole = req.user.role?.toLowerCase();
    const vendorId = req.user.id;
    const { vendor_id, from, to, format = 'csv' } = req.query;

    let query = `
      SELECT p.*, u.name as vendor_name, u.email as vendor_email, u.store_name, u.phone
      FROM payouts p
      JOIN users u ON p.vendor_id = u.id
      WHERE 1=1
    `;

    let params = [];
    let paramCounter = 1;

    if (userRole !== 'super_admin') {
      query += ` AND p.vendor_id = $${paramCounter++}`;
      params.push(vendorId);
    } else if (vendor_id) {
      query += ` AND p.vendor_id = $${paramCounter++}`;
      params.push(vendor_id);
    }

    if (from) {
      query += ` AND p.requested_at >= $${paramCounter++}`;
      params.push(from);
    }

    if (to) {
      query += ` AND p.requested_at <= $${paramCounter++}`;
      params.push(to + ' 23:59:59');
    }

    query += ` ORDER BY p.requested_at DESC`;

    const result = await pool.query(query, params);

    // Calculate summary
    const totalAmount = result.rows.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const totalPending = result.rows.filter(p => p.status === 'Pending').reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const totalPaid = result.rows.filter(p => p.status === 'Paid').reduce((sum, p) => sum + parseFloat(p.amount), 0);

    // Generate CSV
    const headers = [
      'Settlement ID',
      'Vendor Name',
      'Store Name',
      'Email',
      'Phone',
      'Amount (₹)',
      'Status',
      'Bank Details',
      'Requested Date',
      'Processed Date'
    ];

    const rows = result.rows.map(p => [
      `STL-${String(p.id).padStart(6, '0')}`,
      p.vendor_name,
      p.store_name || '-',
      p.vendor_email,
      p.phone || '-',
      parseFloat(p.amount).toFixed(2),
      p.status,
      p.bank_details?.replace(/,/g, ';')?.replace(/\n/g, ' ') || '-',
      new Date(p.requested_at).toLocaleString('en-IN'),
      p.processed_at ? new Date(p.processed_at).toLocaleString('en-IN') : '-'
    ]);

    // Add summary rows
    const summaryRows = [
      [],
      ['REPORT SUMMARY', '', '', '', '', '', '', '', '', ''],
      ['Total Settlements', result.rows.length.toString(), '', '', '', totalAmount.toFixed(2), '', '', '', ''],
      ['Total Pending', result.rows.filter(p => p.status === 'Pending').length.toString(), '', '', '', totalPending.toFixed(2), '', '', '', ''],
      ['Total Paid', result.rows.filter(p => p.status === 'Paid').length.toString(), '', '', '', totalPaid.toFixed(2), '', '', '', ''],
      [],
      [`Generated On: ${new Date().toLocaleString()}`, '', '', '', '', '', '', '', '', ''],
      [`Report Period: ${from || 'Start'} to ${to || 'End'}`, '', '', '', '', '', '', '', '', '']
    ];

    const allRows = [headers, ...rows, ...summaryRows];
    const csvContent = allRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const filename = `settlement_report_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.send('\uFEFF' + csvContent); // Add BOM for UTF-8 encoding

  } catch (err) {
    console.error("Report download error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ================= MONTHLY STATEMENT DOWNLOAD =================
app.get("/api/admin/payouts/monthly-statement/download", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    const { month, year } = req.query;
    const userRole = req.user.role?.toLowerCase();
    const vendorId = req.user.id;

    let query = `
      SELECT p.*, u.name as vendor_name, u.email as vendor_email, u.store_name, u.phone, u.address
      FROM payouts p
      JOIN users u ON p.vendor_id = u.id
      WHERE EXTRACT(MONTH FROM p.requested_at) = $1 
      AND EXTRACT(YEAR FROM p.requested_at) = $2
    `;

    let params = [month, year];

    if (userRole !== 'super_admin') {
      query += ` AND p.vendor_id = $3`;
      params.push(vendorId);
    }

    query += ` ORDER BY p.requested_at DESC`;

    const result = await pool.query(query, params);
    const payouts = result.rows;

    // Parse amounts to numbers
    const totalAmount = payouts.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const completedAmount = payouts.filter(p => p.status === 'Paid').reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const pendingAmount = payouts.filter(p => p.status === 'Pending').reduce((sum, p) => sum + parseFloat(p.amount), 0);

    // Create PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=statement_${month}_${year}.pdf`);

    doc.pipe(res);

    // Header
    doc.fontSize(24)
      .font('Helvetica-Bold')
      .fillColor('#8E2139')
      .text('JAYASTRA STORE', { align: 'center' });

    doc.fontSize(16)
      .fillColor('#333333')
      .text('Monthly Account Statement', { align: 'center' });

    doc.fontSize(12)
      .fillColor('#666666')
      .text(`${month} ${year}`, { align: 'center' });

    doc.moveDown(1);

    doc.strokeColor('#E0E0E0')
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke();

    doc.moveDown(1);

    // Vendor Info
    const vendor = payouts[0] || {};
    doc.fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#333333')
      .text('Account Holder Details:', 50, doc.y);

    doc.font('Helvetica')
      .text(`Name: ${vendor.store_name || vendor.vendor_name || 'N/A'}`, 50, doc.y + 5)
      .text(`Email: ${vendor.vendor_email || 'N/A'}`, 50, doc.y + 20)
      .text(`Phone: ${vendor.phone || 'N/A'}`, 300, doc.y + 5);

    if (vendor.address) {
      doc.text(`Address: ${vendor.address.substring(0, 80)}`, 50, doc.y + 35);
    }

    doc.moveDown(4);

    // Summary Cards
    const summaryY = doc.y;
    doc.rect(50, summaryY, 150, 70).fillAndStroke('#F0FDF4', '#86EFAC');
    doc.rect(210, summaryY, 150, 70).fillAndStroke('#FEF3C7', '#FDE68A');
    doc.rect(370, summaryY, 150, 70).fillAndStroke('#EFF6FF', '#BFDBFE');

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#166534');
    doc.text('Total Transactions', 70, summaryY + 15);
    doc.fontSize(18).text(payouts.length.toString(), 70, summaryY + 35);

    doc.fillColor('#92400E');
    doc.text('Total Amount', 230, summaryY + 15);
    doc.fontSize(18).text(`₹${totalAmount.toFixed(2)}`, 230, summaryY + 35);

    doc.fillColor('#1E40AF');
    doc.text('Settled Amount', 390, summaryY + 15);
    doc.fontSize(18).text(`₹${completedAmount.toFixed(2)}`, 390, summaryY + 35);

    doc.moveDown(7);

    // Transactions Table
    const tableTop = doc.y;
    doc.rect(50, tableTop, 500, 25).fillAndStroke('#8E2139', '#8E2139');

    doc.fillColor('#FFFFFF')
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Date', 60, tableTop + 7)
      .text('Transaction ID', 150, tableTop + 7)
      .text('Amount (₹)', 350, tableTop + 7)
      .text('Status', 430, tableTop + 7);

    let currentY = tableTop + 25;
    payouts.forEach((p, index) => {
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
      }

      doc.fillColor('#333333')
        .fontSize(9)
        .font('Helvetica')
        .text(new Date(p.requested_at).toLocaleDateString(), 60, currentY + 5)
        .text(`PYT-${String(p.id).padStart(6, '0')}`, 150, currentY + 5)
        .text(parseFloat(p.amount).toFixed(2), 350, currentY + 5)
        .text(p.status, 430, currentY + 5);

      doc.rect(50, currentY, 500, 20).stroke();
      currentY += 20;
    });

    // Footer
    doc.moveDown(2);
    const footerY = doc.y;
    doc.fontSize(8)
      .fillColor('#9CA3AF')
      .text('This is a computer generated statement. For queries, contact accounts@jayastra.com', 50, footerY, { align: 'center' })
      .text(`Generated on: ${new Date().toLocaleString()}`, 50, footerY + 15, { align: 'center' });

    doc.end();

  } catch (err) {
    console.error("Monthly statement error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});



// ================= SAVED BANK ACCOUNTS ROUTES =================

// Get saved bank accounts for vendor
app.get("/api/admin/payouts/saved-accounts", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    const vendorId = req.user.id;

    // First, check if the table exists, if not create it
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vendor_bank_accounts (
        id SERIAL PRIMARY KEY,
        vendor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        bank_details TEXT NOT NULL,
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const result = await pool.query(
      `SELECT * FROM vendor_bank_accounts WHERE vendor_id = $1 ORDER BY is_default DESC, created_at DESC`,
      [vendorId]
    );

    res.json({ success: true, accounts: result.rows });
  } catch (err) {
    console.error("Error fetching saved accounts:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Save bank account for vendor
app.post("/api/admin/payouts/save-account", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { bank_details } = req.body;

    if (!bank_details || bank_details.trim() === "") {
      return res.status(400).json({ success: false, message: "Bank details are required" });
    }

    // Create table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vendor_bank_accounts (
        id SERIAL PRIMARY KEY,
        vendor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        bank_details TEXT NOT NULL,
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if this exact bank detail already exists for this vendor
    const existing = await pool.query(
      `SELECT id FROM vendor_bank_accounts WHERE vendor_id = $1 AND bank_details = $2`,
      [vendorId, bank_details]
    );

    if (existing.rows.length === 0) {
      // Check if this is the first account - make it default
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM vendor_bank_accounts WHERE vendor_id = $1`,
        [vendorId]
      );
      const isFirstAccount = parseInt(countResult.rows[0].count) === 0;

      await pool.query(
        `INSERT INTO vendor_bank_accounts (vendor_id, bank_details, is_default) VALUES ($1, $2, $3)`,
        [vendorId, bank_details, isFirstAccount]
      );
    }

    res.json({ success: true, message: "Bank account saved successfully" });
  } catch (err) {
    console.error("Error saving bank account:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete saved bank account
app.delete("/api/admin/payouts/saved-account/:id", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    const vendorId = req.user.id;
    const accountId = req.params.id;

    const result = await pool.query(
      `DELETE FROM vendor_bank_accounts WHERE id = $1 AND vendor_id = $2 RETURNING *`,
      [accountId, vendorId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    res.json({ success: true, message: "Bank account deleted successfully" });
  } catch (err) {
    console.error("Error deleting bank account:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Set default bank account
app.put("/api/admin/payouts/saved-account/:id/default", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  const client = await pool.connect();
  try {
    const vendorId = req.user.id;
    const accountId = req.params.id;

    await client.query("BEGIN");

    // Remove default from all accounts
    await client.query(
      `UPDATE vendor_bank_accounts SET is_default = false WHERE vendor_id = $1`,
      [vendorId]
    );

    // Set new default
    await client.query(
      `UPDATE vendor_bank_accounts SET is_default = true WHERE id = $1 AND vendor_id = $2`,
      [accountId, vendorId]
    );

    await client.query("COMMIT");
    res.json({ success: true, message: "Default account updated successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error setting default account:", err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});

// ================= CANCEL & REJECT PAYOUT ROUTES =================

// Cancel payout request (Vendor/Admin) - FIXED - Refund to balance
app.put("/api/admin/payouts/:id/cancel", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  const client = await pool.connect();
  try {
    const payoutId = req.params.id;
    const vendorId = req.user.id;
    const { reason } = req.body;

    await client.query("BEGIN");

    const payoutCheck = await client.query(
      "SELECT * FROM payouts WHERE id = $1 AND vendor_id = $2 AND status = 'Pending'",
      [payoutId, vendorId]
    );

    if (payoutCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Payout request not found or already processed" });
    }

    const payout = payoutCheck.rows[0];

    await client.query(
      "UPDATE users SET balance = balance + $1 WHERE id = $2",
      [parseFloat(payout.amount), vendorId]
    );

    await client.query(
      "UPDATE payouts SET status = 'Cancelled', cancellation_reason = $1, updated_at = NOW() WHERE id = $2",
      [reason || "Cancelled by vendor", payoutId]
    );

    // Update wallet transaction status
    await client.query(
      `UPDATE wallet_transactions SET status = 'cancelled', description = description || ' - Cancelled' WHERE payout_id = $1`,
      [payoutId]
    );

    await client.query("COMMIT");

    res.json({ success: true, message: "Payout request cancelled and amount refunded" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Cancel payout error:", err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});


// Reject payout request (Super Admin only) - FIXED - Refund to balance
app.put("/api/admin/payouts/:id/reject", verifyToken, verifySuperAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const payoutId = req.params.id;
    const { reason } = req.body;

    await client.query("BEGIN");

    // Check if payout exists and is pending
    const payoutCheck = await client.query(
      "SELECT * FROM payouts WHERE id = $1 AND status = 'Pending'",
      [payoutId]
    );

    if (payoutCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Payout request not found or already processed" });
    }

    const payout = payoutCheck.rows[0];

    // REFUND the amount back to vendor's balance
    await client.query(
      "UPDATE users SET balance = balance + $1 WHERE id = $2",
      [parseFloat(payout.amount), payout.vendor_id]
    );

    // Update payout status
    await client.query(
      "UPDATE payouts SET status = 'Rejected', rejection_reason = $1, updated_at = NOW(), processed_at = NOW() WHERE id = $2",
      [reason || "Rejected by admin", payoutId]
    );

    await client.query("COMMIT");

    res.json({ success: true, message: "Payout request rejected and amount refunded" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Reject payout error:", err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});

app.get("/api/admin/wallet-transactions", verifyToken, verifyAdminVendorIndividualAccess, async (req, res) => {
  try {
    const userRole = req.user.role?.toLowerCase();
    let query = `
      SELECT wt.*, 
             u.store_name, 
             u.name as vendor_name
      FROM wallet_transactions wt
      JOIN users u ON wt.vendor_id = u.id
      WHERE 1=1
    `;
    let params = [];

    if (userRole !== 'super_admin') {
      query += ` AND wt.vendor_id = $1`;
      params.push(req.user.id);
    }

    query += ` ORDER BY wt.created_at DESC`;

    const result = await pool.query(query, params);
    res.json({ success: true, transactions: result.rows });
  } catch (err) {
    console.error("Wallet transactions error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


app.get("/", (req, res) => res.send("Jayastra API is running 🚀"));

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ success: false, message: 'File too large' });
    return res.status(400).json({ success: false, message: err.message });
  }
  res.status(500).json({ success: false, message: err.message || "Server Error" });
});

// ================= START SERVER =================
initDatabase().then(() => {
  server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
});