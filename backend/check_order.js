import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkOrder() {
  try {
    const res = await pool.query("SELECT id, shiprocket_order_id, shiprocket_shipment_id, awb_code FROM orders ORDER BY id DESC LIMIT 5");
    console.log("Recent Orders:");
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkOrder();
