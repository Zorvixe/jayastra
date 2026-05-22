import React, { useEffect, useMemo, lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Context
import { CartProvider } from "./context/CartContext";
import { WishlistProvider } from "./context/WishlistContext";
import { UserProvider, useUser } from "./context/UserContext";

// Components (non-lazy – needed immediately)
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import LoginModal from "./components/LoginModal";
import LoadingSpinner from "./components/LoadingSpinner"; // create this simple component

// Lazy load page components for faster initial load
const Home = lazy(() => import("./Pages/Home"));
const AllProducts = lazy(() => import("./Pages/AllProducts"));
const ProductDetails = lazy(() => import("./Pages/ProductDetails"));
const CartPage = lazy(() => import("./Pages/CartPage"));
const WishlistPage = lazy(() => import("./Pages/WishlistPage"));
const CheckoutPage = lazy(() => import("./Pages/CheckoutPage"));
const Profile = lazy(() => import("./Pages/Profile"));
const OrderDetails = lazy(() => import("./Pages/OrderDetails"));
const PaymentPage = lazy(() => import("./Pages/PaymentPage"));
const About = lazy(() => import("./Pages/About"));
const Contact = lazy(() => import("./Pages/Contact"));
const PrivacyPolicy = lazy(() => import("./Pages/PrivacyPolicy"));
const ExchangePolicy = lazy(() => import("./Pages/ExchangePolicy"));
const TermsOfService = lazy(() => import("./Pages/TermsOfService"));
const ShippingPolicy = lazy(() => import("./Pages/ShippingPolicy"));

const App = () => {
  return (
    <Router>
      <UserProvider>
        <AppContent />
      </UserProvider>
    </Router>
  );
};

const AppContent = () => {
  const { showLogin, setShowLogin } = useUser();
  const location = useLocation();

  // Show login popup only once per session, after a short delay (smooth & non-intrusive)
  useEffect(() => {
    const token = localStorage.getItem("token");
    const popupClosed = sessionStorage.getItem("loginPopupClosed");

    if (!token && !popupClosed) {
      const timer = setTimeout(() => {
        setShowLogin(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [setShowLogin]);

  const handleCloseLogin = () => {
    setShowLogin(false);
    sessionStorage.setItem("loginPopupClosed", "true");
  };

  // Memoize footer visibility to avoid recalculations on every render
  const shouldShowFooter = useMemo(() => {
    const visiblePaths = ["/", "/all-products"];
    const isProductDetail = location.pathname.startsWith("/product/");
    return visiblePaths.includes(location.pathname) || isProductDetail;
  }, [location.pathname]);

  return (
    <CartProvider>
      <WishlistProvider>
        <ToastContainer position="top-right" autoClose={3000} />
        <ScrollToTop />

        <LoginModal
          show={showLogin}
          setShow={setShowLogin}
          onClose={handleCloseLogin}
        />

        <Navbar />

        {/* Suspense with a smooth loading spinner */}
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/all-products" element={<AllProducts />} />
            <Route path="/product/:uuid/:slug?" element={<ProductDetails />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/payment" element={<PaymentPage />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/order/:id" element={<OrderDetails />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/exchange-policy" element={<ExchangePolicy />} />
            <Route path="/terms-and-conditions" element={<TermsOfService />} />
            <Route path="/shipping-policy" element={<ShippingPolicy />} />
          </Routes>
        </Suspense>

        {shouldShowFooter && <Footer />}
      </WishlistProvider>
    </CartProvider>
  );
};

export default App;