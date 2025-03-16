import { useState } from 'react';
import { Link , useNavigate} from 'react-router-dom';
import axios from "../config/axios"
import { useUser } from '../context/user.context';

const Register = () => {

  const [email , setEmail] = useState("");
  const [password , setPassword] = useState("");
  const [name , setName] = useState("");
  const navigate = useNavigate();
  const {user , setUser} = useUser();

  function submitHandler(e) {

    e.preventDefault();

    axios.post("/users/register" , {
      name,
      email,
      password
    }).then((res) => {
      console.log(res.data);

      localStorage.setItem("token" , res.data.token);
      setUser(res.data.user);

      navigate("/");
    }).catch((err) => {
      console.log(err.response.data);
      console.log("error");
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 to-gray-800">
      <div className="bg-[#1e1e2f] p-10 rounded-3xl shadow-2xl w-full max-w-md border border-gray-700">
        <h2 className="text-4xl font-bold text-white mb-8 text-center tracking-wide">Join Us Today</h2>
        <form
          onSubmit={submitHandler}
        >
          <div className="mb-5">
            <label htmlFor="name" className="block text-sm text-gray-300 mb-2">Full Name</label>
            <input
              onChange={(e)=> {setName(e.target.value)}}
              type="text"
              id="name"
              className="w-full px-4 py-3 rounded-xl bg-[#2a2a3b] text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-600"
              placeholder="Enter your name"
            />
          </div>
          <div className="mb-5">
            <label htmlFor="email" className="block text-sm text-gray-300 mb-2">Email Address</label>
            <input
              onChange={(e)=> {setEmail(e.target.value)}}
              type="email"
              id="email"
              className="w-full px-4 py-3 rounded-xl bg-[#2a2a3b] text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-600"
              placeholder="Enter your email"
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm text-gray-300 mb-2">Password</label>
            <input
              onChange={(e) => {setPassword(e.target.value)}}
              type="password"
              id="password"
              className="w-full px-4 py-3 rounded-xl bg-[#2a2a3b] text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-600"
              placeholder="Create a password"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold tracking-wide transition duration-300"
          >
            Register
          </button>
        </form>
        <p className="text-center text-sm text-gray-400 mt-6">
          Already have an account? <Link to="/login" className="text-purple-400 hover:underline">Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;