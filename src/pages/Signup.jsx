import { useState } from "react";
import { supabase } from "../supabaseClient";
import { Link, useNavigate } from "react-router-dom";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("patient");
  const [doctorName, setDoctorName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) return setError("Shkruaj emrin.");
    if (!email.includes("@")) return setError("Email invalid");
    if (password.length < 6) return setError("Password min 6 karaktere");
    if (role === "doctor" && !doctorName.trim()) {
      return setError("Shkruaj emrin e mjekut, p.sh. Dr. Elira Hoxha.");
    }

    setLoading(true);

    const metadata = {
      name: name.trim(),
      role,
      ...(role === "doctor" ? { doctor_name: doctorName.trim() } : {}),
    };

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: metadata },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      alert("Kontrollo email per verifikim!");
      navigate("/login");
    }
  };

  return (
    <div className="center">
      <div className="form-container">
        <h2>Sign Up</h2>
        <form onSubmit={handleSignup}>
          <input placeholder="Emri" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="role-choice">
            <button
              type="button"
              className={role === "patient" ? "role-choice__button role-choice__button--active" : "role-choice__button"}
              onClick={() => {
                setRole("patient");
                setDoctorName("");
              }}
            >
              Pacient
            </button>
            <button
              type="button"
              className={role === "doctor" ? "role-choice__button role-choice__button--active" : "role-choice__button"}
              onClick={() => setRole("doctor")}
            >
              Mjek
            </button>
          </div>
          {role === "doctor" && (
            <input
              placeholder="Emri i mjekut, p.sh. Dr. Elira Hoxha"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
            />
          )}
          <input
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
            {loading ? "Duke u regjistruar..." : "Sign Up"}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
        <p>
          Ke account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
