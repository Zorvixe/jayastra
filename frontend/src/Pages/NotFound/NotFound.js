import React, { useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './NotFound.css';

const NotFound = () => {
  const navigate = useNavigate();
  const cardRef = useRef(null);
  const illustrationRef = useRef(null);

  useEffect(() => {
    const card = cardRef.current;
    const illustration = illustrationRef.current;
    if (!card || !illustration) return;

    const handleMouseMove = (e) => {
      const rect = card.getBoundingClientRect();
      // Calculate mouse position relative to the card center
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      // Limit the rotation angle (tilt effect)
      const tiltX = (y / (rect.height / 2)) * -10;
      const tiltY = (x / (rect.width / 2)) * 10;

      illustration.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateZ(20px)`;
    };

    const handleMouseLeave = () => {
      illustration.style.transform = 'rotateX(0deg) rotateY(0deg) translateZ(0px)';
      illustration.style.transition = 'transform 0.5s ease';
    };

    const handleMouseEnter = () => {
      illustration.style.transition = 'none';
    };

    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseleave', handleMouseLeave);
    card.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
      card.removeEventListener('mouseleave', handleMouseLeave);
      card.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, []);

  const handleGoBack = () => {
    // Navigate back, or fallback to home if there is no history
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="not-found-wrapper">
      <div className="not-found-card" ref={cardRef}>
        
        {/* Central SVG Illustration with Interactive Hover Depth */}
        <div className="illustration-container" ref={illustrationRef}>
          <svg viewBox="0 0 500 350" fill="none" xmlns="http://www.w3.org/2000/svg" className="not-found-svg">
            {/* Soft background glows */}
            <circle cx="250" cy="175" r="120" fill="url(#glow)" opacity="0.15" />
            <circle cx="90" cy="90" r="8" fill="#6366F1" opacity="0.3" className="float-slow" />
            <circle cx="410" cy="260" r="12" fill="#8E2139" opacity="0.2" className="float-fast" />
            <circle cx="380" cy="70" r="6" fill="#10B981" opacity="0.4" />
            
            {/* Subtle "404" shadow text */}
            <text x="50%" y="190" textAnchor="middle" className="svg-text-bg">404</text>
            
            {/* Floating focal point */}
            <g className="main-character">
              <ellipse cx="250" cy="245" rx="80" ry="12" fill="#E2E8F0" />
              
              {/* Outer dashed ring */}
              <circle cx="250" cy="155" r="45" stroke="#8E2139" strokeWidth="5" fill="white" strokeLinecap="round" strokeDasharray="10 6" className="spin-slow" />
              <circle cx="250" cy="155" r="35" fill="#EEF2FF" />
              
              {/* Central question mark symbol */}
              <text x="250" y="170" fontFamily="system-ui, sans-serif" fontSize="42" fontWeight="bold" fill="#8E2139" textAnchor="middle">?</text>
              
              <path d="M250 200V240" stroke="#8E2139" strokeWidth="6" strokeLinecap="round" />
              <path d="M230 240H270" stroke="#8E2139" strokeWidth="6" strokeLinecap="round" />
            </g>

            <defs>
              <radialGradient id="glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(250 175) rotate(90) scale(120)">
                <stop offset="0%" stopColor="#8E2139" />
                <stop offset="100%" stopColor="#8E2139" stopOpacity="0" />
              </radialGradient>
            </defs>
          </svg>
        </div>

        {/* Text Elements */}
        <div className="content-box">
          <h1 className="error-title">Page not found</h1>
          <p className="error-description">
            We can’t seem to find the page you’re looking for. It might have been moved, or the link may be broken.
          </p>
          
          {/* Actions */}
          <div className="action-buttons">
            <button onClick={handleGoBack} className="btn btn-secondary">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
              </svg>
              Go Back
            </button>
            <Link to="/" className="btn btn-primary">
              Go to Homepage
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default NotFound;