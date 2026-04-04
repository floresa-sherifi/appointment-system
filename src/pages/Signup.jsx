import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate, Link } from "react-router-dom";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.includes("@")) return setError("Email invalid");
    if (password.length < 6) return setError("Password min 6 karaktere");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (error) setError(error.message);
    else {
      alert("Kontrollo email për verifikim!");
      navigate("/login");
    }
  };

  return (
    <div className="center">
      <div className="form-container">
        <h2>Sign Up</h2>
        <form onSubmit={handleSignup}>
          <input
            placeholder="Emri"
            onChange={(e) => setName(e.target.value)}
          />
          <input
            placeholder="Email"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit">Sign Up</button>
        </form>
        {error && <p className="error">{error}</p>}
        <p>
          Ke account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}