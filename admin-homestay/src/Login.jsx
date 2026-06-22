import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard");
    } catch (err) {
      setError("Sai tài khoản hoặc mật khẩu!");
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-[#1a1a1a]">
      <div className="bg-[#242424] p-8 rounded-lg shadow-lg w-96 border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Đăng nhập Admin</h2>
        {error && <p className="text-red-500 mb-4 text-sm text-center">{error}</p>}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email quản trị"
            className="p-3 rounded bg-[#333] text-white border border-gray-600 focus:outline-none focus:border-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Mật khẩu"
            className="p-3 rounded bg-[#333] text-white border border-gray-600 focus:outline-none focus:border-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded font-bold mt-2 transition-colors">
            Đăng nhập
          </button>
        </form>
      </div>
    </div>
  );
}