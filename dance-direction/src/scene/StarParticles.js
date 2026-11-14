import { enamel, solid } from './geometry.js';

const palette = [0xffcb67, 0xf6a5d9, 0xb9a4ff, 0xffefab, 0x90dbd0];

export class StarParticles {
  constructor(parent, geometry, reducedMotion) {
    this.cursor = 0;
    this.reducedMotion = reducedMotion;
    const materials = palette.map((color) => enamel(color, 0.54));
    this.pool = Array.from({ length: 32 }, (_, index) => {
      const star = solid(parent, geometry, materials[index % materials.length]);
      star.visible = false;
      return { star, age: 0, life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, turn: 0, size: 0 };
    });
  }

  burst(center, big = false) {
    const count = this.reducedMotion ? 4 : big ? 19 : 12;
    for (let index = 0; index < count; index += 1) {
      const particle = this.pool[this.cursor];
      this.cursor = (this.cursor + 1) % this.pool.length;
      const direction = index % 2 === 0 ? -1 : 1;
      const spread = this.reducedMotion ? 0.23 : 0.86 + Math.random() * 0.36;
      particle.x = center.x + direction * (0.47 + Math.random() * 0.26);
      particle.y = 1.53 + Math.random() * 0.88;
      particle.z = 0.38 + Math.random() * 0.25;
      particle.age = 0;
      particle.life = 0.93 + Math.random() * 0.47;
      particle.vx = direction * (0.55 + Math.random() * 1.3) * spread;
      particle.vy = (0.88 + Math.random() * 1.8) * spread;
      particle.vz = (Math.random() - 0.3) * spread * 0.7;
      particle.turn = direction * (0.65 + Math.random() * 1.2);
      particle.size = (0.084 + Math.random() * 0.11) * (big ? 1.26 : 1);
      particle.star.visible = true;
      particle.star.scale.setScalar(particle.size);
      particle.star.position.set(particle.x, particle.y, particle.z);
    }
  }

  update(delta) {
    for (const particle of this.pool) {
      if (!particle.star.visible) continue;
      particle.age += delta;
      if (particle.age >= particle.life) {
        particle.star.visible = false;
        continue;
      }
      const gravity = this.reducedMotion ? 0.29 : 2.35;
      const time = particle.age;
      particle.star.position.set(
        particle.x + particle.vx * time,
        particle.y + particle.vy * time - gravity * time * time,
        particle.z + particle.vz * time,
      );
      particle.star.rotation.set(time * particle.turn * 0.46, time * particle.turn * 0.73, time * particle.turn);
      const fade = Math.min(1, (particle.life - time) / 0.37);
      particle.star.scale.setScalar(particle.size * fade);
    }
  }

  clear() {
    for (const { star } of this.pool) star.visible = false;
  }
}
