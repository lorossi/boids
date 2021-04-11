class Obstacle {
  constructor(x, y, scale_factor, base_radius = 10) {
    this._pos = new Vector(x, y);
    this._scale_factor = scale_factor;

    this._radius = base_radius * this._scale_factor;
    // somewhere in the grey range
    this._hue = random_int(0, 2);
    this._sat = random_int(0, 2);
    this._val = random_int(50, 55);
  }

  show(ctx) {
    // rounding for better canvas performances
    const px = parseInt(this._pos.x);
    const py = parseInt(this._pos.y);

    // draw boid
    ctx.save();
    ctx.translate(px, py);
    ctx.fillStyle = `hsla(${this._hue}, ${this._sat}%, ${this._val}%, 0.8)`;
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