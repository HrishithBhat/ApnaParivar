import { useState } from 'react';
import Button from '../components/ui/Button';
import { apiUrl } from '../lib/api';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import {
  Crown,
  Users,
  Shield,
  Sparkles,
  TreePine as Tree,
  Link as LinkIcon,
  Image as ImageIcon,
  Share2,
  Lock,
  Star,
  Clock,
  Heart,
} from 'lucide-react';

export default function Landing() {
  const [joining, setJoining] = useState(false);

  const handleGoogle = () => {
    window.location.href = apiUrl('/api/auth/google');
  };

  const handleJoin = () => {
    const familyCode = prompt('Enter family invitation code or paste the full invitation link:');
    if (!familyCode) return;
    const familyId = familyCode.includes('/join/') ? familyCode.split('/join/')[1] : familyCode;
    setJoining(true);
    window.location.href = `/join/${familyId}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-indigo-50/60 to-white">
      {/* Top nav */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-7 w-7 text-indigo-600" />
            <span className="text-xl font-bold text-gray-900">ApnaParivar</span>
            <span className="hidden md:inline text-sm text-gray-500 ml-2">Private family trees</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleJoin} disabled={joining}>
              🔗 Join with invite
            </Button>
            <Button variant="primary" size="sm" onClick={handleGoogle}>
              Continue with Google
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 bg-indigo-200/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 bg-emerald-200/40 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium mb-4">
                <Sparkles className="h-4 w-4" />
                New: Clean, visual dashboard and family tree
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900">
                Your private, living family story
              </h1>
              <p className="mt-4 text-lg text-gray-600">
                Build a beautiful family tree, capture memories, and invite loved ones—kept private, secure, and easy for everyone.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button variant="primary" size="lg" onClick={handleGoogle}>
                  🔐 Create your family tree
                </Button>
                <Button variant="gray" size="lg" onClick={handleJoin} disabled={joining}>
                  🔗 I have an invite code
                </Button>
              </div>
              <div className="mt-6 flex items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2"><Shield className="h-4 w-4" /> Private by default</div>
                <div className="flex items-center gap-2"><Lock className="h-4 w-4" /> You control access</div>
                <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> Set up in minutes</div>
              </div>
            </div>
            <div className="lg:pl-8">
              <div className="relative">
                <div className="absolute inset-0 -rotate-2 rounded-2xl bg-gradient-to-r from-indigo-200 to-emerald-200" />
                <div className="relative rounded-2xl bg-white shadow-xl ring-1 ring-black/5 p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <MiniCard icon={<Users className="h-5 w-5 text-indigo-600" />} title="Members" desc="Add, edit, relate" />
                    <MiniCard icon={<Tree className="h-5 w-5 text-emerald-600" />} title="Family Tree" desc="Visual & interactive" />
                    <MiniCard icon={<ImageIcon className="h-5 w-5 text-pink-600" />} title="Photos" desc="Albums & tags" />
                    <MiniCard icon={<Share2 className="h-5 w-5 text-amber-600" />} title="Events" desc="Timelines & notes" />
                  </div>
                  <div className="mt-4 rounded-lg border border-dashed border-gray-200 p-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Star className="h-4 w-4 text-indigo-600" /> Highlights
                    </div>
                    <div className="mt-2 flex gap-2 overflow-x-auto snap-x snap-mandatory pb-2">
                      {['Private & secure', 'Invite by link', 'Role-based access', 'Photo albums', 'Clean UI', 'Fast search'].map((t) => (
                        <span key={t} className="snap-start whitespace-nowrap inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs border border-gray-200">
                          <Sparkles className="h-3 w-3 text-indigo-600" /> {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Scrollable highlights ribbon */}
      <section className="bg-white/70 border-y">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory">
            {[ 
              { icon: <Shield className="h-4 w-4" />, text: 'Private by design' },
              { icon: <Users className="h-4 w-4" />, text: 'Invite family easily' },
              { icon: <Tree className="h-4 w-4" />, text: 'Interactive tree' },
              { icon: <ImageIcon className="h-4 w-4" />, text: 'Photo albums' },
              { icon: <Share2 className="h-4 w-4" />, text: 'Events timeline' },
              { icon: <Lock className="h-4 w-4" />, text: 'Role-based access' },
            ].map((item, i) => (
              <div key={i} className="snap-start flex items-center gap-2 px-3 py-2 rounded-lg border bg-white shadow-sm text-gray-700">
                {item.icon}
                <span className="whitespace-nowrap text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About + Getting Started */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 text-indigo-700">
                  <Crown className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">About ApnaParivar</h3>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  ApnaParivar helps you preserve your family story—people, photos, and events—in a private space controlled by you. Invite family members, assign roles, and grow your tree together.
                </p>
                <ul className="mt-4 space-y-2 text-gray-700 text-sm">
                  <li className="flex items-start gap-2"><Shield className="h-4 w-4 mt-0.5 text-indigo-600" /> Private by default. Only invited people can view.</li>
                  <li className="flex items-start gap-2"><LinkIcon className="h-4 w-4 mt-0.5 text-emerald-600" /> Share an invite link or code to add members.</li>
                  <li className="flex items-start gap-2"><Users className="h-4 w-4 mt-0.5 text-amber-600" /> Roles for admin, editor, and viewer for safety.</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-2 text-emerald-700">
                  <Sparkles className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Getting Started</h3>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1">
                  {[ 
                    { n: 1, title: 'Sign in with Google', desc: 'We create your secure profile', icon: <Lock className="h-4 w-4" /> },
                    { n: 2, title: 'Create your family', desc: 'Name it and set admin role', icon: <Crown className="h-4 w-4" /> },
                    { n: 3, title: 'Add members & photos', desc: 'Build the tree visually', icon: <ImageIcon className="h-4 w-4" /> },
                    { n: 4, title: 'Invite others', desc: 'Share link or code to join', icon: <Share2 className="h-4 w-4" /> },
                  ].map((step) => (
                    <div key={step.n} className="snap-start min-w-[240px] rounded-xl border bg-white shadow-sm p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-gray-800">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white text-sm font-semibold">{step.n}</span>
                          <span className="font-medium">{step.title}</span>
                        </div>
                        {step.icon}
                      </div>
                      <p className="mt-2 text-sm text-gray-600">{step.desc}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex gap-3">
                  <Button variant="primary" onClick={handleGoogle}>Get started</Button>
                  <Button variant="outline" onClick={handleJoin} disabled={joining}>Join with invite</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="pb-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Feature icon={<Tree className="h-6 w-6 text-indigo-600" />} title="Interactive Family Tree" desc="Visualize relationships with a clean, zoomable tree." />
            <Feature icon={<ImageIcon className="h-6 w-6 text-pink-600" />} title="Photos & Albums" desc="Upload photos, organize albums, and relive memories." />
            <Feature icon={<Share2 className="h-6 w-6 text-amber-600" />} title="Events Timeline" desc="Record births, weddings, and milestones with dates." />
            <Feature icon={<Shield className="h-6 w-6 text-emerald-600" />} title="Privacy & Roles" desc="Only invited members can view. Roles keep data safe." />
            <Feature icon={<Users className="h-6 w-6 text-purple-600" />} title="Invite with Link" desc="Share a code or link—no complex setup required." />
            <Feature icon={<Sparkles className="h-6 w-6 text-sky-600" />} title="Polished UI" desc="Fast, modern, and accessible—designed for families." />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-sm text-gray-500 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-rose-500" /> Built for families
          </div>
          <div className="flex items-center gap-4">
            <a className="hover:text-gray-700" href="#">Privacy</a>
            <a className="hover:text-gray-700" href="#">Terms</a>
            <span>© {new Date().getFullYear()} ApnaParivar</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function MiniCard({ icon, title, desc }) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="flex items-center gap-2 text-gray-800">
        {icon}
        <span className="font-medium">{title}</span>
      </div>
      <p className="mt-1 text-xs text-gray-600">{desc}</p>
    </div>
  );
}

function Feature({ icon, title, desc }) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        {icon}
        <h4 className="font-semibold text-gray-900">{title}</h4>
      </div>
      <p className="mt-2 text-gray-600 text-sm">{desc}</p>
    </div>
  );
}
