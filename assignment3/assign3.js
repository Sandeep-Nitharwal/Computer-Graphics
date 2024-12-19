var gl;
var canvas;

var zAngle = 0.0;
var yAngle = 0.0;

var prevMouseX = 0;
var prevMouseY = 0;


var aNormalLocation;
var aTexCoordLocation;
var aPositionLocation;
var uColorLocation;

var uVMatrixLocation;
var uMMatrixLocation;
var uPMatrixLocation;
var uWNMatrixLocation;

var objVertexPositionBuffer;
var objVertexNormalBuffer;
var objVertexIndexBuffer;
var objVertexTextureBuffer;

var uTextureLocation;
var uTexture2DLocation;
var reflectFactorLocation;
var phongLocation;
var FenceLocation;
var refractLocation;
var uEyePosLocation;

var aPositionLocation1;
var uMMatrixLocation1;
var uPMatrixLocation1;
var uVMatrixLocation1;
var uTextureLocation1;

var cubeMapTexture;

var cubeBuf;
var indexBuf;
var cubeNormalBuf;
var cubeTexBuf;

var spBuf;
var spIndexBuf;
var spNormalBuf;
var spTexBuf;

var skyboxInd;
var skyboxIndBuf;
var skyboxPos;
var skyboxPosBuf;

var spVerts = [];
var spIndicies = [];
var spNormals = [];
var spTexCoords = [];

var wood_tex;
var globe_tex;
var fence_tex;
var reflect_flag=0;
var refract_flag=0;
var phong_flag=0;

var vMatrix = mat4.create(); // view matrix
var mMatrix = mat4.create(); // model matrix
var pMatrix = mat4.create(); //projection matrix
var wNMatrix = mat4.create();

var eyePos = [2, 2, 3];
var defaultEyePos = [2, 2, 3];

var COI = [0.0, 0.0, 0.0];
var viewUp = [0.0, 1.0, 0.0];
var light = [0, 2, 2.0];
var degree = 0.0;

var shaderProgram;
var shaderProgram1;

// Inpur JSON model file to load
var input_JSON = "texture_and_other_files/teapot.json";
var cubeMapPath = "texture_and_other_files/Field/";

const vertexShaderCode = `#version 300 es

in vec3 aPosition;
in vec2 aTexCoords;
in vec3 aNormal;

uniform vec3 uLightDirection;
uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;
uniform mat4 uWNMatrix;

out mat4 vMatrix;
out vec3 eyePos;
out vec3 normal;
out vec2 fragTexCoord;
out vec3 worldCoord;
out vec3 worldNormal;
out vec3 L;
out vec3 R;
out vec3 V;
void main() 
{
	gl_PointSize = 1.0;
	mat4 projectionModelView;
	eyePos = vec3(uVMatrix * uMMatrix * vec4(aPosition, 1.0));
	projectionModelView = uPMatrix * uVMatrix * uMMatrix;
	gl_Position = projectionModelView * vec4(aPosition, 1.0);
	
	vMatrix=uVMatrix;
	mat3 normalTransformMatrix = mat3(uVMatrix * uMMatrix);
	normal = vec3(normalize(normalTransformMatrix * aNormal));
	
	fragTexCoord = aTexCoords;

	worldCoord = mat3(uMMatrix) * aPosition; 
	worldNormal =  mat3(uWNMatrix) * aNormal;
	L = normalize(vec3(vMatrix * vec4(uLightDirection, 1.0))  - eyePos);
	R = normalize(-reflect(L, normal));
	V = normalize(-eyePos);
}`;

// Fragment shader code
const fragShaderCode = `#version 300 es

precision highp float;
	
uniform samplerCube cubeMap;
uniform sampler2D imageTexture; 

uniform vec4 objColor;
uniform bool uRefract; 
uniform bool Phongcheck; 
uniform bool Fencecheck; 
uniform vec3 camera;
uniform float reflectFactor;

in vec3 eyePos;
in vec3 normal;
in mat4 vMatrix;
in vec3 worldCoord;
in vec3 worldNormal;
in vec2 fragTexCoord;
in vec3 L;
in vec3 R;
in vec3 V;

out vec4 fragColor;
	
void main() {

	vec3 seeVector = normalize(worldCoord - camera);
	vec3 wNormal = normalize(worldNormal);

    vec3 reflectVector = reflect(seeVector, wNormal);
    vec3 refractVector = refract(seeVector, wNormal, 0.99);

	vec4 cubeMapReflectCol = vec4(0,0,0,0);
	
	if (uRefract) cubeMapReflectCol = texture(cubeMap, refractVector);
	else cubeMapReflectCol = texture(cubeMap, reflectVector);
		

	float diffuse = max(dot(normal, L), 0.0);
	float specular = 1.0*pow(max(dot(V, R), 0.0), 20.0);
	float ambient = 0.9;
	
	vec4 phongColor = vec4(vec3((ambient+ diffuse) * objColor ), 1.0) + vec4(vec3(specular), 1.0);
	vec4 textureColor =  texture(imageTexture, fragTexCoord); 
	if (Fencecheck)
	{
		if (textureColor.a <= 0.1) discard;
		else textureColor = vec4(0.05, 0.05, 0.05, 1); 
	}

    vec4 refColor = cubeMapReflectCol;

	if (Phongcheck)
	{
		textureColor = textureColor + phongColor;
		refColor = refColor + phongColor;
	}
	float modifiedReflectFactor = reflectFactor * 1.5;
	modifiedReflectFactor = clamp(modifiedReflectFactor, 0.0, 1.0);
	fragColor = mix(textureColor, refColor, modifiedReflectFactor);
}`;

const skyBoxVertex = `#version 300 es
	in vec3 aPosition;
	uniform mat4 uMMatrix;
	uniform mat4 uPMatrix;
	uniform mat4 uVMatrix;
	out vec3 vPosition;
	void main() {
		gl_Position = uPMatrix * uVMatrix * uMMatrix * vec4(aPosition, 1.0);
		vPosition= aPosition;   
	}`;

const skyBoxFragment = `#version 300 es
	precision mediump float;
	uniform samplerCube cubeMap;
	in vec3 vPosition;
	out vec4 fragColor;
	void main() {
    	fragColor = texture(cubeMap, normalize(vPosition));
	}`;

function vertexShaderSetup(vertexShaderCode) {
	var shader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(shader, vertexShaderCode);
	gl.compileShader(shader);
	// Error check whether the shader is compiled correctly
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert(gl.getShaderInfoLog(shader));
		return null;
	}
	return shader;
}

function fragmentShaderSetup(fragShaderCode) {
	var shader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(shader, fragShaderCode);
	gl.compileShader(shader);

	// Error check whether the shader is compiled correctly
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert(gl.getShaderInfoLog(shader));
		return null;
	}
	return shader;
}

function initShaders(vertexShaderCode, fragShaderCode) {

  var shaderProgram = gl.createProgram();

  var vertexShader = vertexShaderSetup(vertexShaderCode);
  var fragmentShader = fragmentShaderSetup(fragShaderCode);

  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
	console.log(gl.getShaderInfoLog(vertexShader));
	console.log(gl.getShaderInfoLog(fragmentShader));
  }

  return shaderProgram;
}

function initGL(canvas) {
  
	try {
		gl = canvas.getContext("webgl2"); // the graphics webgl2 context
		gl.viewportWidth = canvas.width; // the width of the canvas
		gl.viewportHeight = canvas.height; // the height
  	} catch (e) {}
  	if (!gl) {
		alert("WebGL initialization failed");
  	}
}

function degToRad(degrees) {
	return (degrees * Math.PI) / 180;
}

function initObject() {

  // XMLHttpRequest objects are used to interact with servers
  // It can be used to retrieve any type of data, not just XML.
  var request = new XMLHttpRequest();
  request.open("GET", input_JSON);
  // MIME: Multipurpose Internet Mail Extensions
  // It lets users exchange different kinds of data files
  request.overrideMimeType("application/json");
  request.onreadystatechange = function () {
	//request.readyState == 4 means operation is done
	if (request.readyState == 4) {
	  processObject(JSON.parse(request.responseText));
	}
  };
  request.send();
}

function processObject(objData) 
{
	objVertexPositionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, objVertexPositionBuffer);
	gl.bufferData(
	gl.ARRAY_BUFFER,
	new Float32Array(objData.vertexPositions),
	gl.STATIC_DRAW
	);
	objVertexPositionBuffer.itemSize = 3;
	objVertexPositionBuffer.numItems = objData.vertexPositions.length / 3;

	objVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, objVertexNormalBuffer);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(objData.vertexNormals),
        gl.STATIC_DRAW
    );
    objVertexNormalBuffer.itemSize = 3;
    objVertexNormalBuffer.numItems = objData.vertexNormals.length / 3;

    objVertexTextureBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, objVertexTextureBuffer);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(objData.vertexTextureCoords),
        gl.STATIC_DRAW
    );
    objVertexTextureBuffer.itemSize = 2;
    objVertexTextureBuffer.numItems = objData.vertexTextureCoords.length / 2;

	objVertexIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, objVertexIndexBuffer);
	gl.bufferData(
	gl.ELEMENT_ARRAY_BUFFER,
	new Uint32Array(objData.indices),
	gl.STATIC_DRAW
	);
	objVertexIndexBuffer.itemSize = 1;
	objVertexIndexBuffer.numItems = objData.indices.length;
	drawScene();
}

function drawObject(color) 
{

	gl.bindBuffer(gl.ARRAY_BUFFER, objVertexPositionBuffer);
	gl.vertexAttribPointer(aPositionLocation, objVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, objVertexNormalBuffer);
	gl.vertexAttribPointer(
	  aNormalLocation,
	  objVertexNormalBuffer.itemSize,
	  gl.FLOAT,
	  false,
	  0,
	  0
    );
	
	gl.bindBuffer(gl.ARRAY_BUFFER, objVertexTextureBuffer);
	gl.vertexAttribPointer(
		aTexCoordLocation,
		objVertexTextureBuffer.itemSize,
		gl.FLOAT,
		false,
		0,
		0
	);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, objVertexIndexBuffer);

	gl.uniform4fv(uColorLocation, color);
	gl.uniform3fv(uEyePosLocation, eyePos);
	gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
	gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
	gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);
	wNMatrix = mat4.transpose(mat4.inverse(mMatrix));
	gl.uniformMatrix4fv(uWNMatrixLocation, false, wNMatrix);
	gl.uniform3fv(uLightLocation, light);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMapTexture); // bind the texture object to the texture unit
	gl.uniform1i(uTextureLocation, 0); // pass the texture unit to the shader
	
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, null);
	gl.uniform1i(uTexture2DLocation, 1);
	
	gl.uniform1f(reflectFactorLocation, 1.0);
	gl.uniform1i(refractLocation, 0);
	gl.uniform1i(phongLocation, 1);
	gl.uniform1i(FenceLocation, 0);

	gl.drawElements(
		gl.TRIANGLES,
		objVertexIndexBuffer.numItems,
		gl.UNSIGNED_INT,
		0
	);

	gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
	gl.bindTexture(gl.TEXTURE_2D, null);
}

function initSphere(nslices, nstacks, radius) {
    for (var i = 0; i <= nslices; i++) {
      var angle = (i * Math.PI) / nslices;
      var comp1 = Math.sin(angle);
      var comp2 = Math.cos(angle);
  
      for (var j = 0; j <= nstacks; j++) {
        var phi = (j * 2 * Math.PI) / nstacks;
        var comp3 = Math.sin(phi);
        var comp4 = Math.cos(phi);
  
        var xcood = comp4 * comp1;
        var ycoord = comp2;
        var zcoord = comp3 * comp1;
        var utex = 1 - j / nstacks;
        var vtex = 1 - i / nslices;
  
        spVerts.push(radius * xcood, radius * ycoord, radius * zcoord);
        spNormals.push(xcood, ycoord, zcoord);
        spTexCoords.push(utex, vtex);
      }
    }
  
    // now compute the indices here
    for (var i = 0; i < nslices; i++) {
      for (var j = 0; j < nstacks; j++) {
        var id1 = i * (nstacks + 1) + j;
        var id2 = id1 + nstacks + 1;
  
        spIndicies.push(id1, id2, id1 + 1);
        spIndicies.push(id2, id2 + 1, id1 + 1);
      }
    }
  }
  
function initSphereBuffer() {
    var nslices = 50;
    var nstacks = 50;
    var radius = 0.5;
  
    initSphere(nslices, nstacks, radius);
  
    // buffer for vertices
    spBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spVerts), gl.STATIC_DRAW);
    spBuf.itemSize = 3;
    spBuf.numItems = spVerts.length / 3;
  
    // buffer for indices
    spIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint32Array(spIndicies),
      gl.STATIC_DRAW
    );
    spIndexBuf.itemsize = 1;
    spIndexBuf.numItems = spIndicies.length;
  
    // buffer for normals
    spNormalBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spNormals), gl.STATIC_DRAW);
    spNormalBuf.itemSize = 3;
    spNormalBuf.numItems = spNormals.length / 3;
  
    // buffer for texture coordinates
    spTexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, spTexBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spTexCoords), gl.STATIC_DRAW);
    spTexBuf.itemSize = 2;
    spTexBuf.numItems = spTexCoords.length / 2;
}

function drawSphere(color, texture) {

	gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
	gl.vertexAttribPointer(aPositionLocation,spBuf.itemSize,gl.FLOAT,false,0,0);

	gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);
	gl.vertexAttribPointer(aNormalLocation,spNormalBuf.itemSize,gl.FLOAT,false,0,0);

	gl.bindBuffer(gl.ARRAY_BUFFER, spTexBuf);
    gl.vertexAttribPointer(aTexCoordLocation, spTexBuf.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);

	gl.uniform4fv(uColorLocation, color);
	gl.uniform3fv(uEyePosLocation, eyePos);
	gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
	gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
	gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);
	wNMatrix = mat4.transpose(mat4.inverse(mMatrix));
	gl.uniformMatrix4fv(uWNMatrixLocation, false, wNMatrix);
	gl.uniform3fv(uLightLocation, light);
	
	gl.activeTexture(gl.TEXTURE0); // set texture unit 0 to use
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMapTexture); // bind the texture object to the texture unit
    gl.uniform1i(uTextureLocation, 0);
	
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(uTexture2DLocation, 1);

	gl.uniform1f(reflectFactorLocation, reflect_flag);
	gl.uniform1i(refractLocation, 0);
	gl.uniform1i(phongLocation, phong_flag);
	gl.uniform1i(FenceLocation, 0);

	gl.drawElements(gl.TRIANGLES, spIndexBuf.numItems, gl.UNSIGNED_INT, 0);
}

// Cube generation function with normals
function initCubeBuffer() {
  var vertices = [
	// Front face
	-0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
	// Back face
	-0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
	// Top face
	-0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
	// Bottom face
	-0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
	// Right face
	0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5,
	// Left face
	-0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5,
  ];
  cubeBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  cubeBuf.itemSize = 3;
  cubeBuf.numItems = vertices.length / 3;

  var normals = [
	// Front face
	0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0,
	// Back face
	0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0,
	// Top face
	0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,
	// Bottom face
	0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0,
	// Right face
	1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,
	// Left face
	-1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0,
  ];
  cubeNormalBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormalBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
  cubeNormalBuf.itemSize = 3;
  cubeNormalBuf.numItems = normals.length / 3;

  var texCoords = [
	// Front face
	0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
	// Back face
	0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
	// Top face
	0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
	// Bottom face
	0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
	// Right face
	0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
	// Left face
	0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
];
  cubeTexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeTexBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
    cubeTexBuf.itemSize = 2;
    cubeTexBuf.numItems = texCoords.length / 2;

  var indices = [
	0,
	1,
	2,
	0,
	2,
	3, // Front face
	4,
	5,
	6,
	4,
	6,
	7, // Back face
	8,
	9,
	10,
	8,
	10,
	11, // Top face
	12,
	13,
	14,
	12,
	14,
	15, // Bottom face
	16,
	17,
	18,
	16,
	18,
	19, // Right face
	20,
	21,
	22,
	20,
	22,
	23, // Left face
  ];
  indexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);
  gl.bufferData(
	gl.ELEMENT_ARRAY_BUFFER,
	new Uint16Array(indices),
	gl.STATIC_DRAW
  );
  indexBuf.itemSize = 1;
  indexBuf.numItems = indices.length;
}

function drawCube(color, do_reflect = false, do_refract = false, texture = null, do_fence = false) {

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuf);
	gl.vertexAttribPointer(aPositionLocation,cubeBuf.itemSize,gl.FLOAT,false,0,0);

	gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormalBuf);
	gl.vertexAttribPointer(aNormalLocation,cubeNormalBuf.itemSize,gl.FLOAT,false,0,0);

	gl.bindBuffer(gl.ARRAY_BUFFER, cubeTexBuf);
    gl.vertexAttribPointer(aTexCoordLocation, cubeTexBuf.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);

	gl.uniform4fv(uColorLocation, color);
	gl.uniform3fv(uEyePosLocation, eyePos);
	gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
	gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
	gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);
	wNMatrix = mat4.transpose(mat4.inverse(mMatrix));
	gl.uniformMatrix4fv(uWNMatrixLocation, false, wNMatrix);
	gl.uniform3fv(uLightLocation, light);

	gl.activeTexture(gl.TEXTURE0); // set texture unit 0 to use
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMapTexture); // bind the texture object to the texture unit
    gl.uniform1i(uTextureLocation, 0);

	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(uTexture2DLocation, 1);

	gl.uniform1f(reflectFactorLocation, do_reflect);
	gl.uniform1i(refractLocation, do_refract ? 1 : 0);
	gl.uniform1i(phongLocation, 0);
	gl.uniform1i(FenceLocation, do_fence? 1: 0);
	
	gl.drawElements(gl.TRIANGLES, indexBuf.numItems, gl.UNSIGNED_SHORT, 0);

}

function initTextures(textureFile) {
	var tex = gl.createTexture();
	tex.image = new Image();
	tex.image.src = textureFile;
	tex.image.onload = function () {
	  handleTextureLoaded(tex);
	};
	return tex;
}
  
function handleTextureLoaded(texture) {
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); // use it to flip Y if needed
	gl.texImage2D(
	  gl.TEXTURE_2D, // 2D texture
	  0, // mipmap level
	  gl.RGBA, // internal format
	  gl.RGBA, // format
	  gl.UNSIGNED_BYTE, // type of data
	  texture.image // array or <img>
	);
  
	gl.generateMipmap(gl.TEXTURE_2D);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(
	  gl.TEXTURE_2D,
	  gl.TEXTURE_MIN_FILTER,
	  gl.LINEAR_MIPMAP_LINEAR
	);
	
	drawScene();
}

function initCubeMap()
{
	const faceImages = [
		{
			target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
			url: cubeMapPath.concat("posx.jpg")
		},
		{
			target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
			url: cubeMapPath.concat("negx.jpg")
		},
		{
			target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
			url: cubeMapPath.concat("posy.jpg")
		},
		{
			target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
			url: cubeMapPath.concat("negy.jpg")
		},
		{
			target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
			url: cubeMapPath.concat("posz.jpg")
		},
		{
			target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
			url: cubeMapPath.concat("negz.jpg")
		}
	]

	cubeMapTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMapTexture);
	faceImages.forEach((face) => {
		const {target, url} = face;
		
		const level = 0;
		const internalFormat = gl.RGBA;
		const width = 512;
		const height = 512;
		const format = gl.RGBA;
		const type = gl.UNSIGNED_BYTE;
		
		gl.texImage2D(target, level, internalFormat, width, height, 0, format, type, null);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

		const image = new Image();
		image.src = url;
		image.addEventListener("load", function() {
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
			gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMapTexture);
			gl.texImage2D(target, level, internalFormat, format, type, image);
			gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
			drawScene();
		});

	});

	gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
	gl.texParameteri(
		gl.TEXTURE_CUBE_MAP,
		gl.TEXTURE_MIN_FILTER,
		gl.LINEAR_MIPMAP_LINEAR
	);
} 

function updateCamera() {
	const cosTheta = Math.cos(degToRad(degree));
    const sinTheta = Math.sin(degToRad(degree));
    eyePos[0] = defaultEyePos[0] * cosTheta - defaultEyePos[2] * sinTheta;
    eyePos[2] = defaultEyePos[0] * sinTheta + defaultEyePos[2] * cosTheta;
    mat4.lookAt(eyePos, COI, viewUp, vMatrix);
}

function initSkyBox()
{
	skyboxInd = [
		0, 1, 2, 2, 1, 3, 4, 6, 5, 6, 7, 5, 0, 4, 1, 4, 5, 1, 2, 3, 6, 6, 3, 7, 0,
		2, 4, 2, 6, 4, 1, 5, 3, 3, 5, 7
	];
	skyboxPos = [];
	var sizes = [-3, 3]
	for (var z in sizes) {
		for (var y in sizes) {
			for (var x in sizes) {
				skyboxPos.push(sizes[x]);
				skyboxPos.push(sizes[y]);
				skyboxPos.push(sizes[z]);
			}
		}
	}

	skyboxIndBuf = gl.createBuffer();
	skyboxPosBuf = gl.createBuffer();

	skyboxPosBuf.itemSize = 3;
	skyboxPosBuf.numItems = skyboxPos.length / skyboxPosBuf.itemSize;
	gl.bindBuffer(gl.ARRAY_BUFFER, skyboxPosBuf);
	
	gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(skyboxPos),gl.STATIC_DRAW);

	skyboxIndBuf.itemSize = 1;
	skyboxIndBuf.numItems = skyboxInd.length / skyboxIndBuf.itemSize;
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyboxIndBuf);
	gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, new Int16Array(skyboxInd), gl.STATIC_DRAW);
}

function drawBox()
{
	
	gl.bindBuffer(gl.ARRAY_BUFFER, skyboxPosBuf);
	gl.vertexAttribPointer(aPositionLocation1,skyboxPosBuf.itemSize,gl.FLOAT,false,0,0);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyboxIndBuf);

	gl.uniformMatrix4fv(uPMatrixLocation1,false,pMatrix);
	gl.uniformMatrix4fv(uMMatrixLocation1,false,mMatrix);
	gl.uniformMatrix4fv(uVMatrixLocation1,false,vMatrix);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMapTexture);
	gl.uniform1i(uTextureLocation1, 0);

	gl.drawElements(gl.TRIANGLES,skyboxIndBuf.numItems,gl.UNSIGNED_SHORT,0);
	gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
}

function drawTable()
{
	var color = [1.0, 1.0, 0.0, 1.0];
	var temp = mat4.create();
	mat4.identity(temp);
	temp=mat4.multiply(temp,mMatrix,temp);

	mMatrix = mat4.scale(mMatrix, [6, 0.6, 4.5]);
	drawSphere(color, wood_tex);

	mat4.identity(mMatrix);
	mMatrix=mat4.multiply(mMatrix,temp,mMatrix);
	mMatrix = mat4.scale(mMatrix, [1/4, 1/0.4, 1/3]);
	mMatrix = mat4.translate(mMatrix, [-5, -0.5, 4]);
	drawCube(color, false, false, wood_tex);

	mat4.identity(mMatrix);
	mMatrix=mat4.multiply(mMatrix,temp,mMatrix);
	mMatrix = mat4.scale(mMatrix, [1/4, 1/0.4, 1/3]);
	mMatrix = mat4.translate(mMatrix, [-5, -0.5, -4]);
	drawCube(color, false, false, wood_tex);

	mat4.identity(mMatrix);
	mMatrix=mat4.multiply(mMatrix,temp,mMatrix);
	mMatrix = mat4.scale(mMatrix, [1/4, 1/0.4, 1/3]);
	mMatrix = mat4.translate(mMatrix, [5, -0.5, 4]);
	drawCube(color, false, false, wood_tex);

	mat4.identity(mMatrix);
	mMatrix=mat4.multiply(mMatrix,temp,mMatrix);
	mMatrix = mat4.scale(mMatrix, [1/4, 1/0.4, 1/3]);
	mMatrix = mat4.translate(mMatrix, [5, -0.5, -4]);
	drawCube(color, false, false, wood_tex);

}

function drawEarth()
{
	var color = [0,0,0,1];
	mMatrix = mat4.rotate(mMatrix, degToRad(180),[1,0,0]);
	mMatrix = mat4.scale(mMatrix, [0.85 , 0.8, 0.85]);
	mMatrix = mat4.translate(mMatrix, [0.7, -0.8, -1]);
	phong_flag = 1;
	drawSphere(color, globe_tex);
	phong_flag = 0;
}

function drawRefract()
{
	var color = [0,0,0,1];
	mMatrix = mat4.scale(mMatrix, [0.5 , 1, 0.1]);
	mMatrix = mat4.translate(mMatrix, [-2, 0.7, 7.5]);
	drawCube(color, true, true);
}

function drawInnerSphere()
{
	var color = [0.0,0.0,0.15,0.4];
	mMatrix = mat4.scale(mMatrix, [0.5 ,0.5 , 0.5]);
 	mMatrix = mat4.translate(mMatrix,[3,1.15,-0.5]);
	reflect_flag = 0.7;
	phong_flag = 1;
	drawSphere(color, null);
	reflect_flag = 0;
	phong_flag = 0;
}


function drawGrid()
{
	color = [1,1,1,0.5];
	mMatrix = mat4.scale(mMatrix, [0.6 , 0.6, 0.6]);
	mMatrix = mat4.translate(mMatrix,[2.5,5.75/6,-1.25/3]);
	drawCube(color, false, false, fence_tex, 1);
}

//The main drawing routine
function drawScene() 
{
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	gl.clearColor(0.8, 0.8, 0.8, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.enable(gl.DEPTH_TEST);

	gl.enableVertexAttribArray(aPositionLocation);
	gl.enableVertexAttribArray(aTexCoordLocation);
	gl.enableVertexAttribArray(aNormalLocation);
	gl.enableVertexAttribArray(aPositionLocation1);

	animate = function() {

		mMatrix = mat4.identity(mMatrix);
		vMatrix = mat4.identity(vMatrix);
		vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

		pMatrix = mat4.identity(pMatrix);
		mat4.perspective(60, 1.0, 0.1, 1000, pMatrix);

		updateCamera();
		degree += 0.02;

		var temp = mat4.create();
		mat4.identity(temp);
		temp=mat4.multiply(temp,mMatrix,temp);

		mMatrix = mat4.scale(mMatrix, [100, 100, 100]);
		gl.useProgram(shaderProgram1);
		drawBox();
		mMatrix = mat4.scale(mMatrix, [0.01, 0.01, 0.01]);


		gl.useProgram(shaderProgram);

		mat4.identity(mMatrix);
		mMatrix=mat4.multiply(mMatrix,temp,mMatrix);
		drawTable();

		mat4.identity(mMatrix);
		mMatrix=mat4.multiply(mMatrix,temp,mMatrix);
		mMatrix = mat4.scale(mMatrix, [0.08, 0.08, 0.08]);
		mMatrix = mat4.translate(mMatrix,[-4,11,-10]);
		color = [0, 0, 0, 1.0];
		drawObject(color);

		mat4.identity(mMatrix);
		mMatrix=mat4.multiply(mMatrix,temp,mMatrix);
		drawEarth();

		mat4.identity(mMatrix);
		mMatrix=mat4.multiply(mMatrix,temp,mMatrix);
		drawRefract();

		mat4.identity(mMatrix);
		mMatrix=mat4.multiply(mMatrix,temp,mMatrix);
		drawInnerSphere();

		mat4.identity(mMatrix);
		mMatrix=mat4.multiply(mMatrix,temp,mMatrix);
		drawGrid();

		animationRequestId = requestAnimationFrame(animate);
	}
	animate();

}


// This is the entry point from the html
function webGLStart() 
{
	canvas = document.getElementById("assign3");

	initGL(canvas);
	gl.enable(gl.DEPTH_TEST);

  	initSkyBox();
	shaderProgram1 = initShaders(skyBoxVertex, skyBoxFragment);
	aPositionLocation1 = gl.getAttribLocation(shaderProgram1, "aPosition");
	uMMatrixLocation1 = gl.getUniformLocation(shaderProgram1, "uMMatrix");
	uPMatrixLocation1 = gl.getUniformLocation(shaderProgram1, "uPMatrix");
	uVMatrixLocation1 = gl.getUniformLocation(shaderProgram1, "uVMatrix");
	uTextureLocation1 = gl.getUniformLocation(shaderProgram1, "cubeMap");
	

	initCubeBuffer();
	initSphereBuffer();
	initCubeMap();
	initObject();
	shaderProgram = initShaders(vertexShaderCode, fragShaderCode);
	aNormalLocation = gl.getAttribLocation(shaderProgram, "aNormal");
	aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
	aTexCoordLocation = gl.getAttribLocation(shaderProgram, "aTexCoords");

	uColorLocation = gl.getUniformLocation(shaderProgram, "objColor");
	uLightLocation = gl.getUniformLocation(shaderProgram, "uLightDirection");

	uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
	uPMatrixLocation = gl.getUniformLocation(shaderProgram, "uPMatrix");
	uVMatrixLocation = gl.getUniformLocation(shaderProgram, "uVMatrix");
	uWNMatrixLocation =  gl.getUniformLocation(shaderProgram, "uWNMatrix");

	uTextureLocation = gl.getUniformLocation(shaderProgram, "cubeMap");
	uTexture2DLocation = gl.getUniformLocation(shaderProgram, "imageTexture");
	reflectFactorLocation = gl.getUniformLocation(shaderProgram, "reflectFactor");
	uEyePosLocation = gl.getUniformLocation(shaderProgram, "camera");
	refractLocation = gl.getUniformLocation(shaderProgram, 'uRefract');
	phongLocation = gl.getUniformLocation(shaderProgram, 'Phongcheck');
	FenceLocation = gl.getUniformLocation(shaderProgram, 'Fencecheck');



	wood_tex = initTextures("texture_and_other_files/wood_texture.jpg");
	globe_tex = initTextures("texture_and_other_files/earthmap.jpg");
	fence_tex = initTextures("texture_and_other_files/fence_alpha.png");
}
