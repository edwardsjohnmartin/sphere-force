var LineProgram = function() {
  this.program = initShaders(gl, "line-vshader", "line-fshader");
  gl.useProgram(this.program);

  this.vertexLoc = gl.getAttribLocation(this.program, "vPosition");
  this.colorLoc = gl.getAttribLocation(this.program, "vColor");

  this.mvMatrixLoc = gl.getUniformLocation(this.program, "mvMatrix");
  this.pMatrixLoc = gl.getUniformLocation(this.program, "pMatrix");
  this.nMatrixLoc = gl.getUniformLocation(this.program, "nMatrix");
}

var SphereProgram = function() {
  this.program = initShaders(gl, "sphere-vshader", "sphere-fshader");
  gl.useProgram(this.program);

  this.vertexLoc = gl.getAttribLocation(this.program, "vPosition");
  this.normalLoc = gl.getAttribLocation(this.program, "vNormal");
  this.colorLoc = gl.getAttribLocation(this.program, "vColor");

  this.mvMatrixLoc = gl.getUniformLocation(this.program, "mvMatrix");
  this.pMatrixLoc = gl.getUniformLocation(this.program, "pMatrix");
  this.nMatrixLoc = gl.getUniformLocation(this.program, "nMatrix");
}

var CircleProgram = function() {
  this.program = initShaders(gl, "circle-vshader", "circle-fshader");
  gl.useProgram(this.program);

  this.vertexLoc = gl.getAttribLocation(this.program, "vPosition");
  this.normalLoc = gl.getAttribLocation(this.program, "vNormal");
  this.colorLoc = gl.getAttribLocation(this.program, "vColor");

  this.mvMatrixLoc = gl.getUniformLocation(this.program, "mvMatrix");
  this.pMatrixLoc = gl.getUniformLocation(this.program, "pMatrix");
  this.nMatrixLoc = gl.getUniformLocation(this.program, "nMatrix");

  this.colorLoc = gl.getUniformLocation(this.program, "color");
}

var BProgram = function() {
  this.program = initShaders(gl, "B-vshader", "B-fshader");
  gl.useProgram(this.program);

  this.vertexLoc = gl.getAttribLocation(this.program, "vPosition");

  this.mvMatrixLoc = gl.getUniformLocation(this.program, "mvMatrix");
  this.pMatrixLoc = gl.getUniformLocation(this.program, "pMatrix");

  this.colorLoc = gl.getUniformLocation(this.program, "color");
}

var FlatProgram = function() {
  this.program = initShaders(gl, "flat-vshader", "flat-fshader");
  gl.useProgram(this.program);

  this.vertexLoc = gl.getAttribLocation(this.program, "vPosition");

  this.mvMatrixLoc = gl.getUniformLocation(this.program, "mvMatrix");
  this.pMatrixLoc = gl.getUniformLocation(this.program, "pMatrix");
  this.nMatrixLoc = gl.getUniformLocation(this.program, "nMatrix");

  this.colorLoc = gl.getUniformLocation(this.program, "color");
}

var TextureProgram = function() {
  this.program = initShaders(gl, "tex-vshader", "tex-fshader");
  gl.useProgram(this.program);

  this.vertexLoc = gl.getAttribLocation(this.program, "vPosition");
  this.colorLoc = gl.getAttribLocation(this.program, "vColor");
  this.texCoordLoc = gl.getAttribLocation(this.program, "vTexCoord");

  this.mvMatrixLoc = gl.getUniformLocation(this.program, "mvMatrix");
  this.pMatrixLoc = gl.getUniformLocation(this.program, "pMatrix");
  this.nMatrixLoc = gl.getUniformLocation(this.program, "nMatrix");
}

