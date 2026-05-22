import { useEffect, useState, useRef } from "react";
import { getProducts } from "../data/products";
import ProductCard from "./ProductCard";
import "./RelatedProducts.css";

const RelatedProducts = ({
  category,
  categories = [],
  excludeIds = []
}) => {

const [products,setProducts] = useState([]);
const [related,setRelated] = useState([]);
const sliderRef = useRef(null);

useEffect(()=>{
  loadProducts();
},[category,categories]);


const loadProducts = async ()=>{
  try{
    const data = await getProducts();
    setProducts(data);
    filterProducts(data);
  }catch(err){
    console.error("Failed to load related products",err);
  }
};


const filterProducts = (data)=>{
  let suggestedProducts = [];
  if(category){
    suggestedProducts = data.filter(p =>
      p.category_name === category &&
      !excludeIds.includes(p.id)
    );
  }
  else if(categories.length > 0){
    suggestedProducts = data.filter(p =>
      categories.includes(p.category_name) &&
      !excludeIds.includes(p.id)
    );
  }
  setRelated(suggestedProducts.slice(0,8));
};

const scroll = (direction) => {
  if (sliderRef.current) {
    const { scrollLeft, clientWidth } = sliderRef.current;
    const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
    sliderRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
  }
};


if(related.length === 0) return null;

return(
<div className="related-section mt-5">
  <div className="section-header d-flex justify-content-between align-items-center mb-4">
    <h3 className="section-title mb-0">You may also like</h3>
    <div className="slider-nav-btns d-none d-md-flex">
      <button className="nav-btn prev" onClick={() => scroll('left')}>
        <i className="bi bi-chevron-left"></i>
      </button>
      <button className="nav-btn next" onClick={() => scroll('right')}>
        <i className="bi bi-chevron-right"></i>
      </button>
    </div>
  </div>

  <div className="related-slider-container" ref={sliderRef}>
    {related.map(product => (
      <div key={product.id} className="related-item">
        <ProductCard
          product={product}
          showAddToCart={true}
          showQuickView={false}
          compact={true}
        />
      </div>
    ))}
  </div>
</div>
);
};

export default RelatedProducts;
