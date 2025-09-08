import React from "react";
import Navbar from "../components/Navbar";
import { MessageCircle, User, FileText, Users, Layers } from "lucide-react";

const features = [
  {
    title: "Chat Section",
    desc: "Communicate directly with students or professors via text, or voice calls. Chat and collaborate seamlessly.",
    icon: <MessageCircle className="w-10 h-10 text-green-700" />,
  },
  {
    title: "Profile Section",
    desc: "Showcase skills, resume, portfolio, GitHub, and LinkedIn. Update and save details easily to build your professional presence.",
    icon: <User className="w-10 h-10 text-green-700" />,
  },
  {
    title: "Placement Section",
    desc: "Professors and recruiters can search for students who applied for jobs to identify qualified candidates for placements and internships quickly.",
    icon: <FileText className="w-10 h-10 text-green-700" />,
  },
  {
    title: "Project Partner Section",
    desc: "Search for project partners by skills. View profiles to collaborate on academic and research projects.",
    icon: <Layers className="w-10 h-10 text-green-700" />,
  },
  {
    title: "Club Section",
    desc: "Create clubs and add participants. Club creators manage discussions, making it a space for community building.",
    icon: <Users className="w-10 h-10 text-green-700" />,
  },
];

const Home = () => {
  return (
    <>
      <Navbar />
      <div className="bg-gray-50 min-h-screen px-6 py-12">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl font-extrabold text-[#3F7D58] mb-6">
            Welcome to Glue Connect
          </h1>
          <p className="text-lg text-gray-600 mb-12">
            A collaborative platform for students and professors to connect,
            share, and grow together.
          </p>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="bg-white shadow-lg rounded-2xl p-6 text-left hover:shadow-2xl transition"
              >
                <div className="flex items-center space-x-4 mb-4">
                  {feature.icon}
                  <h2 className="text-xl font-semibold text-gray-800">
                    {feature.title}
                  </h2>
                </div>
                <p className="text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
