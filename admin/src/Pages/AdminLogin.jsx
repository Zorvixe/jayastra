// AdminLogin.js - Complete Working Version with Redesigned Modern UI
import React, { useState, useEffect, useRef } from "react";
import axios from '../utils/axiosConfig';
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import sarry_logo from "../assets/jayastra_banner.png";
import login_image from "../assets/login-image.png";
import "./AdminLogin.css";

const API_URL = process.env.REACT_APP_API_URL;

function AdminLogin() {
  const navigate = useNavigate();
  const [loginMethod, setLoginMethod] = useState("credentials");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showPinSheet, setShowPinSheet] = useState(false);

  // Credentials Login States
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Direct PIN Login States
  const [pin, setPin] = useState(["", "", "", ""]);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [rememberPinUser, setRememberPinUser] = useState(false);
  const [savedUserId, setSavedUserId] = useState(null);
  const [showPin, setShowPin] = useState(false);

  const pinInputRefs = [useRef(), useRef(), useRef(), useRef()];

  // Check mobile viewport
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load saved user ID from localStorage for PIN login
  useEffect(() => {
    const savedPinUser = localStorage.getItem("pinLoginUserId");
    const rememberPin = localStorage.getItem("rememberPinLogin");
    if (savedPinUser && rememberPin === "true") {
      setSavedUserId(savedPinUser);
      setRememberPinUser(true);
    }
  }, []);

  // Countdown timer for lock
  useEffect(() => {
    if (lockedUntil) {
      const interval = setInterval(() => {
        const now = new Date();
        if (now >= lockedUntil) {
          setLockedUntil(null);
          setAttemptsLeft(5);
          setPinError("");
          clearInterval(interval);
        } else {
          setPinError(`Too many failed attempts. Login with Credentials.`);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [lockedUntil]);

  // Auto-focus first PIN input when sheet opens
  useEffect(() => {
    if (showPinSheet && !lockedUntil) {
      const timer = setTimeout(() => {
        pinInputRefs[0].current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [showPinSheet, lockedUntil]);

  // Handle PIN change
  const handlePinChange = (index, value) => {
    if (value && !/^\d*$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value.slice(0, 1);
    setPin(newPin);

    if (value && index < 3) {
      pinInputRefs[index + 1].current?.focus();
    }

    if (pinError) setPinError("");
  };

  const handlePinKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinInputRefs[index - 1].current?.focus();
    }

    if (e.key === 'Enter' && pin.join('').length === 4) {
      handlePinLogin();
    }
  };

  const handlePinPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/[^\d]/g, '').slice(0, 4);
    const newPin = [...pin];
    for (let i = 0; i < pastedData.length; i++) {
      newPin[i] = pastedData[i] || "";
    }
    setPin(newPin);

    const lastIndex = Math.min(pastedData.length - 1, 3);
    if (lastIndex >= 0 && lastIndex < 3) {
      pinInputRefs[lastIndex + 1].current?.focus();
    }
  };

  // Direct PIN Login Handler
  const handlePinLogin = async () => {
    const pinCode = pin.join('');

    if (pinCode.length !== 4) {
      setPinError('Please enter complete 4-digit PIN');
      return;
    }

    setPinLoading(true);
    setPinError('');

    try {
      let res;

      if (savedUserId && rememberPinUser) {
        res = await axios.post(`${API_URL}/auth/login-with-pin-only`, {
          userId: savedUserId,
          pin: pinCode
        });
      } else {
        res = await axios.post(`${API_URL}/auth/login-with-pin-only`, {
          pin: pinCode
        });
      }

      // Check if response indicates success
      if (res.data.success === false) {
        // Handle error message from backend
        const errorMsg = res.data.message;

        if (errorMsg.includes("locked")) {
          setPinError(errorMsg);
        } else if (errorMsg.includes("attempt")) {
          setPinError(errorMsg);
          // Extract attempts left from message if possible
          const match = errorMsg.match(/(\d+)\s*attempt/);
          if (match) {
            setAttemptsLeft(parseInt(match[1]));
          }
        } else {
          setPinError(errorMsg);
        }

        setPin(['', '', '', '']);
        pinInputRefs[0].current?.focus();
        setPinLoading(false);
        return;
      }

      const role = res.data.user?.role;
      if (role !== "super_admin" && role !== "admin" && role !== "vendor") {
        setPinError("Access denied. Not an admin or vendor");
        setPinLoading(false);
        return;
      }

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userRole", role);
      localStorage.setItem("admin_name", res.data.user.name);
      localStorage.setItem("admin_email", res.data.user.email || '');
      localStorage.setItem("userId", res.data.user.id);

      if (rememberPinUser) {
        localStorage.setItem("pinLoginUserId", res.data.user.id);
        localStorage.setItem("rememberPinLogin", "true");
      } else {
        localStorage.removeItem("pinLoginUserId");
        localStorage.removeItem("rememberPinLogin");
      }

      toast.success("PIN login successful!");

      setShowPinSheet(false);
      setLoginMethod("credentials");

      setTimeout(() => {
        navigate("/admin/dashboard", { replace: true });
      }, 500);

    } catch (err) {
      console.error("PIN login error:", err);
      // Handle different error scenarios
      if (err.response) {
        const status = err.response.status;
        const data = err.response.data;

        if (status === 400) {
          // Bad request - show the error message from backend
          setPinError(data.message || "Invalid PIN or Not Registered. Please try again.");
          setPin(['', '', '', '']);
          pinInputRefs[0].current?.focus();
        } else if (status === 401) {
          setPinError("Invalid PIN or Not Registered. Please try again.");
          setPin(['', '', '', '']);
          pinInputRefs[0].current?.focus();
        } else if (status === 429) {
          setPinError(data.message || "Too many attempts. Please try again later.");
        } else if (status === 500) {
          setPinError("Server error. Please try again later.");
        } else {
          setPinError(data?.message || "PIN verification failed. Please try again.");
          setPin(['', '', '', '']);
          pinInputRefs[0].current?.focus();
        }
      } else if (err.request) {
        setPinError("Invalid PIN or Not Registered. Please try again.");
      } else {
        setPinError("An error occurred. Please try again.");
      }
    } finally {
      setPinLoading(false);
    }
  };

  // Credentials Login Handler
  const handleCredentialsLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post(`${API_URL}/auth/login`, {
        identifier: identifier.trim(),
        password: password
      });

      const role = res.data.user.role;
      if (role !== "super_admin" && role !== "admin" && role !== "vendor") {
        toast.error("Access denied. Not an admin or vendor");
        setLoading(false);
        return;
      }

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userRole", role);
      localStorage.setItem("admin_name", res.data.user.name);
      localStorage.setItem("admin_email", res.data.user.email || '');
      localStorage.setItem("userId", res.data.user.id);

      toast.success("Login successful!");

      setTimeout(() => {
        navigate("/admin/dashboard", { replace: true });
      }, 500);

    } catch (err) {
      const errorMsg = err.response?.data?.message || "Invalid email/phone or password";
      toast.error(errorMsg);
      setLoading(false);
    }
  };

  const openPinSheet = () => {
    setPinError("");
    setPin(["", "", "", ""]);
    setShowPinSheet(true);
  };

  const closePinSheet = () => {
    setShowPinSheet(false);
    setPinError("");
    setPin(["", "", "", ""]);
    setShowPin(false);
  };

  const switchLoginMethod = (method) => {
    setLoginMethod(method);
    setPinError("");
    setPin(["", "", "", ""]);
    setLockedUntil(null);
    setAttemptsLeft(5);
    setShowPin(false);
  };

  return (
    <div className="ad-log-container">
      <div className="ad-log-box">
        {/* Left Section: Branding & Illustration */}
        <div className="ad-log-brand-side">
          <div className="ad-log-header">
            <img src={sarry_logo} className="ad-log-brand-logo" alt="Jayastra Banner" />
            <p className="ad-log-powered">Powered by Zorvixe Technologies</p>
          </div>

          <div className="ad-log-illustration-container">
            <img src={login_image} className="ad-log-illustration" alt="Login Illustration" />
          </div>
        </div>

        {/* Right Section: Interactive Login Form */}
        <div className="ad-log-form-side">
          {/* Welcome Section */}
          <div className="ad-log-welcome-section">
            <h2 className="ad-log-title">Welcome to Jayastra</h2>
            <p className="ad-log-subtitle">Please enter your details to continue</p>
          </div>

          {/* Sleek Method Selector */}
          <div className="ad-log-method-switch">
            <button
              type="button"
              className={`ad-log-method-btn ${loginMethod === 'credentials' ? 'ad-log-active' : ''}`}
              onClick={() => switchLoginMethod('credentials')}
            >
              <i className="bi bi-key"></i> Credentials
            </button>
            <button
              type="button"
              className={`ad-log-method-btn ${loginMethod === 'pin' ? 'ad-log-active' : ''}`}
              onClick={() => isMobile ? openPinSheet() : switchLoginMethod('pin')}
            >
              <i className="bi bi-shield-lock"></i> PIN Login
            </button>
          </div>

          {loginMethod === "credentials" && (
            <form onSubmit={handleCredentialsLogin} className="ad-log-form">
              {/* Custom Styled Email Field */}
              <div className="ad-log-input-group">
                <span className="ad-log-input-label-badge">Email or Phone *</span>
                <div className="ad-log-input-wrapper">
                  <i className="bi bi-envelope ad-log-input-icon"></i>
                  <input
                    type="text"
                    placeholder="Enter your email or phone"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Custom Styled Password Field */}
              <div className="ad-log-input-group">
                <span className="ad-log-input-label-badge">Password *</span>
                <div className="ad-log-input-wrapper">
                  <i className="bi bi-lock ad-log-input-icon"></i>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="ad-log-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
                  </button>
                </div>
              </div>

              {/* Capsule Submit Button */}
              <button type="submit" className="ad-log-capsule-submit-btn" disabled={loading}>
                <span className="ad-log-btn-text">
                  {loading ? "LOGGING IN..." : "LOGIN"}
                </span>
                <div className="ad-log-btn-arrow-circle">
                  <i className="bi bi-arrow-right"></i>
                </div>
              </button>
            </form>
          )}

          {loginMethod === "pin" && !isMobile && (
            <div className="ad-log-pin-form">
              <p className="ad-log-pin-description">Enter your 4-digit PIN</p>

              <div className="ad-log-pin-inputs" onPaste={handlePinPaste}>
                {pin.map((digit, index) => (
                  <div key={index} className="ad-log-pin-input-wrapper">
                    <input
                      ref={pinInputRefs[index]}
                      type={showPin ? "text" : "password"}
                      maxLength="1"
                      value={digit}
                      onChange={(e) => handlePinChange(index, e.target.value)}
                      onKeyDown={(e) => handlePinKeyDown(index, e)}
                      className={`ad-log-pin-digit ${pinError ? 'ad-log-error-border' : ''}`}
                      inputMode="numeric"
                      pattern="\d*"
                      disabled={pinLoading}
                      autoComplete="off"
                    />
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="ad-log-pin-eye-icon"
                onClick={() => setShowPin(!showPin)}
              >
                <i className={`bi ${showPin ? "bi-eye-slash" : "bi-eye"}`}></i>
                <span>{showPin ? "Hide" : "Show"} PIN</span>
              </button>

              {pinError && (
                <div className="ad-log-pin-error">
                  <i className="bi bi-exclamation-circle-fill"></i>
                  <span>{pinError}</span>
                </div>
              )}

              <div className="ad-log-remember-pin">
                <label className="ad-log-checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberPinUser}
                    onChange={(e) => setRememberPinUser(e.target.checked)}
                  />
                  <span className="ad-log-checkbox-custom"></span>
                  <span>Remember me for next time</span>
                </label>
              </div>

              <button
                type="button"
                className="ad-log-capsule-submit-btn"
                onClick={handlePinLogin}
                disabled={pinLoading || pin.join('').length !== 4}
              >
                <span className="ad-log-btn-text">
                  {pinLoading ? "VERIFYING..." : "LOGIN PIN"}
                </span>
                <div className="ad-log-btn-arrow-circle">
                  <i className="bi bi-arrow-right"></i>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Fixed Mobile Bottom Sheet Layout */}
      {showPinSheet && (
        <>
          <div className="ad-log-sheet-overlay" onClick={closePinSheet}></div>
          <div className="ad-log-bottom-sheet">
            <div className="ad-log-sheet-header">
              <div className="ad-log-sheet-drag-handle"></div>
              <div className="ad-log-sheet-title-wrapper">
                <h3 className="ad-log-sheet-title">Login PIN</h3>
                <button type="button" className="ad-log-sheet-close-btn" onClick={closePinSheet}>
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
            </div>

            <div className="ad-log-sheet-content">
              <div className="ad-log-pin-form">
                <p className="ad-log-pin-description">Enter your 4-digit PIN</p>

                <div className="ad-log-pin-inputs" onPaste={handlePinPaste}>
                  {pin.map((digit, index) => (
                    <div key={index} className="ad-log-pin-input-wrapper">
                      <input
                        ref={pinInputRefs[index]}
                        type={showPin ? "text" : "password"}
                        maxLength="1"
                        value={digit}
                        onChange={(e) => handlePinChange(index, e.target.value)}
                        onKeyDown={(e) => handlePinKeyDown(index, e)}
                        className={`ad-log-pin-digit ${pinError ? 'ad-log-error-border' : ''}`}
                        inputMode="numeric"
                        pattern="\d*"
                        disabled={pinLoading}
                        autoComplete="off"
                      />
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="ad-log-pin-eye-icon"
                  onClick={() => setShowPin(!showPin)}
                >
                  <i className={`bi ${showPin ? "bi-eye-slash" : "bi-eye"}`}></i>
                  <span>{showPin ? "Hide" : "Show"} PIN</span>
                </button>

                {pinError && (
                  <div className="ad-log-pin-error">
                    <i className="bi bi-exclamation-circle-fill"></i>
                    <span>{pinError}</span>
                  </div>
                )}

                <div className="ad-log-remember-pin">
                  <label className="ad-log-checkbox-label">
                    <input
                      type="checkbox"
                      checked={rememberPinUser}
                      onChange={(e) => setRememberPinUser(e.target.checked)}
                    />
                    <span className="ad-log-checkbox-custom"></span>
                    <span>Remember me for next time</span>
                  </label>
                </div>

                <button
                  type="button"
                  className="ad-log-capsule-submit-btn"
                  onClick={handlePinLogin}
                  disabled={pinLoading || pin.join('').length !== 4}
                >
                  <span className="ad-log-btn-text">
                    {pinLoading ? "VERIFYING..." : "LOGIN PIN"}
                  </span>
                  <div className="ad-log-btn-arrow-circle">
                    <i className="bi bi-arrow-right"></i>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminLogin;