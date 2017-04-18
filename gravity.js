// Polyfill window.requestAnimationFrame
(function() {
  var lastTime = 0;
  var vendors = ['webkit', 'moz'];
  for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
    window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
    window.cancelAnimationFrame =
      window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
  }

  if (!window.requestAnimationFrame)
    window.requestAnimationFrame = function(callback, element) {
      var currTime = new Date().getTime();
      var timeToCall = Math.max(0, 16 - (currTime - lastTime));
      var id = window.setTimeout(function() { callback(currTime + timeToCall); },
        timeToCall);
      lastTime = currTime + timeToCall;
      return id;
    };

  if (!window.cancelAnimationFrame)
    window.cancelAnimationFrame = function(id) {
      clearTimeout(id);
    };
}());

var go = function() {
  var Frame = function(origin) {
    _ = {"origin": origin || new Vector(0,0), "vecs": []};
    this.getOrigin = function(){ return _.origin; };
  };

  var Vector = function(x,y,frame) {
    this.x = x;
    this.y = y;
    var _ = {"frame": frame || Frame.default};
    this.getFrame = function() { return _.frame; };
    this.setFrame = function(_frame) { return _.frame = _frame; };
  };
  Vector.prototype = {
    "norm": function(x) {
      return Math.sqrt(Math.pow(this.x,2)+Math.pow(this.y,2));
    },
    "subtract": function(vec) {
      return new Vector(this.x - vec.x, this.y - vec.y);
    },
    "add": function(vec) {
      return new Vector(this.x + vec.x, this.y + vec.y);
    },
    "multiply": function(s) {
      return new Vector(this.x*s, this.y*s);
    },
    "dot": function(vec) {
      return this.x*vec.x + this.y*vec.y;
    }
  };

  Frame.default = new Frame(new Vector(0,0));

  var Particle = function(pos, vel, mass) {
    var _ = {"pos": pos, "vel": vel, "mass": mass};
    this.getPos = function() { return _.pos; };
    this.setPos = function(_pos) { return _.pos = _pos; };
    this.getVel = function() { return _.vel; };
    this.setVel = function(_vel) { return _.vel = _vel; };
    this.getMass = function() { return _.mass; };
    this.setMass = function(_mass) { return _.mass = _mass; };
  };
  Particle.prototype = {
    "kineticEnergy": function() {
      return this.getMass()*Math.pow(this.getVel().norm(),2)/2;
    }
  };

  // Convert real time to simulation time
  var rt2st = function(val) {
    return val/10;
  };

  var start_gravitation = function(particles, g, ddt, callback, rt2st) {
    var r = [], time = 0, substeps = 2, dt = ddt/substeps;
    for(var i in particles) {
      r.push([particles[i].getPos().subtract(particles[i].getVel().multiply(dt)), particles[i].getPos()]);
    }

    var step = function(calltime) {
      rtmp = [];
      for(var k = 0; k<substeps; k++) {
        for(var i in r) {
          var inter = new Vector(0,0);
          for(var j in r) {
            if(j !== i) {
              var d = r[j][1].subtract(r[i][1]);
              inter = inter.add(d.multiply(particles[j].getMass()/Math.pow(d.norm(),3)));
            }
          }

          particles[i].setVel(particles[i].getVel().add(inter.multiply(dt*g)));
          particles[i].setPos(r[i][0].add(particles[i].getVel().multiply(2*dt)));
          r[i][0] = r[i][1];
          rtmp.push(particles[i].getPos());
        }
        for(var i in r) {
          r[i][1] = rtmp[i];
        }
        time += dt;
      }

      window.requestAnimationFrame(step);

      callback(particles, time);
    };

    window.requestAnimationFrame(step);
  };

  // Utility-Functions
  var vectorFromTransform = function(el) {
    var style = window.getComputedStyle(el);
    var transform = style.getPropertyValue("-webkit-transform") ||
         style.getPropertyValue("-moz-transform") ||
         style.getPropertyValue("-ms-transform") ||
         style.getPropertyValue("-o-transform") ||
         style.getPropertyValue("transform");
    var values = transform.split('(')[1];
      values = values.split(')')[0];
      values = values.split(',');
    return new Vector(~~(values[4].trim()),~~(values[5].trim()));
  };
  var centerVector = function(el) {
    return vectorFromTransform(el).add(new Vector(el.offsetWidth/2,el.offsetHeight/2));
  };
  var move = function(el, pos) {
    var nPos = pos.subtract(new Vector(el.offsetWidth/2,el.offsetHeight/2));
    var style = "translate(" + nPos.x + "px," + nPos.y + "px)"

    el.style.webkitTransform = style;
    el.style.MozTransform = style;
    el.style.msTransform = style;
    el.style.oTransform = style;
    el.style.transform = style;
  };

  // Convert meter to pixel
  var m2p = function(val) {
    if(val instanceof Vector) return new Vector(m2p(val.x), m2p(val.y));
    return val/p2m(1);
  };
  // Convert pixel to meter
  // Adjust scale to adjust size of planets and distances between them
  var p2m = function(val) {
    var scale = 0.4e+9;
    if(val instanceof Vector) return new Vector(p2m(val.x), p2m(val.y));
    return val*scale;
  };

  // Start the Solar System
  var e_m = 5.976e+24,
    s_m = 1.99e+33,
    G = 6.67384e-11*Math.pow(m2p(1),3);
  var masses = {
    "sun": s_m,
    "mercury": 0.0553*e_m,
    "venus": 0.815*e_m,
    "earth": 1*e_m,
    "mars": 0.107*e_m
  };
  var velocity = {
    "mercury": new Vector(m2p(-2.508384486075530E+04), m2p(-4.426073835751376E+04)),
    "venus": new Vector(m2p(-4.152596928894345E+03), m2p(-3.495054371241744E+04)),
    "earth": new Vector(m2p(-1.535623836554226E+04), m2p(-2.591318921390343E+04)),
    "mars": new Vector(m2p(-4.717856742173361E+02), m2p(-2.211976465232791E+04))
  };
  var position = {
    "mercury": new Vector(m2p(-5.140116587747101E+10), m2p(1.665164056981867E+10)),
    "venus": new Vector(m2p(-1.067892284973810E+11), m2p(1.215551937725253E+10)),
    "earth": new Vector(m2p(-1.281351399378693E+11), m2p(7.380869039461541E+10)),
    "mars": new Vector(m2p(-2.471257822985050E+11), m2p(1.406522003838323E+10))
  };

  var solar_system = {
    "sun": document.getElementById("sun"),
    "mercury": document.getElementById("mercury"),
    "venus": document.getElementById("venus"),
    "earth": document.getElementById("earth"),
    "mars": document.getElementById("mars")
  };
  var solar_systemDOM = document.getElementById("solarsystem")
  var initSolarSystem = function() {
    var e_d = m2p(2*6378.1e+3);
    var resize = function(el, factor) { el.style.width = e_d*factor + "px"; el.style.height = e_d*factor + "px"; el.style.borderRadius = e_d*factor + "px"; };
    resize(solar_system.sun, 109);
    resize(solar_system.mercury, 0.3825);
    resize(solar_system.venus, 0.9488);
    resize(solar_system.earth, 1);
    resize(solar_system.mars, 0.53226);

    move(solar_system.sun, new Vector(solar_systemDOM.offsetWidth/2, solar_systemDOM.offsetHeight/2));
    move(solar_system.mercury, centerVector(solar_system.sun).subtract(position.mercury));
    move(solar_system.venus, centerVector(solar_system.sun).subtract(position.venus));
    move(solar_system.earth, centerVector(solar_system.sun).subtract(position.earth));
    move(solar_system.mars, centerVector(solar_system.sun).subtract(position.mars));
  };

  initSolarSystem();
  start_gravitation([
      new Particle(centerVector(solar_system.mercury), velocity.mercury, masses.mercury),
      new Particle(centerVector(solar_system.venus), velocity.venus, masses.venus),
      new Particle(centerVector(solar_system.earth), velocity.earth, masses.earth),
      new Particle(centerVector(solar_system.mars), velocity.mars, masses.mars),
      new Particle(centerVector(solar_system.sun), new Vector(0,0), masses.sun)
    ], G/1000, 10000,
    function(particles, time) {
      move(solar_system.mercury, particles[0].getPos());
      move(solar_system.venus, particles[1].getPos());
      move(solar_system.earth, particles[2].getPos());
      move(solar_system.mars, particles[3].getPos());
      move(solar_system.sun, particles[4].getPos());
      document.getElementById("time").innerHTML = (time/(24*3600) >> 0) + " Days";
    }
  );
};
window.onload=go;
