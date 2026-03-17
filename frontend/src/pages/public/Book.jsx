import React from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import '../../css/style.css';

const Book = () => {
  return (
    <>
        <Navbar />
        <section id="book-section" className="home-section">
        <div className="container">
            <div className="d-flex justify-content-center">
            <div className="col-md-7 bg-dark shadow-lg rounded py-5">
                <form className="p-5 g-5">
                    <div className="form-floating mb-3">
                        <input 
                        type="email" 
                        className="form-control" 
                        id="floatingInput" 
                        placeholder="name@example.com" 
                        />
                        <label htmlFor="floatingInput">Email address</label>
                    </div>
                    <div className="form-floating">
                        <input 
                        type="password" 
                        className="form-control" 
                        id="floatingPassword" 
                        placeholder="Password" 
                        />
                        <label htmlFor="floatingPassword">Password</label>
                    </div>                    
                {/* Added a submit button so the form is functional */}
                <button type="submit" className="btn btn-primary mt-3 w-100">
                    Book Now
                </button>
                </form>
            </div>
            </div>
        </div>
        </section>
        <Footer />
    </> 
  );
};

export default Book;