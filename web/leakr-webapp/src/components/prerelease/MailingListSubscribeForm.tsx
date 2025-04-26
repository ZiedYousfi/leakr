"use client";

import { useState, FormEvent } from "react";

const SubscribeForm = () => {
  const [email, setEmail] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage("⏳ Sending your request...");

    try {
      const res = await fetch("https://mailing.leakr.net/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(`✨ Thank you! ${data.message}`);
        setEmail("");
      } else {
        setMessage(`⚠️ Error: ${data.error || "Something went wrong."}`);
      }
    } catch (error) {
      setMessage(`⚠️ Network error : ${error} Please try again later.`);
    }
  };

  /* Assuming the parent container provides a dark background */
  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col items-start space-y-3 max-w-sm font-[var(--font-fira-mono)]" // Font matches style guide (Fira Mono)
    >
      <input
        type="email"
        placeholder="Enter your email..."
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="w-full bg-black border border-[#B0B0B0] text-[#E0E0E0] px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7E5BEF] focus:border-transparent placeholder:text-[#4B4B4B] transition duration-200 ease-in-out" // Added transition for consistency
      />
      <button
        type="submit"
        className="bg-[#7E5BEF] text-white px-4 py-2 rounded-md hover:bg-[#6a48d7] hover:shadow-[0_0_15px_rgba(126,91,239,0.6)] transition duration-200 ease-in-out self-center" // Colors match style guide (Night Violet bg, White text) + Added hover glow effect
      >
        Subscribe ✨
      </button>
      {message && <p className="text-sm mt-2 text-[#B0B0B0]">{message}</p>} {/* Text color matches style guide (Silver Grey) */}
    </form>
  );
};

export default SubscribeForm;
