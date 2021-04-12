class Obstacle {
  constructor(x, y, scale_factor, base_radius = 10, seed = 0) {
    this._pos = new Vector(x, y);
    this._scale_factor = scale_factor;

    this._radius = base_radius * this._scale_factor * (0.9 + noise(x, y, seed) * 0.1);
    // somewhere in the grey range
    this._hue = noise(x, y, seed * 2) * 2;
    this._sat = noise(x, y, seed * 3) * 2;
    this._val = 80 + noise(x, y, seed * 4) * 5;
  }

  show(ctx) {
    // rounding for better canvas performances
    const px = parseInt(this._pos.x);
    const py = parseInt(this._pos.y);

    // draw boid
    ctx.save();
    ctx.translate(px, py);
    ctx.fillStyle = `hsla(${this._hue}, ${this._sat}%, ${this._val}%, 1)`;
    ctx.beginPath();
    ctx.arc(0, 0, this._radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  }

  get radius() {
    return this._radius;
  }

  set pos(p) {
    this._pos = p.copy();
  }

  get pos() {
    return this._pos.copy();
  }
}