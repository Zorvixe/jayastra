import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL;

/* GET ALL PRODUCTS */
export const getProducts = async () => {
try{
const res = await axios.get(`${API_URL}/products`);
return res.data.products;
}catch(err){
console.error("Failed to fetch products", err);
return [];

}

};


/* GET PRODUCT BY ID */

export const getProductById = async (id) => {

try{

const res = await axios.get(`${API_URL}/products`);

const product = res.data.products.find(p => p.id === Number(id));

return product;

}catch(err){

console.error("Failed to fetch product", err);

return null;

}

};


/* GET PRODUCT IMAGES */

export const getProductImages = async (id) => {

try{

const res = await axios.get(`${API_URL}/products/${id}/images`);

return res.data.images;

}catch(err){

console.error("Failed to fetch images", err);

return [];

}

};


/* GET ALL CATEGORIES */
export const getCategories = async () => {
    try {
        const res = await axios.get(`${API_URL}/categories`);
        return res.data.categories;
    } catch (err) {
        console.error("Failed to fetch categories", err);
        return [];
    }
};
