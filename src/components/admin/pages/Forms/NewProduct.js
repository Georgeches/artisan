import React, { useState } from "react";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export default function NewProduct({ api }) {

    const [displayPicFile, setDisplayPicFile] = useState(null);
    const [newProduct, setNewProduct] = useState({
        name: "",
        price: "",
        category: "",
        quantity: "",
        description: "",
        image: "",
    });
    const [error, setError] = useState('');
    const path = `${api}/products`;

    function handleInputChange(e) {
        const { name, value } = e.target;
        setNewProduct({ ...newProduct, [name]: value });
    }

    function handleImageChange(e) {
        const file = e.target.files[0];
        if (file) {
            setNewProduct({
                ...newProduct,
                image: URL.createObjectURL(file) // Just for previewing purpose
            });
            setDisplayPicFile(file); // Save the file object for uploading
        }
    }

    async function saveProduct(e) {
        e.preventDefault();

        let uploadedFilename = "";
        if (displayPicFile) {
            try {
                uploadedFilename = await uploadFileToS3(displayPicFile, displayPicFile.name);
            } catch (error) {
                setError("Failed to upload image. Please try again.");
                console.error("Error uploading file:", error);
                return;
            }
        }

        const productDetails = {
            ...newProduct,
            displayPic: uploadedFilename // Include the uploaded filename URL
        };

        // Removing image preview URL from product details before sending to the backend
        delete productDetails.image;

        fetch(path, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(productDetails)
        })
        .then(res => {
            if (!res.ok) {
                throw new Error("Network response was not ok.");
            }
            return res.json();
        })
        .then(data => {
            console.log(data);
            // Handle success, e.g., clear form, show success message
        })
        .catch(error => {
            setError("Could not save product. Try again later.");
            console.error("Error:", error);
        });
    }

    async function uploadFileToS3(file, filename) {
        const uploadClient = new S3Client({
            region: process.env.REACT_APP_NEXT_AWS_S3_REGION,
            credentials: {
                secretAccessKey: process.env.REACT_APP_NEXT_AWS_S3_SECRET_ACCESS_KEY,
                accessKeyId: process.env.REACT_APP_NEXT_AWS_S3_ACCESS_KEY_ID,
            },
        });

        const params = {
            Bucket: process.env.REACT_APP_NEXT_AWS_S3_BUCKET_NAME,
            Key: `${filename}-${Date.now()}`,
            Body: file,
            ContentType: "image/jpeg",
        };
        const command = new PutObjectCommand(params);

        try {
            const { Key } = await uploadClient.send(command);
            return `https://${params.Bucket}.s3.amazonaws.com/${Key}`; // Return the full URL of the uploaded file
        } catch (err) {
            console.error("Upload error:", err);
            throw err;
        }
    }
    return (
        <div className="border d-flex justify-content-center pb-3" style={{ height: "fit-content" }}>
            <form className="bg-light w-50 mt-4 px-5" onSubmit={saveProduct}>
                <p className="h4 text-center p-3">New Product Form</p>

                <label htmlFor="name">Product Name</label>
                <input onChange={handleInputChange} value={newProduct.name} className="form-control mb-3" id="name" name="name" type="text" placeholder="Enter product name" />
                
                <label htmlFor="price">Price</label>
                <input onChange={handleInputChange} value={newProduct.price} className="form-control mb-3" id="price" name="price" type="number" placeholder="Enter price" />

                <label htmlFor="category">Category</label>
                <input onChange={handleInputChange} value={newProduct.category} className="form-control mb-3" id="category" name="category" type="text" placeholder="Enter category of product" />

                <label htmlFor="quantity">Quantity</label>
                <input onChange={handleInputChange} value={newProduct.quantity} className="form-control mb-3" id="quantity" name="quantity" type="number" placeholder="Enter quantity" />

                <label htmlFor="description">Description of Product</label>
                <textarea onChange={handleInputChange} value={newProduct.description} className="form-control mb-3" id="description" name="description" rows="3" placeholder="Enter product description"></textarea>

                <label htmlFor="image">Image</label>
                <input onChange={handleImageChange} className="form-control mb-3" id="image" name="image" type="file" accept="image/*" />

                {newProduct.image && (
                    <div className="imageUploaded p-5 mb-3 text-center" style={{ background: "rgb(230, 230, 230)" }}>
                        <img src={newProduct.image} alt="Uploaded" width="50%" />
                    </div>
                )}

                <button type="submit" className="btn btn-success mt-3">Save</button>
                {error && <div className="alert alert-danger mt-3" role="alert">{error}</div>}
            </form>
        </div>
    );
}
