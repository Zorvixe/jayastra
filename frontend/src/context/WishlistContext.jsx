import { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";

const WishlistContext = createContext();
const API_URL = process.env.REACT_APP_API_URL;

export const WishlistProvider = ({ children }) => {
  const [wishlistItems, setWishlistItems] = useState(() => {
    const saved = localStorage.getItem("guestWishlist");
    return saved ? JSON.parse(saved) : [];
  });

  const fetchWishlist = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await axios.get(`${API_URL}/wishlist`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Standardize our wishlist to include product_id uniformly
      // Note: Backend Join returns 'product_id', while list context uses 'id'
      const mapped = (res.data.wishlist || []).map(item => ({
        ...item,
        id: item.product_id // mapping to be compatible with isInWishlist checks
      }));
      setWishlistItems(mapped);
      localStorage.removeItem("guestWishlist"); // Remove guest data
    } catch (err) {
      console.error("Wishlist sync error:", err);
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem("token")) {
      fetchWishlist();
    }
  }, [fetchWishlist]);

  // Save guest wishlist
  useEffect(() => {
    if (!localStorage.getItem("token")) {
      localStorage.setItem("guestWishlist", JSON.stringify(wishlistItems));
    }
  }, [wishlistItems]);

  const toggleWishlist = async (product) => {
    const token = localStorage.getItem("token");

    if (!token) {
        // GUEST MODE
        const exists = wishlistItems.some(i => i.id === product.id);
        if (exists) {
            setWishlistItems(prev => prev.filter(i => i.id !== product.id));
        } else {
            setWishlistItems(prev => [...prev, { ...product, product_id: product.id }]);
        }
        return;
    }

    // AUTH MODE
    try {
      await axios.post(
        `${API_URL}/wishlist`,
        { product_id: product.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchWishlist();
    } catch (err) {
      console.error("Cloud wishlist error", err);
    }
  };

  const isInWishlist = (productId) => {
    return wishlistItems.some(item => (item.product_id === productId || item.id === productId));
  };

  return (
    <WishlistContext.Provider value={{ wishlistItems, toggleWishlist, isInWishlist, fetchWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => useContext(WishlistContext);
