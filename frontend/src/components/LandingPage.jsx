
import React, { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bot,
  Boxes,
  Check,
  ChevronRight,
  ChevronDown,
  CircleHelp,
  CirclePlay,
  Clock3,
  Command,
  DollarSign,
  FileSpreadsheet,
  FileText,
  MessageSquare,
  MessageSquareText,
  RefreshCw,
  Search,
  ShoppingCart,
  Upload,
  Wallet,
  Menu,
  Package,
  Pause,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Workflow,
  X,
  Zap,
} from "lucide-react";

const MEDIA = {
  hero:
    "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1800&q=85",
  analytics:
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=85",
  retail:
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1000&q=85",
  ecommerce:
    "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1000&q=85",
  team:
    "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1000&q=85",
  workspace:
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=85",
  agentResearch:
    "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1000&q=85",
  agentOperations:
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1000&q=85",
  agentInsights:
    "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1000&q=85",
  video:
    "https://player.vimeo.com/external/539983030.hd.mp4?s=79fef9561947ea8de6f0fe501388795492c93618&profile_id=172",
};

const C = {
  green: "#0E9C6B",
  greenDark: "#087950",
  forest: "#173D30",
  ink: "#17251F",
  muted: "#718078",
  cream: "#FAF9F5",
  white: "#FFFFFF",
  border: "#E7EBE5",
  paleGreen: "#EAF5EE",
  pale: "#F2F4EF",
};

const features = [
  {
    number: "01",
    title: "Understand your numbers.",
    text: "Bring business activity into view. Explore sales, compare performance, and understand the bigger picture without digging through scattered records.",
    image: MEDIA.analytics,
    icon: BarChart3,
    label: "BUSINESS INTELLIGENCE",
  },
  {
    number: "02",
    title: "Know what needs attention.",
    text: "Keep products and stock information organized. Identify what may need replenishing and where your attention could make a difference.",
    image: MEDIA.ecommerce,
    icon: Boxes,
    label: "OPERATIONS",
  },
  {
    number: "03",
    title: "Turn information into action.",
    text: "Explore reports, ask better questions, and use your available business information to think through your next move.",
    image: MEDIA.workspace,
    icon: Workflow,
    label: "SMARTER WORKFLOWS",
  },
];

const agentCards = [
  {
    number: "01", category: "SALES", title: "Sales Agent",
    text: "See what is selling, which customers are buying, and where sales may be slowing down.",
    image: MEDIA.agentResearch, icon: ShoppingCart,
    capabilities: ["Summarize sales records", "Spot popular products", "Highlight sales changes"],
  },
  {
    number: "02", category: "INVENTORY", title: "Inventory Agent",
    text: "Get a clearer picture of what you have in stock, what is moving, and what needs checking.",
    image: MEDIA.agentOperations, icon: Boxes,
    capabilities: ["Organize product records", "Highlight low-stock items", "Compare stock with sales"],
  },
  {
    number: "03", category: "REORDER", title: "Reorder Agent",
    text: "Identify products that may need replacing before you run out of the things customers want.",
    image: MEDIA.ecommerce, icon: RefreshCw,
    capabilities: ["Flag items to review", "Estimate needs from available records", "Prepare a reorder checklist"],
  },
  {
    number: "04", category: "PRICING", title: "Pricing Agent",
    text: "Understand how prices, costs, and sales fit together before you decide whether a price should change.",
    image: MEDIA.analytics, icon: DollarSign,
    capabilities: ["Compare listed prices and costs", "Show possible margin changes", "Explain pricing trade-offs"],
  },
  {
    number: "05", category: "CASH FLOW", title: "Cash Flow Agent",
    text: "Make money coming in and going out easier to understand, using the records you provide.",
    image: MEDIA.workspace, icon: Wallet,
    capabilities: ["Group income and expenses", "Highlight upcoming cash needs", "Summarize recorded payments"],
  },
  {
    number: "06", category: "DIAGNOSIS", title: "Business Diagnosis Agent",
    text: "Ask what may be going wrong and explore possible reasons using the information available.",
    image: MEDIA.agentInsights, icon: Search,
    capabilities: ["Spot unusual changes", "Connect related business signals", "Suggest questions to investigate"],
  },
];

const stories = [
  {
    label: "RETAIL",
    title: "For the shop that keeps moving.",
    text: "Keep sales, products, and stock information easier to understand as your daily business gets busier.",
    image: MEDIA.retail,
  },
  {
    label: "ONLINE SELLING",
    title: "For the business growing beyond its first orders.",
    text: "Build a clearer picture of products, orders, and the work behind fulfilling them.",
    image: MEDIA.ecommerce,
  },
  {
    label: "SERVICES & TEAMS",
    title: "For people building something of their own.",
    text: "Create more room for informed decisions instead of piecing together information from different places.",
    image: MEDIA.team,
  },
];

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');

  .bp-landing, .bp-landing * { box-sizing: border-box; }
  .bp-landing {
    font-family: 'DM Sans', sans-serif;
    color: ${C.ink};
    background: ${C.cream};
    width: 100%;
    min-height: 100vh;
    overflow: clip;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }
  .bp-landing h1, .bp-landing h2, .bp-landing h3,
  .bp-landing h4, .bp-landing p { margin-top: 0; }
  .bp-landing h1, .bp-landing h2, .bp-landing h3,
  .bp-landing h4 {
    font-family: 'Manrope', sans-serif;
    letter-spacing: -0.055em;
    line-height: 1.12;
  }
  .bp-landing button, .bp-landing a, .bp-landing select {
    font: inherit;
  }
  .bp-landing button { cursor: pointer; }
  .bp-landing a { color: inherit; text-decoration: none; }
  .bp-landing img { display: block; max-width: 100%; }
  .bp-landing button:focus-visible, .bp-landing a:focus-visible,
  .bp-landing select:focus-visible {
    outline: 3px solid #78CFA7;
    outline-offset: 4px;
  }

  .bp-landing .bp-nav {
    position: sticky; top: 0; z-index: 100;
    display: flex; align-items: center; justify-content: space-between;
    gap: 24px; min-height: 76px; padding: 12px clamp(20px, 5vw, 84px);
    background: rgba(250,249,245,.91);
    border-bottom: 1px solid rgba(23,61,48,.08);
    backdrop-filter: blur(18px);
  }
  .bp-landing .bp-nav-links { display: flex; align-items: center; gap: 30px; }
  .bp-landing .bp-nav-links a, .bp-landing .bp-login {
    color: #59665E; font-size: 13px; font-weight: 600;
    transition: color .2s ease;
  }
  .bp-landing .bp-nav-links a:hover, .bp-landing .bp-login:hover { color: ${C.green}; }
  .bp-landing .bp-brand { display: inline-flex; align-items: center; gap: 10px; flex-shrink: 0; }
  .bp-landing .bp-brand-name {
    font-family: 'Manrope', sans-serif; font-size: 22px; font-weight: 800;
    letter-spacing: -1.3px; color: ${C.forest};
  }
  .bp-landing .bp-brand-mark {
    display: grid; place-items: center; width: 38px; height: 38px;
    border-radius: 13px; background: ${C.forest}; color: white;
  }
  .bp-landing .bp-nav-actions { display: flex; align-items: center; gap: 20px; }
  .bp-landing .bp-button {
    min-height: 48px; display: inline-flex; align-items: center;
    justify-content: center; gap: 10px; padding: 0 21px;
    border: 1px solid transparent; border-radius: 9px;
    font-size: 13px; font-weight: 700;
    transition: transform .22s ease, background .22s ease, box-shadow .22s ease;
  }
  .bp-landing .bp-button:hover { transform: translateY(-2px); }
  .bp-landing .bp-button-primary {
    color: white; background: ${C.forest};
    box-shadow: 0 5px 14px rgba(23,61,48,.1);
  }
  .bp-landing .bp-button-primary:hover {
    background: ${C.greenDark}; box-shadow: 0 9px 22px rgba(23,61,48,.17);
  }
  .bp-landing .bp-button-light {
    background: white; border-color: ${C.border}; color: ${C.forest};
  }
  .bp-landing .bp-button-light:hover { border-color: #B4D7C3; }
  .bp-landing .bp-menu-toggle {
    display: none; align-items: center; justify-content: center;
    width: 42px; height: 42px; border: 1px solid ${C.border};
    border-radius: 9px; background: white; color: ${C.forest};
  }

  .bp-landing .bp-hero {
    position: relative; display: grid;
    grid-template-columns: minmax(0, .92fr) minmax(0, 1.08fr);
    align-items: center; gap: clamp(30px, 4vw, 70px);
    padding: 35px clamp(20px, 6vw, 100px) 10px;
    max-width: 1600px; margin: auto;
  }
  .bp-landing .bp-hero:before {
    content: ''; position: absolute; width: 420px; height: 420px;
    border-radius: 50%; background: rgba(14,156,107,.07);
    filter: blur(75px); top: 4%; right: 12%; pointer-events: none;
  }
  .bp-landing .bp-hero-copy { position: relative; z-index: 2; }
  .bp-landing .bp-eyebrow {
    display: inline-flex; align-items: center; gap: 10px;
    padding: 7px 12px; border: 1px solid #DCE9DF;
    border-radius: 999px; background: rgba(255,255,255,.7);
    color: ${C.forest}; font-size: 10px; font-weight: 800;
    letter-spacing: 1.35px;
  }
  .bp-landing .bp-eyebrow-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: ${C.green}; box-shadow: 0 0 0 4px rgba(14,156,107,.12);
    animation: bpPulse 2.2s ease-in-out infinite;
  }
  .bp-landing .bp-hero h1 {
    margin: 25px 0 22px; font-size: clamp(42px, 5.1vw, 76px);
    font-weight: 700; line-height: 1.045; letter-spacing: -.07em;
    max-width: 760px;
  }
  .bp-landing .bp-gradient-text {
    color: ${C.green};
    background: linear-gradient(100deg, #0E9C6B 5%, #347C55 52%, #173D30 100%);
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .bp-landing .bp-hero-description {
    max-width: 540px; margin-bottom: 26px;
    color: #68766D; font-size: 15px; line-height: 1.95;
  }
  .bp-landing .bp-hero-actions { display: flex; flex-wrap: wrap; gap: 12px; }
  .bp-landing .bp-proof {
    display: flex; align-items: center; gap: 12px; margin-top: 31px;
  }
  .bp-landing .bp-proof-icon {
    display: grid; place-items: center; width: 39px; height: 39px;
    color: ${C.greenDark}; background: ${C.paleGreen}; border-radius: 50%;
  }
  .bp-landing .bp-proof strong { display: block; font-size: 12px; color: ${C.forest}; }
  .bp-landing .bp-proof small { display: block; font-size: 11px; color: ${C.muted}; }

  .bp-landing .bp-dashboard-wrap { min-width: 0; position: relative; animation: bpFloat 7s ease-in-out infinite; }
  .bp-landing .bp-dashboard-glow {
    position: absolute; inset: 12% -5% 4%; background: rgba(14,156,107,.13);
    filter: blur(45px); border-radius: 50%;
  }
  .bp-landing .bp-dashboard {
    position: relative; overflow: hidden; background: white;
    border: 1px solid rgba(23,61,48,.13); border-radius: 16px;
    box-shadow: 0 35px 90px rgba(27,54,39,.14), 0 3px 10px rgba(27,54,39,.04);
    transform: perspective(1200px) rotateY(-3deg);
  }
  .bp-landing .bp-dashboard-top {
    min-height: 48px; display: flex; align-items: center; justify-content: space-between;
    padding: 0 15px; border-bottom: 1px solid #E9EEE8; background: #FCFDFB;
  }
  .bp-landing .bp-window-dots { display: flex; gap: 5px; }
  .bp-landing .bp-window-dots i { width: 7px; height: 7px; border-radius: 50%; background: #D9E3DC; }
  .bp-landing .bp-window-dots i:first-child { background: #E6A99B; }
  .bp-landing .bp-window-dots i:nth-child(2) { background: #EACD8C; }
  .bp-landing .bp-window-dots i:nth-child(3) { background: #9ED8B8; }
  .bp-landing .bp-sample-tag {
    display: inline-flex; align-items: center; gap: 6px; padding: 5px 8px;
    border-radius: 5px; background: #EDF6EE; color: #397452;
    font-size: 9px; font-weight: 800; letter-spacing: .7px;
  }
  .bp-landing .bp-dashboard-layout { display: grid; grid-template-columns: 48px 1fr; min-height: 340px; }
  .bp-landing .bp-mini-sidebar {
    display: flex; flex-direction: column; align-items: center; gap: 16px;
    padding: 15px 0; background: #F8FAF7; border-right: 1px solid #E9EEE8;
    color: #A0ADA4;
  }
  .bp-landing .bp-mini-sidebar .active {
    display: grid; place-items: center; width: 31px; height: 31px;
    border-radius: 8px; background: #E4F3E9; color: ${C.greenDark};
  }
  .bp-landing .bp-dashboard-content { padding: 19px; min-width: 0; }
  .bp-landing .bp-dash-heading {
    display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
    margin-bottom: 16px;
  }
  .bp-landing .bp-dash-heading small {
    display: block; color: #7E8B81; font-size: 8px;
    font-weight: 800; letter-spacing: 1px;
  }
  .bp-landing .bp-dash-heading h3 { margin: 4px 0; font-size: clamp(14px, 1.5vw, 19px); letter-spacing: -.7px; }
  .bp-landing .bp-dash-heading p { margin: 0; font-size: 10px; color: #89958D; }
  .bp-landing .bp-demo-chip {
    white-space: nowrap; padding: 5px 7px; border-radius: 6px;
    background: #F1F4F0; color: #657368; font-size: 9px;
  }
  .bp-landing .bp-metrics { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 9px; }
  .bp-landing .bp-metric {
    padding: 12px 10px; min-width: 0; border: 1px solid #E9EEE8;
    border-radius: 9px; background: linear-gradient(140deg,#fff,#FCFDFB);
  }
  .bp-landing .bp-metric span { display: block; color: #7C8980; font-size: 9px; }
  .bp-landing .bp-metric strong {
    display: block; margin: 6px 0 3px; color: ${C.forest};
    font: 800 clamp(15px, 1.8vw, 22px)/1.1 'Manrope', sans-serif;
    letter-spacing: -.8px;
  }
  .bp-landing .bp-metric small { color: #88958C; font-size: 8px; }
  .bp-landing .bp-dash-lower { display: grid; grid-template-columns: minmax(0,1.6fr) minmax(105px,.9fr); gap: 10px; margin-top: 11px; }
  .bp-landing .bp-chart-card, .bp-landing .bp-insight-card {
    min-width: 0; border: 1px solid #E9EEE8; border-radius: 9px; padding: 12px;
  }
  .bp-landing .bp-chart-heading { display: flex; align-items: center; justify-content: space-between; gap: 5px; }
  .bp-landing .bp-chart-heading strong { font-size: 10px; }
  .bp-landing .bp-chart-heading small { display: block; color: #89958D; font-size: 8px; }
  .bp-landing .bp-chart-heading select {
    max-width: 78px; border: 1px solid #E5EBE5; border-radius: 5px;
    padding: 4px; color: #5F6E63; background: white; font-size: 9px;
  }
  .bp-landing .bp-chart {
    position: relative; display: flex; align-items: flex-end; justify-content: space-around;
    gap: 5px; height: 105px; padding: 10px 4px 0;
    background: repeating-linear-gradient(to bottom,transparent 0,transparent 24px,#EDF1EC 25px,#EDF1EC 26px);
  }
  .bp-landing .bp-chart-bar {
    flex: 1; max-width: 19px; min-width: 4px; border-radius: 4px 4px 1px 1px;
    background: linear-gradient(to top,#5DB78B,#C5E8D0);
    transform-origin: bottom; animation: bpBarRise .9s cubic-bezier(.2,.8,.2,1) both;
  }
  .bp-landing .bp-chart-bar.highlight { background: linear-gradient(to top,#087950,#41C18B); }
  .bp-landing .bp-insight-card { display: flex; flex-direction: column; align-items: flex-start; background: #F4F8F2; }
  .bp-landing .bp-insight-icon {
    display: grid; place-items: center; width: 28px; height: 28px;
    margin-bottom: 9px; border-radius: 8px; background: #E1F1E5; color: ${C.greenDark};
  }
  .bp-landing .bp-insight-card small { font-size: 8px; color: #728174; font-weight: 800; letter-spacing: .5px; }
  .bp-landing .bp-insight-card strong { margin-top: 6px; font-size: 12px; line-height: 1.3; }
  .bp-landing .bp-insight-card p { margin: 6px 0 0; font-size: 9px; line-height: 1.6; color: #77847A; }
  .bp-landing .bp-floating-note {
    position: absolute; display: flex; align-items: center; gap: 10px;
    padding: 12px 15px; border: 1px solid rgba(23,61,48,.08);
    border-radius: 11px; background: rgba(255,255,255,.96);
    box-shadow: 0 12px 30px rgba(23,61,48,.1);
    animation: bpFloat 5s ease-in-out infinite;
  }
  .bp-landing .bp-floating-note svg { color: ${C.green}; }
  .bp-landing .bp-floating-note strong { display: block; font-size: 11px; }
  .bp-landing .bp-floating-note small { display: block; color: #829087; font-size: 9px; }
  .bp-landing .bp-floating-one { left: -28px; bottom: 15%; }
  .bp-landing .bp-floating-two { right: -18px; top: 14%; animation-delay: -2s; }

  .bp-landing .bp-section { padding: 105px clamp(20px, 7vw, 112px); }
  .bp-landing .bp-container { max-width: 1250px; margin: 0 auto; }
  .bp-landing .bp-kicker {
    display: inline-block; color: ${C.greenDark}; font-size: 10px;
    font-weight: 800; letter-spacing: 1.5px; line-height: 1.5;
  }
  .bp-landing .bp-section-heading {
    max-width: 760px; margin: 15px 0 18px;
    font-size: clamp(34px, 4.1vw, 56px); font-weight: 700;
  }
  .bp-landing .bp-section-description { max-width: 620px; color: #718078; font-size: 14px; line-height: 1.95; }
  .bp-landing .bp-human-section {
    display: grid; grid-template-columns: 1fr 1fr; align-items: center;
    gap: clamp(35px, 7vw, 100px); background: white;
  }
  .bp-landing .bp-human-image { position: relative; min-height: 410px; }
  .bp-landing .bp-human-image img {
    width: 100%; height: 410px; object-fit: cover;
    border-radius: 13px; box-shadow: 0 20px 50px rgba(23,61,48,.12);
  }
  .bp-landing .bp-image-caption {
    position: absolute; left: 18px; right: 18px; bottom: 18px;
    padding: 17px 20px; border: 1px solid rgba(255,255,255,.3);
    border-radius: 9px; background: rgba(23,61,48,.87);
    backdrop-filter: blur(10px); color: white;
  }
  .bp-landing .bp-image-caption small { font-size: 9px; letter-spacing: 1.3px; color: #C6E6D3; font-weight: 800; }
  .bp-landing .bp-image-caption p { margin: 5px 0 0; font-size: 14px; }
  .bp-landing .bp-human-copy h2 { margin: 15px 0 20px; font-size: clamp(33px, 3.8vw, 49px); }
  .bp-landing .bp-human-copy p { color: #718078; font-size: 14px; line-height: 1.95; }
  .bp-landing .bp-human-copy .bp-emphasis { color: ${C.forest}; font-weight: 700; }
  .bp-landing .bp-text-link {
    display: inline-flex; align-items: center; gap: 9px; margin-top: 8px;
    padding: 0; border: 0; background: transparent; color: ${C.greenDark};
    font-size: 13px; font-weight: 800;
  }
  .bp-landing .bp-text-link svg { transition: transform .2s ease; }
  .bp-landing .bp-text-link:hover svg { transform: translateX(5px); }

  .bp-landing .bp-features { background: #F3F5F0; }
  // .bp-landing .bp-center-heading { text-align: center; margin: 0 auto 45px; }
  // .bp-landing .bp-center-heading .bp-section-description { margin: auto; }
  .bp-landing .bp-feature-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 20px; }
  .bp-landing .bp-feature-card {
    min-width: 0; overflow: hidden; background: white;
    border: 1px solid #E5EAE3; border-radius: 13px;
    transition: transform .3s ease, box-shadow .3s ease, border-color .3s ease;
  }
  .bp-landing .bp-feature-card:hover {
    transform: translateY(-7px); border-color: #C3DFCC;
    box-shadow: 0 20px 42px rgba(23,61,48,.09);
  }
  .bp-landing .bp-feature-image { position: relative; height: 205px; overflow: hidden; background: #E6ECE4; }
  .bp-landing .bp-feature-image img, .bp-landing .bp-story-image img, .bp-landing .bp-agent-image img {
    width: 100%; height: 100%; object-fit: cover;
    transition: transform .65s cubic-bezier(.2,.7,.2,1);
  }
  .bp-landing .bp-feature-card:hover .bp-feature-image img,
  .bp-landing .bp-story-card:hover .bp-story-image img,
  .bp-landing .bp-agent-card:hover .bp-agent-image img { transform: scale(1.06); }
  .bp-landing .bp-image-number {
    position: absolute; right: 13px; bottom: 13px; padding: 6px 9px;
    border: 1px solid rgba(255,255,255,.4); border-radius: 6px;
    background: rgba(23,61,48,.8); color: white; font-size: 10px; font-weight: 800;
  }
  .bp-landing .bp-feature-copy { padding: 23px; }
  .bp-landing .bp-card-label { color: ${C.greenDark}; font-size: 9px; font-weight: 800; letter-spacing: 1px; }
  .bp-landing .bp-feature-copy h3 { margin: 11px 0; font-size: 22px; }
  .bp-landing .bp-feature-copy p { color: #758178; font-size: 12px; line-height: 1.9; }
  .bp-landing .bp-card-link {
    display: inline-flex; align-items: center; gap: 6px;
    margin-top: 4px; color: ${C.forest}; font-size: 11px; font-weight: 800;
  }

  .bp-landing .bp-wide-panel {
    display: grid; grid-template-columns: .9fr 1.1fr; gap: 35px;
    align-items: center; margin-top: 25px; padding: 35px;
    overflow: hidden; border-radius: 14px; background: ${C.forest}; color: white;
  }
  .bp-landing .bp-wide-panel h3 { margin: 13px 0; font-size: clamp(25px,3vw,38px); }
  .bp-landing .bp-wide-panel p { color: #C1D2C6; font-size: 13px; line-height: 1.9; }
  .bp-landing .bp-wide-panel .bp-kicker { color: #9DE1BB; }
  .bp-landing .bp-wide-panel img { width: 100%; height: 260px; object-fit: cover; border-radius: 9px; }

  .bp-landing .bp-agents-section { position: relative; background: ${C.forest}; color: white; overflow: hidden; }
  .bp-landing .bp-agents-section:before {
    content: ''; position: absolute; width: 550px; height: 550px; top: -220px; right: -150px;
    border-radius: 50%; background: rgba(14,156,107,.16); filter: blur(70px); pointer-events: none;
  }
  .bp-landing .bp-agents-section:after {
    content: ''; position: absolute; width: 350px; height: 350px; bottom: -180px; left: -80px;
    border-radius: 50%; background: rgba(151,205,165,.1); filter: blur(60px); pointer-events: none;
  }
  .bp-landing .bp-agents-inner { position: relative; z-index: 1; }
  .bp-landing .bp-agents-header {
    display: grid; grid-template-columns: 1.05fr .8fr; gap: 50px;
    align-items: end; margin-bottom: 42px;
  }
  .bp-landing .bp-agents-header .bp-kicker { color: #9DE1BB; }
  .bp-landing .bp-agents-header h2 { margin: 14px 0 0; font-size: clamp(36px,4.5vw,60px); }
  .bp-landing .bp-agents-header h2 span { color: #9DE1BB; }
  .bp-landing .bp-agents-header p { margin-bottom: 4px; color: #C1D2C6; font-size: 14px; line-height: 1.9; }
  .bp-landing .bp-agent-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 17px; }
  .bp-landing .bp-agent-card {
    display: flex; flex-direction: column; min-width: 0; overflow: hidden;
    border: 1px solid rgba(255,255,255,.14); border-radius: 13px;
    background: rgba(255,255,255,.055);
    transition: transform .3s ease, border-color .3s ease, background .3s ease;
  }
  .bp-landing .bp-agent-card:hover {
    transform: translateY(-8px); border-color: rgba(157,225,187,.55);
    background: rgba(255,255,255,.09);
  }
  .bp-landing .bp-agent-image { position: relative; height: 190px; overflow: hidden; background: #294D3D; }
  .bp-landing .bp-agent-image:after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(to top,rgba(17,43,32,.76),transparent 65%);
  }
  .bp-landing .bp-agent-image-tag {
    position: absolute; z-index: 1; left: 14px; bottom: 13px;
    display: inline-flex; align-items: center; gap: 7px;
    padding: 7px 10px; border-radius: 7px; color: white;
    border: 1px solid rgba(255,255,255,.25); background: rgba(23,61,48,.55);
    backdrop-filter: blur(8px); font-size: 9px; font-weight: 800; letter-spacing: .7px;
  }
  .bp-landing .bp-agent-copy { display: flex; flex-direction: column; flex: 1; padding: 22px; }
  .bp-landing .bp-agent-number { color: #9DE1BB; font-size: 10px; font-weight: 800; letter-spacing: 1px; }
  .bp-landing .bp-agent-copy h3 { margin: 11px 0; font-size: 23px; }
  .bp-landing .bp-agent-copy > p { color: #C0D0C4; font-size: 12px; line-height: 1.9; }
  .bp-landing .bp-agent-list { display: grid; gap: 9px; margin: 8px 0 20px; padding: 0; list-style: none; }
  .bp-landing .bp-agent-list li { display: flex; align-items: flex-start; gap: 8px; color: #E0E9E1; font-size: 11px; }
  .bp-landing .bp-agent-list svg { flex-shrink: 0; margin-top: 3px; color: #9DE1BB; }
  .bp-landing .bp-agent-note {
    display: flex; align-items: flex-start; gap: 12px; margin-top: auto;
    padding-top: 15px; border-top: 1px solid rgba(255,255,255,.12);
    color: #9FB8A7; font-size: 10px; line-height: 1.7;
  }
  .bp-landing .bp-agent-note svg { flex-shrink: 0; color: #9DE1BB; }
  .bp-landing .bp-agent-bottom {
    display: flex; align-items: center; justify-content: space-between; gap: 25px;
    margin-top: 30px; padding: 23px 25px; border: 1px solid rgba(255,255,255,.14);
    border-radius: 11px; background: rgba(255,255,255,.045);
  }
  .bp-landing .bp-agent-bottom p { margin: 0; color: #C1D2C6; font-size: 12px; }
  .bp-landing .bp-agent-bottom strong { color: white; }
  .bp-landing .bp-agent-bottom .bp-button { flex-shrink: 0; background: #9DE1BB; color: ${C.forest}; }

  .bp-landing .bp-stories { background: white; }
  .bp-landing .bp-story-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 20px; }
  .bp-landing .bp-story-card {
    overflow: hidden; border: 1px solid ${C.border}; border-radius: 12px;
    background: white; transition: transform .3s ease, box-shadow .3s ease;
  }
  .bp-landing .bp-story-card:hover { transform: translateY(-6px); box-shadow: 0 18px 35px rgba(23,61,48,.08); }
  .bp-landing .bp-story-image { height: 220px; position: relative; overflow: hidden; background: #E9EEE7; }
  .bp-landing .bp-story-tag {
    position: absolute; left: 14px; bottom: 14px; padding: 6px 9px;
    border-radius: 5px; background: white; color: ${C.forest};
    font-size: 9px; font-weight: 800; letter-spacing: .8px;
  }
  .bp-landing .bp-story-copy { padding: 22px; }
  .bp-landing .bp-story-copy h3 { margin: 0 0 12px; font-size: 22px; }
  .bp-landing .bp-story-copy p { margin: 0; color: #758178; font-size: 12px; line-height: 1.9; }

  .bp-landing .bp-video-section { display: grid; grid-template-columns: .8fr 1.2fr; align-items: center; gap: 65px; }
  .bp-landing .bp-video-copy h2 { margin: 14px 0 20px; font-size: clamp(34px,4vw,50px); }
  .bp-landing .bp-video-copy p { color: #718078; font-size: 13px; line-height: 1.95; }
  .bp-landing .bp-video-wrap {
    position: relative; overflow: hidden; min-height: 340px;
    border-radius: 15px; background: ${C.forest};
    box-shadow: 0 25px 60px rgba(23,61,48,.16);
  }
  .bp-landing .bp-video-wrap video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .bp-landing .bp-video-overlay {
    position: absolute; inset: 0; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 15px; color: white;
    background: linear-gradient(0deg,rgba(15,39,28,.62),rgba(15,39,28,.15));
    pointer-events: none;
  }
  .bp-landing .bp-video-overlay button { pointer-events: auto; }
  .bp-landing .bp-video-overlay small { font-size: 9px; font-weight: 800; letter-spacing: 1.4px; }
  .bp-landing .bp-video-play {
    display: grid; place-items: center; width: 74px; height: 74px;
    border: 1px solid rgba(255,255,255,.6); border-radius: 50%;
    background: rgba(255,255,255,.15); color: white;
    backdrop-filter: blur(10px); transition: transform .2s ease, background .2s ease;
  }
  .bp-landing .bp-video-play:hover { transform: scale(1.08); background: rgba(255,255,255,.27); }
  .bp-landing .bp-video-disclaimer { margin: 10px 0 0; color: #89958D; font-size: 10px; }

  .bp-landing .bp-how { background: #F0F4EF; }
  .bp-landing .bp-how-grid { display: grid; grid-template-columns: .8fr 1.2fr; gap: 70px; align-items: center; }
  .bp-landing .bp-how-copy h2 { margin: 15px 0 20px; font-size: clamp(35px,4vw,52px); }
  .bp-landing .bp-how-copy p { color: #718078; font-size: 13px; line-height: 1.95; }
  .bp-landing .bp-steps { display: grid; gap: 12px; }
  .bp-landing .bp-step {
    display: grid; grid-template-columns: 40px 1fr 20px; align-items: start;
    gap: 14px; padding: 22px; border: 1px solid #E1E8E0; border-radius: 10px;
    background: white; transition: transform .25s ease, border-color .25s ease;
  }
  .bp-landing .bp-step:hover { transform: translateX(4px); border-color: #B7D9C2; }
  .bp-landing .bp-step-number {
    display: grid; place-items: center; width: 38px; height: 38px;
    border-radius: 9px; background: ${C.paleGreen}; color: ${C.greenDark};
    font-size: 11px; font-weight: 800;
  }
  .bp-landing .bp-step strong { font-size: 13px; }
  .bp-landing .bp-step p { margin: 6px 0 0; color: #758178; font-size: 11px; line-height: 1.8; }
  .bp-landing .bp-step > svg { color: ${C.green}; margin-top: 3px; }

  .bp-landing .bp-principles { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 35px; }
  .bp-landing .bp-principle { padding: 10px 0; }
  .bp-landing .bp-principle-icon {
    display: grid; place-items: center; width: 47px; height: 47px;
    margin-bottom: 19px; border-radius: 12px; background: ${C.paleGreen}; color: ${C.greenDark};
  }
  .bp-landing .bp-principle h3 { margin-bottom: 9px; font-size: 18px; letter-spacing: -.5px; }
  .bp-landing .bp-principle p { margin: 0; color: #758178; font-size: 12px; line-height: 1.9; }

  .bp-landing .bp-closing {
    position: relative; overflow: hidden; margin: 0 clamp(16px,4vw,60px) 24px;
    padding: 80px 25px; border-radius: 18px; background: ${C.forest}; color: white;
    text-align: center;
  }
  .bp-landing .bp-closing:before, .bp-landing .bp-closing:after {
    content: ''; position: absolute; width: 360px; height: 360px; border-radius: 50%;
    border: 1px solid rgba(157,225,187,.18); pointer-events: none;
  }
  .bp-landing .bp-closing:before { top: -250px; left: -100px; box-shadow: 0 0 0 30px rgba(157,225,187,.025),0 0 0 60px rgba(157,225,187,.02); }
  .bp-landing .bp-closing:after { bottom: -280px; right: -80px; box-shadow: 0 0 0 35px rgba(157,225,187,.025),0 0 0 70px rgba(157,225,187,.02); }
  .bp-landing .bp-closing-content { position: relative; z-index: 1; max-width: 700px; margin: auto; }
  .bp-landing .bp-closing .bp-kicker { color: #9DE1BB; }
  .bp-landing .bp-closing h2 { margin: 17px 0; font-size: clamp(38px,5vw,62px); }
  .bp-landing .bp-closing h2 span { color: #9DE1BB; }
  .bp-landing .bp-closing p { max-width: 550px; margin: 0 auto 25px; color: #C1D2C6; font-size: 13px; line-height: 1.9; }
  .bp-landing .bp-closing .bp-button { background: #9DE1BB; color: ${C.forest}; }
  .bp-landing .bp-closing-note { display: block; margin-top: 18px; color: #A8BDAE; font-size: 10px; }

  .bp-landing .bp-footer {
    display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
    align-items: center; padding: 30px clamp(20px,6vw,90px);
    border-top: 1px solid ${C.border}; background: white;
  }
  .bp-landing .bp-footer-tagline { color: #7C8980; font-size: 11px; }
  .bp-landing .bp-footer-links {
    display: flex; align-items: center; justify-content: flex-end;
    flex-wrap: wrap; gap: 18px;
  }
  .bp-landing .bp-footer-links a, .bp-landing .bp-footer-links button {
    border: 0; padding: 0; background: transparent; color: #68766D; font-size: 11px;
  }
  .bp-landing .bp-footer-links a:hover, .bp-landing .bp-footer-links button:hover { color: ${C.greenDark}; }
  .bp-landing .bp-copyright { grid-column: 1/-1; margin: 0; color: #9AA49D; font-size: 10px; }

  .bp-landing .bp-reveal {
    opacity: 0; transform: translateY(24px);
    transition: opacity .75s cubic-bezier(.2,.7,.2,1), transform .75s cubic-bezier(.2,.7,.2,1);
    transition-delay: var(--bp-delay,0ms);
  }
  .bp-landing .bp-reveal.bp-visible { opacity: 1; transform: translate(0,0); }
  .bp-landing .bp-reveal-left { transform: translateX(-28px); }
  .bp-landing .bp-reveal-right { transform: translateX(28px); }

  @keyframes bpPulse {
    0%,100% { box-shadow: 0 0 0 3px rgba(14,156,107,.12); }
    50% { box-shadow: 0 0 0 7px rgba(14,156,107,.025); }
  }
  @keyframes bpFloat {
    0%,100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
  @keyframes bpBarRise {
    from { transform: scaleY(.15); opacity: .45; }
    to { transform: scaleY(1); opacity: 1; }
  }

 @media (min-width: 1500px) {
  .bp-landing .bp-hero {
    padding-top: 3px;
    padding-bottom: 45px;
  }
}
  @media (max-width: 1100px) {
    .bp-landing .bp-nav-links { gap: 17px; }
    .bp-landing .bp-hero { grid-template-columns: 1fr; gap: 55px; padding-top: 65px; }
    .bp-landing .bp-hero-copy { max-width: 760px; }
    .bp-landing .bp-dashboard-wrap { width: min(100%,760px); margin: 0 auto; }
    .bp-landing .bp-dashboard-layout { min-height: 350px; }
    .bp-landing .bp-floating-one { left: -10px; }
    .bp-landing .bp-floating-two { right: -8px; }
    .bp-landing .bp-agent-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
    .bp-landing .bp-agent-card:last-child { grid-column: 1/-1; }
    .bp-landing .bp-agent-card:last-child .bp-agent-image { height: 230px; }
    .bp-landing .bp-video-section, .bp-landing .bp-how-grid { gap: 35px; }
  }
  @media (max-width: 760px) {
    .bp-landing .bp-nav { min-height: 66px; padding: 10px 18px; gap: 12px; }
    .bp-landing .bp-brand-name { font-size: 20px; }
    .bp-landing .bp-brand-mark { width: 35px; height: 35px; }
    .bp-landing .bp-menu-toggle { display: inline-flex; margin-left: auto; }
    .bp-landing .bp-nav-links {
      position: absolute; top: calc(100% + 1px); left: 0; right: 0;
      display: none; align-items: stretch; gap: 0; padding: 8px 18px 16px;
      background: ${C.cream}; border-bottom: 1px solid ${C.border};
      box-shadow: 0 15px 25px rgba(23,61,48,.07);
    }
    .bp-landing .bp-nav-links.is-open { display: flex; flex-direction: column; }
    .bp-landing .bp-nav-links a { padding: 12px 4px; border-bottom: 1px solid #E9EDE7; }
    .bp-landing .bp-nav-actions { gap: 10px; }
    .bp-landing .bp-login { display: none; }
    .bp-landing .bp-nav-actions .bp-button { min-height: 40px; padding: 0 12px; font-size: 11px; }
    .bp-landing .bp-hero { padding: 55px 20px 60px; gap: 42px; }
    .bp-landing .bp-hero h1 { font-size: clamp(39px,9.5vw,62px); }
    .bp-landing .bp-hero-description { font-size: 13px; }
    .bp-landing .bp-hero-actions { align-items: stretch; flex-direction: column; }
    .bp-landing .bp-hero-actions .bp-button { width: 100%; }
    .bp-landing .bp-dashboard { transform: none; }
    .bp-landing .bp-dashboard-layout { grid-template-columns: 36px 1fr; min-height: 0; }
    .bp-landing .bp-mini-sidebar { gap: 13px; }
    .bp-landing .bp-dashboard-content { padding: 11px; }
    .bp-landing .bp-metrics { gap: 5px; }
    .bp-landing .bp-metric { padding: 9px 7px; }
    .bp-landing .bp-metric span { font-size: 8px; }
    .bp-landing .bp-metric strong { font-size: 16px; }
    .bp-landing .bp-metric small { font-size: 7px; }
    .bp-landing .bp-dash-lower { grid-template-columns: 1fr; }
    .bp-landing .bp-insight-card { display: none; }
    .bp-landing .bp-floating-note { padding: 9px 11px; }
    .bp-landing .bp-floating-note strong { font-size: 9px; }
    .bp-landing .bp-floating-note small { font-size: 8px; }
    .bp-landing .bp-floating-one { left: -3px; bottom: -19px; }
    .bp-landing .bp-floating-two { right: -3px; top: -18px; }
    .bp-landing .bp-section { padding: 70px 20px; }
    .bp-landing .bp-human-section, .bp-landing .bp-video-section, .bp-landing .bp-how-grid {
      grid-template-columns: 1fr; gap: 32px;
    }
    .bp-landing .bp-human-image, .bp-landing .bp-human-image img { height: 300px; min-height: 300px; }
    .bp-landing .bp-section-heading { font-size: clamp(32px,8vw,44px); }
 .bp-landing .bp-center-heading {
  text-align: center;
  margin: 0 auto 45px;
}

.bp-landing .bp-center-heading .bp-section-description {
  margin: 0 auto;
}
    .bp-landing .bp-feature-grid, .bp-landing .bp-story-grid { grid-template-columns: 1fr; gap: 15px; }
    .bp-landing .bp-feature-image { height: 220px; }
    .bp-landing .bp-wide-panel { grid-template-columns: 1fr; padding: 23px; gap: 20px; }
    .bp-landing .bp-wide-panel img { height: 210px; }
    .bp-landing .bp-agents-header { grid-template-columns: 1fr; gap: 15px; }
    .bp-landing .bp-agent-grid { grid-template-columns: 1fr; gap: 15px; }
    .bp-landing .bp-agent-card:last-child { grid-column: auto; }
    .bp-landing .bp-agent-card:last-child .bp-agent-image,
    .bp-landing .bp-agent-image { height: 210px; }
    .bp-landing .bp-agent-bottom { align-items: stretch; flex-direction: column; padding: 20px; }
    .bp-landing .bp-agent-bottom .bp-button { width: 100%; }
    .bp-landing .bp-video-wrap { min-height: 260px; }
    .bp-landing .bp-principles { grid-template-columns: 1fr; gap: 24px; }
    .bp-landing .bp-principle { display: grid; grid-template-columns: 48px 1fr; column-gap: 15px; }
    .bp-landing .bp-principle-icon { grid-row: 1/3; margin: 0; }
    .bp-landing .bp-principle h3 { margin: 2px 0 5px; }
    .bp-landing .bp-principle p { grid-column: 2; }
    .bp-landing .bp-closing { margin: 0 12px 16px; padding: 65px 22px; }
    .bp-landing .bp-footer { grid-template-columns: 1fr; gap: 14px; padding: 25px 20px; }
    .bp-landing .bp-footer-links { justify-content: flex-start; gap: 15px; }
    .bp-landing .bp-copyright { grid-column: auto; }
  }
  @media (max-width: 390px) {
    .bp-landing .bp-nav-actions .bp-button { padding: 0 9px; }
    .bp-landing .bp-dashboard-top { padding: 0 9px; }
    .bp-landing .bp-brand-name { font-size: 18px; }
    .bp-landing .bp-dashboard-content { padding: 8px; }
    .bp-landing .bp-metric strong { font-size: 14px; }
    .bp-landing .bp-dash-heading h3 { font-size: 13px; }
    .bp-landing .bp-floating-note { gap: 6px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .bp-landing *, .bp-landing *:before, .bp-landing *:after {
      animation-duration: .01ms !important;
      animation-iteration-count: 1 !important;
      scroll-behavior: auto !important;
      transition-duration: .01ms !important;
    }
    .bp-landing .bp-reveal { opacity: 1; transform: none; }
  }

  /* BizPilot landing-page-only additions. Every rule stays inside .bp-landing. */
  .bp-landing .bp-hero-copy { max-width: 650px; }
  .bp-landing .bp-hero .bp-eyebrow { gap: 0; }
  .bp-landing .bp-dashboard-content { text-align: left; }
  .bp-landing .bp-dash-heading h3 { line-height: 1.25; }
  .bp-landing .bp-metric span, .bp-landing .bp-metric small { line-height: 1.45; }
  .bp-landing .bp-import-section { background: #fff; }
  .bp-landing .bp-import-layout { display: grid; grid-template-columns: .78fr 1.22fr; gap: 48px; align-items: center; }
  .bp-landing .bp-import-copy .bp-section-heading { margin-bottom: 17px; }
  .bp-landing .bp-import-copy .bp-section-description { margin-bottom: 24px; }
  .bp-landing .bp-import-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; }
  .bp-landing .bp-import-card { min-height: 160px; padding: 20px; border: 1px solid #E3EAE2; border-radius: 13px; background: linear-gradient(145deg,#fff,#F7FAF6); transition: transform .25s ease,border-color .25s ease,box-shadow .25s ease; }
  .bp-landing .bp-import-card:last-child { grid-column: 1/-1; }
  .bp-landing .bp-import-card:hover { transform: translateY(-4px); border-color: #B6D9C2; box-shadow: 0 14px 28px rgba(23,61,48,.07); }
  .bp-landing .bp-import-icon, .bp-landing .bp-recommend-icon { display: grid; place-items: center; width: 42px; height: 42px; margin-bottom: 13px; border-radius: 11px; color: #087950; background: #EAF5EE; }
  .bp-landing .bp-import-card h3 { margin-bottom: 7px; font-size: 16px; letter-spacing: -.4px; }
  .bp-landing .bp-import-card p { margin: 0; color: #718078; font-size: 11px; line-height: 1.8; }
  .bp-landing .bp-import-note { display: flex; align-items: flex-start; gap: 10px; margin-top: 22px; padding: 15px 18px; border-radius: 10px; background: #F2F7F1; color: #52665A; }
  .bp-landing .bp-import-note svg { flex-shrink: 0; margin-top: 3px; color: #087950; }
  .bp-landing .bp-import-note p { margin: 0; font-size: 11px; line-height: 1.8; }
  .bp-landing .bp-agent-grid { grid-template-columns: repeat(3,minmax(0,1fr)); }
  .bp-landing .bp-agent-card:last-child { grid-column: auto; }
  .bp-landing .bp-agent-card:last-child .bp-agent-image { height: 190px; }
  .bp-landing .bp-recommend-section { background: #F3F5F0; }
  .bp-landing .bp-recommend-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 17px; }
  .bp-landing .bp-recommend-card { padding: 25px; border: 1px solid #E1E8E0; border-radius: 14px; background: white; transition: transform .25s ease,box-shadow .25s ease; }
  .bp-landing .bp-recommend-card:hover { transform: translateY(-5px); box-shadow: 0 16px 32px rgba(23,61,48,.08); }
  .bp-landing .bp-recommend-label { display: block; margin-bottom: 8px; color: #087950; font-size: 9px; font-weight: 800; letter-spacing: 1.2px; }
  .bp-landing .bp-recommend-card h3 { margin-bottom: 10px; font-size: 19px; line-height: 1.35; }
  .bp-landing .bp-recommend-card p, .bp-landing .bp-recommend-disclaimer { margin: 0; color: #718078; font-size: 12px; line-height: 1.85; }
  .bp-landing .bp-recommend-disclaimer { margin-top: 20px; text-align: center; font-size: 10px; }
  .bp-landing .bp-faq-section { background: #fff; }
  .bp-landing .bp-faq-layout { display: grid; grid-template-columns: .8fr 1.2fr; gap: clamp(35px,7vw,90px); align-items: start; }
  .bp-landing .bp-faq-intro { position: sticky; top: 110px; }
  .bp-landing .bp-faq-help { display: flex; align-items: flex-start; gap: 12px; margin-top: 27px; padding: 17px; border-radius: 12px; background: #F1F7F0; color: #087950; }
  .bp-landing .bp-faq-help span { display: grid; gap: 5px; }
  .bp-landing .bp-faq-help strong { color: #173D30; font-size: 12px; }
  .bp-landing .bp-faq-help small { color: #718078; font-size: 11px; line-height: 1.7; }
  .bp-landing .bp-faq-list { display: grid; gap: 10px; }
  .bp-landing .bp-faq-item { overflow: hidden; border: 1px solid #E3EAE2; border-radius: 12px; background: #fff; transition: border-color .2s ease,box-shadow .2s ease; }
  .bp-landing .bp-faq-item[open] { border-color: #B9D9C2; box-shadow: 0 9px 22px rgba(23,61,48,.045); }
  .bp-landing .bp-faq-item summary { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 19px 20px; cursor: pointer; list-style: none; color: #173D30; font-size: 13px; font-weight: 700; }
  .bp-landing .bp-faq-item summary::-webkit-details-marker { display: none; }
  .bp-landing .bp-faq-item summary svg { flex-shrink: 0; color: #087950; transition: transform .2s ease; }
  .bp-landing .bp-faq-item[open] summary svg { transform: rotate(180deg); }
  .bp-landing .bp-faq-item p { margin: 0; padding: 0 20px 20px; color: #718078; font-size: 12px; line-height: 1.9; }
  .bp-landing .bp-footer-expanded { display: block; padding: 58px clamp(20px,6vw,90px) 22px; background: #102E23; color: #fff; border-top: 0; }
  .bp-landing .bp-footer-main { display: grid; grid-template-columns: 1.3fr .8fr 1fr .9fr; gap: 40px; max-width: 1400px; margin: 0 auto; padding-bottom: 42px; }
  .bp-landing .bp-footer-expanded .bp-brand-name { color: #fff; }
  .bp-landing .bp-footer-expanded .bp-brand-mark { background: #9DE1BB; color: #173D30; }
  .bp-landing .bp-footer-tagline { display: block; margin: 18px 0 8px; color: #D7E6DA; font-size: 13px; }
  .bp-landing .bp-footer-small { max-width: 270px; margin-bottom: 20px; color: #AFC4B5; font-size: 11px; line-height: 1.85; }
  .bp-landing .bp-footer-expanded .bp-footer-column { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; }
  .bp-landing .bp-footer-column h3 { margin: 4px 0 8px; color: #fff; font-size: 13px; letter-spacing: -.2px; }
  .bp-landing .bp-footer-column a, .bp-landing .bp-footer-column button { padding: 0; border: 0; background: transparent; color: #B7C9BC; font-size: 11px; text-align: left; transition: color .2s ease; }
  .bp-landing .bp-footer-column a:hover, .bp-landing .bp-footer-column button:hover { color: #9DE1BB; }
  .bp-landing .bp-footer-how { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 25px; max-width: 1400px; margin: 0 auto; padding: 28px 0; border-top: 1px solid rgba(255,255,255,.13); border-bottom: 1px solid rgba(255,255,255,.13); }
  .bp-landing .bp-footer-how > div { display: grid; grid-template-columns: 34px 1fr; column-gap: 12px; align-content: start; }
  .bp-landing .bp-footer-step { grid-row: 1/3; display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; background: rgba(157,225,187,.12); color: #9DE1BB; font-size: 10px; font-weight: 800; }
  .bp-landing .bp-footer-how strong { margin: 2px 0 5px; color: #fff; font-size: 12px; }
  .bp-landing .bp-footer-how p { grid-column: 2; margin: 0; color: #AFC4B5; font-size: 10px; line-height: 1.8; }
  .bp-landing .bp-footer-bottom { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 15px; max-width: 1400px; margin: 0 auto; padding-top: 20px; }
  .bp-landing .bp-footer-bottom p { margin: 0; color: #91AB99; font-size: 10px; }
  .bp-landing .bp-footer-bottom a { color: #9DE1BB; font-size: 10px; font-weight: 700; }
  @media (max-width: 1100px) {
    .bp-landing .bp-import-layout, .bp-landing .bp-faq-layout { grid-template-columns: 1fr; }
    .bp-landing .bp-faq-intro { position: static; }
    .bp-landing .bp-footer-main { grid-template-columns: repeat(2,minmax(0,1fr)); }
    .bp-landing .bp-agent-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
  }
  @media (max-width: 760px) {
    .bp-landing .bp-import-layout { gap: 28px; }
    .bp-landing .bp-import-grid, .bp-landing .bp-recommend-grid { grid-template-columns: 1fr; }
    .bp-landing .bp-import-card:last-child { grid-column: auto; }
    .bp-landing .bp-agent-grid { grid-template-columns: 1fr; }
    .bp-landing .bp-recommend-card { padding: 21px; }
    .bp-landing .bp-faq-layout { gap: 28px; }
    .bp-landing .bp-faq-item summary { padding: 17px; font-size: 12px; }
    .bp-landing .bp-faq-item p { padding: 0 17px 17px; }
    .bp-landing .bp-footer-expanded { padding: 42px 20px 20px; }
    .bp-landing .bp-footer-main, .bp-landing .bp-footer-how { grid-template-columns: 1fr; gap: 27px; }
    .bp-landing .bp-footer-bottom { align-items: flex-start; flex-direction: column; }
  }
`;

function Reveal({ children, direction = "up", delay = 0, className = "" }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    ) {
      setVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(node);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -30px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`bp-reveal bp-reveal-${direction} ${visible ? "bp-visible" : ""} ${className}`}
      style={{ "--bp-delay": `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function Brand({ onClick }) {
  return (
    <a className="bp-brand" href="#bizpilot-bp-top" onClick={onClick} aria-label="BizPilot home">
      <span className="bp-brand-mark">
        <Activity size={21} />
      </span>
      <span className="bp-brand-name">
        bizpilot<span style={{ color: C.green }}>.</span>
      </span>
    </a>
  );
}

function DashboardPreview() {
  const [period, setPeriod] = useState("Week");

  const bars = {
    Week: [38, 58, 45, 74, 54, 88, 67, 96, 61, 78, 52, 84],
    Month: [34, 48, 42, 60, 49, 75, 57, 84, 68, 91, 72, 96],
    Year: [42, 35, 54, 48, 63, 57, 76, 67, 82, 71, 88, 96],
  }[period];

  const recordCards = [
    {
      className: "bp-record-csv",
      icon: <FileSpreadsheet size={16} />,
      label: "sales_october.csv",
      detail: "Sales records · 248 rows",
      type: "CSV",
    },
    {
      className: "bp-record-invoice",
      icon: <FileText size={16} />,
      label: "Invoice #1048",
      detail: "Payment record · PDF",
      type: "PDF",
    },
    {
      className: "bp-record-stock",
      icon: <Package size={16} />,
      label: "Stock list.xlsx",
      detail: "Products · 128 items",
      type: "XLSX",
    },
    {
      className: "bp-record-message",
      icon: <MessageSquare size={16} />,
      label: "Order received",
      detail: '"Please reserve 4 items"',
      type: "MESSAGE",
    },
  ];

  return (
    <div className="bp-dashboard-wrap bp-clarity-scene">
      <div className="bp-dashboard-glow" />

      {/* Decorative records collage */}
      <div
        className="bp-records-collage"
        aria-hidden="true"
      >
        <div className="bp-records-label">
          <span className="bp-records-label-dot" />
          YOUR BUSINESS RECORDS
        </div>

        {recordCards.map((record, index) => (
          <div
            key={record.className}
            className={`bp-record-card ${record.className}`}
            style={{ "--record-index": index }}
          >
            <span className="bp-record-icon">{record.icon}</span>

            <span className="bp-record-copy">
              <strong>{record.label}</strong>
              <small>{record.detail}</small>
            </span>

            <span className="bp-record-type">{record.type}</span>
          </div>
        ))}

        <div className="bp-records-transform">
          <span className="bp-transform-line" />
          <span className="bp-transform-icon">
            <Sparkles size={16} />
          </span>
          <span className="bp-transform-line" />
        </div>

        <div className="bp-organized-label">
          <span className="bp-organized-check">✓</span>
          Organized into one view
        </div>
      </div>

      {/* Main dashboard */}
      <div className="bp-dashboard bp-clarity-dashboard">
        <div className="bp-dashboard-top">
          <div className="bp-window-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>

          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: C.forest,
            }}
          >
            bizpilot. / overview
          </span>

          <span className="bp-sample-tag">SAMPLE DATA</span>
        </div>

        <div className="bp-dashboard-layout">
          <aside className="bp-mini-sidebar" aria-hidden="true">
            <Activity size={16} />
            <span className="active">
              <BarChart3 size={16} />
            </span>
            <Package size={16} />
            <Boxes size={16} />
            <Workflow size={16} />
          </aside>

          <div className="bp-dashboard-content">
            <div className="bp-dash-heading bp-assemble-heading">
              <div>
                <small>YOUR WORKSPACE</small>
                <h3>Your business, at a glance.</h3>
                <p>
                  See what is selling, what is left, and how money is moving.
                </p>
              </div>

              <span className="bp-demo-chip">Demo data</span>
            </div>

            <div className="bp-metrics bp-assemble-metrics">
              <div className="bp-metric">
                <span>Sales recorded</span>
                <strong>24,860</strong>
                <small>Illustrative amount</small>
              </div>

              <div className="bp-metric">
                <span>Orders</span>
                <strong>248</strong>
                <small>Sample activity</small>
              </div>

              <div className="bp-metric">
                <span>Products</span>
                <strong>128</strong>
                <small>Sample catalogue</small>
              </div>
            </div>

            <div className="bp-dash-lower bp-assemble-lower">
              <div className="bp-chart-card">
                <div className="bp-chart-heading">
                  <span>
                    <strong>Business activity</strong>
                    <small>Illustrative performance data</small>
                  </span>

                  <label>
                    <span
                      className="bp-sr-only"
                      style={{
                        position: "absolute",
                        width: 1,
                        height: 1,
                        overflow: "hidden",
                        clip: "rect(0,0,0,0)",
                      }}
                    >
                      Chart period
                    </span>

                    <select
                      value={period}
                      onChange={(event) => setPeriod(event.target.value)}
                    >
                      <option value="Week">Week</option>
                      <option value="Month">Month</option>
                      <option value="Year">Year</option>
                    </select>
                  </label>
                </div>

                <div
                  className="bp-chart"
                  role="img"
                  aria-label={`Illustrative business activity over the ${period.toLowerCase()}`}
                >
                  {bars.map((height, index) => (
                    <span
                      key={`${period}-${index}`}
                      className={`bp-chart-bar ${index === 7 ? "highlight" : ""
                        }`}
                      style={{
                        height: `${height}%`,
                        animationDelay: `${index * 35}ms`,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="bp-insight-card">
                <span className="bp-insight-icon">
                  <Sparkles size={16} />
                </span>

                <small>YOUR NEXT STEP</small>
                <strong>Look for the pattern.</strong>

                <p>
                  Compare activity over time to understand what may need your
                  attention.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating business insights */}
      <div className="bp-floating-note bp-floating-one bp-assemble-note-one">
        <TrendingUp size={20} />
        <div>
          <strong>See the bigger picture</strong>
          <small>Business performance</small>
        </div>
      </div>

      <div className="bp-floating-note bp-floating-two bp-assemble-note-two">
        <Sparkles size={19} />
        <div>
          <strong>Clarity starts here.</strong>
          <small>Explore your business data</small>
        </div>
      </div>

      {/* Scoped animation styles */}
      <style>{`
        .bp-landing .bp-clarity-scene {
          isolation: isolate;
        }

        .bp-landing .bp-records-collage {
          position: absolute;
          inset: 0;
          z-index: 5;
          pointer-events: none;
          opacity: 0;
          animation: bpRecordsScene 5.2s ease-in-out both;
        }

        .bp-landing .bp-records-label {
          position: absolute;
          top: 5%;
          left: 50%;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 8px 12px;
          border: 1px solid rgba(23, 61, 48, 0.1);
          border-radius: 999px;
          background: rgba(255, 252, 245, 0.96);
          color: #173D30;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.08em;
          white-space: nowrap;
          box-shadow: 0 8px 25px rgba(23, 61, 48, 0.07);
          transform: translate(-50%, 15px);
          animation: bpRecordsLabel 5.2s ease both;
        }

        .bp-landing .bp-records-label-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #0E9C6B;
        }

        .bp-landing .bp-record-card {
          position: absolute;
          display: flex;
          align-items: center;
          gap: 10px;
          width: min(230px, 48%);
          min-height: 66px;
          padding: 12px;
          border: 1px solid rgba(23, 61, 48, 0.11);
          border-radius: 13px;
          background: #FFFCF5;
          box-shadow: 0 14px 38px rgba(23, 61, 48, 0.12);
          opacity: 0;
          animation: bpRecordAssemble 5.2s cubic-bezier(.2,.75,.25,1) both;
          animation-delay: calc(var(--record-index) * 100ms);
        }

        .bp-landing .bp-record-csv {
          top: 20%;
          left: -3%;
          --record-x: -75px;
          --record-y: -40px;
          --record-rotate: -12deg;
        }

        .bp-landing .bp-record-invoice {
          top: 19%;
          right: -2%;
          --record-x: 75px;
          --record-y: -45px;
          --record-rotate: 11deg;
        }

        .bp-landing .bp-record-stock {
          bottom: 20%;
          left: -4%;
          --record-x: -80px;
          --record-y: 45px;
          --record-rotate: 9deg;
        }

        .bp-landing .bp-record-message {
          right: -2%;
          bottom: 19%;
          --record-x: 80px;
          --record-y: 45px;
          --record-rotate: -10deg;
        }

        .bp-landing .bp-record-icon {
          display: grid;
          flex: 0 0 34px;
          width: 34px;
          height: 34px;
          place-items: center;
          border-radius: 10px;
          background: #EAF5ED;
          color: #0E805A;
        }

        .bp-landing .bp-record-copy {
          display: grid;
          min-width: 0;
          gap: 4px;
        }

        .bp-landing .bp-record-copy strong {
          overflow: hidden;
          color: #173D30;
          font-size: 10px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .bp-landing .bp-record-copy small {
          color: #718078;
          font-size: 8px;
          line-height: 1.4;
        }

        .bp-landing .bp-record-type {
          margin-left: auto;
          color: #73857B;
          font-size: 7px;
          font-weight: 800;
        }

        .bp-landing .bp-records-transform {
          position: absolute;
          top: 50%;
          left: 50%;
          display: flex;
          align-items: center;
          gap: 9px;
          opacity: 0;
          transform: translate(-50%, -50%) scale(.6);
          animation: bpTransformPulse 5.2s ease both;
        }

        .bp-landing .bp-transform-line {
          width: 24px;
          height: 1px;
          background: rgba(14, 156, 107, .5);
        }

        .bp-landing .bp-transform-icon {
          display: grid;
          width: 38px;
          height: 38px;
          place-items: center;
          border: 1px solid rgba(14, 156, 107, .2);
          border-radius: 50%;
          background: #EAF5ED;
          color: #0E9C6B;
          box-shadow: 0 0 0 7px rgba(14, 156, 107, .07);
        }

        .bp-landing .bp-organized-label {
          position: absolute;
          bottom: 5%;
          left: 50%;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 8px 12px;
          border: 1px solid rgba(14, 156, 107, .18);
          border-radius: 999px;
          background: #F0F8F0;
          color: #205641;
          font-size: 9px;
          font-weight: 700;
          white-space: nowrap;
          opacity: 0;
          transform: translate(-50%, -8px);
          animation: bpOrganizedLabel 5.2s ease both;
        }

        .bp-landing .bp-organized-check {
          display: grid;
          width: 16px;
          height: 16px;
          place-items: center;
          border-radius: 50%;
          background: #0E9C6B;
          color: white;
          font-size: 10px;
        }

        .bp-landing .bp-clarity-dashboard {
          transform-origin: center;
          animation: bpDashboardReveal 5.2s cubic-bezier(.2,.75,.25,1) both;
        }

        .bp-landing .bp-assemble-heading,
        .bp-landing .bp-assemble-metrics,
        .bp-landing .bp-assemble-lower {
          animation: bpDashboardContentReveal 5.2s ease both;
        }

        .bp-landing .bp-assemble-heading {
          animation-delay: 1.5s;
        }

        .bp-landing .bp-assemble-metrics {
          animation-delay: 1.7s;
        }

        .bp-landing .bp-assemble-lower {
          animation-delay: 1.9s;
        }

        .bp-landing .bp-assemble-note-one {
          animation: bpAssembleNoteOne 5.2s ease both;
        }

        .bp-landing .bp-assemble-note-two {
          animation: bpAssembleNoteTwo 5.2s ease both;
        }

        @keyframes bpRecordsScene {
          0%, 3% { opacity: 1; }
          48% { opacity: 1; }
          69%, 100% { opacity: 0; visibility: hidden; }
        }

        @keyframes bpRecordsLabel {
          0% { opacity: 0; transform: translate(-50%, 15px); }
          8%, 38% { opacity: 1; transform: translate(-50%, 0); }
          55%, 100% { opacity: 0; transform: translate(-50%, -10px); }
        }

        @keyframes bpRecordAssemble {
          0% {
            opacity: 0;
            transform: translate(var(--record-x), var(--record-y)) rotate(var(--record-rotate)) scale(.78);
          }
          10%, 24% {
            opacity: 1;
            transform: translate(0, 0) rotate(var(--record-rotate)) scale(1);
          }
          44% {
            opacity: 1;
            transform: translate(0, 0) rotate(0) scale(.96);
          }
          62%, 100% {
            opacity: 0;
            transform: translate(0, -18px) rotate(0) scale(.82);
          }
        }

        @keyframes bpTransformPulse {
          0%, 28% { opacity: 0; transform: translate(-50%, -50%) scale(.6); }
          38%, 48% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          60%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(1.2); }
        }

        @keyframes bpOrganizedLabel {
          0%, 43% { opacity: 0; transform: translate(-50%, -8px); }
          53%, 65% { opacity: 1; transform: translate(-50%, 0); }
          75%, 100% { opacity: 0; transform: translate(-50%, 8px); }
        }

        @keyframes bpDashboardReveal {
          0%, 35% {
            opacity: .05;
            transform: translateY(22px) scale(.94);
            filter: blur(5px);
          }
          55% {
            opacity: 1;
            transform: translateY(0) scale(1.015);
            filter: blur(0);
          }
          68%, 100% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: none;
          }
        }

        @keyframes bpDashboardContentReveal {
          0%, 34% { opacity: 0; transform: translateY(12px); }
          54%, 100% { opacity: 1; transform: translateY(0); }
        }

        @keyframes bpAssembleNoteOne {
          0%, 43% { opacity: 0; transform: translate(-24px, 12px) scale(.9); }
          58%, 100% { opacity: 1; transform: translate(0, 0) scale(1); }
        }

        @keyframes bpAssembleNoteTwo {
          0%, 47% { opacity: 0; transform: translate(24px, 12px) scale(.9); }
          62%, 100% { opacity: 1; transform: translate(0, 0) scale(1); }
        }

        @media (max-width: 680px) {
          .bp-landing .bp-record-card {
            width: min(190px, 54%);
            min-height: 56px;
            gap: 7px;
            padding: 8px;
          }

          .bp-landing .bp-record-csv {
            left: -2%;
          }

          .bp-landing .bp-record-invoice {
            right: -2%;
          }

          .bp-landing .bp-record-stock {
            left: -2%;
          }

          .bp-landing .bp-record-message {
            right: -2%;
          }

          .bp-landing .bp-record-copy strong {
            font-size: 9px;
          }

          .bp-landing .bp-record-copy small {
            font-size: 7px;
          }

          .bp-landing .bp-record-type {
            display: none;
          }

          .bp-landing .bp-records-label,
          .bp-landing .bp-organized-label {
            font-size: 8px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .bp-landing .bp-records-collage,
          .bp-landing .bp-record-card,
          .bp-landing .bp-records-label,
          .bp-landing .bp-records-transform,
          .bp-landing .bp-organized-label,
          .bp-landing .bp-clarity-dashboard,
          .bp-landing .bp-assemble-heading,
          .bp-landing .bp-assemble-metrics,
          .bp-landing .bp-assemble-lower,
          .bp-landing .bp-assemble-note-one,
          .bp-landing .bp-assemble-note-two {
            animation: none !important;
          }

          .bp-landing .bp-records-collage {
            display: none;
          }

          .bp-landing .bp-clarity-dashboard,
          .bp-landing .bp-assemble-heading,
          .bp-landing .bp-assemble-metrics,
          .bp-landing .bp-assemble-lower,
          .bp-landing .bp-assemble-note-one,
          .bp-landing .bp-assemble-note-two {
            opacity: 1;
            transform: none;
            filter: none;
          }
        }
      `}</style>
    </div>
  );
}

function FeatureCard({ feature, index, onPreview }) {
  const Icon = feature.icon;

  return (
    <Reveal direction="up" delay={index * 100}>
      <article className="bp-feature-card">
        <div className="bp-feature-image">
          <img src={feature.image} alt={feature.title} loading="lazy" decoding="async" />
          <span className="bp-image-number">{feature.number}</span>
        </div>
        <div className="bp-feature-copy">
          <span className="bp-card-label">{feature.label}</span>
          <h3>{feature.title}</h3>
          <p>{feature.text}</p>

          <button
            type="button"
            onClick={onPreview}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-3px)";
              e.currentTarget.style.background = "linear-gradient(135deg, #147D58, #0E9C6B)";
              e.currentTarget.style.boxShadow = "0 10px 24px rgba(14, 156, 107, 0.25)";
              e.currentTarget.style.borderColor = "#0E9C6B";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.background = "linear-gradient(135deg, #173D30, #205641)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(23, 61, 48, 0.12)";
              e.currentTarget.style.borderColor = "rgba(23, 61, 48, 0.12)";
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              padding: "13px 18px",
              borderRadius: "12px",
              border: "1px solid rgba(23, 61, 48, 0.12)",
              background: "linear-gradient(135deg, #173D30, #205641)",
              color: "#FFFFFF",
              fontSize: "14px",
              fontWeight: 700,
              letterSpacing: "-0.01em",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(23, 61, 48, 0.12)",
              transition:
                "transform 220ms ease, background 220ms ease, box-shadow 220ms ease, border-color 220ms ease",
              WebkitTapHighlightColor: "transparent",
              outline: "none",
            }}
          >
            <Icon size={16} strokeWidth={2.2} />

            <span>Explore this capability</span>

            <ChevronRight
              size={16}
              strokeWidth={2.4}
              style={{
                transition: "transform 220ms ease",
              }}
            />
          </button>

        </div>
      </article>
    </Reveal>
  );
}

function AgentCard({ agent, index }) {
  const Icon = agent.icon;

  return (
    <Reveal direction="up" delay={index * 120}>
      <article className="bp-agent-card">
        <div className="bp-agent-image">
          <img src={agent.image} alt={`Illustrative image for ${agent.category.toLowerCase()}`} loading="lazy" decoding="async" />
          <span className="bp-agent-image-tag"><Icon size={14} /> {agent.category}</span>
        </div>

        <div className="bp-agent-copy">
          <span className="bp-agent-number">AGENT CONCEPT / {agent.number}</span>
          <h3>{agent.title}</h3>
          <p>{agent.text}</p>

          <ul className="bp-agent-list">
            {agent.capabilities.map((capability) => (
              <li key={capability}><Check size={14} /> {capability}</li>
            ))}
          </ul>

          <div className="bp-agent-note">
            <ShieldCheck size={16} />
            <span>
              Designed as a human-guided assistant concept. Actions and integrations depend on the features actually enabled in BizPilot.
            </span>
          </div>
        </div>
      </article>
    </Reveal>
  );
}

function StoryCard({ story, index }) {
  return (
    <Reveal direction="up" delay={index * 100}>
      <article className="bp-story-card">
        <div className="bp-story-image">
          <img src={story.image} alt={story.title} loading="lazy" decoding="async" />
          <span className="bp-story-tag">{story.label}</span>
        </div>
        <div className="bp-story-copy">
          <h3>{story.title}</h3>
          <p>{story.text}</p>
        </div>
      </article>
    </Reveal>
  );
}

export default function LandingPage({ onLogin, onSignup, onPreview }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const videoRef = useRef(null);

  const closeMenu = () => setMenuOpen(false);

  const scrollTo = (id) => {
    closeMenu();
    document.getElementById(id)?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  };

  const toggleVideo = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (videoPlaying) {
      video.pause();
      setVideoPlaying(false);
      return;
    }

    try {
      await video.play();
      setVideoPlaying(true);
    } catch {
      setVideoPlaying(false);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    return () => {
      if (video) video.pause();
    };
  }, []);

  return (
    <div className="bp-landing" id="bizpilot-bp-top">
      <style>{globalStyles}</style>

      <header className="bp-nav">
        <Brand onClick={closeMenu} />

        <button
          type="button"
          className="bp-menu-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <nav className={`bp-nav-links ${menuOpen ? "is-open" : ""}`} aria-label="Main navigation">
          <a href="#bizpilot-bp-features" onClick={closeMenu}>Platform</a>
          <a href="#bizpilot-bp-agents" onClick={closeMenu}>AI agents</a>
          <a href="#bizpilot-bp-how" onClick={closeMenu}>How it works</a>
          <a href="#bizpilot-bp-import-records" onClick={closeMenu}>Your records</a>
          <a href="#bizpilot-bp-faq" onClick={closeMenu}>FAQ</a>
          <a href="#bizpilot-bp-businesses" onClick={closeMenu}>Who it's for</a>
        </nav>

        <div className="bp-nav-actions">

          <button
            type="button"
            onClick={onLogin}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              padding: "11px 18px",
              border: "1px solid #dce8df",
              borderRadius: "10px",
              background: "#ffffff",
              color: "#173d30",
              fontSize: "14px",
              fontWeight: 600,
              letterSpacing: "-0.2px",
              cursor: "pointer",
              transition: "all 180ms ease",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f1f7f2";
              e.currentTarget.style.borderColor = "#b9d2c0";
              e.currentTarget.style.color = "#0e7c51";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#ffffff";
              e.currentTarget.style.borderColor = "#dce8df";
              e.currentTarget.style.color = "#173d30";
            }}
          >
            Log in
            <span
              aria-hidden="true"
              style={{
                display: "inline-block",
                fontSize: "17px",
                lineHeight: 1,
                transition: "transform 180ms ease",
              }}
            >
              →
            </span>
          </button>

          <button type="button" className="bp-button bp-button-primary" onClick={onSignup}>
            Get started <ArrowUpRight size={15} />
          </button>
        </div>
      </header>

      <main>
        <section className="bp-hero">
          <Reveal direction="left">
            <div className="bp-hero-copy">
              {/* <span className="bp-eyebrow">
                BUILT FOR EVERYDAY BUSINESS OWNERS
              </span> */}

              <h1>
                Run your business with less guesswork.
                <br />
                <span className="bp-gradient-text">Know what to do next.</span>
              </h1>

              <p className="bp-hero-description">
                BizPilot helps you bring your business records together, understand sales and stock, and spot things that may need your attention. Think of it as one easier place to check how your business is doing.
              </p>

              <div className="bp-hero-actions">
                <button type="button" className="bp-button bp-button-primary" onClick={onSignup}>
                  Explore BizPilot <ArrowRight size={17} />
                </button>
                <button type="button" className="bp-button bp-button-light" onClick={onPreview}>
                  <CirclePlay size={18} /> Explore the workspace
                </button>
              </div>

              <div className="bp-proof">
                <span className="bp-proof-icon"><ShieldCheck size={19} /></span>
                <div>
                  <strong>Built around real business needs</strong>
                  <small>From everyday operations to bigger decisions.</small>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal direction="right">
            <DashboardPreview />
          </Reveal>
        </section>

        <section className="bp-section bp-human-section" id="bizpilot-bp-story">
          <Reveal direction="left">
            <div className="bp-human-image">
              <img src={MEDIA.hero} alt="A team collaborating around a table" loading="lazy" decoding="async" />
              <div className="bp-image-caption">
                <small>EVERY NUMBER HAS A STORY</small>
                <p>Your records can help answer everyday business questions.</p>
              </div>
            </div>
          </Reveal>

          <Reveal direction="right">
            <div className="bp-human-copy">
              <span className="bp-kicker">THE REALITY OF RUNNING A BUSINESS</span>
              <h2>It starts with an idea. Then comes everything else.</h2>
              <p>
                You make sales, buy stock, pay bills, and serve customers. As your business grows, it can get harder to keep every detail in your head.
              </p>
              <p>
                Some details may be in a spreadsheet, some in messages, and some on paper. BizPilot is designed to help make those details easier to review in one place.
              </p>
              <p className="bp-emphasis">
                The people building businesses deserve a clearer view of the work they put into them.
              </p>
              <button className="bp-text-link" type="button" onClick={() => scrollTo("bizpilot-bp-features")}>
                Meet your business workspace <ArrowRight size={16} />
              </button>
            </div>
          </Reveal>
        </section>

        <section className="bp-section bp-features" id="bizpilot-bp-features">
          <div className="bp-container">
            <Reveal direction="up">
              <div className="bp-center-heading">
                <span className="bp-kicker">THE TURNING POINT</span>
                <h2 className="bp-section-heading">
                  Bring your business records together.
                  <br />
                  <span className="bp-gradient-text">Understand them more easily.</span>
                </h2>
                <p className="bp-section-description">
                  Start with the information you already have. BizPilot helps you review it in plain language, from sales and stock to prices and money coming in or going out.
                </p>
              </div>
            </Reveal>

            <div className="bp-feature-grid">
              {features.map((feature, index) => (
                <FeatureCard key={feature.number} feature={feature} index={index} onPreview={onPreview} />
              ))}
            </div>

            <Reveal direction="up">
              <div className="bp-wide-panel">
                <div>
                  <span className="bp-kicker">FROM INFORMATION TO UNDERSTANDING</span>
                  <h3>Your records are more useful when you can see the bigger picture.</h3>
                  <p>
                    Explore business performance, keep track of products, and review available reports in a more connected experience.
                  </p>
                  <button type="button" className="bp-button bp-button-light" onClick={onPreview}>
                    Explore the workspace <ArrowRight size={16} />
                  </button>
                </div>
                <img src={MEDIA.analytics} alt="Business analytics displayed on a computer screen" loading="lazy" decoding="async" />
              </div>
            </Reveal>
          </div>
        </section>

        <section className="bp-section bp-import-section" id="bizpilot-bp-import-records">
          <div className="bp-container bp-import-layout">
            <Reveal direction="left">
              <div className="bp-import-copy">
                <span className="bp-kicker">START WITH WHAT YOU ALREADY HAVE</span>
                <h2 className="bp-section-heading">No need to start your records from zero.</h2>
                <p className="bp-section-description">Already running a business? Begin with the information you have today. Choose a file or record type to see how it could be used. Import availability depends on the tools enabled in your BizPilot workspace.</p>
                <button type="button" className="bp-button bp-button-primary" onClick={onSignup}>Start with your business <ArrowRight size={16} /></button>
              </div>
            </Reveal>
            <div className="bp-import-grid">
              {[
                { icon: FileSpreadsheet, title: "CSV files", text: "A simple table of sales, products, stock, or payments." },
                { icon: FileSpreadsheet, title: "Excel spreadsheets", text: "Existing .xlsx or spreadsheet records you already use." },
                { icon: Command, title: "Pasted business records", text: "Copy rows or notes from a record and paste them in when supported." },
                { icon: MessageSquareText, title: "Chat messages", text: "Useful order or customer details saved in conversations, where supported." },
                { icon: FileText, title: "PDF documents", text: "Invoices, statements, and reports that may contain useful business details." },
              ].map((item) => {
                const Icon = item.icon;
                return <article className="bp-import-card" key={item.title}><span className="bp-import-icon"><Icon size={21} /></span><h3>{item.title}</h3><p>{item.text}</p></article>;
              })}
            </div>
          </div>
          <div className="bp-container bp-import-note"><ShieldCheck size={17} /><p><strong>You stay in control.</strong> Review imported information before relying on it. BizPilot should only process files and connected sources that the product actually supports.</p></div>
        </section>

        {/* AI AGENTS */}
        <section className="bp-section bp-agents-section" id="bizpilot-bp-agents">
          <div className="bp-container bp-agents-inner">
            <Reveal direction="up">
              <div className="bp-agents-header">
                <div>
                  <span className="bp-kicker">A SMARTER WAY TO WORK</span>
                  <h2>
                    Meet the idea of your
                    <br />
                    <span>AI business team.</span>
                  </h2>
                </div>
                <p>
                  Six focused agents, each with one job: sales, inventory, reordering, pricing, cash flow, and business diagnosis. They are designed to explain what your records may be telling you, while you stay in charge of decisions.
                </p>
              </div>
            </Reveal>

            <div className="bp-agent-grid">
              {agentCards.map((agent, index) => (
                <AgentCard key={agent.number} agent={agent} index={index} />
              ))}
            </div>

            <Reveal direction="up">
              <div className="bp-agent-bottom">
                <p>
                  <strong>Not just another chatbot.</strong> The vision is to make useful business assistance fit into the work people already do.
                </p>
                <button type="button" className="bp-button" onClick={onPreview}>
                  Explore BizPilot <ArrowRight size={16} />
                </button>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="bp-section bp-stories" id="bizpilot-bp-businesses">
          <div className="bp-container">
            <Reveal direction="up">
              <div className="bp-center-heading">
                <span className="bp-kicker">BUILT FOR DIFFERENT BUSINESS JOURNEYS</span>
                <h2 className="bp-section-heading">
                  Different businesses.
                  <br />
                  <span className="bp-gradient-text">One need for clarity.</span>
                </h2>
                <p className="bp-section-description">
                  A retailer, an online seller, and a service provider may work differently. Each still needs to understand what is happening and what deserves attention.
                </p>
              </div>
            </Reveal>

            <div className="bp-story-grid">
              {stories.map((story, index) => (
                <StoryCard key={story.label} story={story} index={index} />
              ))}
            </div>
          </div>
        </section>

        <section className="bp-section bp-video-section" id="bizpilot-bp-video-story">
          <Reveal direction="left">
            <div className="bp-video-copy">
              <span className="bp-kicker">BEHIND EVERY BUSINESS</span>
              <h2>
                The work happens everywhere.
                <br />
                <span className="bp-gradient-text">Clarity should, too.</span>
              </h2>
              <p>
                Businesses take shape in shops, studios, warehouses, offices, and homes. The setting changes, but the need to understand the work remains.
              </p>
              <p>
                BizPilot is being built to help business owners organize information and make more informed decisions.
              </p>
              <button type="button" className="bp-button bp-button-primary" onClick={onPreview}>
                See BizPilot in action <ArrowRight size={16} />
              </button>
            </div>
          </Reveal>

          <Reveal direction="right">
            <div>
              <div className="bp-video-wrap">
                <video
                  ref={videoRef}
                  poster={MEDIA.hero}
                  src={MEDIA.video}
                  muted
                  loop
                  playsInline
                  preload="none"
                  onPlay={() => setVideoPlaying(true)}
                  onPause={() => setVideoPlaying(false)}
                  aria-label="Illustrative stock footage of a person working on a laptop"
                />
                <div className="bp-video-overlay">
                  <small>THE PEOPLE BEHIND THE WORK</small>
                  <button
                    type="button"
                    className="bp-video-play"
                    onClick={toggleVideo}
                    aria-label={videoPlaying ? "Pause business story video" : "Play business story video"}
                  >
                    {videoPlaying ? <Pause size={28} /> : <CirclePlay size={42} />}
                  </button>
                  <span style={{ fontSize: 11 }}>{videoPlaying ? "Pause the story" : "Play the story"}</span>
                </div>
              </div>
              <p className="bp-video-disclaimer">
                Illustrative stock footage. The people shown are not represented as BizPilot customers.
              </p>
            </div>
          </Reveal>
        </section>

        <section className="bp-section bp-how" id="bizpilot-bp-how">
          <div className="bp-container bp-how-grid">
            <Reveal direction="left">
              <div className="bp-how-copy">
                <span className="bp-kicker">A CLEARER DAILY ROUTINE</span>
                <h2>
                  From scattered records to <span className="bp-gradient-text">your next step.</span>
                </h2>
                <p>
                  You do not need another complicated process. Start with the business information available to you, explore it, and use what you learn to guide the next decision.
                </p>
                <button type="button" className="bp-button bp-button-primary" onClick={onSignup}>
                  Start exploring <ArrowRight size={16} />
                </button>
              </div>
            </Reveal>

            <Reveal direction="right">
              <div className="bp-steps">
                <div className="bp-step">
                  <span className="bp-step-number">01</span>
                  <div>
                    <strong>Bring your information together</strong>
                    <p>Explore the sample workspace or use the available import flow to begin with your records.</p>
                  </div>
                  <Check size={17} />
                </div>
                <div className="bp-step">
                  <span className="bp-step-number">02</span>
                  <div>
                    <strong>Understand what is happening</strong>
                    <p>Review sales activity, products, stock information, and available business reports.</p>
                  </div>
                  <Check size={17} />
                </div>
                <div className="bp-step">
                  <span className="bp-step-number">03</span>
                  <div>
                    <strong>Decide what to look at next</strong>
                    <p>Use the information available to investigate patterns and consider your next move.</p>
                  </div>
                  <Check size={17} />
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="bp-section">
          <div className="bp-container bp-principles">
            <Reveal direction="up" delay={0}>
              <article className="bp-principle">
                <span className="bp-principle-icon"><Package size={22} /></span>
                <h3>Keep the essentials together.</h3>
                <p>Find important business information in a more organized workspace.</p>
              </article>
            </Reveal>
            <Reveal direction="up" delay={100}>
              <article className="bp-principle">
                <span className="bp-principle-icon"><BarChart3 size={22} /></span>
                <h3>Understand the bigger picture.</h3>
                <p>Review activity and reports instead of relying on memory alone.</p>
              </article>
            </Reveal>
            <Reveal direction="up" delay={200}>
              <article className="bp-principle">
                <span className="bp-principle-icon"><ShieldCheck size={22} /></span>
                <h3>Keep people in control.</h3>
                <p>Use information and assistance to support thoughtful decisions.</p>
              </article>
            </Reveal>
          </div>
        </section>

        <section className="bp-section bp-recommend-section" id="bizpilot-bp-recommendations">
          <div className="bp-container">
            <Reveal direction="up"><div className="bp-center-heading"><span className="bp-kicker">HELP FOR YOUR NEXT MOVE</span><h2 className="bp-section-heading">Recommendations you can actually understand.</h2><p className="bp-section-description">BizPilot can help turn business records into clear things to check next. Suggestions should explain the reason behind them—not just give you a number.</p></div></Reveal>
            <div className="bp-recommend-grid">
              <article className="bp-recommend-card"><span className="bp-recommend-icon"><Boxes size={22} /></span><span className="bp-recommend-label">STOCK</span><h3>“This product may run out soon.”</h3><p>See which recorded items are running low and review them before placing an order.</p></article>
              <article className="bp-recommend-card"><span className="bp-recommend-icon"><Wallet size={22} /></span><span className="bp-recommend-label">CASH FLOW</span><h3>“Check the money due this week.”</h3><p>Review recorded payments, bills, and expected money so you can plan ahead.</p></article>
              <article className="bp-recommend-card"><span className="bp-recommend-icon"><TrendingUp size={22} /></span><span className="bp-recommend-label">SALES</span><h3>“Sales changed compared with last week.”</h3><p>Compare the records and investigate what may have caused the change.</p></article>
            </div>
            <p className="bp-recommend-disclaimer">Examples only. Recommendations depend on the quality and detail of your records; always review them before taking action.</p>
          </div>
        </section>

        <section className="bp-section bp-faq-section" id="bizpilot-bp-faq">
          <div className="bp-container bp-faq-layout">
            <Reveal direction="left"><div className="bp-faq-intro"><span className="bp-kicker">GOOD QUESTIONS, CLEAR ANSWERS</span><h2 className="bp-section-heading">Questions business owners may ask.</h2><p className="bp-section-description">New to business software or AI? Here are straightforward answers to help you understand the idea behind BizPilot.</p><div className="bp-faq-help"><CircleHelp size={22} /><span><strong>Still unsure?</strong><small>Open the workspace or create an account to explore what is available.</small></span></div></div></Reveal>
            <div className="bp-faq-list">
              {[
                { q: "Do I need to start a new business to use BizPilot?", a: "No. The idea is to help people who already run a business start with records they have, subject to the import options available in their workspace." },
                { q: "What records can I start with?", a: "Possible starting points include CSV files, Excel spreadsheets, pasted rows or notes, chat messages, and PDF documents. Not every source or format is guaranteed to be supported yet." },
                { q: "What do the six AI agents do?", a: "The Sales Agent reviews sales, Inventory Agent looks at stock, Reorder Agent flags items to review, Pricing Agent compares prices and costs, Cash Flow Agent summarizes money in and out, and Business Diagnosis Agent helps investigate changes." },
                { q: "Will BizPilot automatically buy stock or change my prices?", a: "The agents are presented as assistants for understanding records and preparing suggestions. Do not assume they can place orders, move money, or change prices unless that action is explicitly available and approved in the product." },
                { q: "Can I trust every recommendation?", a: "Treat recommendations as a starting point, not a guarantee. Check the source records, confirm important figures, and use your own judgment before making business decisions." },
                { q: "Is the dashboard showing my real business figures?", a: "The landing-page dashboard uses sample data to demonstrate the layout. It is not your real business data." },
                { q: "Do I need to be good with technology?", a: "The goal is to make the information easier to understand in everyday language. You should not need to understand complicated charts or technical terms to explore the basic ideas." },
                { q: "Are all these features available right now?", a: "The page describes the intended experience. File imports, integrations, and agent actions depend on what is implemented and enabled in your current BizPilot version." },
              ].map((item, index) => <details className="bp-faq-item" key={item.q} open={index === 0}><summary><span>{item.q}</span><ChevronDown size={18} /></summary><p>{item.a}</p></details>)}
            </div>
          </div>
        </section>

        <Reveal direction="up">
          <section className="bp-closing" id="bizpilot-bp-vision">
            <div className="bp-closing-content">
              <span className="bp-kicker">YOUR BUSINESS IS STILL UNFOLDING</span>
              <h2>
                Make room for
                <br />
                <span>better decisions.</span>
              </h2>
              <p>
                Whatever you are building, give yourself a clearer view of the work behind it. Explore BizPilot and see how it fits your business journey.
              </p>
              <button type="button" className="bp-button" onClick={onSignup}>
                Explore BizPilot <ArrowRight size={17} />
              </button>
              <small className="bp-closing-note">
                This preview uses sample business data. Features depend on the connected services and functionality enabled.
              </small>
            </div>
          </section>
        </Reveal>
      </main>

      <footer className="bp-footer bp-footer-expanded">
        <div className="bp-footer-main">
          <div className="bp-footer-brand-column"><Brand onClick={closeMenu} /><p className="bp-footer-tagline">A clearer way to understand the business you are building.</p><p className="bp-footer-small">Bring your records together. Understand what is happening. Decide what to check next.</p><button type="button" className="bp-button bp-button-primary" onClick={onSignup}>Get started <ArrowUpRight size={15} /></button></div>
          <div className="bp-footer-column"><h3>Explore BizPilot</h3><a href="#bizpilot-bp-features">Business workspace</a><a href="#bizpilot-bp-import-records">Start with existing records</a><a href="#bizpilot-bp-recommendations">Recommendations</a><a href="#bizpilot-bp-how">How it works</a><a href="#bizpilot-bp-businesses">Who it helps</a></div>
          <div className="bp-footer-column"><h3>AI business agents</h3><a href="#bizpilot-bp-agents">Sales Agent</a><a href="#bizpilot-bp-agents">Inventory Agent</a><a href="#bizpilot-bp-agents">Reorder Agent</a><a href="#bizpilot-bp-agents">Pricing Agent</a><a href="#bizpilot-bp-agents">Cash Flow Agent</a><a href="#bizpilot-bp-agents">Business Diagnosis Agent</a></div>
          <div className="bp-footer-column"><h3>Learn & account</h3><a href="#bizpilot-bp-faq">Frequently asked questions</a><a href="#bizpilot-bp-video-story">See the story</a><button type="button" onClick={onLogin}>Log in</button><button type="button" onClick={onSignup}>Create an account</button><button type="button" onClick={onPreview}>Explore the workspace</button></div>
        </div>
        <div className="bp-footer-how"><div><span className="bp-footer-step">01</span><strong>Bring your records</strong><p>Start with the files and information you already have, where supported.</p></div><div><span className="bp-footer-step">02</span><strong>Understand your business</strong><p>Review sales, stock, prices, and money records in clearer language.</p></div><div><span className="bp-footer-step">03</span><strong>Review the next step</strong><p>Explore suggestions, check the details, and make the final decision yourself.</p></div></div>
        <div className="bp-footer-bottom"><p className="bp-copyright">© {new Date().getFullYear()} BizPilot. Built for clearer business decisions.</p><p>Demo figures are illustrative. Features depend on the current product version and enabled integrations.</p><a href="#bizpilot-bp-top">Back to top ↑</a></div>
      </footer>
    </div>
  );
}
