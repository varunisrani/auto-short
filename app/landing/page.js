"use client";

import Link from 'next/link';

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed w-full bg-white/90 backdrop-blur-xl z-50 border-b border-purple-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex-shrink-0">
              <span className="text-3xl font-bold bg-gradient-to-r from-purple-500 via-purple-700 to-purple-900 bg-clip-text text-transparent">
                AutoShorts
              </span>
            </div>
            <div className="hidden sm:flex sm:space-x-8">
              <a href="#features" className="text-gray-600 hover:text-purple-600 px-3 py-2 text-sm font-medium transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-gray-600 hover:text-purple-600 px-3 py-2 text-sm font-medium transition-colors">
                How it Works
              </a>
              <a href="#pricing" className="text-gray-600 hover:text-purple-600 px-3 py-2 text-sm font-medium transition-colors">
                Pricing
              </a>
              <Link href="/create" className="bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 text-white px-6 py-2 rounded-full hover:shadow-lg hover:shadow-purple-200 transition-all font-medium ring-1 ring-purple-200">
                Create Short
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_#f3e8ff,_transparent)] opacity-70"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_#f3e8ff,_transparent)] opacity-50"></div>
        <div className="relative max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center justify-center px-4 py-2 mb-8 rounded-full bg-gradient-to-r from-purple-50 to-white ring-1 ring-purple-100 shadow-sm">
            <span className="bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent font-medium">AI-Powered Video Creation</span>
          </div>
          <h1 className="text-5xl sm:text-7xl font-bold text-gray-900 mb-8 leading-tight">
            Create Viral Shorts with
            <span className="bg-gradient-to-r from-purple-500 via-purple-700 to-purple-900 bg-clip-text text-transparent"> AI Magic</span>
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            Transform your ideas into engaging short-form videos in minutes. Powered by advanced AI, designed for modern creators.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link href="/create" 
              className="group bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 text-white px-8 py-4 rounded-full text-lg font-semibold hover:shadow-xl hover:shadow-purple-200/50 transition-all ring-1 ring-purple-200 hover:-translate-y-0.5">
              <span className="flex items-center justify-center">
                Start Creating Now
                <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </Link>
            <a href="#how-it-works" 
              className="group bg-white text-gray-900 px-8 py-4 rounded-full text-lg font-semibold hover:bg-purple-50 transition-all border border-purple-100 hover:border-purple-200 hover:shadow-lg hover:shadow-purple-100/50 hover:-translate-y-0.5">
              See How It Works
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#f3e8ff,_transparent)] opacity-30"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Create <span className="bg-gradient-to-r from-purple-500 via-purple-700 to-purple-900 bg-clip-text text-transparent">Amazing Shorts</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Powerful features designed to help you create professional content in minutes
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "AI Script Generation",
                description: "Generate engaging scripts tailored for short-form content with our advanced AI."
              },
              {
                title: "Professional Voiceovers",
                description: "Convert your script into natural-sounding voiceovers with multiple voice options."
              },
              {
                title: "Smart Image Generation",
                description: "Create stunning visuals that match your content using AI image generation."
              },
              {
                title: "Automatic Video Creation",
                description: "Combine everything into a polished video with perfect timing and transitions."
              },
              {
                title: "Multiple Duration Options",
                description: "Create shorts of various lengths - 30, 45, or 60 seconds to suit your needs."
              },
              {
                title: "Topic Suggestions",
                description: "Never run out of ideas with our AI-powered topic suggestion feature."
              }
            ].map((feature, index) => (
              <div key={index} className="group bg-white p-8 rounded-2xl shadow-sm border border-purple-100 hover:shadow-xl hover:shadow-purple-100/50 transition-all hover:-translate-y-1">
                <div className="w-12 h-12 rounded-xl mb-6 bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 flex items-center justify-center text-white text-xl font-bold ring-1 ring-purple-200 group-hover:shadow-lg group-hover:shadow-purple-200/50 transition-all">
                  {index + 1}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 bg-gradient-to-b from-white via-purple-50/50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Create Your First Short in <span className="bg-gradient-to-r from-purple-500 via-purple-700 to-purple-900 bg-clip-text text-transparent">4 Simple Steps</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our streamlined process makes video creation effortless
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: "01",
                title: "Choose Your Topic",
                description: "Select a topic or get AI suggestions for viral content ideas."
              },
              {
                step: "02",
                title: "Generate Script",
                description: "Our AI creates an engaging script optimized for short-form content."
              },
              {
                step: "03",
                title: "Create Assets",
                description: "Generate matching visuals and professional voiceovers automatically."
              },
              {
                step: "04",
                title: "Export Video",
                description: "Get your finished short ready to upload to any platform."
              }
            ].map((step, index) => (
              <div key={index} className="relative">
                <div className="group bg-white p-8 rounded-2xl shadow-sm border border-purple-100 hover:shadow-xl hover:shadow-purple-100/50 transition-all hover:-translate-y-1">
                  <div className="text-4xl font-bold bg-gradient-to-r from-purple-500 via-purple-700 to-purple-900 bg-clip-text text-transparent mb-6">
                    {step.step}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    {step.title}
                  </h3>
                  <p className="text-gray-600">
                    {step.description}
                  </p>
                </div>
                {index < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-8 transform -translate-y-1/2">
                    <div className="w-8 h-8 border-t-2 border-r-2 border-purple-200 transform rotate-45"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-white relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#f3e8ff,_transparent)] opacity-30"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Simple, <span className="bg-gradient-to-r from-purple-500 via-purple-700 to-purple-900 bg-clip-text text-transparent">Transparent Pricing</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Choose the perfect plan for your content creation needs
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: "Starter",
                price: "Free",
                features: [
                  "5 shorts per month",
                  "30-second duration",
                  "Basic AI script generation",
                  "Standard voice options",
                  "720p export quality"
                ]
              },
              {
                name: "Pro",
                price: "$29/month",
                features: [
                  "30 shorts per month",
                  "Up to 60-second duration",
                  "Advanced AI script generation",
                  "Premium voice options",
                  "1080p export quality",
                  "Priority processing"
                ],
                popular: true
              },
              {
                name: "Business",
                price: "$99/month",
                features: [
                  "Unlimited shorts",
                  "Custom duration options",
                  "Custom AI training",
                  "All voice options",
                  "4K export quality",
                  "Priority support",
                  "Custom branding"
                ]
              }
            ].map((plan, index) => (
              <div key={index} className={`group relative bg-white p-8 rounded-2xl shadow-sm ${
                plan.popular ? 'ring-2 ring-purple-500 scale-105' : 'border border-purple-100'
              } hover:shadow-xl hover:shadow-purple-100/50 transition-all hover:-translate-y-1`}>
                {plan.popular && (
                  <div className="absolute -top-5 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 text-white px-4 py-1 rounded-full text-sm font-medium shadow-lg shadow-purple-200/50">
                      Most Popular
                    </div>
                  </div>
                )}
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  {plan.name}
                </h3>
                <div className="text-4xl font-bold bg-gradient-to-r from-purple-500 via-purple-700 to-purple-900 bg-clip-text text-transparent mb-6">
                  {plan.price}
                </div>
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center text-gray-600">
                      <span className="mr-2 text-purple-600">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link href="/create" 
                  className="group block w-full text-center bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 text-white px-6 py-3 rounded-full hover:shadow-lg hover:shadow-purple-200/50 transition-all font-medium ring-1 ring-purple-200">
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-purple-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-500 via-purple-700 to-purple-900 bg-clip-text text-transparent">
                AutoShorts
              </span>
              <p className="mt-4 text-gray-600">
                Creating viral shorts has never been easier.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 uppercase mb-4">Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-gray-600 hover:text-purple-600 transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="text-gray-600 hover:text-purple-600 transition-colors">How it Works</a></li>
                <li><a href="#pricing" className="text-gray-600 hover:text-purple-600 transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 uppercase mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-600 hover:text-purple-600 transition-colors">About</a></li>
                <li><a href="#" className="text-gray-600 hover:text-purple-600 transition-colors">Blog</a></li>
                <li><a href="#" className="text-gray-600 hover:text-purple-600 transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 uppercase mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-600 hover:text-purple-600 transition-colors">Privacy</a></li>
                <li><a href="#" className="text-gray-600 hover:text-purple-600 transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-purple-100 text-center text-gray-600">
            © {new Date().getFullYear()} AutoShorts. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
} 