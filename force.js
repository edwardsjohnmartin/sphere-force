"use strict";

// diameter
const D = 1;
const radius = D/2;
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

var updateP = true;
var updateM = true;

const red = vec4(1, 0, 0, 1);
const green = vec4(0, 1, 0, 1);
const blue = vec4(0, 0, 1, 1);
const cyan = vec4(0, 1, 1, 1);
const yellow = vec4(1.0, 1.0, 0.0, 1.0);
const Bgrey = vec4(.5, .5, .5, 1);
const black = vec4(0, 0, 0, 1);
// const white = vec4(0.8, 0.8, 0.8, 1);

const Fcolor = red;
const FnetColor = vec4(1.0, 0.6, 0.6, 1.0);
const Tcolor = red;
const TnetColor = vec4(0.6, 0.6, 1.0, 1.0);
const vcolor = green;
const wcolor = green;

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
var sin2;
var forceArrow;
var bArrow;
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

var simSpeed;
var fFriction, tFriction;
var collisionType;
const ELASTIC = 0;
const INELASTIC = 1;
var fEddy, tEddy;

// What to render
var showB = false;
var showCircles = true;

var showDebug = true;
var debugValues = new Object();
var DebugLabel = function(name, label) {
  this.name = name;
  this.label = label;
}

var debugLabels = [];
debugLabels.push(new DebugLabel("v_at_collision", "v<sub>coll</sub>"));
debugLabels.push(new DebugLabel("t_at_collision", "t<sub>coll</sub>"));
debugLabels.push(new DebugLabel("time_at_zero_crossing", "t<sub>zero</sub>"));
debugLabels.push(new DebugLabel("w_at_zero_crossing", "&omega;<sub>zero</sub>"));

debugLabels.push(new DebugLabel("t_eddy_mag", "|&tau;<sub>eddy</sub>|"));
debugLabels.push(new DebugLabel("f_eddy_mag", "|F<sub>eddy</sub>|"));
debugLabels.push(new DebugLabel("U", "U"));
debugLabels.push(new DebugLabel("T", "T"));
debugLabels.push(new DebugLabel("R", "R"));
debugLabels.push(new DebugLabel("E", "E"));
debugLabels.push(new DebugLabel("w", "&omega;"));
debugLabels.push(new DebugLabel("v_mag", "|v|"));
debugLabels.push(new DebugLabel("m", "m (&deg;)"));
debugLabels.push(new DebugLabel("B_mag", "|B|"));
debugLabels.push(new DebugLabel("T", "|&tau;|"));
debugLabels.push(new DebugLabel("T_net", "|&tau;<sub>net</sub>|"))
debugLabels.push(new DebugLabel("F", "F"));
debugLabels.push(new DebugLabel("F_mag", "|F|"));
debugLabels.push(new DebugLabel("F_mag_net", "|F<sub>net</sub>|"));
debugLabels.push(new DebugLabel("elapsed_time", "t"));
//debugLabels.push(new DebugLabel("time_step", "&Delta;t"));

var labeled = new Set();
for (var i = 0; i < debugLabels.length; ++i) {
  const label = debugLabels[i];
  labeled.add(label.name);
}

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
  if (!lineProgram.initialized) return;
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
  if (!lineProgram.initialized) return false;
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

  return true;
};

function renderArrow() {
  if (!lineProgram.initialized) return false;
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

  return true;
};

function renderSegment() {
  if (!lineProgram.initialized) return false;
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

  return true;
};

function renderSphere() {
  if (!sphereProgram.initialized) return false;
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

  return true;
};

function renderCircle() {
  if (!circleProgram.initialized) return;
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

  return true;
};

function renderForceArrow(dipole, f, color, thin) {
  const mag = 4 * Math.pow(length(f), 1/4);
  f = mult(normalize(f), mag);
  return forceArrow.render(dipole.p, f, mesh2Obj, color, true, thin);
};

function renderTorqueArrow(dipole, t, color, thin) {
  if (!flatProgram.initialized) return false;

  var p = dipole.p;

  if (length(t) == 0) {
    return true;
  }

  gl.useProgram(flatProgram.program);

  gl.enableVertexAttribArray(flatProgram.vertexLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, torqueArrow.vertexBuffer);
  gl.vertexAttribPointer(flatProgram.vertexLoc, 4, gl.FLOAT, false, 0, 0);

  nMatrix = normalMatrix(mvMatrix, false);

  gl.uniformMatrix4fv(flatProgram.pMatrixLoc, false, flatten(pMatrix));

  gl.uniform4fv(flatProgram.colorLoc, flatten(color));

  const mag = 0.5 * Math.pow(length(t), 1/3);
  const deg = Math.min(358, 360 * mag);

  pushMatrix();
  // get in position
  mvMatrix = mult(mvMatrix, translate(p[0], p[1], p[2]));
  // global scale
  const gs = mesh2Obj;
  mvMatrix = mult(mvMatrix, scalem(gs, gs, 1));

  if (t[2] < 0) {
    mvMatrix = mult(mvMatrix, scalem(1, -1, 1));
  }

  gl.uniformMatrix4fv(flatProgram.mvMatrixLoc, false, flatten(mvMatrix));
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 1 + Math.floor(deg) * 2 + 6);

  gl.bindBuffer(gl.ARRAY_BUFFER, forceArrow.vertexBuffer);
  gl.vertexAttribPointer(flatProgram.vertexLoc, 4, gl.FLOAT, false, 0, 0);
  mvMatrix = mult(mvMatrix, rotateZ(deg));
  mvMatrix = mult(mvMatrix, translate(torqueArrow.r, 0, 0));
  mvMatrix = mult(mvMatrix, rotateZ(90));
  gl.uniformMatrix4fv(flatProgram.mvMatrixLoc, false, flatten(mvMatrix));
  gl.drawArrays(gl.TRIANGLES, 4, 3);

  popMatrix();

  return true;
};

// Angular velocity - w
function renderAVArrow(dipole, w, color) {
  if (!flatProgram.initialized) return false;

  var p = dipole.p;

  if (w == 0) {
    return true;
  }

  gl.useProgram(flatProgram.program);

  gl.enableVertexAttribArray(flatProgram.vertexLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, torqueArrow.vertexBuffer);
  gl.vertexAttribPointer(flatProgram.vertexLoc, 4, gl.FLOAT, false, 0, 0);

  nMatrix = normalMatrix(mvMatrix, false);

  gl.uniformMatrix4fv(flatProgram.pMatrixLoc, false, flatten(pMatrix));

  gl.uniform4fv(flatProgram.colorLoc, flatten(color));

  const mag = 0.5 * Math.abs(w);
  const deg = Math.min(358, 360 * mag);

  pushMatrix();
  // get in position
  mvMatrix = mult(mvMatrix, translate(p[0], p[1], p[2]));
  // global scale
  const gs = mesh2Obj * 0.5;
  mvMatrix = mult(mvMatrix, scalem(gs, gs, 1));

  if (w < 0) {
    mvMatrix = mult(mvMatrix, scalem(1, -1, 1));
  }

  gl.uniformMatrix4fv(flatProgram.mvMatrixLoc, false, flatten(mvMatrix));
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 1 + Math.floor(deg) * 2 + 6);

  gl.bindBuffer(gl.ARRAY_BUFFER, forceArrow.vertexBuffer);
  gl.vertexAttribPointer(flatProgram.vertexLoc, 4, gl.FLOAT, false, 0, 0);
  mvMatrix = mult(mvMatrix, rotateZ(deg));
  mvMatrix = mult(mvMatrix, translate(torqueArrow.r, 0, 0));
  mvMatrix = mult(mvMatrix, rotateZ(90));
  gl.uniformMatrix4fv(flatProgram.mvMatrixLoc, false, flatten(mvMatrix));
  gl.drawArrays(gl.TRIANGLES, 4, 3);

  popMatrix();

  return true;
};

function renderB() {
  if (!flatProgram.initialized) return false;
  //--------------------------------
  // Render the magnetic field lines
  //--------------------------------
  gl.useProgram(flatProgram.program);

  gl.enableVertexAttribArray(flatProgram.vertexLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, sin2.vertexBuffer);
  gl.vertexAttribPointer(flatProgram.vertexLoc, 4, gl.FLOAT, false, 0, 0);

  // How many diameter units from origin to top of viewport?
  const k = fh/2;
  const i = Math.log(k) / Math.log(2);
  // console.log("fh = " + fh);
  // console.log("k = " + k);
  const inc = 1.5;
  var exp = 1.5;
  const start = 0.7;
  const end = 1024 * zoom;

  // s is the distance from the center in factors of D.
  var myinc = inc;
  // for (var s = start; s <= end; s *= inc) {
  for (var s = start; s <= end; s *= myinc) {
    myinc *= 1.2;
  // for (var s = start; s <= end; s = Math.pow(s+1, 1.5)) {
    pushMatrix();
    mvMatrix = mult(mvMatrix, scalem(s*2, s*2, 1));
    gl.uniformMatrix4fv(flatProgram.pMatrixLoc, false, flatten(pMatrix));
    gl.uniformMatrix4fv(flatProgram.mvMatrixLoc, false, flatten(mvMatrix));

    gl.uniform4fv(flatProgram.colorLoc, flatten(Bgrey));

    gl.drawArrays(gl.LINE_STRIP, 0, sin2.size);
    popMatrix();
  }

  // //--------------------------------
  // // Render the direction arrows
  // //--------------------------------
  gl.useProgram(flatProgram.program);

  gl.enableVertexAttribArray(flatProgram.vertexLoc);
  // gl.bindBuffer(gl.ARRAY_BUFFER, forceArrow.vertexBuffer);
  gl.bindBuffer(gl.ARRAY_BUFFER, bArrow.vertexBuffer);
  gl.vertexAttribPointer(flatProgram.vertexLoc, 4, gl.FLOAT, false, 0, 0);

  gl.uniformMatrix4fv(flatProgram.pMatrixLoc, false, flatten(pMatrix));
  gl.uniform4fv(flatProgram.colorLoc, flatten(Bgrey));

  // const gs = 0.2 * zoom;
  const gs = 0.3 * zoom;

  // s is the distance from the center in factors of D.
  var count = 0;
  // for (var s = start; s <= end; s *= inc) {
  // for (var s = start; s <= end; s = Math.pow(s+1, 1.5)) {
  myinc = inc;
  for (var s = start; s <= end; s *= myinc) {
    myinc *= 1.2;
    if (s > k) {
      // The angle at which the field line intersects y=k.
      // The intersection point is s*sin^3(theta)
      var ytheta = Math.asin(Math.pow(k/s, 1/3));
      // The angle at which the field line intersects y=k/2
      var ytheta2 = Math.asin(Math.pow(k/(2*s), 1/3));
      // var theta = ytheta2;
      // var theta = ytheta;
      var theta = ytheta / 1.4;

      var curx = s*Math.sin(ytheta)*Math.sin(ytheta)*Math.cos(ytheta);
      if (curx > fw/2) {
          // The angle at which the field line intersects x=fw/2
          // The equation for this is cos^3(theta) - cos(theta) = -fw/s
          // which doesn't appear to have a solution using acos. So solve
          // using a binary search. Start the search at ytheta.
          var curTheta = ytheta;
          var dTheta = ytheta;
          // const x = fw/4;
          const x = fw/2;
          while (Math.abs(curx-x) > 0.01) {
            dTheta /= 2;
            if (curx > x) {
              curTheta -= dTheta;
            } else {
              curTheta += dTheta;
            }
            curx = s*Math.sin(curTheta)*Math.sin(curTheta)*Math.cos(curTheta);
          }
          theta = curTheta;
          var cury = s*Math.sin(theta)*Math.sin(theta)*Math.sin(theta);
          // The angle at which the field line intersects y=cury/2
          theta = Math.asin(Math.pow(cury/(2*s), 1/3));
      }
      // theta /= 1.4;
      // theta *= theta;
      // theta = Math.pow(theta, 1.5);

      for (var d = -1; d <= 1; d += 2) {
        for (var j = 0; j < 2; ++j) {
          var phi = theta;
          if (j == 0) {
            phi = Math.PI - phi;
          }
          phi *= d;
          var r = s * Math.pow(Math.sin(phi), 2);
          var p = vec3(r*Math.cos(phi), r*Math.sin(phi), 0);
          renderBArrow(p, gs);
        }
      }
    } else {
      count++;
      renderBArrow(vec3(0, s, 0), gs);
      renderBArrow(vec3(0, -s, 0), gs);
    }
  }

  return true;
};

function renderBArrow(p, gs) {
  if (!flatProgram.initialized) return false;

  var v = B(dipoles[0].m, p);

  pushMatrix();
  // get in position
  mvMatrix = mult(mvMatrix, translate(p[0], p[1], p[2]));
  // rotation
  mvMatrix = mult(mvMatrix, rotateZ(degrees(Math.atan2(v[1], v[0]))));
  // global scale
  // mvMatrix = mult(mvMatrix, scalem(gs, gs/1.4, 1));
  mvMatrix = mult(mvMatrix, scalem(gs, gs/2.8, 1));
  // move triangle to origin
  mvMatrix = mult(mvMatrix,
                  translate(Math.max(-forceArrow.arrowWidth/2), 0, 0));

  gl.uniformMatrix4fv(flatProgram.mvMatrixLoc, false, flatten(mvMatrix));

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  popMatrix();

  return true;
}

function renderTexture() {
  if (!textureProgram.initialized) return false;

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

  return true;
};

function updateForces(updateInitial) {
  for (var j = 0; j < dipoles.length; ++j) {
    dipoles[j].F = vec3(0, 0, 0);
    dipoles[j].T = vec3(0, 0, 0);
    for (var i = 0; i < dipoles.length; ++i) {
      if (i != j) {
        // dipoles[j].F = add(dipoles[j].F, F(i, j));
        dipoles[j].F = add(dipoles[j].F,
                           F(dipoles[i], dipoles[j], true));
        dipoles[j].T = add(dipoles[j].T,
                           T(dipoles[i], dipoles[j], true));
        // dipoles[j].T = dipoles[j].T + T(dipoles[i], dipoles[j]);
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

// // Computes the velocity of a free dipole at position p
// function f(dipole, p, dt) {
//   var newDipole = new Dipole(p, dipole.m, false);
//   var a = F(dipoles[0], newDipole);
//   return add(dipole.v, mult(a, dt));
// }

// Computes the acceleration of a free dipole at position p with moment m
function a(p, v, theta, dt) {
  // const m = dipoles[1].m;
  const m = vec3(Math.cos(theta), Math.sin(theta), 0);
  var dipole = new Dipole(p, m, false);
  dipole.v = v;
  return F(dipoles[0], dipole, true);
}

// Angular acceleration from the torque
function alpha(p, v, theta, alphaValue, dt) {
  const m = vec3(Math.cos(theta), Math.sin(theta), 0);
  var dipole = new Dipole(p, m, false);
  dipole.av = alphaValue;
  var t = mult(T(dipoles[0], dipole, true), 10);
  var ret = length(t) * ((t[2] < 0) ? -1 : 1);
  return ret;
}

function rk4(x, v, theta, omega, dt, m) {
  // Returns final (position, velocity) tuple after
  // time dt has passed.

  // x: initial position (number-like object)
  // v: initial velocity (number-like object)
  // a: acceleration
  // theta: initial moment
  // omega: initial angular velocity
  // alpha: angular acceleration
  // dt: timestep (number)
  var x1 = x;
  var v1 = v;
  var theta1 = theta;
  var omega1 = omega;
  var a1 = a(x1, v1, theta1, 0);
  var alpha1 = alpha(x1, v1, theta1, omega1, 0);

  var x2 = add(x, mult(v1, 0.5*dt));
  var v2 = add(v, mult(a1, 0.5*dt));
  var theta2 = theta + omega1 * 0.5*dt;
  var omega2 = omega + alpha1 * 0.5*dt;
  var a2 = a(x2, v2, theta2, dt/2.0);
  var alpha2 = alpha(x2, v2, theta2, omega2, dt/2.0);

  var x3 = add(x, mult(v2, 0.5*dt));
  var v3 = add(v, mult(a2, 0.5*dt));
  var theta3 = theta + omega2 * 0.5*dt;
  var omega3 = omega + alpha2 * 0.5*dt;
  var a3 = a(x3, v3, theta3, dt/2.0);
  var alpha3 = alpha(x3, v3, theta3, omega3, dt/2.0);

  var x4 = add(x, mult(v3, dt));
  var v4 = add(v, mult(a3, dt));
  var theta4 = theta + omega3 * dt;
  var omega4 = omega + alpha3 * dt;
  var a4 = a(x4, v4, theta4, dt);
  var alpha4 = alpha(x4, v4, theta4, omega4, dt);

  var xf =
    add(x, mult(dt/6.0, add(v1, add(mult(2, v2), add(mult(2, v3), v4)))));
  var vf =
    add(v, mult(dt/6.0, add(a1, add(mult(2, a2), add(mult(2, a3), a4)))));
  var thetaf = theta + (dt/6.0) * (omega1 + 2*omega2 + 2*omega3 + omega4);
  var omegaf = omega + (dt/6.0) * (alpha1 + 2*alpha2 + 2*alpha3 + alpha4);

  var ret = new Object();
  ret.p = xf;
  ret.v = vf;
  ret.theta = thetaf;
  ret.omega = omegaf;
  return ret;
}

// Given a sphere c1 and translation dx, and given that c1 is not
// intersecting c0, return the t parameter at which c1 will intersect c0.
function computeIntersection(c0, c1, dx) {
  // Change dx such that dipole runs into other dipole.
  var x0 = c0[0];
  var y0 = c0[1];
  var x1 = c1[0];
  var y1 = c1[1];
  var xw = dx[0];
  var yw = dx[1];
  // a, b and c for quadratic equation
  var qa = xw*xw + yw*yw;
  var qb = 2 * (x1*xw-x0*xw) + 2 * (y1*yw-y0*yw);
  var qc = x1*x1-2*x1*x0+x0*x0 + y1*y1-2*y1*y0+y0*y0 - D*D;
  var qt0 = (-qb + Math.sqrt(qb*qb - 4*qa*qc)) / (2 * qa);
  var qt1 = (-qb - Math.sqrt(qb*qb - 4*qa*qc)) / (2 * qa);
  var qt = Math.min(qt0, qt1);
  if (qt < 0) {
    qt = Math.max(qt0, qt1);
  }
  return qt;
}

// Assumes forces are up-to-date.
function updatePositions() {
  var dt = simSpeed * 1/10000;
  elapsedTime += dt;

  // 4th order runge-kutta
  var rk = rk4(dipoles[1].p, dipoles[1].v,
               Math.atan2(dipoles[1].m[1], dipoles[1].m[0]), dipoles[1].av,
               dt, dipoles[1].m);

  //----------------------------------------
  // torque
  //----------------------------------------

  if (updateM) {
    const oldTheta = Math.atan2(dipoles[1].m[1], dipoles[1].m[0]);
    const newTheta = rk.theta;
    dipoles[1].m = vec3(Math.cos(rk.theta), Math.sin(rk.theta));
    dipoles[1].av = rk.omega;

    if ((oldTheta < 0 && newTheta > 0) ||
        (oldTheta > 0 && newTheta < 0)) {
      debugValues.w_at_zero_crossing = dipoles[1].av.toFixed(4);
      debugValues.time_at_zero_crossing = elapsedTime.toFixed(4);
    }
  }

  //----------------------------------------
  // force
  //----------------------------------------

  if (updateP && !dipoles[1].fixed) {
    const R01 = subtract(dipoles[1].p, dipoles[0].p);
    const R10 = subtract(dipoles[0].p, dipoles[1].p);
    const touching = Math.abs(length(R01) - D) < 0.00000001;

    const dx = subtract(rk.p, dipoles[1].p);
    const v = rk.v;

    // dipoles[1].v = v;
    
    var newp, newv;

    if (!touching || dot(rk.v, mult(R01, -1)) < 0) {
      // We're not touching or we're traveling away from the fixed dipole

      // Find the distance a from the center of the fixed dipole
      // to the displacement line.
      //
      //       R10  ____ c0
      //       ____/
      //   c1 /_________ c1+dx
      //           dx

      var c0 = dipoles[0].p;
      var c1 = dipoles[1].p;

      var dist;
      var shadow = dot(R10, dx)/length(dx);
      if (shadow > length(dx)) {
        // Check how far from fixed dipole we'll be after traveling
        dist = length(subtract(c0, add(c1, dx)));
      } else if (shadow < 0) {
        // Traveling away from fixed dipole
        // dist = length(subtract(c0, c1));
        dist = length(subtract(c0, add(c1, dx)));
      } else {
        // Find closest approach
        dist = length(cross(R10, dx)) / length(dx);
      }

      if (dist < D) {
        const qt = computeIntersection(c0, c1, dx);
        // dipoles[1].p = add(dipoles[1].p, mult(dx, qt));
        newp = add(dipoles[1].p, mult(dx, qt));
        if (collisionType == ELASTIC) {
          // specular reflection
          var normal = normalize(R01);
          var l = normalize(mult(dipoles[1].v, -1));
          var refln = 2 * dot(l, normal);
          refln = mult(refln, normal);
          refln = normalize(subtract(refln, l));
          // dipoles[1].v = mult(refln, length(dipoles[1].v));
          newv = mult(refln, length(dipoles[1].v));
        } else {
          // dipoles[1].v = vec3(0, 0, 0);
          newv = vec3(0, 0, 0);
        }
        debugValues.v_at_collision = length(v).toFixed(5);
        debugValues.t_at_collision = elapsedTime.toFixed(5);
      } else {
        // dipoles[1].p = add(dipoles[1].p, dx);
        newp = add(dipoles[1].p, dx);
        newv = rk.v;
      }
    } else {
      // touching
      var tangent = normalize(cross(R01, vec3(0, 0, 1)));
      newv = mult(tangent, dot(v, tangent));
      // dipoles[1].v = v;
      // newv = v;
      var newp2 = add(dipoles[1].p, mult(newv, dt));
      var u = mult(normalize(subtract(newp2, dipoles[0].p)), D);
      // dipoles[1].p = add(dipoles[0].p, u);
      newp = add(dipoles[0].p, u);
    }

    dipoles[1].p = newp;
    dipoles[1].v = newv;
  }

  updateDebug(dipoles[1]);
}

function vecString(v, fixed) {
  return v.map(function(n) { return n.toFixed(fixed) });
}

function updateDebug(dipole) {
  // Potential energy
  const U_ = -dot(dipole.m, B(dipoles[0].m, dipole.p));
  // Translational kinetic energy
  const T_ = Math.pow(length(dipole.v), 2) / 2;
  // Rotational kinetic energy
  const R_ = (dipole.av * dipole.av) / 20;
  // Total energy
  const E_ = U_ + T_ + R_;
  debugValues.U = U_.toFixed(4);
  debugValues.T = T_.toFixed(4);
  debugValues.R = R_.toFixed(4);
  debugValues.E = E_.toFixed(4);

  debugValues.v = dipole.v.map(function(n) { return n.toFixed(2) });
  debugValues.w = dipole.av.toFixed(4);
  debugValues.m = degrees(Math.atan2(dipole.m[1], dipole.m[0])).toFixed(4);
  debugValues.elapsed_time = elapsedTime.toFixed(4);
}

function tick() {
  // if (!dipoles[1].fixed && animate) {
  if (animate) {
    requestAnimFrame(tick);
    // var animSpeed = document.getElementById("animSpeed").value;
    var animSpeed = 500;

    // for (var i = 0; !dipoles[1].fixed && i < animSpeed; ++i) {
    for (var i = 0; i < animSpeed; ++i) {
      updatePositions();
    }
    updateForces();
    render();
  }
}

function renderCircles() {
  pushMatrix();
  const s = mesh2Obj;
  var success = true;
  for (var i = 0; i < dipoles.length; i++) { 
    pushMatrix();
    mvMatrix = mult(mvMatrix, translate(dipoles[i].p));
    var phi = Math.acos(dot(vec3(1, 0, 0), dipoles[i].m));
    if (phi != 0) {
      var axis = cross(vec3(1, 0, 0), dipoles[i].m);
      mvMatrix = mult(mvMatrix, rotate(degrees(phi), axis));
    }
    mvMatrix = mult(mvMatrix, scalem(s, s, 1));
    success = success && renderCircle();
    popMatrix();
  }
  popMatrix();

  return success;
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
  var success = true;
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
      // var v = BSum(dipoles, p);
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
        success = success && renderArrow();
        popMatrix();
      }
    }
  }
  popMatrix();
  return success;
}

function renderDebug() {
  var debug = document.getElementById("debug");
  var html = "";
  if (showDebug) {
    html = "<table border=\"0\">";
    var first = true;
    // Render debug values that don't have a custom label
    for (var property in debugValues) {
      if (debugValues.hasOwnProperty(property)) {
        var label = property;
        if (!labeled.has(property)) {
          html += "<tr>";
          html += "<td>" + label + ":</td>";
          html += "<td>" + debugValues[property] + "</td>";
          html += "</tr>";
        }
      }
    }
    for (var i = 0; i < debugLabels.length; i++) {
      const label = debugLabels[i].label;
      const property = debugLabels[i].name;
      var value = "";
      if (debugValues.hasOwnProperty(property)) {
        value = debugValues[property];
      }
      html += "<tr>";
      html += "<td>" + label + ":</td>";
      html += "<td>" + value + "</td>";
      html += "</tr>";
    }
  }
  debug.innerHTML = html;
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
  fw *= zoom;
  fh *= zoom;
  pMatrix = ortho(0-fw/2, fw/2, 0-fh/2, fh/2, 0, 2);

  mvMatrix = lookAt(eye, at , up);  
  if (rotAngle != 0) {
    mvMatrix = mult(mvMatrix, rotate(rotAngle*180.0/Math.PI, rotVec));
  }
  mvMatrix = mult(mvMatrix, rotMatrix);

  gl.disable(gl.DEPTH_TEST);

  var success = true;

  success = success && renderB();

  if (showCircles) {
    success = success && renderCircles();
  }
  if (showB) {
    success = success && renderMagneticField(dipoles[1].p);
  }

  var dipole = dipoles[1];

  // force
  var f = F(dipoles[0], dipoles[1], false);
  success = success && renderForceArrow(
    dipole, f, Fcolor, 1.0);
  // render force after friction
  // f = F(dipoles[0], dipoles[1], true);
  // success = success && renderForceArrow(dipole, f, FnetColor, 0.5);

  // torque
  var t = T(dipoles[0], dipoles[1], false);
  success = success && renderTorqueArrow(dipole, t, Tcolor, 1.0);
  // Render torque after friction
  // var tp = T(dipoles[0], dipoles[1], true);
  // success = success && renderTorqueArrow(dipole, tp, TnetColor, 0.5);

  // render Rij
  // const Rij = subtract(dipole.p, dipoles[0].p);
  // success = success && forceArrow.render(dipoles[0].p, Rij,
  //                   1, black, false);

  // render velocity arrow
  success = success && forceArrow.render(dipole.p, mult(dipole.v, 30),
                    mesh2Obj/2, vcolor, false);

  // render angular velocity arrow
  success = success && renderAVArrow(dipole, dipole.av, wcolor);

  // render B at dipole
  const B1 = B(dipoles[0].m, dipole.p);
  success = success && forceArrow.render(
    dipole.p, mult(normalize(B1), 3.1*mesh2Obj), 1/3.7, Bgrey, false);
  // forceArrow.render(
  //   dipole.p, mult(normalize(B1), 4*mesh2Obj), 1/5, Bgrey, false);

  renderDebug();

  if (!success) {
    requestAnimFrame(render);
  }
}

function setAnimate(a) {
  animate = a;
  if (animate) {
    document.getElementById("play").innerHTML =
      "<font size=\"6\"><i class=\"fa fa-pause\"></i>";
    tick();
  } else {
    document.getElementById("play").innerHTML =
      "<font size=\"6\"><i class=\"fa fa-play\"></i>";
  }
}

function toggleAnimate() {
  setAnimate(!animate);
}

function zoomIn() {
  zoom = zoom * 0.9;
  render();
}

function zoomOut() {
  zoom = zoom * 1.1;
  render();
}

function adjustSimSpeed(factor) {
  const newSpeed = simSpeed * factor;
  // for (var i = 0; i < 5; ++i) {
  //   if (newSpeed > 
  // }
  document.getElementById("simSpeed").value = newSpeed.toPrecision(2);
  // document.getElementById("simSpeed").value = newSpeed.toFixed(1);
  // var fixed = 2;
  // while (Number(document.getElementById("simSpeed").value) == simSpeed) {
  //   document.getElementById("simSpeed").value = (simSpeed * factor).toFixed(fixed);
  // }
  simSpeedChanged();
}

function keyDown(e) {
  if (e.target != document.body) {
    if (e.target.type != "button") {
      return;
    }
    // switch(e.keyCode) {
    //   case " ".charCodeAt(0):
    //   return;
    // }
  }

  switch (e.keyCode) {
  case 37:
    // left arrow
    break;
  case 38:
    // up arrow
    adjustSimSpeed(1.2);
    break;
  case 39:
    // right arrow
    break;
  case 40:
    // down arrow
    adjustSimSpeed(0.8);
    break;
  case 189:
    // -
    zoomOut();
    break;
  case 187:
    // +
    zoomIn();
    break;
  case " ".charCodeAt(0):
    toggleAnimate();
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
    // updateForces(true);
    // render();
    break;
  case "M".charCodeAt(0):
    showB = !showB;
    render();
    break;
  case "C".charCodeAt(0):
    showCircles = !showCircles;
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

function removeFocus() {
  document.activeElement.blur();
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
  return vec2(x, y);
}

function rotatePoint(mousePos, i) {
  var p = vec3(mousePos[0], mousePos[1], 0.0);
  var v = subtract(p, dipoles[i].p);
  var theta = degrees(Math.atan2(v[1], v[0]));
  document.getElementById("degrees").value = theta;
  reset();
}

function movePoint(p, i) {
  const v = subtract(vec3(p[0], p[1], 0), dipoles[0].p);
  if (length(v) < D) {
    p = add(dipoles[0].p, mult(normalize(v), D));
  }
  document.getElementById("x").value = p[0];
  document.getElementById("y").value = p[1];
  reset();
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
  if (!textureProgram.initialized) {
    window.setTimeout(configureTexture, 1000/60, image);
    return;
  }

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
  setAnimate(false);

  updateForces(true);
  render();
}

function x0Changed() {
  reset();
}

function y0Changed() {
  reset();
}

function moment0Changed() {
  reset();
}

function resetClicked() {
  reset();
  // updateForces(true);
  // render();
}

function transRotClicked() {
  updateP = document.getElementById("updateP").checked;
  updateM = document.getElementById("updateM").checked;
}

function tEddyChanged() {
  tEddy = Number(document.getElementById("tEddy").value);
}

function fEddyChanged() {
  fEddy = Number(document.getElementById("fEddy").value);
}

function tFrictionChanged() {
  tFriction = Number(document.getElementById("tFriction").value);
}

function fFrictionChanged() {
  fFriction = Number(document.getElementById("fFriction").value);
}

function collisionTypeChanged() {
  collisionType = Number(document.getElementById("collisionType").value);
}

function simSpeedChanged() {
  simSpeed = Number(document.getElementById("simSpeed").value);
}

window.onload = function init() {
  canvas = document.getElementById("gl-canvas");

  document.onkeydown = keyDown;
  // document.onclick = onMouseClick;
  // document.onmousedown = onDocumentMouseDown;
  // document.onmouseup = onMouseUp;
  // document.onmousemove = onMouseMove;

  // canvas.addEventListener('keydown', keyDown, true);
  // document.addEventListener("keydown", keyDown, false);
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
  sin2 = new Sin2();
  forceArrow = new ForceArrow();
  bArrow = new BArrow();
  torqueArrow = new TorqueArrow();

  simSpeed = Number(document.getElementById("simSpeed").value);
  tFriction = Number(document.getElementById("tFriction").value);
  fFriction = Number(document.getElementById("fFriction").value);
  tEddy = Number(document.getElementById("tEddy").value);
  fEddy = Number(document.getElementById("fEddy").value);
  collisionType = Number(document.getElementById("collisionType").value);

  reset();
  // updateForces(true);
  // render();
}
