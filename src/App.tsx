import { useState } from 'react';
import { CheckCircle, Upload, Zap, Heart, Users } from 'lucide-react';

export default function App() {
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Netlify Forms will handle the submission
    setIsSubmitted(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Upload your exam papers.{' '}
            <span className="text-blue-600">Get instant AI feedback</span>{' '}
            on mistakes & improvements.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
            Never repeat the same exam mistakes again — AnswerLens shows you exactly how to improve.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <button className="rounded-xl bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors">
              Try Free / Join Waitlist
            </button>
          </div>
        </div>
      </section>

      {/* Demo Mockup Section */}
      <section className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              AI that learns from your answers — and helps you improve faster.
            </h2>
          </div>
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-16">
            {/* Exam Paper Mockup */}
            <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-lg">
              <div className="mb-4 flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-red-500"></div>
                <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                <span className="ml-2 text-sm font-medium text-gray-600">exam-paper.pdf</span>
              </div>
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-400 rounded">
                  <div className="h-3 bg-red-200 rounded w-2/3 mb-2"></div>
                  <div className="h-3 bg-red-200 rounded w-1/2"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                  <div className="h-3 bg-yellow-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-yellow-200 rounded w-1/3"></div>
                </div>
              </div>
            </div>

            {/* AI Feedback Mockup */}
            <div className="rounded-2xl border bg-white p-6 shadow-lg">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Analysis Results</h3>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Analysis complete in 2.3 seconds</span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-red-500 mt-2"></div>
                    <div className="flex-1">
                      <h4 className="font-medium text-red-900 mb-1">Knowledge Gap</h4>
                      <p className="text-sm text-red-700 mb-2">Missing key concept about photosynthesis</p>
                      <p className="text-xs text-red-600">💡 Fix: Review Chapter 8, section 3.2</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-yellow-500 mt-2"></div>
                    <div className="flex-1">
                      <h4 className="font-medium text-yellow-900 mb-1">Writing Style</h4>
                      <p className="text-sm text-yellow-700 mb-2">Answer lacks clear structure</p>
                      <p className="text-xs text-yellow-600">💡 Fix: Use topic sentences for each paragraph</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-green-50 border border-green-200 p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-green-500 mt-2"></div>
                    <div className="flex-1">
                      <h4 className="font-medium text-green-900 mb-1">Strength</h4>
                      <p className="text-sm text-green-700">Excellent use of scientific terminology</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">7.5/10</div>
                    <div className="text-sm text-blue-700">Predicted Score</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why It's Different Section */}
      <section className="bg-gray-50 px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Why AnswerLens is Different
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <Heart className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Free for students</h3>
              <p className="text-gray-600">(ads supported)</p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Honest, personalized advice</h3>
              <p className="text-gray-600">Tailored feedback for your learning style</p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
                <Zap className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Instant results</h3>
              <p className="text-gray-600">No waiting — get feedback in seconds</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial / Founder Note Section */}
      <section className="relative px-4 py-16 sm:py-24">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
        <div className="relative mx-auto max-w-4xl text-center">
          <blockquote className="text-xl font-medium text-white sm:text-2xl">
            "I kept making the same mistakes in exams. That's why I built AnswerLens — to make sure no student has to repeat them again."
          </blockquote>
          <div className="mt-6">
            <div className="text-lg font-semibold text-blue-100">— Founder, AnswerLens</div>
          </div>
        </div>
      </section>

      {/* Email Capture Section */}
      <section className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl mb-4">
            Be the first to try it when we launch.
          </h2>
          
          {!isSubmitted ? (
            <form 
              onSubmit={handleSubmit}
              data-netlify="true"
              name="waitlist"
              className="mt-8 space-y-4"
            >
              <input type="hidden" name="form-name" value="waitlist" />
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  type="text"
                  name="name"
                  placeholder="Your name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Your email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
              >
                Join Waitlist
              </button>
            </form>
          ) : (
            <div className="mt-8 rounded-xl bg-green-50 border border-green-200 p-6">
              <div className="flex items-center justify-center gap-2 text-green-700">
                <CheckCircle className="h-6 w-6" />
                <span className="text-lg font-semibold">Thank you for joining our waitlist!</span>
              </div>
              <p className="mt-2 text-green-600">We'll notify you as soon as AnswerLens is ready.</p>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 px-4 py-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-gray-400">© 2025 AnswerLens. Built for students, by students.</p>
        </div>
      </footer>
    </div>
  );
}