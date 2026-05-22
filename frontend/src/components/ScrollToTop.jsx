import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Ensure scroll to top happens on every route change
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth" // Smooth scroll as requested by user
    });
  }, [pathname]);

  return null;
};

export default ScrollToTop;
