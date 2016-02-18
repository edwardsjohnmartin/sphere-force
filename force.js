"use strict";

// diameter
const D = 1;
// frustum height. Frustum width will be computed using the height
// and aspect ratio of the viewport. The frustum will be centered
// at the origin.
const frustumDim = D*6;

// Mesh models (circle, force arrows) are based on a circle radius
// of one. These must be scaled to match the diameter.
const mesh2Obj = D/2;
// Scale factor for the dipole field texture
const fieldTexCoord2Obj = D * 13.0;

var elapsedTime = 0;
var animate = false;

const red = vec4(1, 0, 0, 1);
const green = vec4(0, 1, 0, 1);
const blue = vec4(0, 0, 1, 1);
const cyan = vec4(0, 1, 1, 1);
const Bgrey = vec4(.5, .5, .5, 1);
const black = vec4(0, 0, 0, 1);

var canvas;
var canvasWidth, canvasHeight;
// Frustum width and height
var fw, fh;
var gl;

var axis;
var floor;
var arrow;
var segment;
var sphere;
var circle;
var forceArrow;
var torqueArrow;
var square;
var dipoles = new Array();

var lineProgram;
var circleProgram;
var flatProgram;
var sphereProgram;
var textureProgram;

var texture;

var aspect = 1.0;

var mvMatrix, pMatrix, nMatrix;

// Interaction
var mouseDown = false;
var mouseDownPos;
var mousePos;
var button = 0;
var rotVec = vec3(1, 0, 0);
var rotAngle = 0;
var rotMatrix = mat4(1.0);
var zoom = 1;
var downZoom = 1;
const LEFT_BUTTON = 0;
const RIGHT_BUTTON = 2;

// What to render
var showB = false;

var debugValues = new Object();
var showDebug = true;

// Stack stuff
var matrixStack = new Array();
function pushMatrix() {
  matrixStack.push(mat4(mvMatrix));
}
function popMatrix() {
  mvMatrix = matrixStack.pop();
}

var Dipole = function(p, m, fixed) {
  // position
  this.p = p;
  // moment
  this.m = m;
  // velocity
  this.v = vec3(0, 0, 0);
  // angular velocity
  this.av = 0;
  // force
  this.F = vec3(0, 0, 0);
  // torque
  this.T = vec3(0, 0, 0);
  this.F0 = this.F;
  this.T0 = this.T;
  
  this.fixed = fixed;
}

function renderAxis() {
  gl.useProgram(lineProgram.program);

  gl.enableVertexAttribArray(lineProgram.vertexLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, axis.vertexBuffer);
  gl.vertexAttribPointer(lineProgram.vertexLoc, 4, gl.FLOAT, false, 0, 0);

  gl.enableVertexAttribArray(lineProgram.colorLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, axis.colorBuffer);
  gl.vertexAttribPointer(lineProgram.colorLoc, 4, gl.FLOAT, false, 0, 0);

  gl.uniformMatrix4fv(lineProgram.mvMatrixLoc, false, flatten(mvMatrix));
  gl.uniformMatrix4fv(lineProgram.pMatrixLoc, false, flatten(pMatrix));

  gl.drawArrays(gl.LINES, 0, axis.numPoints);
};

function renderFloor() {
  gl.useProgram(lineProgram.program);

  gl.enableVertexAttribArray(lineProgram.vertexLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, floor.vertexBuffer);
  gl.vertexAttribPointer(lineProgram.vertexLoc, 4, gl.FLOAT, false, 0, 0);

  gl.enableVertexAttribArray(lineProgram.colorLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, floor.colorBuffer);
  gl.vertexAttribPointer(lineProgram.colorLoc, 4, gl.FLOAT, false, 0, 0);

  gl.uniformMatrix4fv(lineProgram.mvMatrixLoc, false, flatten(mvMatrix));
  gl.uniformMatrix4fv(lineProgram.pMatrixLoc, false, flatten(pMatrix));

  gl.drawArrays(gl.LINES, 0, floor.numPoints);
};

function renderArrow() {
  gl.useProgram(lineProgram.program);

  gl.enableVertexAttribArray(lineProgram.vertexLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, arrow.vertexBuffer);
  gl.vertexAttribPointer(lineProgram.vertexLoc, 4, gl.FLOAT, false, 0, 0);

  gl.enableVertexAttribArray(lineProgram.colorLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, arrow.colorBuffer);
  gl.vertexAttribPointer(lineProgram.colorLoc, 4, gl.FLOAT, false, 0, 0);

  gl.uniformMatrix4fv(lineProgram.mvMatrixLoc, false, flatten(mvMatrix));
  gl.uniformMatrix4fv(lineProgram.pMatrixLoc, false, flatten(pMatrix));

  gl.drawArrays(gl.LINES, 0, arrow.numPoints);
};

function renderSegment() {
  gl.useProgram(lineProgram.program);

  gl.enableVertexAttribArray(lineProgram.vertexLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, segment.vertexBuffer);
  gl.vertexAttribPointer(lineProgram.vertexLoc, 4, gl.FLOAT, false, 0, 0);

  gl.enableVertexAttribArray(lineProgram.colorLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, segment.colorBuffer);
  gl.vertexAttribPointer(lineProgram.colorLoc, 4, gl.FLOAT, false, 0, 0);

  gl.uniformMatrix4fv(lineProgram.mvMatrixLoc, false, flatten(mvMatrix));
  gl.uniformMatrix4fv(lineProgram.pMatrixLoc, false, flatten(pMatrix));

  gl.drawArrays(gl.LINES, 0, segment.numPoints);
};

function renderSphere() {
  gl.useProgram(sphereProgram.program);

  gl.enableVertexAttribArray(sphereProgram.vertexLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, sphere.vertexBuffer);
  gl.vertexAttribPointer(sphereProgram.vertexLoc, 4, gl.FLOAT, false, 0, 0);

  gl.enableVertexAttribArray(sphereProgram.normalLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, sphere.normalBuffer);
  gl.vertexAttribPointer(sphereProgram.normalLoc, 4, gl.FLOAT, false, 0, 0);

  gl.enableVertexAttribArray(sphereProgram.colorLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, sphere.colorBuffer);
  gl.vertexAttribPointer(sphereProgram.colorLoc, 4, gl.FLOAT, false, 0, 0);

  nMatrix = normalMatrix(mvMatrix, false);

  gl.uniformMatrix4fv(sphereProgram.mvMatrixLoc, false, flatten(mvMatrix));
  gl.uniformMatrix4fv(sphereProgram.pMatrixLoc, false, flatten(pMatrix));
  gl.uniformMatrix4fv(sphereProgram.nMatrixLoc, false, flatten(nMatrix));

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphere.indexBuffer);
  gl.drawElements(gl.TRIANGLES, sphere.numIndices, gl.UNSIGNED_SHORT, 0);
};

function renderCircle() {
  gl.useProgram(circleProgram.program);

  gl.enableVertexAttribArray(circleProgram.vertexLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, circle.vertexBuffer);
  gl.vertexAttribPointer(circleProgram.vertexLoc, 4, gl.FLOAT, false, 0, 0);

  nMatrix = normalMatrix(mvMatrix, false);

  gl.uniformMatrix4fv(circleProgram.mvMatrixLoc, false, flatten(mvMatrix));
  gl.uniformMatrix4fv(circleProgram.pMatrixLoc, false, flatten(pMatrix));
  gl.uniformMatrix4fv(circleProgram.nMatrixLoc, false, flatten(nMatrix));

  // Circle
  gl.uniform4fv(circleProgram.colorLoc, flatten(vec4(1.0, 1.0, 1.0, 1.0)));
  gl.drawArrays(gl.TRIANGLE_FAN, 0, circle.numCirclePoints);

  // Arrow base and triangle
  gl.uniform4fv(circleProgram.colorLoc, flatten(vec4(0.2, 0.2, 0.2, 1.0)));
  gl.drawArrays(gl.TRIANGLE_FAN,
                circle.numCirclePoints, 4);
  gl.drawArrays(gl.TRIANGLES, circle.numCirclePoints + 4, 3);
};

function renderForceArrow(dipole) {
  var f = dipole.F;
  const mag = 4 * Math.pow(length(f), 1/4);
  f = mult(normalize(f), mag);
  forceArrow.render(dipole.p, f, mesh2Obj, red, true);
};

function renderTorqueArrow(dipole) {
  var p = dipole.p;
  var t = dipole.T;

  if (length(t) == 0) {
    return;
  }

  gl.useProgram(flatProgram.program);

  gl.enableVertexAttribArray(flatProgram.vertexLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, torqueArrow.vertexBuffer);
  gl.vertexAttribPointer(flatProgram.vertexLoc, 4, gl.FLOAT, false, 0, 0);

  nMatrix = normalMatrix(mvMatrix, false);

  gl.uniformMatrix4fv(flatProgram.pMatrixLoc, false, flatten(pMatrix));
  gl.uniformMatrix4fv(flatProgram.nMatrixLoc, false, flatten(nMatrix));

  gl.uniform4fv(flatProgram.colorLoc, flatten(vec4(0.3, 0.3, 1.0, 1.0)));

  const mag = 0.5 * Math.pow(length(t), 1/3);
  const deg = Math.min(358, 360 * mag);

  pushMatrix();
  // get in position
  mvMatrix = mult(mvMatrix, translate(p[0], p[1], p[2]));
  // global scale
  const gs = mesh2Obj;
  mvMatrix = mult(mvMatrix, scalem(gs, gs, 1));
  // // rotation
  // mvMatrix = mult(mvMatrix, rotateZ(degrees(Math.atan2(f[1], f[0]))));
  // // translate outside of circle
  // mvMatrix = mult(mvMatrix, translate(1, 0, 0));

  if (t[2] < 0) {
    mvMatrix = mult(mvMatrix, scalem(1, -1, 1));
  }

  // pushMatrix();
  // (1 - aw) * f = (mag - aw)
  // f = (mag - aw)/(1 - aw)
  // const s = (mag - forceArrow.arrowWidth) / (1.0 - forceArrow.arrowWidth);
  // mvMatrix = mult(mvMatrix, scalem(s, 1, 1));
  gl.uniformMatrix4fv(flatProgram.mvMatrixLoc, false, flatten(mvMatrix));
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 1 + Math.floor(deg) * 2 + 6);
  // popMatrix();

  gl.bindBuffer(gl.ARRAY_BUFFER, forceArrow.vertexBuffer);
  gl.vertexAttribPointer(flatProgram.vertexLoc, 4, gl.FLOAT, false, 0, 0);
  mvMatrix = mult(mvMatrix, rotateZ(deg));
  mvMatrix = mult(mvMatrix, translate(torqueArrow.r, 0, 0));
  mvMatrix = mult(mvMatrix, rotateZ(90));
  gl.uniformMatrix4fv(flatProgram.mvMatrixLoc, false, flatten(mvMatrix));
  gl.drawArrays(gl.TRIANGLES, 4, 3);

  popMatrix();
};

function renderTexture() {
  gl.useProgram(textureProgram.program);

  gl.enableVertexAttribArray(textureProgram.vertexLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, square.vBuffer);
  gl.vertexAttribPointer(textureProgram.vertexLoc, 4, gl.FLOAT, false, 0, 0);

  gl.enableVertexAttribArray(textureProgram.colorLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, square.cBuffer);
  gl.vertexAttribPointer(textureProgram.colorLoc, 4, gl.FLOAT, false, 0, 0);

  gl.enableVertexAttribArray(textureProgram.texCoordLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, square.tBuffer);
  gl.vertexAttribPointer(textureProgram.texCoordLoc, 2, gl.FLOAT, false, 0, 0);

  gl.uniformMatrix4fv(textureProgram.mvMatrixLoc, false, flatten(mvMatrix));
  gl.uniformMatrix4fv(textureProgram.pMatrixLoc, false, flatten(pMatrix));

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, square.numVertices);
};

// Permeability of free space in a vacuum
const MU0 = 4 * Math.PI * Math.pow(10, -7);

// Computes the magnetic field at position r.
// m points south to north
// dipole is sphere
// n spheres of diameter d. For each sphere, specify m orientation.
// Torque on dipole will twist m.
function B(m, r) {
  var mag = length(r);
  if (mag == 0) {
    return 0;
  }
  const c = MU0 / (4 * Math.PI);
  const mr = mult(r, vec3c(3 * dot(m, r) / Math.pow(mag, 5)));
  const mm = mult(m, vec3c(1.0 / Math.pow(mag, 3)));
  return mult(subtract(mr, mm), vec3c(c));
}

function BSum(r) {
  var sum = 0;
  for (var i = 0; i < dipoles.length; ++i) {
    var v = B(dipoles[i].m, subtract(r, dipoles[i].p));
    if (v != 0) {
      if (sum == 0) {
        sum = v;
      } else {
        sum = add(sum, v);
      }
    }
  }
  return sum;
}

// Force of dipole m_i on dipole m_j.
// Equation 8 of the paper.
// function F(i, j) {
function F(di, dj) {
  // const Rij = subtract(dipoles[j].p, dipoles[i].p);
  const Rij = subtract(dj.p, di.p);
  const Rij_mag = length(Rij);
  // const mi = dipoles[i].m;
  // const mj = dipoles[j].m;
  const mi = di.m;
  const mj = dj.m;

  const c = 1 / (2 * Math.pow(Rij_mag, 5));
  const n1 = mult(vec3c(dot(mi, Rij)), mj);
  const n2 = mult(vec3c(dot(mj, Rij)), mi);
  const n3 = mult(vec3c(dot(mi, mj)), Rij);
  const n4 = mult(vec3c(5 * dot(mi, Rij) * dot(mj, Rij) / Math.pow(Rij_mag, 2)),
                  Rij);
  return mult(vec3c(c), add(n1, add(n2, subtract(n3, n4))));
}

// Torque of dipole m_i on dipole m_j.
// Equation 10 of the paper.
function T(i, j) {
  // const Rij = mult(subtract(dipoles[j].p, dipoles[i].p), D);
  const Rij = subtract(dipoles[j].p, dipoles[i].p);
  const Rij_mag = length(Rij);
  const mi = dipoles[i].m;
  const mj = dipoles[j].m;

  const c = 1;
  const cn1 = dot(mi, Rij) / (2 * Math.pow(Rij_mag, 5));
  const n1 = mult(cross(mj, Rij), cn1);
  const n2 = mult(cross(mj, mi), 1/(6 * Math.pow(Rij_mag, 3)));
  return mult(vec3c(c), subtract(n1, n2));
}

function updateForces(updateInitial) {
  for (var j = 0; j < dipoles.length; ++j) {
    dipoles[j].F = vec3(0, 0, 0);
    dipoles[j].T = vec3(0, 0, 0);
    for (var i = 0; i < dipoles.length; ++i) {
      if (i != j) {
        // dipoles[j].F = add(dipoles[j].F, F(i, j));
        dipoles[j].F = add(dipoles[j].F,
                           F(dipoles[i], dipoles[j]));
        dipoles[j].T = add(dipoles[j].T, T(i, j));
      }
    }
    if (updateInitial) {
      dipoles[j].F0 = dipoles[j].F;
      dipoles[j].T0 = dipoles[j].T;
      dipoles[j].fixed = false;
      dipoles[j].v = vec3(0, 0, 0);
      dipoles[j].av = 0;
      animate = false;
    }
  }

  updateDebug(dipoles[1]);
}

function euler(v, a, dt) {
  return add(v, mult(a, dt));
}

// Computes the velocity of a free dipole at position p
function f(dipole, p, dt) {
  var newDipole = new Dipole(p, dipole.m, false);
  var a = F(dipoles[0], newDipole);
  return add(dipole.v, mult(a, dt));
}

// Computes the acceleration of a free dipole at position p with moment m
function a(p, v, dt) {
  const m = dipoles[1].m;
  var dipole = new Dipole(p, m, false);
  return F(dipoles[0], dipole);
}

function rk4(x, v, dt, m) {
  // Returns final (position, velocity) tuple after
  // time dt has passed.

  // x: initial position (number-like object)
  // v: initial velocity (number-like object)
  // a: acceleration function a(x,v,dt) (must be callable)
  // dt: timestep (number)
  var x1 = x;
  var v1 = v;
  var a1 = a(x1, v1, 0);

  var x2 = add(x, mult(v1, 0.5*dt));
  var v2 = add(v, mult(a1, 0.5*dt));
  var a2 = a(x2, v2, dt/2.0);

  var x3 = add(x, mult(v2, 0.5*dt));
  var v3 = add(v, mult(a2, 0.5*dt));
  var a3 = a(x3, v3, dt/2.0);

  var x4 = add(x, mult(v3, dt));
  var v4 = add(v, mult(a3, dt));
  var a4 = a(x4, v4, dt);

  // var xf = x + (dt/6.0)*(v1 + 2*v2 + 2*v3 + v4);
  // var vf = v + (dt/6.0)*(a1 + 2*a2 + 2*a3 + a4);
  var xf =
    add(x, mult(dt/6.0, add(v1, add(mult(2, v2), add(mult(2, v3), v4)))));
  var vf =
    add(v, mult(dt/6.0, add(a1, add(mult(2, a2), add(mult(2, a3), a4)))));

  var ret = new Object();
  ret.p = xf;
  ret.v = vf;
  return ret;
}

// TODO: take angular force into account
function RK4(h) {
  var dipole = dipoles[1];
  var yn = dipole.p;
  var k1 = f(dipole, yn, 0);
  var k2 = f(dipole, add(yn, mult(k1, h/2)), h/2);
  var k3 = f(dipole, add(yn, mult(k2, h/2)), h/2);
  var k4 = f(dipole, add(yn, mult(k3, h)), h);
  return add(yn, mult(h/6, add(k1, add(mult(2, k2), add(mult(2, k3), k4)))));
}

// Assumes forces are up-to-date.
function updatePositions() {
  var simSpeed = document.getElementById("simSpeed").value;

  // mass
  // const M = 1;
  // var F0 = dipoles[1].F0;
  // var T = Math.sqrt(M * D / length(F0));
  // timestep
  var dt = simSpeed * 1/10000;
  debugValues.time_step = dt.toFixed(4);
  elapsedTime += dt;

  //----------------------------------------
  // torque
  //----------------------------------------

  {
    var a = length(mult(dipoles[1].T, 10));
    if (dipoles[1].T[2] < 0) {
      a = -a;
    }
    const omega = dipoles[1].av + a * dt;
    const m = dipoles[1].m;
    var theta = Math.atan2(m[1], m[0]) + omega * dt;
    dipoles[1].m = vec3(Math.cos(theta), Math.sin(theta));
    dipoles[1].av = omega;
  }

  //----------------------------------------
  // force
  //----------------------------------------

  if (!dipoles[1].fixed) {
    var a = dipoles[1].F;
    // var v = euler(dipoles[1].v, a, dt);
    // // displacement vector
    // var dx = mult(v, dt);

    // var newp = RK4(dt);
    // // displacement vector
    // var dx = subtract(newp, dipoles[1].p);
    // var v = mult(dx, 1/dt);

    var rk = rk4(dipoles[1].p, dipoles[1].v, dt, dipoles[1].m);
    var dx = subtract(rk.p, dipoles[1].p);
    var v = rk.v;

    dipoles[1].v = v;
    
    // Find the distance a from the center of the fixed dipole
    // to the displacement line.
    //
    //         u  ____ c0
    //       ____/
    //   c1 /_________ c1+dx
    //           w

    var c0 = dipoles[0].p;
    var c1 = dipoles[1].p;
    var u = subtract(c0, c1);
    var w = dx;

    var dist;
    var shadow = dot(u, w)/length(w);
    if (shadow > length(w)) {
      dist = length(subtract(c0, add(c1, dx)));
    } else if (shadow < 0) {
      dist = length(subtract(c0, c1));
    } else {
      dist = length(cross(u, w)) / length(dx);
    }

    if (dist < D) {
      // Change dx such that dipole runs into other dipole.
      var x0 = c0[0];
      var y0 = c0[1];
      var x1 = c1[0];
      var y1 = c1[1];
      var xw = w[0];
      var yw = w[1];
      // a, b and c for quadratic equation
      var qa = xw*xw + yw*yw;
      var qb = 2 * (x1*xw-x0*xw) + 2 * (y1*yw-y0*yw);
      var qc = x1*x1-2*x1*x0+x0*x0 + y1*y1-2*y1*y0+y0*y0 - D*D;
      var qt0 = (-qb + Math.sqrt(qb*qb - 4*qa*qc)) / (2 * qa);
      var qt1 = (-qb - Math.sqrt(qb*qb - 4*qa*qc)) / (2 * qa);
      var qt = Math.min(qt0, qt1);
      dipoles[1].p = add(dipoles[1].p, mult(w, qt));
      dipoles[1].fixed = true;
      dipoles[1].v = vec3(0, 0, 0);
      debugValues.v_at_collision = length(v).toFixed(5);
    } else {
      dipoles[1].p = add(dipoles[1].p, dx);
    }
  }

  updateDebug(dipoles[1]);
}

function updateDebug(dipole) {
  debugValues.F = dipole.F.map(function(n) { return n.toFixed(2) });
  debugValues.F_mag = length(dipole.F).toFixed(2);
  // debugValues.T = dipole.T.map(function(n) { return n.toFixed(2) });
  debugValues.T_mag = length(dipole.T).toFixed(2);

  debugValues.v = dipole.v.map(function(n) { return n.toFixed(2) });
  debugValues.w = dipole.av.toFixed(2);
  debugValues.m = degrees(Math.atan2(dipole.m[1], dipole.m[0])).toFixed(2);
  debugValues.elapsedTime = elapsedTime.toFixed(2);
}

function tick() {
  if (!dipoles[1].fixed && animate) {
    requestAnimFrame(tick);
    var animSpeed = document.getElementById("animSpeed").value;
    for (var i = 0; !dipoles[1].fixed && i < animSpeed; ++i) {
      updatePositions();
    }
    updateForces();
    render();
  }
}

function renderCircles() {
  pushMatrix();
  const s = mesh2Obj;
  for (var i = 0; i < dipoles.length; i++) { 
    pushMatrix();
    mvMatrix = mult(mvMatrix, translate(dipoles[i].p));
    var phi = Math.acos(dot(vec3(1, 0, 0), dipoles[i].m));
    if (phi != 0) {
      var axis = cross(vec3(1, 0, 0), dipoles[i].m);
      mvMatrix = mult(mvMatrix, rotate(degrees(phi), axis));
    }
    mvMatrix = mult(mvMatrix, scalem(s, s, 1));
    renderCircle();
    popMatrix();
  }
  popMatrix();
}

function renderSpheres() {
  pushMatrix();
  const s = mesh2Obj;
  for (var i = 0; i < dipoles.length; i++) { 
    pushMatrix();
    mvMatrix = mult(mvMatrix, translate(dipoles[i].p));
    var phi = Math.acos(dot(vec3(1, 0, 0), dipoles[i].m));
    if (phi != 0) {
      var axis = cross(vec3(1, 0, 0), dipoles[i].m);
      mvMatrix = mult(mvMatrix, rotate(degrees(phi), axis));
    }
    mvMatrix = mult(mvMatrix, scalem(s, s, s));
    renderSphere();
    popMatrix();
  }
  popMatrix();
}

function renderMagneticField(origin) {
  // Render magnetic field
  pushMatrix();
  const sf = 0.05;
  const inc = 0.08;
  const ystart = -1.0;// + (inc*100 % origin[1]*100)/100;
  const xstart = -1.0;
  const yend = 1.0;
  const xend = 1.0;
  for (var y = ystart; y < yend; y += inc) {
    for (var x = xstart; x < xend; x += inc) {
      var p = vec3(x, y, 0);
      // var v = B(dipoles[0].m, p);
      // var v = BSum(p);
      var v = B(dipoles[0].m, subtract(p, dipoles[0].p));
      if (v != 0) {
        pushMatrix();
        mvMatrix = mult(mvMatrix, translate(p));
        var vnorm = normalize(v);
        var phi = Math.acos(dot(vec3(1, 0, 0), vnorm));
        if (phi != 0) {
          var axis = cross(vec3(1, 0, 0), vnorm);
          mvMatrix = mult(mvMatrix, rotate(degrees(phi), axis));
        }
        mvMatrix = mult(mvMatrix, scalem(sf, sf, sf));
        renderArrow();
        popMatrix();
      }
    }
  }
  popMatrix();
}

function render() {
  resize(canvas);
  aspect = canvas.width/canvas.height;

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const at = vec3(0.0, 0.0, 0.0);
  var up = vec3(0.0, 1.0, 0.0);
  var eye = vec3(0, 0, 1);

  if (canvas.width > canvas.height) {
    fh = frustumDim;
    fw = (fh*canvas.width)/canvas.height;
  } else {
    fw = frustumDim;
    fh = (fw*canvas.height)/canvas.width;
  }
  pMatrix = ortho(0-fw/2, fw/2, 0-fh/2, fh/2, 0, 2);

  mvMatrix = lookAt(eye, at , up);  
  if (rotAngle != 0) {
    mvMatrix = mult(mvMatrix, rotate(rotAngle*180.0/Math.PI, rotVec));
  }
  mvMatrix = mult(mvMatrix, rotMatrix);

  pushMatrix();
  mvMatrix = mult(mvMatrix, scalem(fieldTexCoord2Obj, fieldTexCoord2Obj, 1));
  renderTexture();
  popMatrix();

  gl.disable(gl.DEPTH_TEST);

  renderCircles();
  if (showB) {
    renderMagneticField(dipoles[1].p);
  }

  var dipole = dipoles[1];

  // render velocity arrow
  forceArrow.render(dipole.p, mult(dipole.v, 5),
                    mesh2Obj/2, green, false);
  // render Rij
  // const Rij = subtract(dipole.p, dipoles[0].p);
  // forceArrow.render(dipoles[0].p, Rij,
  //                   1, black, false);

  // render B at dipole
  const B1 = B(dipoles[0].m, dipole.p);
  forceArrow.render(
    dipole.p, mult(normalize(B1), 4*mesh2Obj), 1/5, Bgrey, false);

  renderForceArrow(dipole);
  renderTorqueArrow(dipole);

  var debug = document.getElementById("debug");
  debug.innerHTML = "";
  if (showDebug) {
    var first = true;
    for (var property in debugValues) {
      if (debugValues.hasOwnProperty(property)) {
        if (first) {
          debug.innerHTML += property + ": " + debugValues[property];
        } else {
          debug.innerHTML += "<br>" + property + ": " + debugValues[property];
        }
        first = false;
      }
    }
  }
}

function doAnimation() {
  if (!animate) {
    animate = true;
    tick();
  }
}

function keyDown(e) {
  switch (e.keyCode) {
  case 37:
    // left arrow
    break;
  case 38:
    // up arrow
    break;
  case 39:
    // right arrow
    break;
  case 40:
    // down arrow
    break;
  case " ".charCodeAt(0):
    animate = !animate;
    if (animate) {
      tick();
    }
    break;
  case "N".charCodeAt(0):
    updatePositions();
    updateForces(false);
    render();
    break;
  case "D".charCodeAt(0):
    showDebug = !showDebug;
    render();
    break;
  case "R".charCodeAt(0):
    reset();
    updateForces(true);
    render();
    break;
  case "M".charCodeAt(0):
    showB = !showB;
    render();
    break;
  // default:
  //   console.log("Unrecognized key press: " + e.keyCode);
  //   break;
  }

  // requestAnimFrame(render);
}

//------------------------------------------------------------
// Mouse handlers
//------------------------------------------------------------
function onMouseClick(e) {
  var p = win2obj(vec2(e.clientX, e.clientY));
  if (length(subtract(p, mouseDownPos)) < 0.01) {
    // addPoint(p);
    if (e.shiftKey) {
      rotatePoint(p, 1);
    } else {
      movePoint(p, 1);
    }
  }
}

var zooming;
function onMouseDown(e) {
  mouseDown = true;
  mouseDownPos = win2obj(vec2(e.clientX, e.clientY));
  button = e.button;
  // if (button == RIGHT_BUTTON) {
  // zooming = false;
  // if (e.shiftKey) {
  //   zooming = true;
  //   downZoom = zoom;
  // }
  if (e.shiftKey) {
    rotatePoint(mouseDownPos, 1);
  } else {
    movePoint(mouseDownPos, 1);
  }
}

function onMouseUp() {
  if (mouseDown) {
    mouseDown = false;
    // if (button == LEFT_BUTTON) {
    if (!zooming) {
      rotMatrix = mult(rotate(rotAngle*180.0/Math.PI, rotVec), rotMatrix);
      rotAngle = 0;
    }
  }
}

function onMouseMove(e) {
  mousePos = win2obj(vec2(e.clientX, e.clientY));

  if (mouseDown && mouseDownPos != mousePos) {
    if (e.shiftKey) {
      rotatePoint(mousePos, 1);
    } else {
      movePoint(mousePos, 1);
    }

    // arcball
    // if (!zooming) {
    //   const down_v = mapMouse(mouseDownPos);
    //   const v = mapMouse(mousePos);
    //   rotVec = normalize(cross(down_v, v));
    //   rotAngle = Math.acos(dot(down_v, v) / length(v));
    // } else {
    //   const factor = 2;
    //   zoom = downZoom * Math.pow(factor, mousePos[1] - mouseDownPos[1]);
    // }
    // render();
  }
}

function mapMouse(p) {
  var x = p[0];
  var y = p[1];
  if (x*x + y*y > 1) {
    const len = Math.sqrt(x*x + y*y);
    x = x/len;
    y = y/len;
  }
  const z = Math.sqrt(Math.max(0.0, 1 - x*x - y*y));
  return vec3(x, y, z);
}

function win2obj(p) {
  var x = fw * p[0] / canvasWidth;
  var y = fh * (canvasHeight-p[1]) / canvasHeight;
  x = x - fw/2;
  y = y - fh/2;
  // var x = 2 * p[0] / canvasWidth - 1;
  // var y = 2 * (canvasHeight-p[1]) / canvasHeight - 1;
  // x = Math.max(Math.min(x, 1.0), -1.0);
  // y = Math.max(Math.min(y, 1.0), -1.0);
  return vec2(x, y);
}

function rotatePoint(mousePos, i) {
  var p = vec3(mousePos[0], mousePos[1], 0.0);
  dipoles[i].m = normalize(subtract(p, dipoles[i].p));
  updateForces(true);
  render();
}

function movePoint(p, i) {
  var m = dipoles[i].m;
  dipoles[i].p = vec3(p[0], p[1], 0);
  dipoles[i].m = m;
  elapsedTime = 0;
  updateForces(true);
  render();
}

function addPoint(p) {
  dipoles.push(vec3(p[0], p[1], 0));
  dipoles[dipoles.length-1].m = normalize(vec3(1, 0, 0));
  updateForces(true);
  render();
}

function resize(canvas) {
  // Lookup the size the browser is displaying the canvas.
  var displayWidth  = canvas.clientWidth;
  var displayHeight = canvas.clientHeight;
 
  // Check if the canvas is not the same size.
  if (canvas.width  != displayWidth ||
      canvas.height != displayHeight) {
 
    // Make the canvas the same size
    canvas.width  = displayWidth;
    canvas.height = displayHeight;
  }

  canvasWidth = canvas.width;
  canvasHeight = canvas.height;
  gl.viewport(0, 0, canvas.width, canvas.height);
}

function configureTexture(image) {
  texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB,
                gl.RGB, gl.UNSIGNED_BYTE, image);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,
                   gl.NEAREST_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

  gl.uniform1i(gl.getUniformLocation(textureProgram.program, "texture"), 0);
}

function reset() {
  dipoles = [];
  dipoles.push(new Dipole(vec3(0, 0, 0), vec3(1, 0, 0), true));

  const x = Number(document.getElementById("x").value);
  const y = Number(document.getElementById("y").value);
  const p = vec3(x*D, y*D, 0);
  const theta = radians(document.getElementById("degrees").value);
  const m = vec3(Math.cos(theta), Math.sin(theta), 0);
  dipoles.push(new Dipole(p, m, false));

  elapsedTime = 0;
}

function resetClicked() {
  reset();
  updateForces(true);
  render();
}

window.onload = function init() {
  canvas = document.getElementById("gl-canvas");

  document.onkeydown = keyDown;
  // document.onclick = onMouseClick;
  // document.onmousedown = onMouseDown;
  // document.onmouseup = onMouseUp;
  // document.onmousemove = onMouseMove;
  // canvas.onkeydown = keyDown;
  canvas.onclick = onMouseClick;
  canvas.onmousedown = onMouseDown;
  canvas.onmouseup = onMouseUp;
  canvas.onmousemove = onMouseMove;

  canvasWidth = canvas.width;
  canvasHeight = canvas.height;

  gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) { alert("WebGL isn't available"); }

  gl.viewport(0, 0, canvas.width, canvas.height);

  gl.clearColor(1.0, 1.0, 1.0, 1.0);

  gl.enable(gl.DEPTH_TEST);

  //  Load shaders and initialize attribute buffers
  lineProgram = new LineProgram();
  circleProgram = new CircleProgram();
  flatProgram = new FlatProgram();
  sphereProgram = new SphereProgram();
  textureProgram = new TextureProgram();

  var image = document.getElementById("dipoleFieldImage");
  configureTexture(image);

  axis = new Axis();
  floor = new Floor();
  arrow = new Arrow();
  segment = new Segment();
  sphere = new Sphere(1, 200, 200);
  square = new Square();
  circle = new Circle();
  forceArrow = new ForceArrow();
  torqueArrow = new TorqueArrow();

  reset();
  updateForces(true);
  render();
}
