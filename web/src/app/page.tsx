import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Car,
  Shield,
  DollarSign,
  ArrowRight,
  Star,
  CheckCircle,
  Users,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-transparent">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Knot</h1>
          <div className="flex items-center gap-2">
            <Link href="/home">
              <Button variant="outline" className="border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/20 text-sm">
                🔧 Dev Mode
              </Button>
            </Link>
            <Link href="/login">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                Start Matching
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Split rides.
            <br />
            <span className="text-blue-400">Stay safe.</span>
            <br />
            Save money.
          </h2>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Find verified travelers heading to the same destination and save up
            to 50% on airport rides. It&apos;s like Tinder for ridesharing.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login">
              <Button
                size="lg"
                className="h-14 px-8 text-lg bg-blue-600 hover:bg-blue-700"
              >
                Get Started
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button
                size="lg"
                variant="ghost"
                className="h-14 px-8 text-lg text-white hover:bg-white/10"
              >
                How it works
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-6 bg-white/5 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold text-white mb-2">50%</div>
            <div className="text-blue-200">Average savings</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-white mb-2">10K+</div>
            <div className="text-blue-200">Rides matched</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-white mb-2">4.9★</div>
            <div className="text-blue-200">User rating</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6" id="how-it-works">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-white text-center mb-16">
            How Knot Works
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-white/10 border-0 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center mx-auto mb-6">
                  <Car className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-xl font-semibold text-white mb-3">
                  1. Post your ride
                </h4>
                <p className="text-blue-100">
                  Enter your airport, destination, and preferred time window.
                  Add your flight number to anchor timing.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-0 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center mx-auto mb-6">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-xl font-semibold text-white mb-3">
                  2. Find matches
                </h4>
                <p className="text-blue-100">
                  Browse verified travelers heading the same way. See ratings,
                  ride history, and compatibility scores.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-0 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center mx-auto mb-6">
                  <DollarSign className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-xl font-semibold text-white mb-3">
                  3. Split the fare
                </h4>
                <p className="text-blue-100">
                  Coordinate via chat, meet at the terminal, and split your
                  Uber/Lyft fare. Save up to 50%!
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Trust & Safety */}
      <section className="py-20 px-6 bg-white/5 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto text-center">
          <Shield className="w-16 h-16 text-green-400 mx-auto mb-6" />
          <h3 className="text-3xl font-bold text-white mb-6">
            Built for Trust & Safety
          </h3>
          <div className="grid sm:grid-cols-2 gap-6 text-left">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
              <div>
                <h4 className="text-lg font-semibold text-white">
                  Verified Users
                </h4>
                <p className="text-blue-100">
                  Email and phone verification required for all users
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
              <div>
                <h4 className="text-lg font-semibold text-white">
                  Rating System
                </h4>
                <p className="text-blue-100">
                  See past ride history and ratings from other travelers
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
              <div>
                <h4 className="text-lg font-semibold text-white">
                  Report & Block
                </h4>
                <p className="text-blue-100">
                  Easy reporting and blocking tools from day one
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
              <div>
                <h4 className="text-lg font-semibold text-white">
                  Airport Focus
                </h4>
                <p className="text-blue-100">
                  Designed specifically for safe, public airport meetups
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl font-bold text-white mb-6">
            Ready to save on your next airport ride?
          </h3>
          <Link href="/login">
            <Button
              size="lg"
              className="h-14 px-8 text-lg bg-blue-600 hover:bg-blue-700"
            >
              Join Knot Today
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-blue-200 text-sm">
            © {new Date().getFullYear()} Knot. All rights reserved.
          </div>
          <div className="flex items-center gap-6 text-sm text-blue-200">
            <Link href="#" className="hover:text-white">
              Privacy
            </Link>
            <Link href="#" className="hover:text-white">
              Terms
            </Link>
            <Link href="#" className="hover:text-white">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
