import { Link } from "@tanstack/solid-router";
import { Github } from "lucide-solid";

export default function Header() {
  return (
    <header class="border-b border-[#262626] bg-[#0a0a0a]">
      <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" class="flex items-center gap-3 no-underline">
          <span
            class="text-[var(--text-primary)] text-xl font-bold tracking-tight"
            style="font-family: 'JetBrains Mono', monospace"
          >
            openboard
          </span>
        </Link>

        <nav class="flex items-center gap-6">
          <Link
            to="/onboard"
            class="text-[#a3a3a3] hover:text-[var(--text-primary)] transition-colors text-sm no-underline"
          >
            Get plugin
          </Link>
          <a
            href="https://github.com/simonxabris/openboard"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center gap-2 text-[#a3a3a3] hover:text-[var(--text-primary)] transition-colors text-sm no-underline"
          >
            <Github size={18} />
            <span>GitHub</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
