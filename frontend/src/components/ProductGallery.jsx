// import { useState, useEffect } from "react";
// import { getProductImages } from "../data/products";

// const API_URL = process.env.REACT_APP_API_URL;

// const ProductGallery = ({ product }) => {

//   const [images, setImages] = useState([]);
//   const [selectedImage, setSelectedImage] = useState(null);

//   useEffect(() => {

//     const loadImages = async () => {

//       if (!product?.id) return;

//       try {

//         const gallery = await getProductImages(product.id);

//         const baseUrl = API_URL.replace("/api", "");

//         const mainImage = product.main_image_url
//           ? [`${baseUrl}${product.main_image_url}`]
//           : [];

//         const galleryImages = gallery.map(img =>
//           `${baseUrl}${img.image_url}`
//         );

//         const allImages = [...mainImage, ...galleryImages];

//         setImages(allImages);

//         if (allImages.length > 0) {
//           setSelectedImage(allImages[0]);
//         }

//       } catch (err) {
//         console.error("Gallery load error", err);
//       }

//     };

//     loadImages();

//   }, [product]);


//   if (!images.length) {
//     return <p>No images available</p>;
//   }

//   return (
//     <div className="product-gallery">

//       {/* MAIN */}
//       <div className="details-image">
//         <img src={selectedImage} alt={product.name} />
//       </div>

//       {/* THUMB */}
//       <div className="thumbnail-wrapper">
//         {images.map((img, index) => (
//           <img
//             key={index}
//             src={img}
//             alt=""
//             className={`thumbnail ${selectedImage === img ? "active" : ""}`}
//             onClick={() => setSelectedImage(img)}
//           />
//         ))}
//       </div>

//     </div>
//   );
// };

// export default ProductGallery;
