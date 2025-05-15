export function playSuccessSound() {
  const audio = new Audio('https://www.youtube.com/watch?v=SbZ1g4Ow6yQ');
  audio.volume = 0.5;
  audio.play().catch(error => {
    console.warn('Failed to play sound:', error);
  });
}

export function triggerCelebration() {
  const confetti = require('canvas-confetti');
  
  // Create a festive burst of confetti
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    spread: 360,
    ticks: 50,
    gravity: 0,
    decay: 0.94,
    startVelocity: 30,
  };

  function fire(particleRatio: number, opts: any) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  });

  fire(0.2, {
    spread: 60,
  });

  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
  });

  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
  });

  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  });
}