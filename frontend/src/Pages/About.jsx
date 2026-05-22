import React from "react";
import "./About.css";

import Footer from "../components/Footer";

const About = () => {
  const blogs = [
    {
      id: 1,
      title: "The Timeless Elegance of Kanchipuram Silk",
      excerpt: "Dive into the rich history of the 'Queen of Sarees'. Discover why authentic JAYASTRA Kanchipuram silk is a must-have for every wedding...",
      date: "March 20, 2026",
      image: "/assets/kanchip.jpeg"
    },
    {
      id: 2,
      title: "Draping Handlooms for the Modern Woman",
      excerpt: "Sarees are transcending conventional styling. Here are 5 ways to drape luxurious JAYASTRA sarees for an elegant and powerful modern look...",
      date: "March 28, 2026",
      image: "/assets/sarry3.jpeg"
    },
    {
      id: 3,
      title: "The Heartbeat of the Weaver's Loom",
      excerpt: "In a world of fast fashion, sustainable handloom weaves represent a profound commitment to our artisans and the timeless heritage of India...",
      date: "April 05, 2026",
      image: "/assets/sarry2.jpeg"
    }
  ];

  return (
    <div className="about-page">
      {/* HERO SECTION */}
      <section className="about-hero">
        <div className="container">
          <h1 className="hero-heading">Celebrating The Art Of Weave</h1>
          <p className="hero-sub">Where Tradition Meets Timeless Luxury</p>
        </div>
      </section>

      {/* OUR STORY SECTION */}
      <section className="about-story py-5">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6 mb-4 mb-lg-0">
              <div className="story-img-frame">
                <img src="/assets/about.jpeg" alt="Our Story" className="img-fluid" />
              </div>
            </div>
            <div className="col-lg-6 shop-story-content">
              <h2 className="section-title">The JAYASTRA Story</h2>
              <div className="divider-left"></div>
              <p>
                Founded in the heart of Bengaluru, <strong>JAYASTRA</strong> began with a simple yet powerful dream: to bring back the lost glory of authentic Indian handlooms. We believe that every saree tells a story – a story of an artisan's dedicated hours, the rhythm of the loom, and the rich cultural heritage that binds us all.
              </p>
              <p>
                Specializing exclusively in premium, hand-picked luxury sarees, we have become a trusted destination for modern women who value purity, quality, and timeless elegance. Every drape is a testament to the master weavers of India.
              </p>
              <p>
                From the royal courts of Kanchipuram to the vibrant lanes of Banaras, we travel across the country to bring you the finest silk and handloom weaves, curated with love and delivered with a sense of pride.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section className="why-us-section py-5">
        <div className="container">
          <h2 className="section-title text-center">Our Commitment</h2>
          <div className="section-divider"></div>
          <div className="row g-4 text-center mt-4 commitment-mobile-row">
            <div className="col-md-4">
              <div className="commitment-card">
                <i className="bi bi-patch-check"></i>
                <h3>100% Authentic</h3>
                <p>No compromises on origin. Every saree is sourced directly from master weavers across India.</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="commitment-card">
                <i className="bi bi-stars"></i>
                <h3>Timeless Elegance</h3>
                <p>Every saree is crafted with precision and passion, giving you a luxurious feel that lasts generations.</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="commitment-card">
                <i className="bi bi-heart"></i>
                <h3>Empowering Weavers</h3>
                <p>A portion of every purchase goes back to supporting our artisan communities and keeping heritage alive.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BLOGS / ARTICLES FOR SEO */}
      <section className="about-blogs py-5">
        <div className="container">
          <h2 className="section-title text-center">Style & Heritage Stories</h2>
          <p className="text-center text-muted mb-5">Explore our latest insights on luxury handlooms, silken weaves, and traditional fashion.</p>
          <div className="row g-4 commitment-mobile-row">
            {blogs.map((blog) => (
              <div className="col-md-4" key={blog.id}>
                <div className="blog-card">
                  <div className="blog-img">
                    <img src={blog.image} alt={blog.title} />
                  </div>
                  <div className="blog-body">
                    <span className="blog-date">{blog.date}</span>
                    <h3 className="blog-title">{blog.title}</h3>
                    <p className="blog-excerpt">{blog.excerpt}</p>
                    <button className="read-more-btn">Explore Story <i className="bi bi-arrow-right"></i></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
