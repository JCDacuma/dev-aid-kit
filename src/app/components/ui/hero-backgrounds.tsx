"use client";

import { useEffect, useRef } from "react";

type ParticleT = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
};

function createParticle(x: number, y: number, color: string): ParticleT {
  const maxLife = 70 + Math.random() * 50;
  return {
    x,
    y,
    vx: (Math.random() - 0.5) * 2,
    vy: (Math.random() - 0.5) * 2,
    maxLife,
    life: maxLife,
    size: 1 + Math.random() * 1.8,
    color,
  };
}

export default function HeroBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let width = 0;
    let height = 0;
    let animationFrameId = 0;
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const particles: ParticleT[] = [];
    const ripple = {
      x: 0,
      y: 0,
      radius: 0,
      maxRadius: 340,
      speed: 13,
      active: false,
    };

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const toLocal = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const p = toLocal(clientX, clientY);
      mouse.targetX = p.x - width / 2;
      mouse.targetY = p.y - height / 2;
    };

    const handlePointerLeave = () => {
      mouse.targetX = 0;
      mouse.targetY = 0;
    };

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const p = toLocal(clientX, clientY);
      ripple.x = p.x;
      ripple.y = p.y;
      ripple.radius = 0;
      ripple.active = true;
      for (let i = 0; i < 24; i++) {
        particles.push(createParticle(p.x, p.y, "rgba(52, 211, 153, 0.85)"));
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    canvas.addEventListener("mousemove", handlePointerMove);
    canvas.addEventListener("touchmove", handlePointerMove, { passive: true });
    canvas.addEventListener("mouseleave", handlePointerLeave);
    canvas.addEventListener("mousedown", handlePointerDown);
    canvas.addEventListener("touchstart", handlePointerDown, { passive: true });

    let lastTime = performance.now();
    let time = 0;

    const noise = (x: number, t: number, o: number) =>
      (Math.sin(x * 0.0012 + t * 0.25 + o) +
        Math.cos(x * 0.0028 - t * 0.4 + o * 2)) /
      2;

    const layers = [
      {
        ribbonCount: 12,
        step: 5,
        offsetMod: 0,
        freqScale: 0.0035,
        ampScale: 46,
        speedScale: 1,
        primary: true,
      },
      {
        ribbonCount: 8,
        step: 7,
        offsetMod: 1.1,
        freqScale: 0.0075,
        ampScale: 24,
        speedScale: 0.65,
        primary: false,
      },
    ];

    const render = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      if (!reduceMotion) time += dt * 0.8;

      const lerp = 1 - Math.exp(-9 * dt);
      mouse.x += (mouse.targetX - mouse.x) * lerp;
      mouse.y += (mouse.targetY - mouse.y) * lerp;

      ctx.fillStyle = "#0a0b0d";
      ctx.fillRect(0, 0, width, height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.life -= 1;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      if (ripple.active && ripple.radius < ripple.maxRadius) {
        ripple.radius += ripple.speed;
      } else {
        ripple.active = false;
      }

      layers.forEach((layer) => {
        ctx.globalCompositeOperation = layer.primary
          ? "source-over"
          : "lighten";
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(
          0,
          `rgba(16, 185, 129, ${layer.primary ? 0.05 : 0.02})`,
        );
        gradient.addColorStop(
          0.5,
          `rgba(45, 212, 191, ${layer.primary ? 0.55 : 0.22})`,
        );
        gradient.addColorStop(
          1,
          `rgba(34, 211, 238, ${layer.primary ? 0.05 : 0.02})`,
        );

        for (let r = 0; r < layer.ribbonCount; r++) {
          const progress = r / layer.ribbonCount;
          const yOffset =
            height * 0.3 + r * (height * 0.05) + layer.offsetMod * 30;
          const baseAlpha = (1 - progress * 0.7) * 0.55;

          ctx.beginPath();
          for (let x = 0; x <= width + layer.step; x += layer.step) {
            const edge = Math.sin((x / width) * Math.PI);
            const nFreq = 1 + noise(x, time, progress) * 0.18;
            const wave1 =
              Math.sin(
                x * (layer.freqScale * nFreq) +
                  time * layer.speedScale +
                  r * 0.18,
              ) *
              (layer.ampScale * edge);
            const wave2 =
              Math.cos(x * 0.008 - time * 0.6 + r * 0.1) * (16 * edge);

            const cursorXWorld = width / 2 + mouse.x;
            const distX = Math.abs(x - cursorXWorld);
            const mouseRadius = layer.primary ? 320 : 200;
            const mouseFactor = Math.exp(-Math.pow(distX / mouseRadius, 2));
            const mouseDisplacement =
              Math.sin(x * 0.015 + time * 2.4) *
              (mouseFactor * (layer.primary ? 42 : 22) * edge);

            let rippleDisplacement = 0;
            if (ripple.active) {
              const rippleFactor = Math.exp(
                -Math.pow(Math.abs(distX - ripple.radius) / 30, 2),
              );
              rippleDisplacement = rippleFactor * 26 * (1 - progress);
            }

            const y =
              yOffset +
              wave1 +
              wave2 +
              mouseDisplacement +
              rippleDisplacement +
              mouse.y * (progress * 0.08);

            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.globalAlpha = baseAlpha;
          ctx.strokeStyle = gradient;
          ctx.lineWidth = (layer.primary ? 1.2 : 0.7) + (1 - progress) * 0.4;
          ctx.stroke();
        }
      });

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      ro.disconnect();
      canvas.removeEventListener("mousemove", handlePointerMove);
      canvas.removeEventListener("touchmove", handlePointerMove);
      canvas.removeEventListener("mouseleave", handlePointerLeave);
      canvas.removeEventListener("mousedown", handlePointerDown);
      canvas.removeEventListener("touchstart", handlePointerDown);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 h-full w-full">
      <canvas ref={canvasRef} className="block h-full w-full cursor-default" />
    </div>
  );
}
