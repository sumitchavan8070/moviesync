import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Logo } from '@/components/common';

const features = [
  {
    icon: '🎬',
    title: 'Stream Video & Music',
    desc: 'Share local videos and songs up to 50GB+ without cloud upload. Files stay on your device.',
  },
  {
    icon: '🔗',
    title: 'Shareable Links',
    desc: 'Generate a unique room link instantly. Guests join from any browser, any device.',
  },
  {
    icon: '⏱️',
    title: 'Synced Playback',
    desc: 'Everyone watches together with ±300ms sync. Play, pause, and seek in perfect harmony.',
  },
  {
    icon: '💬',
    title: 'Live Chat',
    desc: 'Real-time chat with typing indicators. React and discuss as you watch.',
  },
  {
    icon: '🔒',
    title: 'Private & Secure',
    desc: 'Room tokens, host controls, lock rooms, and remove guests. No permanent storage.',
  },
  {
    icon: '📱',
    title: 'Cross-Platform',
    desc: 'Works on Windows, macOS, Linux, Android, and iPhone. Desktop and mobile ready.',
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-8 pb-20">
        <nav className="max-w-6xl mx-auto flex items-center justify-between mb-16">
          <Logo size="lg" />
          <div className="flex gap-3">
            <Link to="/join">
              <Button variant="ghost">Join Room</Button>
            </Link>
            <Link to="/create">
              <Button>Create Room</Button>
            </Link>
          </div>
        </nav>

        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              <span className="text-gradient">mauknh.diaries</span>
              <br />
              Stream Together
            </h1>
            <p className="text-lg text-text-muted mb-8 max-w-lg">
              Stream local videos and music directly to friends worldwide. No uploads, no cloud
              storage — real-time synced sessions from your device.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/create">
                <Button size="lg">Start Streaming</Button>
              </Link>
              <Link to="/join">
                <Button variant="secondary" size="lg">
                  Join a Room
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <HeroAnimation />
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-3xl font-bold text-center mb-12"
          >
            Everything You Need
          </motion.h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <GlassCard className="p-6 h-full hover:bg-white/8 transition-colors">
                  <div className="text-3xl mb-4">{f.icon}</div>
                  <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                  <p className="text-text-muted text-sm">{f.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20">
        <GlassCard strong className="max-w-3xl mx-auto p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to stream on mauknh.diaries?</h2>
          <p className="text-text-muted mb-8">
            Pick a video, share the link, and start streaming in seconds.
          </p>
          <Link to="/create">
            <Button size="lg">Create Your Room</Button>
          </Link>
        </GlassCard>
      </section>
    </div>
  );
}

function HeroAnimation() {
  return (
    <div className="relative aspect-video glass-strong rounded-[24px] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-primary/30"
          style={{
            width: 60 + i * 40,
            height: 60 + i * 40,
            top: `${20 + i * 15}%`,
            left: `${30 + i * 10}%`,
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 3 + i,
            repeat: Infinity,
            delay: i * 0.5,
          }}
        />
      ))}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-20 h-20 rounded-full bg-primary/80 flex items-center justify-center shadow-2xl shadow-primary/50"
        >
          <span className="text-3xl ml-1">▶</span>
        </motion.div>
      </div>
      <div className="absolute bottom-4 left-4 right-4 flex gap-2">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden"
          >
            <motion.div
              className="h-full bg-primary rounded-full"
              animate={{ width: ['0%', '100%'] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
