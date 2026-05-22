// AdminLogin.js - Updated version
import { useState } from "react";
import axios from '../utils/axiosConfig'; // Adjust path as needed
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import sarry_logo from "../assets/jayastra_banner.png";
import "./AdminLogin.css";

const API_URL = process.env.REACT_APP_API_URL;

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await axios.post(`${API_URL}/auth/login`, {
        email: email.trim().toLowerCase(),
        password
      });

      const role = res.data.user.role;
      if (role !== "super_admin" && role !== "admin" && role !== "vendor") {
        toast.error("Access denied. Not an admin or vendor");
        setLoading(false);
        return;
      }

      // Store all auth data
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userRole", role);
      localStorage.setItem("admin_name", res.data.user.name);
      localStorage.setItem("admin_email", res.data.user.email);
      if (res.data.user.id) localStorage.setItem("userId", res.data.user.id);

      toast.success("Login successful!");
      
      // Small delay to ensure storage is complete before navigation
      setTimeout(() => {
        navigate("/admin/dashboard", { replace: true });
      }, 500);

    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid email or password");
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-box">
        <div className="login-logo-container">
          <img src={sarry_logo} className="sidebar-logo-login" alt="Logo" />
        </div>
        <form onSubmit={handleLogin}>
          <input 
            type="email" 
            placeholder="Email" 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            disabled={loading}
          />
          <div style={{ position: 'relative', width: '100%' }}>
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Password" 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              style={{ paddingRight: '40px', marginBottom: '15px' }}
              disabled={loading}
            />
            <i 
              className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`} 
              onClick={() => setShowPassword(!showPassword)} 
              style={{ position: 'absolute', right: '12px', top: '21px', transform: 'translateY(-50%)', cursor: 'pointer', color: '#666', fontSize: '18px' }}
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminLogin;