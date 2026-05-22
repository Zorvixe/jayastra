import { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";

const CartContext = createContext();
const API_URL = process.env.REACT_APP_API_URL;

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    const saved = localStorage.getItem("guestCart");
    return saved ? JSON.parse(saved) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false); // ✅ Global drawer state

  /* ================= FETCH CART ================= */
  const fetchCart = useCallback(async () => {
    const activeToken = localStorage.getItem("token");
    if (!activeToken) return;

    try {
      const res = await axios.get(`${API_URL}/cart`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      const mapped = (res.data.cart || []).map(item => ({
        ...item,
        id: item.id,
        product_id: item.product_id,
        name: item.name,
        price: parseFloat(item.price),
        old_price: item.old_price ? parseFloat(item.old_price) : null,
        quantity: item.quantity,
        qty: item.quantity,                 // alias for easier usage
        main_image_url: item.main_image_url,
        image_url: item.main_image_url,
        uuid: item.uuid,
        product_code: item.product_code,
        category_name: item.category_name,
        vendor_id: item.vendor_id,          // ✅ CRITICAL for vendor-specific coupons
        created_at: item.created_at
      }));
      setCartItems(mapped);
      localStorage.removeItem("guestCart");
    } catch (err) {
      console.error("Cart fetch error", err);
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem("token")) {
      fetchCart();
    }
  }, [fetchCart]);

  /* ================= SAVE GUEST DATA ================= */
  useEffect(() => {
    if (!localStorage.getItem("token")) {
      localStorage.setItem("guestCart", JSON.stringify(cartItems));
    }
  }, [cartItems]);

  /* ================= ADD TO CART ================= */
  const addToCart = async (product) => {
    const activeToken = localStorage.getItem("token");

    if (!activeToken) {
      // Guest mode: ensure we store vendor_id
      setCartItems(prev => {
        const exist = prev.find(i => i.id === product.id);
        if (exist) {
          return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + (product.qty || 1) } : i);
        }
        // Spread product and explicitly include vendor_id
        return [...prev, { 
          ...product, 
          qty: product.qty || 1,
          vendor_id: product.vendor_id   // ✅ ensure vendor_id is present
        }];
      });
      setIsCartOpen(true); // ✅ Open drawer after guest add
      return;
    }

    try {
      await axios.post(
        `${API_URL}/cart`,
        { product_id: product.id, quantity: product.qty || 1 },
        { headers: { Authorization: `Bearer ${activeToken}` } }
      );
      await fetchCart();
      setIsCartOpen(true); // ✅ Open drawer after cloud add
    } catch (err) {
      console.error("Cloud add failed", err);
    }
  };

  const updateQty = async (id, qty) => {
    if (qty < 1) return;
    const activeToken = localStorage.getItem("token");

    if (!activeToken) {
      setCartItems(prev => prev.map(i => i.id === id ? { ...i, qty } : i));
      return;
    }

    try {
      await axios.put(`${API_URL}/cart/${id}`, { quantity: qty }, { headers: { Authorization: `Bearer ${activeToken}` } });
      setCartItems(prev => prev.map(i => i.id === id ? { ...i, qty } : i));
    } catch (err) { console.error("Update failed", err); }
  };

  const removeItem = async (id) => {
    const activeToken = localStorage.getItem("token");
    if (!activeToken) {
      setCartItems(prev => prev.filter(i => i.id !== id));
      return;
    }
    try {
      await axios.delete(`${API_URL}/cart/${id}`, { headers: { Authorization: `Bearer ${activeToken}` } });
      setCartItems(prev => prev.filter(i => i.id !== id));
    } catch (err) { console.error("Remove failed", err); }
  };

  const clearCart = () => { setCartItems([]); localStorage.removeItem("guestCart"); };

  const totalPrice = cartItems.reduce((acc, item) => acc + Number(item.price) * (item.qty || 0), 0);
  const totalItems = cartItems.reduce((acc, item) => acc + (item.qty || 0), 0);

  return (
    <CartContext.Provider value={{ 
        cartItems, addToCart, updateQty, removeItem, clearCart, 
        totalPrice, totalItems, fetchCart,
        isCartOpen, setIsCartOpen // ✅ Export drawer state
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);