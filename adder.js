/**
 * Author: Ikumoluyi Oluwadamilare
 * Date: 5/9/2021
 * Professor: Lauren King
 * Project: 4
 * for this project i used the diskworld example from the web gl zip given to us, and I made certain modification to the code. I don't take full credit for this because I am just building up on someone's else idea, but i believe 
 * if i study more, i can do more
 */


"use strict";



var gl; // The webgl context.

var a_coords_loc; // Location of the a_coords attribute variable in the shader program.
var a_normal_loc; // Location of a_normal attribute
var a_texCoords_loc;

var u_modelview; // Locations for uniform matrices
var u_projection;
var u_texture;
var u_normalMatrix;

var u_material; // An object tolds uniform locations for the material.
var u_lights; // An array of objects that holds uniform locations for light properties.

var texture;              // A texture object to hold the texture image.

var textureURLs = [
        "textures/brick001.jpg",
        "textures/marble.jpg"
];


var projection = mat4.create(); // projection matrix
var modelview; // modelview matrix; value comes from rotator
var normalMatrix = mat3.create(); // matrix, derived from modelview matrix, for transforming normal vectors

var rotator; // A TrackballRotator to implement rotation by mouse.

var frameNumber = 0; // frame number during animation (actually only goes up by 0.5 per frame)

var torus,
  sphere,
  cone,
  cylinder,
  disk,
  ring,
  cube;
   // basic objects, created using function createModel

var matrixStack = []; // A stack of matrices for implementing hierarchical graphics.

var currentColor = [1, 1, 1, 1]; // The current diffuseColor; render() functions in the basic objects set
// the diffuse color to currentColor when it is called before drawing the object.
// Other color properties, which don't change often are handled elsewhere.


//]
var sunAngle = Math.PI / 2; // rotation of the sun about the z-axis.
var daytime = true;

var globalScale = 1;

/**
 * Draws the image, which consists of either the "world" or a closeup of the "car".
 */
function draw() {
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  mat4.perspective(projection, Math.PI / 4, 1, 1, 50);
  gl.uniformMatrix4fv(u_projection, false, projection);

  modelview = rotator.getViewMatrix();

  lights();

  world();
}

/* Set the direction vector of a light, in eye coordinates.
 * (Note: This function sets the value of the global variable normalMatrix.)
 * @param modelview the matrix that does object-to-eye coordinate transforms
 * @param u_direction_loc the uniform variable location for the spotDirection property of the light
 * @param lightDirection a vector that points in the direction that the spotlight is pointing (a vec3)
 */
function setSpotlightDirection(u_direction_loc, modelview, lightDirection) {
  mat3.normalFromMat4(normalMatrix, modelview);
  var transformedDirection = new Float32Array(3);
  vec3.transformMat3(transformedDirection, lightDirection, normalMatrix);
  gl.uniform3fv(u_direction_loc, transformedDirection);
}

/* Set the position of a light, in eye coordinates.
 * @param u_position_loc the uniform variable location for the position property of the light
 * @param modelview the matrix that does object-to-eye coordinate transforms
 * @param lightPosition the location of the light, in object coordinates (a vec4)
 */
function setLightPosition(u_position_loc, modelview, lightPosition) {
  var transformedPosition = new Float32Array(4);
  vec4.transformMat4(transformedPosition, lightPosition, modelview);
  gl.uniform4fv(u_position_loc, transformedPosition);
}


function lights() {

  if (daytime) { // light 1 is the sun
    gl.uniform3f(u_lights[1].color, 0.6, 0.6, 0.5); // light 1 is the sun during the day
    gl.uniform1f(u_lights[1].attenuation, 0);
  } else {
    gl.uniform3f(u_lights[1].color, 1, 1, 0.8); // light 1 is the lamp at night
    gl.uniform1f(u_lights[1].attenuation, 2);
  }

  currentColor = [0.3, 0.3, 0.3, 1];

  pushMatrix();
  mat4.scale(modelview, modelview, [globalScale, globalScale, globalScale]);

  pushMatrix(); // draw the sun, with yellow emissive color during the day, dim whita at night; NB: sun won't be illuminated by other lights
  mat4.rotateZ(modelview, modelview, sunAngle);
  mat4.translate(modelview, modelview, [6, 0, 0]);
  mat4.scale(modelview, modelview, [0.3, 0.3, 0.3]);
  if (daytime) {
    gl.uniform3f(u_material.emissiveColor, 0.7, 0.7, 0);
    setLightPosition(u_lights[1].position, modelview, [1, 0, 0, 0]);
  } else {
    gl.uniform3f(u_material.emissiveColor, 0.1, 0.1, 0.1);
  }
  sphere.render();
  gl.uniform3f(u_material.emissiveColor, 0, 0, 0);
  popMatrix();

  // Draw Suns Ring in this crazy world
  pushMatrix();
  if (daytime) {
    gl.uniform3f(u_material.emissiveColor, 1, 0.7, 0);
    setLightPosition(u_lights[1].position, modelview, [1, 0, 0, 0]);
  } else {
    gl.uniform3f(u_material.emissiveColor, 0.1, 0.1, 0.1);
  }
  mat4.rotate(modelview, modelview, (-frameNumber) / 180 * Math.PI, [0, 1,
    0
  ]);
  mat4.rotateZ(modelview, modelview, sunAngle);
  mat4.translate(modelview, modelview, [6, 0, 0]);
  mat4.rotate(modelview, modelview, (90) / 180 * Math.PI, [1, 1, 0]);
  mat4.scale(modelview, modelview, [0.2, 0.2, 0.2]);
  ring.render();
  gl.uniform3f(u_material.emissiveColor, 0, 0, 0);
  popMatrix();

  pushMatrix(); // draw the lamp, with emissive color at night
  mat4.translate(modelview, modelview, [0, 1.5, 0]);
  mat4.scale(modelview, modelview, [0.15, 0.15, 0.15]);
  if (!daytime) {
    setLightPosition(u_lights[1].position, modelview, [0, 0, 0, 1]);
    gl.uniform3f(u_material.emissiveColor, 0.5, 0.5, 0);
  }
  sphere.render();
  gl.uniform3f(u_material.emissiveColor, 0, 0, 0);
  popMatrix();

  // turn on the headlights at night -- we need all the transforms that are applied to the car
  if (daytime) {
    gl.uniform1f(u_lights[2].enabled, 0);
    gl.uniform1f(u_lights[3].enabled, 0);
    gl.uniform1f(u_lights[4].enabled, 0);
    gl.uniform1f(u_lights[5].enabled, 0);
  } else {
    gl.uniform1f(u_lights[2].enabled, 1);
    gl.uniform1f(u_lights[3].enabled, 1);
    gl.uniform1f(u_lights[4].enabled, 1);
    gl.uniform1f(u_lights[5].enabled, 1);

    pushMatrix();
    mat4.rotate(modelview, modelview, (-frameNumber) / 180 * Math.PI, [0, 1,
      0
    ]);
    mat4.translate(modelview, modelview, [0, 0.3, 4]);
    mat4.scale(modelview, modelview, [0.3, 0.3, .3]);

    pushMatrix();
    mat4.translate(modelview, modelview, [-3, 0.6, -1]);
    mat4.rotateY(modelview, modelview, -Math.PI / 12); // (bogus rotation to point headlights more along road)
    setLightPosition(u_lights[2].position, modelview, [0, 0, 0, 1]);
    setSpotlightDirection(u_lights[2].spotDirection, modelview, [-1, 0, 0]);
    popMatrix();

    pushMatrix();
    mat4.translate(modelview, modelview, [-3, 0.6, 1]);
    mat4.rotateY(modelview, modelview, -Math.PI / 12);
    setLightPosition(u_lights[3].position, modelview, [0, 0, 0, 1]);
    setSpotlightDirection(u_lights[3].spotDirection, modelview, [-1, 0, 0]);
    popMatrix();
    popMatrix();

    pushMatrix();
    mat4.rotate(modelview, modelview, ( frameNumber ) / 180 * Math.PI, [0, 1,
      0
    ]);
    mat4.translate(modelview, modelview, [0, 0.3, 4]);
    mat4.scale(modelview, modelview, [0.3, 0.3, .3]);

    pushMatrix();
    mat4.translate(modelview, modelview, [-3, 0.6, -1]);
    mat4.rotateY(modelview, modelview, -Math.PI / 12); // (bogus rotation to point headlights more along road)
    setLightPosition(u_lights[4].position, modelview, [0, 0, 0, 1]);
    setSpotlightDirection(u_lights[4].spotDirection, modelview, [-1, 0, 0]);
    popMatrix();

    pushMatrix();
    mat4.translate(modelview, modelview, [-3, 0.6, 1]);
    mat4.rotateY(modelview, modelview, -Math.PI / 12);
    setLightPosition(u_lights[5].position, modelview, [0, 0, 0, 1]);
    setSpotlightDirection(u_lights[5].spotDirection, modelview, [-1, 0, 0]);
    popMatrix();
    popMatrix();
  }
  popMatrix();

}

/**
 * Utility function to add shapes to the world.
 *
 * @param {[type]} opts [description]
 */
function addShape(opts) {
  console.log(opts);
  pushMatrix();
  if (opts.translate === undefined) {
    mat4.translate(modelview, modelview, [0, 0, 0]);
  } else {
    mat4.translate(modelview, modelview, [opts.translate.x, opts.translate.y,
      opts.translate.z
    ]);
  }

  if (opts.rotate === undefined) {
    mat4.rotate(modelview, modelview, (90) / 180 * Math.PI, [0, 0, 0]);
  } else {
    mat4.rotate(modelview, modelview, (90) / 180 * Math.PI, [opts.rotate.x,
      opts.rotate.y, opts.rotate.z
    ]);
  }

  if (!opts.animationRotate === undefined) {
    mat4.rotate(modelview, modelview, (opts.animationRotate.frameNum) / 90 *
      Math.PI, [
        opts.animationRotate.x,
        opts.animationRotate.y,
        opts.animationRotate.z
      ]);
  }

  if (opts.scale === undefined) {
    mat4.scale(modelview, modelview, [1, 1, 1]);
  } else {
    mat4.scale(modelview, modelview, [opts.scale.x, opts.scale.y, opts.scale.z]);
  }

  currentColor = opts.currentColor;

  if (opts.shape === undefined) {
    switch (opts.object) { // Runs the predefined function to build object.
      case 'tree':
        tree();
        popMatrix();
        break;
      default:
    }
  } else {
    opts.shape.render();
    popMatrix();
  }
}

/**
 * Draws a looney world of a sphere with a ring with cars driving all over the place
 */
function world() {
  pushMatrix();
  mat4.scale(modelview, modelview, [globalScale, globalScale, globalScale]);

  addShape({
    shape: sphere,
    translate: {
      x: 0,
      y: -.05,
      z: 0,
    },
 currentColor: [0.1, 1, 0.3, 1],
  });

  addShape({
    shape: ring,
    rotate: {
      x: -1,
      y: 0,
      z: 0,
    },
  scale: {
  x: 1.1,
  y: 1.1,
  z: 20,
},
  currentColor: [0.9, 0.7, 0.8, 1],
  });
 
//eyes to cyborg
addShape({
    shape: cube,
    translate: {
       x: -0.6,
       y: 0.3,
       z: 0.7,
},
scale: {
  x: .3,
  y: .3,
  z: .3,
},
currentColor: [0.2, 0.3, 0.4, 1],
});


//eyes to cyborg2
addShape({
    shape: cube,
    translate: {
       x: 0.6,
       y: 0.3,
       z: 0.7,
},
scale: {
  x: .3,
  y: .3,
  z: .3,
},
currentColor: [0.2, 0.3, 0.4, 1],
});



//muticolored cyborg
addShape({
    shape: sphere,
    translate: {
      x: 0,
      y: .05,
      z: 0,
    },
   currentColor: [1, 1, 1, 1],
  });




//cyborg nose
addShape({
    shape: cube,
    translate: {
       x: 0,
       y: 0,
       z: 1.0,
},
scale: {
  x: .2,
  y: .2,
  z: .2,
},
currentColor: [0.2, 0.3, 0.4, 1],
});


//cyborg mouth left
addShape({
    shape: ring,
    rotate: {
      x: 0.5,
      y: 0.5,
      z: 0,
    },
   scale: {
   x: 0.3,
   y: 0.1,
   z: -0.5,
},
     currentColor: [0, 0.7, 0.8, 1],
  });
 
//cyborg mouth right
addShape({
    shape: ring,
    rotate: {
      x: 0.5,
      y: -0.5,
      z: 0,
    },
   scale: {
   x: 0.3,
   y: 0.1,
   z: 0.5,
},
 currentColor: [0, 0.7, 0.8, 1],
});


//ring curve
addShape({
    shape: ring,
    rotate: {
      x: 0.7,
      y: -0.3,
      z: 0,
    },
   scale: {
   x: 2.5,
   y: 2.3,
   z: 5,
},
   currentColor: [0.9, 0.7, 0.8, 1],
  });

//ring curve
addShape({
    shape: ring,
    rotate: {
      x: 0.7,
      y: 0.3,
      z: 0,
    },
   scale: {
   x: 2.5,
   y: 2.3,
   z: 5,
},
currentColor: [0.9, 0.7, 0.8, 1],
  });


pushMatrix();
  mat4.rotate(modelview, modelview, (90) / 180 * Math.PI, [-1, 0, 0]);
  mat4.scale(modelview, modelview, [0.15, 0.15, 1.5]);
  currentColor = [0, 0.8, 1, 1];
  cylinder.render();
  popMatrix();

  // Adding Tree's
  pushMatrix();
  mat4.translate(modelview, modelview, [1, 0, 0]);
  mat4.scale(modelview, modelview, [0.2, 0.2, 0.2]);
  mat4.rotate(modelview, modelview, (90) / 180 * Math.PI, [0, 0, -1]);
  tree();
  popMatrix();

  pushMatrix();
  mat4.translate(modelview, modelview, [-1, 0, 0]);
  mat4.scale(modelview, modelview, [0.2, 0.2, 0.2]);
  mat4.rotate(modelview, modelview, (90) / 180 * Math.PI, [0, 0, 1]);
  tree();
  popMatrix();

  pushMatrix();
  mat4.translate(modelview, modelview, [0, 0.2, 0]);
  mat4.scale(modelview, modelview, [0.4, 0.4, 0.4]);
  mat4.rotate(modelview, modelview, (30) / 180 * Math.PI, [0, .5, 1]);
  tree();
  popMatrix();


  pushMatrix();
  mat4.translate(modelview, modelview, [0, 0.2, 0]);
  mat4.scale(modelview, modelview, [0.4, 0.4, 0.4]);
  mat4.rotate(modelview, modelview, (30) / 180 * Math.PI, [0, .5, -1]);
  tree();
  popMatrix();

  // Adding Vehicles
  pushMatrix();
  mat4.rotate(modelview, modelview, (-frameNumber) / 180 * Math.PI, [0, 1,
    0
  ]);
  mat4.translate(modelview, modelview, [0, 0.3, 4]);
  mat4.scale(modelview, modelview, [.1, .1, .1]);
  car();
  popMatrix();

  pushMatrix();
  mat4.rotate(modelview, modelview, (-frameNumber) / 180 * Math.PI, [0, 1,
    0
  ]); 
  mat4.translate(modelview, modelview, [3, 0.3, 4]);
  mat4.scale(modelview, modelview, [.3, .3, .3]);
  car();
  popMatrix();

  popMatrix();
}

/**
 * Draws a tree consisting of a green cone with a brown cylinder for a trunk.
 */
function tree() {
  pushMatrix();
  mat4.rotate(modelview, modelview, (90) / 180 * Math.PI, [-1, 0, 0]);
  pushMatrix();
  currentColor = [1, 1, 1, 1];
  mat4.scale(modelview, modelview, [0.5, 0.5, 1]);
  cylinder.render();
  popMatrix();
  pushMatrix();
  currentColor = [5, 0.8, 0, 1];
  mat4.translate(modelview, modelview, [0, 0, 0.8]);
  mat4.scale(modelview, modelview, [1.5, 1.5, 2]);
  cone.render();
  popMatrix();
  popMatrix();
}

/**
 * Draws a car consisting of two scaled red cubes with headlights
 * and four wheels on two axels.
 */
function car() {
  pushMatrix();
  pushMatrix();
  mat4.translate(modelview, modelview, [2.5, 0, 0]);
  axel();
  popMatrix();
  pushMatrix();
  mat4.translate(modelview, modelview, [-2.5, 0, 0]);
  axel();
  popMatrix();
  currentColor = [0.1, 1, 0.3, 1];
  pushMatrix();
  mat4.translate(modelview, modelview, [0, 0.6, 0]);
  mat4.scale(modelview, modelview, [6, 1.2, 3]);
  cube.render();
  popMatrix();

  pushMatrix();
  mat4.translate(modelview, modelview, [0.5, 1.4, 0]);
  mat4.scale(modelview, modelview, [3, 1, 2.8]);
  cube.render();
  popMatrix();

  currentColor = [1, 1, 0.3, 1];
  if (!daytime) {
    gl.uniform3f(u_material.emissiveColor, 0.4, 0.4, 0);
  }

  pushMatrix();
  mat4.translate(modelview, modelview, [-3, 0.6, -1]);
  mat4.scale(modelview, modelview, [0.1, 0.25, 0.25]);
  sphere.render();
  popMatrix();

  pushMatrix();
  mat4.translate(modelview, modelview, [-3, 0.6, 1]);
  mat4.scale(modelview, modelview, [0.1, 0.25, 0.25]);
  sphere.render();
  popMatrix();
  gl.uniform3f(u_material.emissiveColor, 0, 0, 0);
  popMatrix();
}

/**
 *  Draw an axel that consists of a long yellow cylinder with
 *  a wheel on each end.
 */
function axel() {
  currentColor = [0.8, 0.7, 0, 1];
  pushMatrix();
  mat4.scale(modelview, modelview, [0.2, 0.2, 4.3]);
  mat4.translate(modelview, modelview, [0, 0, -0.5]);
  cylinder.render();
  popMatrix();
  pushMatrix();
  mat4.translate(modelview, modelview, [0, 0, 2]);
  wheel();
  popMatrix();
  pushMatrix();
  mat4.translate(modelview, modelview, [0, 0, -2]);
  wheel();
  popMatrix();
}

/**
 * Draw a rotating wheel that consists of a torus with three
 * cylinders to make the spokes of the wheel.
 */
function wheel() {
  pushMatrix();
  mat4.rotate(modelview, modelview, (frameNumber * 10) / 180 * Math.PI, [0,
    0, 1
  ]);
  currentColor = [0, 0, 0.7, 1];
  torus.render();
  currentColor = [0.9, 0.9, 0.6, 1];
  pushMatrix();
  mat4.rotate(modelview, modelview, (90) / 180 * Math.PI, [-1, 0, 0]);
  mat4.scale(modelview, modelview, [0.1, 0.1, 1.8]);
  mat4.translate(modelview, modelview, [0, 0, -0.5]);
  cylinder.render();
  popMatrix();
  pushMatrix();
  mat4.rotate(modelview, modelview, (60) / 180 * Math.PI, [0, 0, 1]);
  mat4.rotate(modelview, modelview, (90) / 180 * Math.PI, [-1, 0, 0]);
  mat4.scale(modelview, modelview, [0.1, 0.1, 1.8]);
  mat4.translate(modelview, modelview, [0, 0, -0.5]);
  cylinder.render();
  popMatrix();
  pushMatrix();
  mat4.rotate(modelview, modelview, (-60) / 180 * Math.PI, [0, 0, 1]);
  mat4.rotate(modelview, modelview, (90) / 180 * Math.PI, [-1, 0, 0]);
  mat4.scale(modelview, modelview, [0.1, 0.1, 1.8]);
  mat4.translate(modelview, modelview, [0, 0, -0.5]);
  cylinder.render();
  popMatrix();
  popMatrix();
}


/**
 *  Push a copy of the current modelview matrix onto the matrix stack.
 */
function pushMatrix() {
  matrixStack.push(mat4.clone(modelview));
}


/**
 *  Restore the modelview matrix to a value popped from the matrix stack.
 */
function popMatrix() {
  modelview = matrixStack.pop();
}

/**
 *  Create one of the basic objects.  The modelData holds the data for
 *  an IFS using the structure from basic-objects-IFS.js.  This function
 *  creates VBOs to hold the coordinates, normal vectors, and indices
 *  from the IFS, and it loads the data into those buffers.  The function
 *  creates a new object whose properties are the identifies of the
 *  VBOs.  The new object also has a function, render(), that can be called to
 *  render the object, using all the data from the buffers.  That object
 *  is returned as the value of the function.  (The second parameter,
 *  xtraTranslate, is there because this program was ported from a Java
 *  version where cylinders were created in a different position, with
 *  the base on the xy-plane instead of with their center at the origin.
 *  The xtraTranslate parameter is a 3-vector that is applied as a
 *  translation to the rendered object.  It is used to move the cylinders
 *  into the position expected by the code that was ported from Java.)
 */
function createModel(modelData, xtraTranslate) {
  var model = {};
  model.coordsBuffer = gl.createBuffer();
  model.normalBuffer = gl.createBuffer();
  model.indexBuffer = gl.createBuffer();
  model.count = modelData.indices.length;
  if (xtraTranslate)
    model.xtraTranslate = xtraTranslate;
  else
    model.xtraTranslate = null;
  gl.bindBuffer(gl.ARRAY_BUFFER, model.coordsBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, modelData.vertexPositions, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, model.normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, modelData.vertexNormals, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, modelData.indices, gl.STATIC_DRAW);
  model.render = function() { // This function will render the object.
    // Since the buffer from which we are taking the coordinates and normals
    // change each time an object is drawn, we have to use gl.vertexAttribPointer
    // to specify the location of the data. And to do that, we must first
    // bind the buffer that contains the data.  Similarly, we have to
    // bind this object's index buffer before calling gl.drawElements.
    gl.bindBuffer(gl.ARRAY_BUFFER, this.coordsBuffer);
    gl.vertexAttribPointer(a_coords_loc, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.vertexAttribPointer(a_normal_loc, 3, gl.FLOAT, false, 0, 0);
    gl.uniform4fv(u_material.diffuseColor, currentColor);
    if (this.xtraTranslate) {
      pushMatrix();
      mat4.translate(modelview, modelview, this.xtraTranslate);
    }
    gl.uniformMatrix4fv(u_modelview, false, modelview);
    mat3.normalFromMat4(normalMatrix, modelview);
    gl.uniformMatrix3fv(u_normalMatrix, false, normalMatrix);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
    if (this.xtraTranslate) {
      popMatrix();
    }
  }
  return model;
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type String is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 *    The second and third parameters are the id attributes for <script>
 * elementst that contain the source code for the vertex and fragment
 * shaders.
 */
function createProgram(gl, vertexShaderID, fragmentShaderID) {
  function getTextContent(elementID) {
    // This nested function retrieves the text content of an
    // element on the web page.  It is used here to get the shader
    // source code from the script elements that contain it.
    var element = document.getElementById(elementID);
    var node = element.firstChild;
    var str = "";
    while (node) {
      if (node.nodeType == 3) // this is a text node
        str += node.textContent;
      node = node.nextSibling;
    }
    return str;
  }
  try {
    var vertexShaderSource = getTextContent(vertexShaderID);
    var fragmentShaderSource = getTextContent(fragmentShaderID);
  } catch (e) {
    throw "Error: Could not get shader source code from script elements.";
  }
  var vsh = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vsh, vertexShaderSource);
  gl.compileShader(vsh);
  if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
    throw "Error in vertex shader:  " + gl.getShaderInfoLog(vsh);
  }
  var fsh = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fsh, fragmentShaderSource);
  gl.compileShader(fsh);
  if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
    throw "Error in fragment shader:  " + gl.getShaderInfoLog(fsh);
  }
  var prog = gl.createProgram();
  gl.attachShader(prog, vsh);
  gl.attachShader(prog, fsh);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw "Link error in program:  " + gl.getProgramInfoLog(prog);
  }
  return prog;
}



/**
 *  Loads a texture image asynchronously.  The first paramter is the url
 *  from which the image is to be loaded.  The second parameter is the
 *  texture object into which the image is to be loaded.  When the image
 *  has finished loading, the draw() function will be called to draw the
 *  triangle with the texture.  (Also, if an error occurs during loading,
 *  an error message is displayed on the page, and draw() is called to
 *  draw the triangle without the texture.)
 */
function loadTexture( textureNum ) {
    var img = new Image();  //  A DOM image element to represent the image.
    img.onload = function() {
        // This function will be called after the image loads successfully.
        // We have to bind the texture object to the TEXTURE_2D target before
        // loading the image into the texture object.
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
        gl.generateMipmap(gl.TEXTURE_2D);  // Create mipmaps; you must either
                              // do this or change the minification filter.
        draw();  // Draw the canvas, with the texture.
    }
    img.onerror = function(e,f) {
        // This function will be called if an error occurs while loading.
        document.getElementById("message").innerHTML =
                        "<p>Sorry, texture image could not be loaded.</p>";
        draw();  // Draw without the texture; triangle will be black.
    }
    img.src = textureURLs[textureNum];  // Start loading of the image.
                    // This must be done after setting onload and onerror.
}


/* Initialize the WebGL context.  Called from init() */
function initGL() {
  var prog = createProgram(gl, "vshader-source", "fshader-source");
  gl.useProgram(prog);
  gl.enable(gl.DEPTH_TEST);

  /* Get attribute and uniform locations */

  a_coords_loc = gl.getAttribLocation(prog, "a_coords");
  a_normal_loc = gl.getAttribLocation(prog, "a_normal");
  a_texCoords_loc =  gl.getAttribLocation(prog, "a_texCoords");
  gl.enableVertexAttribArray(a_coords_loc);
  gl.enableVertexAttribArray(a_normal_loc);
  gl.enableVertexAttribArray(a_texCoords_loc);

    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

  u_modelview = gl.getUniformLocation(prog, "modelview");
  u_projection = gl.getUniformLocation(prog, "projection");
  u_normalMatrix = gl.getUniformLocation(prog, "normalMatrix");
  u_material = {
    diffuseColor: gl.getUniformLocation(prog, "material.diffuseColor"),
    specularColor: gl.getUniformLocation(prog, "material.specularColor"),
    emissiveColor: gl.getUniformLocation(prog, "material.emissiveColor"),
    specularExponent: gl.getUniformLocation(prog,
      "material.specularExponent")
  };
  u_lights = new Array(6);
  for (var i = 0; i < 6; i++) {
    u_lights[i] = {
      enabled: gl.getUniformLocation(prog, "lights[" + i + "].enabled"),
      position: gl.getUniformLocation(prog, "lights[" + i + "].position"),
      color: gl.getUniformLocation(prog, "lights[" + i + "].color"),
      spotDirection: gl.getUniformLocation(prog, "lights[" + i +
        "].spotDirection"),
      spotCosineCutoff: gl.getUniformLocation(prog, "lights[" + i +
        "].spotCosineCutoff"),
      spotExponent: gl.getUniformLocation(prog, "lights[" + i +
        "].spotExponent"),
      attenuation: gl.getUniformLocation(prog, "lights[" + i +
        "].attenuation")
    };
  }

  gl.uniform3f(u_material.specularColor, 0.1, 0.1, 0.1); // specular properties don't change
  gl.uniform1f(u_material.specularExponent, 16);
  gl.uniform3f(u_material.emissiveColor, 0, 0, 0); // default, will be changed temporarily for some objects


  for (var i = 1; i < 6; i++) { // set defaults for lights
    gl.uniform1i(u_lights[i].enabled, 0);
    gl.uniform4f(u_lights[i].position, 0, 0, 1, 0);
    gl.uniform1f(u_lights[i].spotCosineCutoff, 0); // not a spotlight
    gl.uniform3f(u_lights[i].spotDirection, 0, 0, -1);
    gl.uniform1f(u_lights[i].spotExponent, 5);
    gl.uniform1f(u_lights[i].attenuation, 0); // no attenuation
    gl.uniform3f(u_lights[i].color, 1, 1, 1);
  }

  gl.uniform1i(u_lights[0].enabled, 1); // viewpoint light
  gl.uniform4f(u_lights[0].position, 0, 0, 0, 1); // positional, at viewpoint
  gl.uniform3f(u_lights[0].color, 0.2, 0.2, 0.2); // dim

  gl.uniform1i(u_lights[1].enabled, 1); // the sun during the day, the lamp at night

  gl.uniform1f(u_lights[2].spotCosineCutoff, Math.cos(Math.PI / 8)); // lights 2 and 3 are headlights,
  gl.uniform1f(u_lights[3].spotCosineCutoff, Math.cos(Math.PI / 8)); //    which are spotlights
  gl.uniform3f(u_lights[2].color, 0.5, 0.5, 0.4);
  gl.uniform3f(u_lights[3].color, 0.5, 0.5, 0.4);

  gl.uniform1f(u_lights[4].spotCosineCutoff, Math.cos(Math.PI / 8)); // lights 2 and 3 are headlights,
  gl.uniform1f(u_lights[5].spotCosineCutoff, Math.cos(Math.PI / 8)); //    which are spotlights
  gl.uniform3f(u_lights[4].color, 0.5, 0.5, 0.4);
  gl.uniform3f(u_lights[5].color, 0.5, 0.5, 0.4);

  // Note: position and spot direction for lights 1 to 4 are managed by modeling transforms.

  // Lights are set on in the draw() method
  loadTexture(0);


} // end initGL()



//--------------------------------- animation framework ------------------------------


var animating = false;

function frame() {
  if (animating) {
    frameNumber += 1;
    sunAngle += Math.PI / 360;
    if (sunAngle > 2 * Math.PI) {
      sunAngle -= 2 * Math.PI;
    }
    daytime = sunAngle < Math.PI;
    draw();
    requestAnimationFrame(frame);
  }
}

function setAnimating(run) {
  if (run != animating) {
    animating = run;
    if (animating)
      requestAnimationFrame(frame);
  }
}

//-------------------------------------------------------------------------


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
  var slider = document.getElementById("scale");
  var output = document.getElementById("demo");
  output.innerHTML = slider.value; // Display the default slider value

  // Update the current slider value (each time you drag the slider handle)
  slider.oninput = function() {
    globalScale = 1 * (this.value / 100)
    console.log(globalScale);
    output.innerHTML = this.value;
  }
  try {
    var canvas = document.getElementById("webglcanvas");
    gl = canvas.getContext("webgl") ||
    canvas.getContext("experimental-webgl");
    if (!gl) {
      throw "Browser does not support WebGL";
    }
  } catch (e) {
    document.getElementById("message").innerHTML = "<p>Sorry, could not get a WebGL graphics context.</p>";
    return;
  }
  try {
    initGL(); // initialize the WebGL graphics context
  } catch (e) {
    document.getElementById("message").innerHTML = "<p>Sorry, could not initialize the WebGL graphics context:" + e + "</p>";
    return;
  }
  document.getElementById("animCheck").checked = false;
  document.getElementById("reset").onclick = function() {
    globalScale = 1;
    rotator.setView(17, [0, 1, 2]);
    frameNumber = 0;
    sunAngle = Math.PI / 2;
    daytime = true;
    animating = false;
    document.getElementById("animCheck").checked = false;
    draw();
  }

  torus = createModel(uvTorus(0.5, 1, 16, 8)); // Create all the basic objects.
  sphere = createModel(uvSphere(1));
  cone = createModel(uvCone(), [0, 0, .5]);
  cylinder = createModel(uvCylinder(), [0, 0, .5]);
  disk = createModel(uvCylinder(5.5, 0.5, 64), [0, 0, .25]);
  ring = createModel(ring(3.3, 4.8, 40));
  cube = createModel(cube());
  

  rotator = new TrackballRotator(canvas, function() {
    if (!animating)
      draw();
  }, 17, [0, 1, 2]);
  draw();
}
