class Boid {
  constructor(width, height) {
    this._width = width;
    this._height = height;
    this._border = 0.1 * this._width;
    this._hue = 0;
    this._dHue = random(0, 40);

    this._pos = new Vector(random(this._border, this._width - this._border), random(this._border, this._height - this._border));
    this._vel = new Vector.random2D();
    this._acc = new Vector.random2D();
    this._force = new Vector();
    this._gravity_center = null;
    this._show_trail = true;
    this._dynamic_factors = false;

    // parameters
    this._max_vel = 2;
    this._max_acc = 20;
    this._max_force = 2;
    this._trail_length = 100;
    this._view_range = 50;

    // rule 1
    this._base_separation = 0.2;
    this._separation_factor = 0;
    // rule 2
    this._base_alignment = 0.9;
    this._alignment_factor = 0;
    // rule 3
    this._base_cohesion = 1;
    this._cohesion_factor = 0;
    // gravity
    this._base_gravity = 0.3;
    this._gravity_factor = 0;
    // border / obstacle avoidance
    this._avoidance_factor = 3;

    // rendering
    this._triangle_side = parseInt(random_interval(8, 2));
    this._triangle_height = parseInt(this._triangle_side * 1.5);
    this._trail = [];
  }

  move(boids, frames, seed) {
    // some time variance

    if (this._dynamic_factors) {
      this._separation_factor = this._base_separation * (1 + 0.25 * Math.sin(frames / (60 * 10) + seed));
      this._alignment_factor = this._base_alignment * (1 + 0.25 * Math.sin(frames / (60 * 10) + Math.PI * seed));
      this._cohesion_factor = this._base_cohesion * (1 + 0.25 * Math.sin(frames / (60 * 10) + 3 * Math.PI * seed));
      this._hue = 360 * (1 + Math.sin(frames / (60 * 30) + 5 * Math.PI * seed)) / 2;
    } else {
      this._separation_factor = this._base_separation;
      this._alignment_factor = this._base_alignment;
      this._cohesion_factor = this._base_cohesion;
      this._gravity_factor = this._base_gravity;
    }

    // all close boids excluding this one
    let others;
    others = boids.filter(b => b.pos.sub(this._pos.copy()).mag() < this._view_range && b != this);

    // rule 1 - separate from other boids
    let a1;
    a1 = this._separation(others);

    // rule 2 - align to other boids
    let a2;
    a2 = this._alignment(others);

    // rule 3 - cohesion (go to mass center)
    let a3;
    a3 = this._cohesion(others);

    // now add gravity
    let a4;
    a4 = this._gravity();

    // check and avoid obstacles
    let a5;
    a5 = this._avoid_border();

    // movement
    this._force = new Vector().add(a1).add(a2).add(a3).add(a4);
    this._force.limit(this._max_force);
    this._acc.add(this._force).add(a5);
    this._acc.limit(this._max_acc);
    this._vel.add(this._acc);
    this._vel.limit(this._max_vel);
    this._pos.add(this._vel);

    // trail generation
    // rounding for better canvas performances
    this._trail.push(
      {
        x: parseInt(this._pos.x),
        y: parseInt(this._pos.y),
      }
    );
    if (this._trail.length > this._trail_length) this._trail.shift();
  }

  // separation rule
  _separation(boids) {
    // skip separation if _gravity_center is defined
    if (this._gravity_center) {
      return new Vector(0, 0);
    }

    let steer;
    steer = new Vector();

    boids.forEach(b => {
      let dist;
      dist = this._pos.copy().sub(b.pos);
      // square root because the range is less than 1
      dist.mult(this._separation_factor / ((dist.mag() / this._view_range) ** (1 / 2)));
      steer.add(dist);
    });

    return steer;
  }

  // alignment rule
  _alignment(boids) {
    let steer;
    steer = new Vector();

    if (boids.length > 0) {
      boids.forEach(b => {
        steer.add(b.acc);
      });
      steer.divide_scalar(boids.length);
      steer.mult(this._alignment_factor);
    }

    return steer;
  }

  // cohesion rule
  _cohesion(boids) {
    let steer;
    steer = new Vector();

    if (boids.length > 0) {
      let center;
      center = new Vector();
      boids.forEach(b => {
        center.add(b.pos);
      });
      center.divide_scalar(boids.length);

      steer = center.sub(this._pos);
      steer.mult(this._cohesion_factor);
    }

    return steer;
  }

  // apply gravity
  _gravity() {
    // but only if the vector is defined
    if (this._gravity_center) {
      let steer;
      steer = this._gravity_center.copy().sub(this._pos);
      steer.mult(this._gravity_factor / (steer.mag() / this._view_range) ** (1 / 2));
      return steer;
    }

    return new Vector(0, 0);
  }

  // avoid obstacles
  _avoid_border() {
    let steer;
    steer = new Vector(0, 0);

    if (this._can_see_border(this._pos)) {
      let heading = this._vel.heading2D();
      for (let i = 0; i < Math.PI; i += Math.PI / 25) {
        for (let j = 0; j < 2; j++) {
          let phi = i * (j == 0 ? -1 : 1) + heading;
          let dpos = new Vector.fromAngle2D(phi).setMag(this._view_range).add(this._pos);
          if (!this._can_see_border(dpos)) {
            steer = new Vector.fromAngle2D(phi).setMag(this._avoidance_factor);
            return steer;
          }
        }
      }
    }

    return steer;
  }

  _can_see_border(vector) {
    return vector.x < this._view_range || vector.x > this._width - this._view_range || vector.y < this._view_range || vector.y > this._height - this._view_range;
  }

  _is_inside(vector) {
    return vector.x > 0 && vector.x < this._width && vector.y > 0 && vector.y < this._height;
  }

  show(ctx) {
    // boid position
    // rounding for better canvas performances
    let px, py;
    px = parseInt(this._pos.x);
    py = parseInt(this._pos.y);

    let hue;
    hue = (this._hue + this._dHue) % 360;

    // draw trail
    if (this._show_trail) {
      ctx.save();
      ctx.strokeStyle = `hsla(${hue}, 100%, 75%, 0.2)`;
      ctx.strokeWidth = 2;
      ctx.moveTo(px, py);
      ctx.beginPath();
      this._trail.forEach(t => {
        if (!t.x || !t.y) {
          ctx.stroke();
          ctx.beginPath();
        } else {
          ctx.lineTo(t.x, t.y);
        }
      });
      ctx.stroke();
      ctx.restore();
    }

    // draw boid
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(this._vel.heading2D());
    ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.6)`;
    ctx.strokeStyle = `hsla(${hue}, 100%, 50%, 0.9)`;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -this._triangle_side / 2);
    ctx.lineTo(this._triangle_height, 0);
    ctx.lineTo(0, this._triangle_side / 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  // getters
  get pos() {
    return this._pos.copy();
  }

  get vel() {
    return this._vel.copy();
  }

  get acc() {
    return this._acc.copy();
  }

  get gravity() {
    return this._gravity_center.copy();
  }

  set gravity(g) {
    if (g === null) {
      this._gravity_center = null;
    } else {
      this._gravity_center = g.copy();
    }
  }

  get show_trail() {
    return this._show_trail;
  }

  set show_trail(s) {
    this._show_trail = s;
  }

  get factors() {
    return {
      separation: this._separation_factor.toFixed(2),
      alignment: this._alignment_factor.toFixed(2),
      cohesion: this._cohesion_factor.toFixed(2),
      hue: this._hue.toFixed(0),
    };
  }

  set factors(f) {
    this._base_separation = f.separation;
    this._base_alignment = f.alignment;
    this._base_cohesion = f.cohesion;
    this._hue = f.hue;
  }

  get dynamic() {
    return this._dynamic_factors;
  }

  set dynamic(d) {
    this._dynamic_factors = d;
  }
}