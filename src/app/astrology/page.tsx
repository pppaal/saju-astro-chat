"use client";

import { generatePromptForGemini } from "@/lib/Astrology/astrology";
import { useState, FormEvent } from "react";

// 입력 타입
interface NatalChartInput {
  date: string;
  time: string;
  city: string;
  gender: "male" | "female" | "other";
}

export default function Home() {
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setInterpretation(null);

    const formData = new FormData(event.currentTarget);
    const data: NatalChartInput = {
      date: formData.get("date") as string,
      time: formData.get("time") as string,
      city: formData.get("city") as string,
      gender: formData.get("gender") as "male" | "female" | "other",
    };

    try {
      // 문자열 date, time → 숫자 분해
      const [year, month, day] = data.date.split("-").map(Number);
      const [hour, minute] = data.time.split(":").map(Number);

      const natalInput = {
        year,
        month,
        date: day,
        hour,
        minute,
        latitude: 37.5665,   // ⚠️ 임시값 (서울 위도)
        longitude: 126.9780, // ⚠️ 임시값 (서울 경도)
        locationName: data.city,
      };

      // ✅ API 대신 lib 함수 바로 호출
      const result = generatePromptForGemini(natalInput);
      setInterpretation(result);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Custom CSS for animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes float {
          0% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-12px);
          }
          100% {
            transform: translateY(0px);
          }
        }
        @keyframes pan-background {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        .fade-in-card {
          animation: fadeIn 1s ease-out forwards;
        }
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
      `}</style>

      <main
        className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 text-white font-sans overflow-hidden"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?q=80&w=2071&auto=format&fit=crop')",
          backgroundSize: "150% auto",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
          animation: "pan-background 90s linear infinite",
        }}
      >
        {/* Back Button */}
        <button
          onClick={() => window.history.back()}
          className="absolute top-6 left-6 w-12 h-12 bg-black/20 backdrop-blur-sm text-white/80 border border-white/20 rounded-full flex items-center justify-center text-2xl cursor-pointer z-10 hover:bg-black/40 transition-colors"
          aria-label="Go back"
        >
          ←
        </button>

        <div className="w-full max-w-3xl mx-auto bg-black/40 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-10 md:p-16 fade-in-card animate-float">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
              AI Natal Chart
            </h1>
            <p className="text-lg text-indigo-200">
              Discover your cosmic map based on your birth information.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-7">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
              <div>
                <label
                  htmlFor="date"
                  className="block text-sm font-medium text-indigo-100 mb-2"
                >
                  Date of Birth
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  required
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="time"
                  className="block text-sm font-medium text-indigo-100 mb-2"
                >
                  Time of Birth
                </label>
                <input
                  type="time"
                  id="time"
                  name="time"
                  required
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="city"
                className="block text-sm font-medium text-indigo-100 mb-2"
              >
                City of Birth
              </label>
              <input
                type="text"
                id="city"
                name="city"
                required
                placeholder="e.g., London, New York"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="gender"
                className="block text-sm font-medium text-indigo-100 mb-2"
              >
                Gender
              </label>
              <select
                id="gender"
                name="gender"
                required
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-400 focus:outline-none appearance-none"
              >
                <option value="male" className="bg-gray-900 text-white">
                  Male
                </option>
                <option value="female" className="bg-gray-900 text-white">
                  Female
                </option>
                <option value="other" className="bg-gray-900 text-white">
                  Other
                </option>
              </select>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-400/50 text-white font-bold py-3.5 px-4 rounded-lg transition-all duration-300 shadow-lg flex items-center justify-center text-lg"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Analyzing...
                </>
              ) : (
                "Generate My Chart"
              )}
            </button>
          </form>

          {(error || interpretation) && (
            <div
              className="mt-10 pt-8 border-t border-white/20 fade-in-card"
              style={{ animationDelay: "0.5s", opacity: 0 }}
            >
              {error && (
                <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg text-center">
                  {error}
                </div>
              )}
              {interpretation && (
                <div>
                  <h2 className="text-2xl font-bold text-center mb-4">
                    Your Cosmic Interpretation
                  </h2>
                  <p className="text-indigo-200 whitespace-pre-wrap leading-relaxed">
                    {interpretation}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}