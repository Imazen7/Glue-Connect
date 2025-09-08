import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react"; 

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-[#3F7D58] text-white shadow-md">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex justify-between items-center h-20">           
          <div className="text-3xl font-bold">Glue Connect</div> 
          <ul className="hidden md:flex space-x-8 text-lg font-medium"> {/* Larger text */}
            <li><Link to="/Home" className="hover:text-yellow-300">Home</Link></li>
            <li><Link to="/Profile" className="hover:text-yellow-300">Profile</Link></li>
            <li><Link to="/Chat" className="hover:text-yellow-300">Chat</Link></li>
            <li><Link to="/Placement" className="hover:text-yellow-300">Placement</Link></li>
            <li><Link to="/Project" className="hover:text-yellow-300">Project Partner</Link></li>
            <li><Link to="/Clubs" className="hover:text-yellow-300">Clubs</Link></li>
            <li><Link to="/" className="hover:text-red-300">Logout</Link></li>
          </ul>
          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="focus:outline-none">
              {isOpen ? <X size={32} /> : <Menu size={32} />} 
            </button>
          </div>
        </div>
      </div>
      {isOpen && (
        <div className="md:hidden bg-[#36694A] px-6 pb-6">
          <ul className="space-y-5 text-lg font-medium">
            <li><Link to="/Home" className="block hover:text-yellow-300">Home</Link></li>
            <li><Link to="/Profile" className="block hover:text-yellow-300">Profile</Link></li>
            <li><Link to="/Chat" className="block hover:text-yellow-300">Chat</Link></li>
            <li><Link to="/Placement" className="block hover:text-yellow-300">Placement</Link></li>
            <li><Link to="/Project" className="block hover:text-yellow-300">Project Partner</Link></li>
            <li><Link to="/Clubs" className="block hover:text-yellow-300">Clubs</Link></li>
            <li><Link to="/" className="block hover:text-red-300">Logout</Link></li>
          </ul>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
