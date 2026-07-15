import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Shkruaj email-in dhe password-in.");
      return;
    }

    setLoading(true);

    try {
      const loginRequest = supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      const timeout = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("Supabase nuk u pergjigj. Kontrollo nese projekti eshte healthy.")),
          12000
        );
      });

      const { error } = await Promise.race([loginRequest, timeout]);

      if (error) {
        setError(error.message);
      } else {
        navigate("/dashboard");
      }
    } catch (loginError) {
      setError(loginError.message || "Login nuk funksionoi. Provo perseri.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="center">
      <div className="form-container">
        <h2>Login</h2>
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" disabled={loading}>
            {loading ? "Duke u kycur..." : "Login"}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
        <p>
          Nuk ke account? <Link to="/signup">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}
