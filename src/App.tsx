import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Camera, 
  Brain, 
  Zap, 
  Clock, 
  BookOpen, 
  Lightbulb, 
  Users,
  Upload,
  CheckCircle,
  ArrowRight,
  Menu,
  X
} from 'lucide-react';
import { ThemeToggle } from './components/ThemeToggle';
import { PageTransition } from './components/PageTransition';

export default function App() {
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [redirectCountdown, setRedirectCountdown] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    // Simulate form submission (replace with actual API call if needed)
    setTimeout(() => {
      try {
        // Netlify Forms will handle the actual submission
        setIsSubmitted(true);
        setIsSubmitting(false);
        
        // Start countdown for Discord redirect
        setRedirectCountdown(3);
        const countdownInterval = setInterval(() => {
          setRedirectCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              // Redirect to Discord in new tab after countdown
              window.open('https://discord.gg/UDDH5Gu5', '_blank', 'noopener,noreferrer');
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } catch (error) {
        setSubmitError('Something went wrong. Please try again.');
        setIsSubmitting(false);
      }
    }, 1000); // Simulate network delay
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMenuOpen(false);
    }
  };

  // Animation variants
  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: "easeOut" }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const scaleOnHover = {
    whileHover: { scale: 1.05 },
    whileTap: { scale: 0.95 }
  };

  return (
    <PageTransition className="min-h-screen bg-white dark:bg-gray-900">
      {/* Navigation */}
      <nav className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <motion.div 
              className="flex items-center"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 mr-3 flex items-center justify-center">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">AnswerLens</span>
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => scrollToSection('hero')}
                className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
              >
                Home
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection('demo')}
                className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
              >
                Demo
              </button>
              <button
                onClick={() => scrollToSection('benefits')}
                className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
              >
                Benefits
              </button>
              <ThemeToggle />
              <motion.button
                onClick={() => scrollToSection('waitlist')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full hover:from-blue-700 hover:to-purple-700 transition-all font-medium shadow-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Get Started
              </motion.button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 p-2"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {isMenuOpen && (
            <motion.div 
              className="md:hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="px-2 pt-2 pb-3 space-y-1">
                <button
                  onClick={() => scrollToSection('hero')}
                  className="block w-full text-left px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
                >
                  Home
                </button>
                <button
                  onClick={() => scrollToSection('how-it-works')}
                  className="block w-full text-left px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
                >
                  How It Works
                </button>
                <button
                  onClick={() => scrollToSection('demo')}
                  className="block w-full text-left px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
                >
                  Demo
                </button>
                <button
                  onClick={() => scrollToSection('benefits')}
                  className="block w-full text-left px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
                >
                  Benefits
                </button>
                <button
                  onClick={() => scrollToSection('waitlist')}
                  className="block w-full text-left px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium mt-2"
                >
                  Get Started
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section id="hero" className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-20 sm:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white leading-tight">
                Your AI Study Partner for{' '}
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Instant Answers
                </span>
              </h1>
              <p className="mt-6 text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                Snap a photo of your notes or assignments and get clear, instant explanations. 
                Transform your study sessions with AI-powered insights.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <motion.button
                  onClick={() => scrollToSection('waitlist')}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-full text-lg font-semibold shadow-xl hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Get Started
                  <ArrowRight className="h-5 w-5" />
                </motion.button>
                <motion.button
                  onClick={() => scrollToSection('demo')}
                  className="border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-8 py-4 rounded-full text-lg font-semibold hover:border-blue-500 dark:hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Try Demo
                </motion.button>
                <motion.a
                  href="https://discord.gg/UDDH5Gu5"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-full text-lg font-semibold shadow-xl hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label="Join our Discord community (opens in new tab)"
                >
                  <Users className="h-5 w-5" />
                  Join Our Discord
                </motion.a>
              </div>
            </motion.div>

            {/* Hero Illustration */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            >
              <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-3 w-3 rounded-full bg-red-500"></div>
                  <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                </div>
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-5/6"></div>
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-300">AI Analysis</span>
                    </div>
                    <div className="h-3 bg-blue-200 dark:bg-blue-700 rounded w-4/5 mb-2"></div>
                    <div className="h-3 bg-blue-200 dark:bg-blue-700 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
              {/* Floating elements */}
              <motion.div
                className="absolute -top-4 -right-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full p-3 shadow-lg"
                animate={{ y: [-10, 10, -10] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <Zap className="h-6 w-6 text-white" />
              </motion.div>
              <motion.div
                className="absolute -bottom-4 -left-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full p-3 shadow-lg"
                animate={{ y: [10, -10, 10] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
              >
                <Lightbulb className="h-6 w-6 text-white" />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="px-4 py-20 sm:py-32 bg-gray-50 dark:bg-gray-800">
        <div className="mx-auto max-w-7xl">
          <motion.div
            className="text-center mb-16"
            {...fadeInUp}
          >
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Get instant explanations in three simple steps
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-3 gap-8 lg:gap-12"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              {
                icon: Camera,
                title: "Snap a Photo",
                description: "Take a picture of your notes, assignments, or any study material",
                color: "from-blue-500 to-cyan-500"
              },
              {
                icon: Brain,
                title: "AI Analysis",
                description: "AnswerLens extracts and analyzes the content using advanced AI",
                color: "from-purple-500 to-pink-500"
              },
              {
                icon: Lightbulb,
                title: "Get Explanations",
                description: "Receive clear, instant explanations and insights to help you learn",
                color: "from-green-500 to-emerald-500"
              }
            ].map((step, index) => (
              <motion.div
                key={index}
                className="text-center group"
                variants={fadeInUp}
                {...scaleOnHover}
              >
                <div className={`mx-auto mb-6 w-20 h-20 rounded-2xl bg-gradient-to-r ${step.color} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow`}>
                  <step.icon className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  {step.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="px-4 py-20 sm:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div {...fadeInUp}>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Try It Yourself
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-12">
              Experience the power of AI-driven study assistance
            </p>
          </motion.div>

          <motion.div
            className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 p-8 sm:p-12"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-12 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
              <Upload className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-6" />
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Try uploading your notes
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-8">
                Coming Soon — Upload feature in development
              </p>
              <motion.button
                onClick={() => scrollToSection('waitlist')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-full font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Join the Waitlist
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="px-4 py-20 sm:py-32 bg-gray-50 dark:bg-gray-800">
        <div className="mx-auto max-w-7xl">
          <motion.div
            className="text-center mb-16"
            {...fadeInUp}
          >
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Why Choose AnswerLens?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Discover the benefits that make studying more effective and enjoyable
            </p>
          </motion.div>

          <motion.div
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              {
                icon: Clock,
                title: "Save Study Time",
                description: "Get instant answers instead of spending hours searching for explanations"
              },
              {
                icon: BookOpen,
                title: "Clear Explanations",
                description: "Receive easy-to-understand explanations tailored to your learning level"
              },
              {
                icon: Brain,
                title: "AI-Powered Insights",
                description: "Leverage advanced AI technology for comprehensive study assistance"
              },
              {
                icon: Users,
                title: "Available Anytime",
                description: "Access your AI study partner 24/7, whenever you need help"
              }
            ].map((benefit, index) => (
              <motion.div
                key={index}
                className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow group"
                variants={fadeInUp}
                {...scaleOnHover}
              >
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl p-3 w-fit mb-6 group-hover:from-blue-600 group-hover:to-purple-600 transition-all">
                  <benefit.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  {benefit.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Waitlist Signup */}
      <section id="waitlist" className="px-4 py-20 sm:py-32 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div {...fadeInUp}>
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              Be the First to Try AnswerLens
            </h2>
            <p className="text-xl text-blue-100 mb-12 max-w-2xl mx-auto">
              Join our waitlist and get early access to the future of AI-powered studying
            </p>
          </motion.div>

          {!isSubmitted ? (
            <motion.form
              onSubmit={handleSubmit}
              data-netlify="true"
              name="waitlist"
              className="max-w-md mx-auto space-y-4"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <input type="hidden" name="form-name" value="waitlist" />
              <div className="space-y-4">
                <input
                  type="text"
                  name="name"
                  placeholder="Your name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  disabled={isSubmitting}
                  className="w-full rounded-2xl border-0 bg-white/90 backdrop-blur px-6 py-4 text-gray-900 placeholder-gray-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-white/50 text-lg"
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Your email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  disabled={isSubmitting}
                  className="w-full rounded-2xl border-0 bg-white/90 backdrop-blur px-6 py-4 text-gray-900 placeholder-gray-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-white/50 text-lg"
                />
              </div>
              {submitError && (
                <motion.p
                  className="text-red-200 text-center text-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {submitError}
                </motion.p>
              )}
              <motion.button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-white text-blue-600 px-8 py-4 rounded-2xl text-lg font-bold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    Joining...
                  </>
                ) : (
                  'Join Waitlist'
                )}
              </motion.button>
            </motion.form>
          ) : (
            <motion.div
              className="max-w-md mx-auto bg-white/10 backdrop-blur rounded-2xl p-8 border border-white/20"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <CheckCircle className="h-16 w-16 text-white mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">Thank You!</h3>
              <p className="text-blue-100 mb-4">
                You're on the waitlist! We'll notify you when AnswerLens is ready.
              </p>
              {redirectCountdown > 0 && (
                <motion.div
                  className="text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <p className="text-blue-100 text-sm mb-2">
                    Redirecting to our Discord community in {redirectCountdown} seconds...
                  </p>
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                </motion.div>
              )}
            </motion.div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-gray-950 px-4 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center mb-4">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 mr-3 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">AnswerLens</span>
              </div>
              <p className="text-gray-400 mb-4 max-w-md">
                Your AI study partner for instant answers. Transform your learning experience with AI-powered insights.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><button onClick={() => scrollToSection('hero')} className="text-gray-400 hover:text-white transition-colors">Home</button></li>
                <li><button onClick={() => scrollToSection('how-it-works')} className="text-gray-400 hover:text-white transition-colors">How It Works</button></li>
                <li><button onClick={() => scrollToSection('demo')} className="text-gray-400 hover:text-white transition-colors">Demo</button></li>
                <li><button onClick={() => scrollToSection('benefits')} className="text-gray-400 hover:text-white transition-colors">Benefits</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-400">
              © 2025 AnswerLens. Built for students, by students.
            </p>
          </div>
        </div>
      </footer>
    </PageTransition>
  );
}