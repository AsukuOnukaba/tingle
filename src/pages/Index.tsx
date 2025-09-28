// Tingle Landing/Index Page - Now redirects to Home instead of being separate

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the new home page
    navigate("/home");
  }, [navigate]);

  return null;
};

export default Index;
