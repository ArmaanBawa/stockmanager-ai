'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const FEATURES = [
	{
		icon: '💬',
		title: 'AI Conversations',
		desc: 'Ask anything about your business in plain English. Get instant answers about sales, stock, and customers.',
	},
	{
		icon: '📦',
		title: 'Live Inventory',
		desc: 'Real-time stock tracking. Quantities auto-update with every order. See what\'s running low at a glance.',
	},
	{
		icon: '📊',
		title: 'Sales Analytics',
		desc: 'Revenue breakdowns, customer-wise transactions, product performance — all in one clean dashboard.',
	},
	{
		icon: '👥',
		title: 'Customer Hub',
		desc: 'Complete customer database with purchase history, outstanding balances, and contact management.',
	},
	{
		icon: '📱',
		title: 'Mobile Ready',
		desc: 'Full-featured mobile app for iOS and Android. Chat with your AI assistant from anywhere.',
	},
	{
		icon: '⚡',
		title: 'Smart Insights',
		desc: 'AI-powered recommendations to optimize pricing, identify trends, and accelerate growth.',
	},
];

const CHAT_DEMO = [
	{ role: 'user', text: 'How did we do this week?' },
	{ role: 'ai', text: 'This week you had 23 orders totaling ₹1,47,500. Your top seller was Premium Tea (48 units). Revenue is up 12% from last week.' },
	{ role: 'user', text: 'Which products are running low?' },
	{ role: 'ai', text: 'Green Tea has only 5 units left (was 50). Masala Chai is at 12 units. I\'d recommend restocking both soon.' },
];

export default function Home() {
	const { status } = useSession();
	const router = useRouter();
	const heroRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (status === 'authenticated') {
			router.push('/dashboard');
		}
	}, [status, router]);

	useScrollReveal();

	// Mouse-reactive hero glow
	useEffect(() => {
		const hero = heroRef.current;
		if (!hero) return;
		const glow = hero.querySelector('.land-hero-mouse-glow') as HTMLElement;
		if (!glow) return;

		const handleMove = (e: MouseEvent) => {
			const rect = hero.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const y = e.clientY - rect.top;
			glow.style.background = `radial-gradient(600px circle at ${x}px ${y}px, rgba(217, 119, 87, 0.06), transparent 60%)`;
		};

		hero.addEventListener('mousemove', handleMove);
		return () => hero.removeEventListener('mousemove', handleMove);
	}, []);

	if (status === 'loading') {
		return (
			<div className="loading-page">
				<div className="spinner" />
				<span>Loading...</span>
			</div>
		);
	}

	if (status === 'authenticated') return null;

	return (
		<div className="landing">
			<div className="grain-overlay" />

			{/* ===== NAVBAR ===== */}
			<nav className="land-nav">
				<div className="land-nav-inner">
					<Link href="/" className="land-logo">
						<span className="land-logo-icon">✦</span>
						SalesManager AI
					</Link>
					<div className="land-nav-links">
						<a href="#features">Features</a>
						<a href="#demo">Demo</a>
						<a href="#how-it-works">How it works</a>
					</div>
					<div className="land-nav-actions">
						<Link href="/login" className="land-nav-login">Log in</Link>
						<Link href="/register" className="land-btn-primary land-btn-nav">Get Started</Link>
					</div>
				</div>
			</nav>

			{/* ===== HERO ===== */}
			<section className="land-hero" ref={heroRef}>
				<div className="land-hero-mouse-glow" />
				<div className="land-hero-glow" />
				<div className="land-hero-glow-2" />
				<div className="land-hero-orb land-hero-orb-1" />
				<div className="land-hero-orb land-hero-orb-2" />
				<div className="land-hero-orb land-hero-orb-3" />

				<div className="land-hero-content">
					<div className="land-hero-badge land-zoom-in" style={{ animationDelay: '0.1s' }}>
						<span className="land-badge-dot" />
						AI-Powered Sales Management
					</div>
					<h1 className="land-hero-title land-zoom-in" style={{ animationDelay: '0.25s' }}>
						Your entire business,<br />
						<span className="land-hero-accent">one conversation away.</span>
					</h1>
					<p className="land-hero-sub land-zoom-in" style={{ animationDelay: '0.4s' }}>
						Stop digging through spreadsheets. Just ask — your AI assistant knows
						your inventory, your customers, and your numbers inside out.
					</p>
					<div className="land-hero-ctas land-zoom-in" style={{ animationDelay: '0.55s' }}>
						<Link href="/login" className="land-btn-primary land-btn-lg">
							Try Now — It&apos;s Free <span className="land-btn-arrow">→</span>
						</Link>
						<a href="#demo" className="land-btn-outline land-btn-lg">
							See It In Action
						</a>
					</div>
				</div>

				<div className="land-scroll-hint land-zoom-in" style={{ animationDelay: '0.8s' }}>
					<div className="land-scroll-mouse">
						<div className="land-scroll-dot" />
					</div>
					<span>Scroll to explore</span>
				</div>
			</section>

			{/* ===== MARQUEE ===== */}
			<div className="land-marquee-wrap">
				<div className="land-marquee">
					<div className="land-marquee-track">
						{[...Array(2)].map((_, k) => (
							<div className="land-marquee-items" key={k}>
								<span>Real-time Inventory</span>
								<span className="land-marquee-dot">✦</span>
								<span>AI Chat Assistant</span>
								<span className="land-marquee-dot">✦</span>
								<span>Sales Ledger</span>
								<span className="land-marquee-dot">✦</span>
								<span>Customer Management</span>
								<span className="land-marquee-dot">✦</span>
								<span>Mobile App</span>
								<span className="land-marquee-dot">✦</span>
								<span>Smart Insights</span>
								<span className="land-marquee-dot">✦</span>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* ===== LIVE DEMO PREVIEW ===== */}
			<section className="land-section" id="demo">
				<div className="land-container">
					<div className="land-section-header" data-reveal="">
						<span className="land-section-tag">See it in action</span>
						<h2 className="land-section-title">Talk to your business like you&apos;d talk to a colleague</h2>
					</div>

					<div className="land-demo-window" data-reveal="" data-reveal-delay="100">
						<div className="land-demo-topbar">
							<div className="land-demo-dots">
								<span /><span /><span />
							</div>
							<span className="land-demo-url">salesmanager.ai / assistant</span>
						</div>
						<div className="land-demo-body">
							{CHAT_DEMO.map((msg, i) => (
								<div className={`land-demo-msg land-demo-msg-${msg.role}`} key={i} data-reveal="" data-reveal-delay={String(200 + i * 150)}>
									{msg.role === 'ai' && <span className="land-demo-avatar">✦</span>}
									<div className="land-demo-bubble">
										{msg.text}
									</div>
								</div>
							))}
							<div className="land-demo-input" data-reveal="" data-reveal-delay="900">
								<span>Ask about your sales, inventory, customers...</span>
								<span className="land-demo-send">↑</span>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* ===== FEATURES ===== */}
			<section className="land-section land-section-alt" id="features">
				<div className="land-container">
					<div className="land-section-header" data-reveal="">
						<span className="land-section-tag">Features</span>
						<h2 className="land-section-title">Everything you need.<br />Nothing you don&apos;t.</h2>
						<p className="land-section-desc">
							Simple tools that work together — designed for real business owners, not enterprises.
						</p>
					</div>

					<div className="land-features-grid">
						{FEATURES.map((f, i) => (
							<div className="land-feature-card" key={i} data-reveal="" data-reveal-delay={String(i * 100)}>
								<div className="land-feature-icon">{f.icon}</div>
								<h3 className="land-feature-title">{f.title}</h3>
								<p className="land-feature-desc">{f.desc}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ===== HOW IT WORKS ===== */}
			<section className="land-section" id="how-it-works">
				<div className="land-container">
					<div className="land-section-header" data-reveal="">
						<span className="land-section-tag">How it works</span>
						<h2 className="land-section-title">Three steps. That&apos;s it.</h2>
					</div>

					<div className="land-steps">
						<div className="land-step" data-reveal="" data-reveal-delay="0">
							<div className="land-step-num">01</div>
							<div className="land-step-content">
								<h3>Sign up & add products</h3>
								<p>Create your account, add your product catalog with prices and stock quantities. Takes about 5 minutes.</p>
							</div>
						</div>
						<div className="land-step" data-reveal="" data-reveal-delay="150">
							<div className="land-step-num">02</div>
							<div className="land-step-content">
								<h3>Start selling</h3>
								<p>Create orders, manage customers, track payments. Inventory updates automatically with every sale.</p>
							</div>
						</div>
						<div className="land-step" data-reveal="" data-reveal-delay="300">
							<div className="land-step-num">03</div>
							<div className="land-step-content">
								<h3>Ask your AI anything</h3>
								<p>Open the chat and ask — &quot;How much did I sell today?&quot;, &quot;Who owes me money?&quot;, &quot;What should I restock?&quot;</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* ===== CLOSING CTA ===== */}
			<section className="land-cta-section">
				<div className="land-cta-glow" />
				<div className="land-container land-cta-inner" data-reveal="">
					<h2 className="land-cta-title">
						Ready to know your<br />business better?
					</h2>
					<p className="land-cta-desc">
						Free to start. Set up in under 5 minutes.
					</p>
					<div className="land-hero-ctas">
						<Link href="/register" className="land-btn-primary land-btn-lg">
							Get Started Free <span className="land-btn-arrow">→</span>
						</Link>
						<Link href="/login" className="land-btn-outline land-btn-lg">
							Sign In
						</Link>
					</div>
				</div>
			</section>

			{/* ===== FOOTER ===== */}
			<footer className="land-footer">
				<div className="land-container land-footer-inner">
					<div className="land-footer-left">
						<div className="land-footer-brand">
							<span className="land-logo-icon">✦</span> SalesManager AI
						</div>
						<p className="land-footer-tagline">AI-powered sales management for modern businesses.</p>
					</div>
					<div className="land-footer-right">
						<div className="land-footer-col">
							<h4>Product</h4>
							<a href="#features">Features</a>
							<a href="#demo">Demo</a>
							<a href="#how-it-works">How it works</a>
						</div>
						<div className="land-footer-col">
							<h4>Account</h4>
							<Link href="/login">Log in</Link>
							<Link href="/register">Sign up</Link>
						</div>
					</div>
				</div>
				<div className="land-footer-bottom">
					<p>© 2025 SalesManager AI. All rights reserved.</p>
				</div>
			</footer>
		</div>
	);
}
