export type ServicePlanet = {
  id: string;
  name: string;
  eyebrow: string;
  title: string;
  description: string;
  subservices: string[];
  caseStudy: string;
  orbitRadius: number;
  orbitSpeed: number;
  phase: number;
  size: number;
  inclination: number;
  colors: [string, string, string];
};

export const pirxeyServices: ServicePlanet[] = [
  {
    id: "frontend",
    name: "Front-end & Mobile",
    eyebrow: "Interface Orbit",
    title: "Captivating web and mobile interfaces",
    description:
      "Pirxey designs and builds sharp product interfaces that feel premium, responsive and production ready on every device.",
    subservices: [
      "React product interfaces",
      "Mobile app front ends",
      "Design system implementation",
      "Performance and accessibility refinement"
    ],
    caseStudy: "Inspired by projects for Circle K, Founderspath and SaaS teams that need polished customer-facing products.",
    orbitRadius: 22,
    orbitSpeed: 0.055,
    phase: 0.2,
    size: 1.85,
    inclination: -0.08,
    colors: ["#f5f2c8", "#d74721", "#24212f"]
  },
  {
    id: "backend",
    name: "Back-end",
    eyebrow: "Core Systems",
    title: "Scalable APIs and secure server-side products",
    description:
      "The engineering backbone for digital products: databases, APIs, integrations and business logic designed to stay reliable under load.",
    subservices: [
      "API architecture",
      "Database design",
      "Integration layers",
      "Security and reliability hardening"
    ],
    caseStudy: "A fit for fintech, MedTech, SaaS and enterprise platforms where stability matters as much as speed.",
    orbitRadius: 31,
    orbitSpeed: 0.036,
    phase: 1.6,
    size: 2.35,
    inclination: 0.11,
    colors: ["#6fb5c8", "#f9f9ea", "#090813"]
  },
  {
    id: "ai-native",
    name: "AI-Native",
    eyebrow: "Autonomous Build Lane",
    title: "Senior engineering amplified by AI tooling",
    description:
      "Pirxey works with Claude Code, Codex and Copilot as standard delivery tools, turning complex ideas into cleaner software faster.",
    subservices: [
      "AI-assisted product builds",
      "Autonomous coding workflows",
      "Architecture and codebase acceleration",
      "MVP to production transition"
    ],
    caseStudy: "Best for teams that want the velocity of modern AI delivery without giving up senior engineering judgement.",
    orbitRadius: 39,
    orbitSpeed: 0.028,
    phase: 2.7,
    size: 2.05,
    inclination: -0.18,
    colors: ["#ffcf65", "#d74721", "#f9f9ea"]
  },
  {
    id: "crypto",
    name: "Blockchain",
    eyebrow: "Trust Layer",
    title: "Crypto and blockchain front-end development",
    description:
      "Secure blockchain-facing products, from user interfaces for decentralized apps to flows that make complex financial products usable.",
    subservices: [
      "DApp interfaces",
      "Wallet-aware product flows",
      "Token and fintech dashboards",
      "Blockchain UX for mainstream users"
    ],
    caseStudy: "Draws from crypto and fintech work including 21.co, orao.network, TriSigma and other web3 teams.",
    orbitRadius: 48,
    orbitSpeed: 0.023,
    phase: 4.0,
    size: 1.75,
    inclination: 0.2,
    colors: ["#d74721", "#6fb5c8", "#080612"]
  },
  {
    id: "cloud",
    name: "Cloud & DevOps",
    eyebrow: "Launch Infrastructure",
    title: "Cloud infrastructure that keeps products in orbit",
    description:
      "Cloud migration, CI/CD, infrastructure automation and operational practices that keep systems efficient, scalable and observable.",
    subservices: [
      "Cloud architecture",
      "CI/CD pipelines",
      "Infrastructure as code",
      "Monitoring and operational resilience"
    ],
    caseStudy: "Useful for product teams preparing for scale, regulated workloads and global customer bases.",
    orbitRadius: 58,
    orbitSpeed: 0.018,
    phase: 5.1,
    size: 2.55,
    inclination: -0.24,
    colors: ["#f9f9ea", "#5aa6bd", "#30364a"]
  },
  {
    id: "custom-ai",
    name: "Custom AI",
    eyebrow: "Applied Intelligence",
    title: "AI implementation shaped around your business",
    description:
      "Custom AI solutions for real workflows: automation, decision support, language interfaces and data-powered product features.",
    subservices: [
      "AI feature design",
      "Workflow automation",
      "LLM integration",
      "Machine learning and NLP implementation"
    ],
    caseStudy: "A pragmatic path for companies that want AI embedded into operations instead of a disconnected demo.",
    orbitRadius: 67,
    orbitSpeed: 0.014,
    phase: 0.9,
    size: 2.1,
    inclination: 0.16,
    colors: ["#a8e6f0", "#ffcf65", "#11101a"]
  },
  {
    id: "rapid-ai",
    name: "Rapid AI Prototype",
    eyebrow: "Fast Validation",
    title: "Working AI prototypes in weeks",
    description:
      "Pirxey helps define the core business value, build a real prototype quickly, test it with users and prepare the MVP for production.",
    subservices: [
      "Prototype scoping",
      "Fast product builds",
      "User validation loops",
      "Production readiness audit"
    ],
    caseStudy: "Built for founders and internal venture teams that need evidence before they commit to a full product track.",
    orbitRadius: 76,
    orbitSpeed: 0.011,
    phase: 3.2,
    size: 1.95,
    inclination: -0.12,
    colors: ["#f6a87f", "#f9f9ea", "#d74721"]
  }
];
