
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				sans: ['Inter', 'system-ui', 'sans-serif'],
				headline: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
				mono: ['JetBrains Mono', 'monospace'],
			},
			colors: {
				// Knot Design System Colors
				primary: {
					DEFAULT: '#0052FF',
					light: '#4D7CFF',
					foreground: '#FFFFFF'
				},
				background: '#F8F9FA',
				surface: '#FFFFFF',
				'text-main': '#0F172A',
				'text-muted': '#64748B',
				danger: '#EF4444',
				// Keep shadcn compatibility
				border: '#E2E8F0',
				input: '#E2E8F0',
				ring: '#0052FF',
				foreground: '#0F172A',
				card: {
					DEFAULT: '#FFFFFF',
					foreground: '#0F172A'
				},
				popover: {
					DEFAULT: '#FFFFFF',
					foreground: '#0F172A'
				},
				secondary: {
					DEFAULT: '#F1F5F9',
					foreground: '#0F172A'
				},
				destructive: {
					DEFAULT: '#EF4444',
					foreground: '#FFFFFF'
				},
				muted: {
					DEFAULT: '#F1F5F9',
					foreground: '#64748B'
				},
				accent: {
					DEFAULT: '#F1F5F9',
					foreground: '#0F172A'
				},
				sidebar: {
					DEFAULT: '#F8F9FA',
					foreground: '#64748B',
					primary: '#0052FF',
					'primary-foreground': '#FFFFFF',
					accent: '#F1F5F9',
					'accent-foreground': '#0F172A',
					border: '#E2E8F0',
					ring: '#0052FF'
				}
			},
			boxShadow: {
				'card': '0px 4px 12px rgba(0, 82, 255, 0.06)',
				'float': '0px 8px 24px rgba(0, 82, 255, 0.12)',
				'modal': '0px -4px 30px rgba(0, 0, 0, 0.08)',
			},
			borderRadius: {
				'4xl': '24px',
				'3xl': '24px',
				'2xl': '16px',
				'xl': '12px',
				lg: '8px',
				md: '6px',
				sm: '4px'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'fade-in': {
					'0%': {
						opacity: '0',
						transform: 'translateY(10px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'slide-up': {
					'0%': {
						transform: 'translateY(100%)',
						opacity: '0'
					},
					'100%': {
						transform: 'translateY(0)',
						opacity: '1'
					}
				},
				'scale-in': {
					'0%': {
						opacity: '0',
						transform: 'scale(0.95)'
					},
					'100%': {
						opacity: '1',
						transform: 'scale(1)'
					}
				},
				'pulse-slow': {
					'0%, 100%': {
						opacity: '1'
					},
					'50%': {
						opacity: '0.7'
					}
				},
				'float-up': {
					'0%': {
						opacity: '0',
						transform: 'translateY(20px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'press': {
					'0%, 100%': {
						transform: 'scale(1)'
					},
					'50%': {
						transform: 'scale(0.96)'
					}
				},
				'radar': {
					'0%': {
						transform: 'scale(0.5)',
						opacity: '1'
					},
					'100%': {
						transform: 'scale(2)',
						opacity: '0'
					}
				},
				'shimmer': {
					'0%': {
						backgroundPosition: '-200% 0'
					},
					'100%': {
						backgroundPosition: '200% 0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.5s ease-out',
				'slide-up': 'slide-up 0.4s ease-out',
				'scale-in': 'scale-in 0.3s ease-out',
				'pulse-slow': 'pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
				'float-up': 'float-up 0.6s ease-out',
				'press': 'press 0.15s ease-in-out',
				'radar': 'radar 1.5s ease-out infinite',
				'shimmer': 'shimmer 2s linear infinite'
			}
		}
	},
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
