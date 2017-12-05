const nodemailer = require('nodemailer')

var canvas, bgcanvas, rect, scaleX, scaleY, tool, defectToWrite, symbolToDraw, touchscreen, interaction, mouseX, mouseY;
var customInputArray = new Array();

function help(text) { // maybe this should be in refresh and ref tool.help
	document.getElementById("help").innerHTML = text;
}

var doc = new jsPDF({
	orientation: 'landscape',
	unit: 'cm',
	format: 'a4'
});

function snap(x, y, u, v) {
	var target = {
		x: x,
		y: y
	};
	var origin = {
		x: u,
		y: v
	};
	var snapped = {};
	var snapper = 1;
	var snap2 = 1;
	if (drawing.drawing.snap > 0) {
		snapper = drawing.drawing.snap;
	}
	if (drawing.drawing.lensnap > 0) {
		snap2 = drawing.drawing.lensnap;
	}
	var grid = {};

	grid.x = Math.round(target.x / snapper) * snapper;
	grid.y = Math.round(target.y / snapper) * snapper;
	grid.d = Math.sqrt(Math.pow(target.x - grid.x, 2) + Math.pow(target.y - grid.y, 2));

	if (drawing.drawing.endsnap > 0) {
		// if grid snap is off initialize this to the first point before looping
		if (snapper === 1) {
			grid.x = drawing.drawing.points[0][0];
			grid.y = drawing.drawing.points[0][1];
			grid.d = Math.sqrt(Math.pow(target.x - drawing.drawing.points[0][0], 2) + Math.pow(target.y - drawing.drawing.points[0][1], 2));
		}
		//loop through points
		for (var i = 0; i < drawing.drawing.points.length; i++) {
			var dist = Math.sqrt(Math.pow(target.x - drawing.drawing.points[i][0], 2) + Math.pow(target.y - drawing.drawing.points[i][1], 2));
			if (dist <= grid.d) {
				grid.x = drawing.drawing.points[i][0];
				grid.y = drawing.drawing.points[i][1];
				grid.d = dist;
			}
		}
	}
	snapped.x = grid.x;
	snapped.y = grid.y;
	var coordX = Math.round(snapped.x * 1000 / drawing.drawing.grid) / 100;
	var coordY = Math.round(snapped.y * 1000 / drawing.drawing.grid) / 100;
	if (origin.x !== undefined && origin.y !== undefined) {
		var angle = {};
		var a = Math.atan2((target.y - origin.y), (target.x - origin.x));
		if (drawing.drawing.anglesnap > 0) {
			a = Math.round((a * 180 / Math.PI) / drawing.drawing.anglesnap) * drawing.drawing.anglesnap;
		} else {
			a = a * 180 / Math.PI;
		}
		var r = Math.sqrt(Math.pow(target.x - origin.x, 2) + Math.pow(target.y - origin.y, 2));
		r = Math.round(r / snap2) * snap2;
		//use new a and r to calculate xy from origin
		angle.x = Math.cos(a * Math.PI / 180) * r + origin.x;
		angle.y = Math.sin(a * Math.PI / 180) * r + origin.y;
		angle.d = Math.sqrt(Math.pow(target.x - angle.x, 2) + Math.pow(target.y - angle.y, 2));
		if (drawing.drawing.anglesnap > 0 || snap2 > 1) {
			if (angle.d <= grid.d || (snapper == 1 && drawing.drawing.endsnap == 0)) {
				snapped.x = angle.x;
				snapped.y = angle.y - 270;
				coordX = Math.round(r * 1000 / drawing.drawing.grid) / 1000;
				if (a > 0) {
					a = a - 360;
				}
				coordY = Math.round(a * -1000) / 1000 + "&deg;";
			}
		}
	}
	return {
		x: snapped.x,
		y: snapped.y
	};
}
var drawing = new Object();
drawing.drawing = new Object();
drawing.drawing.grid = 100 / .6;
drawing.drawing.divisions = 10;
drawing.drawing.gridsnap = .5;
drawing.drawing.lengthsnap = 0;
drawing.drawing.lensnap = drawing.drawing.grid / drawing.drawing.divisions * drawing.drawing.lengthsnap;
drawing.drawing.anglesnap = 0;
drawing.drawing.snap = drawing.drawing.grid / drawing.drawing.divisions * drawing.drawing.gridsnap;
drawing.drawing.endsnap = 0;
drawing.drawing.points = [];
drawing.drawing.objects = [];
drawing.undo = function() {
	this.drawing.objects.splice(-1, 1);
	this.refresh();
}
drawing.clear = function() {
	this.drawing.objects.length = 0;
	this.refresh();
}
drawing.refresh = function() {
	canvas.canvas.width = document.documentElement.clientWidth; //window.innerWidth;
	canvas.canvas.height = Math.max(document.body.clientHeight, document.documentElement.clientHeight); //window.innerHeight;
	canvas.translate(0.5, 0.5);
	bgcanvas.canvas.width = document.body.clientWidth - canvas.canvas.style.marginLeft; //window.innerWidth;
	bgcanvas.canvas.height = Math.max(document.body.clientHeight, document.documentElement.clientHeight); //window.innerHeight;
	bgcanvas.translate(0.5, 0.5);
	canvas.clearRect(0, 0, canvas.canvas.width, canvas.canvas.height);
	bgcanvas.fillStyle = "#fff";
	bgcanvas.fillRect(0, 0, bgcanvas.canvas.width - canvas.offsetLeft, bgcanvas.canvas.height - canvas.offsetTop);
	canvas.fillStyle = "#ffa0a0";
	canvas.lineCap = "square";
	if (this.drawing.grid === 0 || this.drawing.divisions === 0) {
		return; // otherwise you crash your browser
	}
	document.getElementById("grid").value = Math.round(100 * 100 / drawing.drawing.grid) / 100;
	document.getElementById("divisions").value = drawing.drawing.divisions;
	document.getElementById("gridsnap").value = drawing.drawing.gridsnap;
	document.getElementById("lengthsnap").value = drawing.drawing.lengthsnap;
	document.getElementById("anglesnap").value = drawing.drawing.anglesnap;
	document.getElementById("endsnap").value = drawing.drawing.endsnap;
	var v, h;
	bgcanvas.beginPath();
	v = this.drawing.grid / this.drawing.divisions;
	while (v < bgcanvas.canvas.width) {
		bgcanvas.moveTo(Math.round(v), 0);
		bgcanvas.lineTo(Math.round(v), bgcanvas.canvas.height);
		v = v + (this.drawing.grid / this.drawing.divisions);
	}
	h = this.drawing.grid / this.drawing.divisions;
	while (Math.round(h) < bgcanvas.canvas.height) {
		bgcanvas.moveTo(0, Math.round(h));
		bgcanvas.lineTo(bgcanvas.canvas.width, h);
		h = h + (this.drawing.grid / this.drawing.divisions);
	}
	bgcanvas.lineWidth = 2;
	bgcanvas.strokeStyle = "#E3F1FE";
	bgcanvas.stroke();
	bgcanvas.beginPath();
	v = this.drawing.grid;
	while (v < bgcanvas.canvas.width) {
		bgcanvas.moveTo(Math.round(v), 0);
		bgcanvas.lineTo(Math.round(v), bgcanvas.canvas.height);
		v = v + this.drawing.grid;
	}
	h = this.drawing.grid;
	while (h < bgcanvas.canvas.height) {
		bgcanvas.moveTo(0, Math.round(h));
		bgcanvas.lineTo(bgcanvas.canvas.width, Math.round(h));
		h = h + this.drawing.grid;
	}
	bgcanvas.lineWidth = 1;
	bgcanvas.strokeStyle = "#BEDBF8";
	bgcanvas.stroke();
	canvas.lineWidth = 2;
	canvas.strokeStyle = "#333";
	this.drawing.objects.forEach(function(obj) {
		canvas.beginPath();
		if (obj.type === "line") {
			if (obj.x === obj.u && obj.y === obj.v) {
				canvas.arc(obj.x, obj.y, 0.75, 0, 2 * Math.PI, true);
				canvas.stroke();
			} else {
				canvas.moveTo(obj.x, obj.y);
				canvas.lineTo(obj.u, obj.v);
				canvas.stroke();
			}
		} else if(obj.type === "highlight"){
			canvas.moveTo(obj.x, obj.y);
			canvas.fillStyle = 'rgba(204, 255, 21, 0.5)';
			canvas.fillRect(obj.x, obj.y, (obj.u - obj.x), (obj.v - obj.y));
			canvas.fillStyle = "#ffa0a0";
		}	else if(obj.type === "defectOne"){
			canvas.moveTo(obj.x, obj.y);
			canvas.font = "bold 20px Arial";
			canvas.fillStyle = "black";
			canvas.fillText("1", obj.x, obj.y);
			canvas.fillStyle = "#ffa0a0";
		}	else if(obj.type === "defectTwo"){
			canvas.moveTo(obj.x, obj.y);
			canvas.font = "bold 20px Arial";
			canvas.fillStyle = "black";
			canvas.fillText("2", obj.x, obj.y);
			canvas.fillStyle = "#ffa0a0";
		} else if(obj.type === "defectThree"){
			canvas.moveTo(obj.x, obj.y);
			canvas.font = "bold 20px Arial";
			canvas.fillStyle = "black";
			canvas.fillText("3", obj.x, obj.y);
			canvas.fillStyle = "#ffa0a0";
		} else if(obj.type === "defectFour"){
			canvas.moveTo(obj.x, obj.y);
			canvas.font = "bold 20px Arial";
			canvas.fillStyle = "black";
			canvas.fillText("4", obj.x, obj.y);
			canvas.fillStyle = "#ffa0a0";
		} else if(obj.type === "defectFive"){
			canvas.moveTo(obj.x, obj.y);
			canvas.font = "bold 20px Arial";
			canvas.fillStyle = "black";
			canvas.fillText("5", obj.x, obj.y);
			canvas.fillStyle = "#ffa0a0";
		} else if(obj.type === "defectSixA"){
			canvas.moveTo(obj.x, obj.y);
			canvas.font = "bold 20px Arial";
			canvas.fillStyle = "black";
			canvas.fillText("6A", obj.x, obj.y);
			canvas.fillStyle = "#ffa0a0";
		} else if(obj.type === "defectSixB"){
			canvas.moveTo(obj.x, obj.y);
			canvas.font = "bold 20px Arial";
			canvas.fillStyle = "black";
			canvas.fillText("6B", obj.x, obj.y);
			canvas.fillStyle = "#ffa0a0";
		} else if(obj.type === "defectSixC"){
			canvas.moveTo(obj.x, obj.y);
			canvas.font = "bold 20px Arial";
			canvas.fillStyle = "black";
			canvas.fillText("6C", obj.x, obj.y);
			canvas.fillStyle = "#ffa0a0";
		} else if(obj.type === "defectSixD"){
			canvas.moveTo(obj.x, obj.y);
			canvas.font = "bold 20px Arial";
			canvas.fillStyle = "black";
			canvas.fillText("6D", obj.x, obj.y);
			canvas.fillStyle = "#ffa0a0";
		} else if(obj.type === "defectSixE"){
			canvas.moveTo(obj.x, obj.y);
			canvas.font = "bold 20px Arial";
			canvas.fillStyle = "black";
			canvas.fillText("6E", obj.x, obj.y);
			canvas.fillStyle = "#ffa0a0";
		} else if(obj.type === "defectSix"){
			canvas.moveTo(obj.x, obj.y);
			canvas.font = "bold 20px Arial";
			canvas.fillStyle = "black";
			canvas.fillText("6", obj.x, obj.y);
			canvas.fillStyle = "#ffa0a0";
		} else if(customInputArray.includes(obj.type)){
			canvas.moveTo(obj.x, obj.y);
			canvas.font = "bold 20px Arial";
			canvas.fillStyle = "black";
			canvas.fillText(obj.type, obj.x, obj.y);
			canvas.fillStyle = "#ffa0a0";
		} else if (obj.type === "arc") {
			canvas.arc(obj.x, obj.y, obj.r, obj.a, obj.b, true);
			canvas.stroke();
		} else if (obj.type === "eraser") {
			canvas.globalCompositeOperation = 'destination-out';
			canvas.arc(obj.x, obj.y - canvas.canvas.height, obj.r, 0, 2 * Math.PI, true);
			canvas.shadowOffsetY = canvas.canvas.height;
			canvas.shadowColor = '#000';
			canvas.shadowBlur = obj.r / 4;
			canvas.fill();
			canvas.globalCompositeOperation = 'source-over';
			canvas.shadowOffsetY = 0;
			canvas.shadowBlur = 0;
		} else if(obj.type === "Utility Cover"){
			var baseImage = new Image();
			baseImage.src = "../images/" + obj.type + ".png";
			canvas.moveTo(obj.x, obj.y);
			canvas.drawImage(baseImage, obj.x, obj.y, 20, 20);
		} else if(obj.type === "Hydrant"){
			var baseImage = new Image();
			baseImage.src = "../images/" + obj.type + ".png";
			canvas.moveTo(obj.x, obj.y);
			canvas.drawImage(baseImage, obj.x, obj.y, 20, 20);
		} else if(obj.type === "SignMeter"){
			var baseImage = new Image();
			baseImage.src = "../images/" + obj.type + ".png";
			canvas.moveTo(obj.x, obj.y);
			canvas.drawImage(baseImage, obj.x, obj.y, 20, 20);
		} else if(obj.type === "MailBox"){
			var baseImage = new Image();
			baseImage.src = "../images/" + obj.type + ".png";
			canvas.moveTo(obj.x, obj.y);
			canvas.drawImage(baseImage, obj.x, obj.y, 30, 30);
		} else if(obj.type === "Telephone"){
			var baseImage = new Image();
			baseImage.src = "../images/" + obj.type + ".png";
			canvas.moveTo(obj.x, obj.y);
			canvas.drawImage(baseImage, obj.x, obj.y, 20, 20);
		} else if(obj.type === "CellarDoors"){
			var baseImage = new Image();
			baseImage.src = "../images/" + obj.type + ".png";
			canvas.moveTo(obj.x, obj.y);
			canvas.drawImage(baseImage, obj.x, obj.y, 20, 20);
		} else if(obj.type === "Pole"){
			var baseImage = new Image();
			baseImage.src = "../images/" + obj.type + ".png";
			canvas.moveTo(obj.x, obj.y);
			canvas.drawImage(baseImage, obj.x, obj.y, 20, 20);
		} else if(obj.type === "Grating"){
			var baseImage = new Image();
			baseImage.src = "../images/" + obj.type + ".png";
			canvas.moveTo(obj.x, obj.y);
			canvas.drawImage(baseImage, obj.x, obj.y, 30, 30);
		} else if(obj.type === "TreePit"){
			var baseImage = new Image();
			baseImage.src = "../images/" + obj.type + ".png";
			canvas.moveTo(obj.x, obj.y);
			canvas.drawImage(baseImage, obj.x, obj.y, 20, 20);
		} else if(obj.type === "Driveway"){
			var baseImage = new Image();
			baseImage.src = "../images/" + obj.type + ".png";
			canvas.moveTo(obj.x, obj.y);
			canvas.drawImage(baseImage, obj.x, obj.y, 40, 40);
		}
	});
	canvas.strokeStyle = "#D6D6D6";
}

drawing.import = function() {
  var upload = document.createElement("input");
  upload.setAttribute("type", "file");
  upload.onchange = function() {
    var reader = new FileReader();
    var file = this.files[0];
    reader.readAsText(file, "utf-8");
    reader.onload = function (e) {
      var temp = JSON.parse(e.target.result);
      drawing.drawing = temp.drawing;
      // for previous version saves
      if(drawing.drawing.lengthsnap === undefined) {
        drawing.drawing.lengthsnap = 1;
        drawing.drawing.lensnap = drawing.drawing.grid / drawing.drawing.divisions * drawing.drawing.lengthsnap;
      }
      if(drawing.drawing.name === undefined) {
        drawing.drawing.name = "Drawing";
      }
			document.getElementById("contractNum").value = temp.contract;
			document.getElementById("sheetOne").value = temp.sheetOne;
			document.getElementById("sheetTwo").value = temp.sheetTwo;
			document.getElementById("property-address1").value = temp.address;
			document.getElementById("borough").value = temp.borough;
			document.getElementById("bldgCl").value = temp.buildingClass;
			document.getElementById("block").value = temp.block;
			document.getElementById("lot").value = temp.lot;
			document.getElementById("cb").value = temp.cb;
			document.getElementById("inspectorInitials").value = temp.inspector;
			document.getElementById("dateOfInsp").value = temp.date;
			document.getElementById("dim").value = temp.dim;
			document.getElementById("swEst").value = temp.estimate;
			document.getElementById("extraComm").value = temp.extraComm;
			document.getElementById("curbEst").value = temp.curb;
			document.getElementById("streetOne").value = temp.streetOne;
			document.getElementById("streetTwo").value = temp.streetTwo;
			document.getElementById("streetThree").value = temp.streetThree;
      drawing.refresh();
    }
  }
  upload.click();
}
drawing.export = function() {
  var name = document.getElementById("borough").value + "-" + document.getElementById("block").value + "-" + document.getElementById("lot").value;

  var temp = new Object();
  temp.drawing = this.drawing;
  temp.drawing.name = name;
	temp.contract = document.getElementById("contractNum").value;
	temp.sheetOne = document.getElementById("sheetOne").value;
	temp.sheetTwo = document.getElementById("sheetTwo").value;
	temp.address = document.getElementById("property-address1").value;
	temp.borough = document.getElementById("borough").value;
	temp.buildingClass = document.getElementById("bldgCl").value;
	temp.block = document.getElementById("block").value;
	temp.lot = document.getElementById("lot").value;
	temp.cb = document.getElementById("cb").value;
	temp.inspector = document.getElementById("inspectorInitials").value;
	temp.date = document.getElementById("dateOfInsp").value;
	temp.dim = document.getElementById("dim").value;
	temp.estimate = document.getElementById("swEst").value;
	temp.extraComm = document.getElementById("extraComm").value;
	temp.curb = document.getElementById("curbEst").value;
	temp.streetOne = document.getElementById("streetOne").value;
	temp.streetTwo = document.getElementById("streetTwo").value;
	temp.streetThree = document.getElementById("streetThree").value;
  var json = encodeURIComponent(JSON.stringify(temp));

	window.location.href = ('mailto:?subject=' + name + '&body=' + json);

  var link = document.createElement("a");
  link.setAttribute("href", "data:text/json;charset=utf-8," + json);
  link.setAttribute("download", name + ".json");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

drawing.closeOptions = function() {
	document.getElementById("options").style.display = 'none';
}

function hideAside() {
	document.getElementById("line-button").style.display = 'none';
	document.getElementById("arc-button").style.display = 'none';
	document.getElementById("eraser-button").style.display = 'none';
	document.getElementById("highlight-button").style.display = 'none';
	document.getElementById("undo-button").style.display = 'none';
	document.getElementById("options-button").style.display = 'none';
	document.getElementById("help").style.display = 'none';
	document.getElementById("coords").style.display = 'none';
	document.getElementById("defectsSymbols").style.display = 'none';
	document.getElementById("newLot").style.display = 'none';
	document.getElementById("newPage").style.display = 'none';
	document.getElementById("customInput").style.display = 'none';
	document.getElementById("customInputButton").style.display = 'none';
	document.getElementById("newBlock").style.display = 'none';
}

function showAside() {
	document.getElementById("line-button").style.display = 'block';
	document.getElementById("arc-button").style.display = 'block';
	document.getElementById("eraser-button").style.display = 'block';
	document.getElementById("undo-button").style.display = 'block';
	document.getElementById("options-button").style.display = 'block';
	document.getElementById("help").style.display = 'block';
	document.getElementById("coords").style.display = 'block';
	document.getElementById("highlight-button").style.display = 'block';
	document.getElementById("defectsSymbols").style.display = 'flex';
	document.getElementById("newLot").style.display = 'block';
	document.getElementById("newPage").style.display = 'block';
	document.getElementById("customInput").style.display = 'flex';
	document.getElementById("customInputButton").style.display = 'flex';
	document.getElementById("newBlock").style.display = 'block';
}

function showHeaderFooter(){
		document.getElementById("header").style.display = 'inline-flex';
		document.getElementById("fill_in").style.display = 'inline-flex';
		document.getElementById("defects").style.display = 'block';
		document.getElementById("bottomKey").style.display = 'block';
		//showAside();
}

function hideHeaderFooter(){
	document.getElementById("header").style.display = 'none';
	document.getElementById("fill_in").style.display = 'none';
	document.getElementById("defects").style.display = 'none';
	document.getElementById("bottomKey").style.display = 'none';
	document.getElementById("bgcanvas").style.removeProperty('marginTop');
	document.getElementById("canvas").style.removeProperty('marginTop');
}

function scalePage(){
	document.getElementById("pirPage").style.width = '100vw';
	document.getElementById("pirPage").style.height = '100vh';
	document.getElementById("bgcanvas").style.display = 'none';
	document.getElementById("leftSideImage").style.zIndex = "100";

	/*//document.getElementById("canvas").style.width = '1900px';
	//document.getElementById("canvas").style.height = '750px';
	//document.getElementById("canvas").style.marginRight = '10px;'
	//document.getElementById("canvas").style.height = "21.6cm";
	document.getElementById("canvas").style.width = "1900px";

	document.getElementById("bottomKey").style.width = '1900px';
	document.getElementById("bottomKey").style.position = 'relative';
	document.getElementById("bottomKey").style.top = '600px';

	document.getElementById("defects").style.width = '1900px';
	document.getElementById("defects").style.fontSize = '20px';

	document.getElementById("fill_in").style.width = '1900px';
	document.getElementById("fill_in").style.fontSize = '20px';

	document.getElementById("header").style.width = '1900px';

	document.getElementById("comments").style.width = '1900px';

	document.getElementById("key").style.width = '1900px';

	document.getElementById("typeofinspection").style.fontSize = '14px';

	document.getElementById("vertical_text").style.fontSize = '14px';

	document.getElementById("streetThree").style.bottom = '-600px';
*/
}

function unscalePage(){
	document.getElementById("pirPage").style.width = '100vw';
	document.getElementById("pirPage").style.height = '100vh';
	document.getElementById("bgcanvas").style.width = '98.75vw';
	document.getElementById("bgcanvas").style.display = 'block';
	document.getElementById("leftSideImage").style.zIndex = "0";

	/*document.getElementById("header").style.width = '100vw';

	//document.getElementById("canvas").style.removeProperty('marginRight');
	//document.getElementById("canvas").style.height = "100vh";
	document.getElementById("canvas").style.width = '98.75vw';
	document.getElementById("bottomKey").style.width = '100vw';
	document.getElementById("bottomKey").style.position = 'absolute';
	document.getElementById("bottomKey").style.bottom = '0';
	document.getElementById("bottomKey").style.removeProperty('top');

	document.getElementById("defects").style.width = '100vw';
	document.getElementById("defects").style.fontSize = '1vw';

	document.getElementById("fill_in").style.width = '100vw';
	document.getElementById("fill_in").style.fontSize = '1vw';

	document.getElementById("comments").style.width = '100vw';

	document.getElementById("typeofinspection").style.fontSize = '.8vh';

	document.getElementById("vertical_text").style.fontSize = '1vh';

	document.getElementById("key").style.width = '100vw';

	document.getElementById("streetThree").style.bottom = '-50vh';

	canvas.restore();*/
}

drawing.hideYellowBox = function(){
	document.getElementById("yellowBox").style.display = 'none';
	document.getElementById("curbOne").style.bottom = '5vh';
}

drawing.showYellowBox = function(){
	document.getElementById("yellowBox").style.display = 'flex';
	document.getElementById("curbOne").style.removeProperty('bottom');
}

drawing.savePDF = function() {
	var name = document.getElementById("borough").value + "-" + document.getElementById("block").value + "-" + document.getElementById("lot").value;
	drawing.closeOptions();
	hideAside();
	scalePage();

	var pirPage = document.getElementById("pirPage");

	doc.addHTML(pirPage, 0.5, 0.5, function() {
		showAside();
		doc.save(name + ".pdf");
		unscalePage();
	});
}

var mouse = new Object();
mouse.click = function(e) {
	if (e.touches) {
		//mouseX = Math.round(e.changedTouches[0].pageX * $("canvas").width() + document.documentElement.scrollLeft * scaleX);
		//mouseY = Math.round(e.changedTouches[0].pageY * $("canvas").height() + document.documentElement.scrollTop * scaleY);
		mouseX = Math.round((e.changedTouches[0].pageX - rect.left) / (rect.right - rect.left) * $("canvas").width() + document.documentElement.scrollLeft * scaleX);
		mouseY = Math.round((e.changedTouches[0].pageY - rect.top) / (rect.bottom - rect.top) * $("canvas").height() + document.documentElement.scrollTop * scaleY);
	} else {
		mouseX = Math.round((e.clientX - rect.left) / (rect.right - rect.left) * $("canvas").width() + document.documentElement.scrollLeft * scaleX);
		mouseY = Math.round((e.clientY - rect.top) / (rect.bottom - rect.top) * $("canvas").height() + document.documentElement.scrollTop * scaleY);
	}
	tool.click(mouseX, mouseY);
}
mouse.move = function(e) {
	if (e.touches) {
		//mouseX = Math.round(e.changedTouches[0].pageX * $("canvas").width() + document.documentElement.scrollLeft * scaleX);
		//mouseY = Math.round(e.changedTouches[0].pageY * $("canvas").height() + document.documentElement.scrollTop * scaleY);
		mouseX = Math.round((e.changedTouches[0].pageX - rect.left) / (rect.right - rect.left) * $("canvas").width() + document.documentElement.scrollLeft * scaleX);
		mouseY = Math.round((e.changedTouches[0].pageY - rect.top) / (rect.bottom - rect.top) * $("canvas").height() + document.documentElement.scrollTop * scaleY);
		e.preventDefault();
	} else {
		mouseX = Math.round((e.clientX - rect.left) / (rect.right - rect.left) * $("canvas").width() + document.documentElement.scrollLeft + document.body.scrollLeft * scaleX);
		mouseY = Math.round((e.clientY - rect.top) / (rect.bottom - rect.top) * $("canvas").height() + document.documentElement.scrollTop + document.body.scrollTop * scaleY);
	}
	drawing.refresh();
	tool.move(mouseX, mouseY);
}
mouse.hide = function(e) {
	document.getElementById("coords").style.display = "none";
	drawing.refresh();
}

function Line() {
	help(interaction + " to set new line start point");
	this.points = 0;
	this.coords = {};
	this.coords.type = "line";
	this.click = function(x, y) {
		this.points = this.points + 1;
		if (this.points === 1) {
			help(interaction + " to set line end point");
		} else if (this.points === 2) {
			this.save();
			this.reset();
		}
	}
	this.reset = function() {
		tool = new Line();
		drawing.refresh();
		tool.move(mouseX, mouseY);
	}
	this.move = function(x, y) {
		var snapped;
		if (this.points === 0) {
			snapped = snap(x, y);
			this.coords.x = snapped.x;
			this.coords.y = snapped.y;
		} else if (this.points === 1) {
			snapped = snap(x, y, this.coords.x, this.coords.y);
			this.coords.u = snapped.x;
			this.coords.v = snapped.y;
			canvas.beginPath();
			canvas.moveTo(this.coords.x, this.coords.y);
			canvas.lineTo(this.coords.u, this.coords.v);
			canvas.stroke();
		}
		canvas.beginPath();
		canvas.arc(snapped.x, snapped.y, 2.5, 0, 2 * Math.PI, true);
		canvas.fill();
	}
	this.save = function() {
		drawing.drawing.objects.push(this.coords);
		drawing.drawing.points.push([this.coords.x, this.coords.y]);
		drawing.drawing.points.push([this.coords.u, this.coords.v]);
		mouse.hide();
	}
}

function Highlight() {
	help(interaction + " to set new highlight start point");
	this.points = 0;
	this.coords = {};
	this.coords.type = "highlight";
	this.click = function(x, y) {
		this.points = this.points + 1;
		if (this.points === 1) {
			help(interaction + " to set highlight end point");
		} else if (this.points === 2) {
			this.save();
			this.reset();
		}
	}
	this.reset = function() {
		tool = new Highlight();
		drawing.refresh();
		tool.move(mouseX, mouseY);
	}
	this.move = function(x, y) {
		var snapped;
		if (this.points === 0) {
			snapped = snap(x, y);
			this.coords.x = snapped.x;
			this.coords.y = snapped.y;
		} else if (this.points === 1) {
			snapped = snap(x, y, this.coords.x, this.coords.y);
			this.coords.u = snapped.x;
			this.coords.v = snapped.y;
			canvas.beginPath();
			canvas.fillStyle = 'rgba(204, 255, 21, 0.5)';
			canvas.fillRect(this.coords.x, this.coords.y, (this.coords.u - this.coords.x), (this.coords.v - this.coords.y));
			canvas.fillStyle = "#ffa0a0";
		}
		canvas.beginPath();
		canvas.arc(x, y, 2.5, 0, 2 * Math.PI, true);
		canvas.fill();
	}
	this.save = function() {
		drawing.drawing.objects.push(this.coords);
		drawing.drawing.points.push([this.coords.x, this.coords.y]);
		drawing.drawing.points.push([this.coords.u, this.coords.v]);
		mouse.hide();
	}
}

function Text() {
	help(interaction + " to place a " + defectToWrite + " on the grid.");
	this.points = 0;
	this.coords = {};
	if(defectToWrite === "1"){
		this.coords.type = "defectOne";
	} else if(defectToWrite === "2"){
		this.coords.type = "defectTwo";
	} else if(defectToWrite === "3"){
		this.coords.type = "defectThree";
	} else if(defectToWrite === "4"){
		this.coords.type = "defectFour";
	}else if(defectToWrite === "5"){
		this.coords.type = "defectFive";
	}else if(defectToWrite === "6A"){
		this.coords.type = "defectSixA";
	}else if(defectToWrite === "6B"){
		this.coords.type = "defectSixB";
	}else if(defectToWrite === "6C"){
		this.coords.type = "defectSixC";
	}else if(defectToWrite === "6D"){
		this.coords.type = "defectSixD";
	}else if(defectToWrite === "6E"){
		this.coords.type = "defectSixE";
	}else if(defectToWrite === "6"){
		this.coords.type = "defectSix";
	} else{
		this.coords.type = defectToWrite;
	}
	this.click = function(x, y) {
		this.save();
		this.reset();
	}
	this.reset = function() {
		tool = new Text();
		drawing.refresh();
		tool.move(mouseX, mouseY);
	}
	this.move = function(x, y) {
		if (this.points === 0) {
			this.coords.x = x;
			this.coords.y = y;
		}
		canvas.beginPath();
		canvas.arc(x, y, 2.5, 0, 2 * Math.PI, true);
		canvas.fill();
	}
	this.save = function() {
		drawing.drawing.objects.push(this.coords);
		drawing.drawing.points.push([this.coords.x, this.coords.y]);
		mouse.hide();
	}
}

function Arc() {
	help(interaction + " to set new arc center point");
	this.points = 0;
	this.coords = {};
	this.coords.type = "arc";
	this.touch = function(x,y){
		this.points = this.points + 1;
		if (this.points === 1) {
			help(interaction + " to set arc radius and start angle");
		} else if (this.points === 2) {
			help(interaction + " to set arc end angle");
		} else if (this.points === 3) {
			this.save();
			this.reset();
		}
	}
	this.click = function(x, y) {
		this.points = this.points + 1;
		if (this.points === 1) {
			help(interaction + " to set arc radius and start angle");
		} else if (this.points === 2) {
			help(interaction + " to set arc end angle");
		} else if (this.points === 3) {
			this.save();
			this.reset();
		}
	}
	this.reset = function() {
		tool = new Arc();
		drawing.refresh();
		tool.move(mouseX, mouseY);
	}
	this.move = function(x, y) {
		var snapped;
		if (this.points === 0) {
			snapped = snap(x, y);
			this.coords.x = snapped.x;
			this.coords.y = snapped.y;
		} else if (this.points === 1) {
			snapped = snap(x, y, this.coords.x, this.coords.y);
			this.coords.a = Math.atan2((snapped.y - this.coords.y), (snapped.x - this.coords.x));
			this.coords.r = Math.round(Math.sqrt(Math.pow(snapped.x - this.coords.x, 2) + Math.pow(snapped.y - this.coords.y, 2)) * 1000) / 1000;
			canvas.beginPath();
			canvas.arc(this.coords.x, this.coords.y, this.coords.r, 0, 2 * Math.PI, true);
			canvas.moveTo(this.coords.x, this.coords.y);
			canvas.lineTo(snapped.x, snapped.y);
			canvas.stroke();
		} else if (this.points === 2) {
			snapped = snap(x, y, this.coords.x, this.coords.y);
			this.coords.b = Math.atan2((snapped.y - this.coords.y), (snapped.x - this.coords.x));
			if (this.coords.b === this.coords.a) {
				this.coords.b = this.coords.a - 2 * Math.PI;
			}
			canvas.beginPath();
			canvas.arc(this.coords.x, this.coords.y, this.coords.r, this.coords.a, this.coords.b, true);
			canvas.moveTo(this.coords.x, this.coords.y);
			canvas.lineTo(snapped.x, snapped.y);
			canvas.stroke();
			// left cause it is prettier than the output of snap function
			var d = this.coords.b - this.coords.a;
			d = Math.round(d * -360 * 1000 / (2 * Math.PI)) / 1000;
			if (d < 0) {
				d = d + 360;
			}
			document.getElementById("coords").innerHTML = d + "&deg;";
		}
		canvas.beginPath();
		canvas.arc(snapped.x, snapped.y, 2.5, 0, 2 * Math.PI, true);
		canvas.fill();
	}
	this.save = function() {
		drawing.drawing.objects.push(this.coords);
		drawing.drawing.points.push([this.coords.x, this.coords.y]);
		drawing.drawing.points.push([this.coords.x + this.coords.r * Math.cos(this.coords.a), this.coords.y + this.coords.r * Math.sin(this.coords.a)]);
		drawing.drawing.points.push([this.coords.x + this.coords.r * Math.cos(this.coords.b), this.coords.y + this.coords.r * Math.sin(this.coords.b)]);
		mouse.hide();
	}
}


function Eraser() {
	help(interaction + " to position eraser");
	this.points = 0;
	this.coords = {};
	this.coords.type = "eraser";
	this.click = function(x, y) {
		this.save();
		this.reset();
	}
	this.reset = function() {
		tool = new Eraser();
		drawing.refresh();
		tool.move(mouseX, mouseY);
	}
	this.move = function(x, y) {
		if (this.points === 0) {
			this.coords.x = x;
			this.coords.y = y;
			if (drawing.drawing.snap === 0) {
				this.coords.r = 16;
			} else {
				this.coords.r = drawing.drawing.snap - 1;
			}
			canvas.beginPath();
			canvas.arc(this.coords.x, this.coords.y, this.coords.r, 0, 2 * Math.PI, true);
			canvas.stroke();
		}
		canvas.beginPath();
		canvas.arc(x, y, 2.5, 0, 2 * Math.PI, true);
		canvas.fill();
	}
	this.save = function() {
		drawing.drawing.objects.push(this.coords);
		mouse.hide();
	}
}

function Symbol(){
	help(interaction + " to place a symbol.");
	this.points = 0;
	this.coords = {};
	if(symbolToDraw === "Utility Cover"){
			this.coords.type = "Utility Cover"
	} else if(symbolToDraw === "Hydrant"){
			this.coords.type = "Hydrant";
	} else if(symbolToDraw === "SignMeter"){
			this.coords.type = "SignMeter";
	} else if(symbolToDraw === "MailBox"){
			this.coords.type = "MailBox";
	} else if(symbolToDraw === "Telephone"){
			this.coords.type = "Telephone";
	} else if(symbolToDraw === "CellarDoors"){
			this.coords.type = "CellarDoors";
	} else if(symbolToDraw === "Pole"){
			this.coords.type = "Pole";
	} else if(symbolToDraw === "Grating"){
			this.coords.type = "Grating";
	} else if(symbolToDraw === "TreePit"){
			this.coords.type = "TreePit";
	} else if(symbolToDraw === "Driveway"){
			this.coords.type = "Driveway";
	} else if(symbolToDraw === "Non-Assessable"){
			this.coords.type = "Non-Assessable";
	}
	this.click = function(x,y){
		this.save();
		this.reset();
	}
	this.reset = function(){
		tool = new Symbol();
		drawing.refresh();
		tool.move(mouseX, mouseY);
	}
	this.move = function(x, y) {
		if (this.points === 0) {
			this.coords.x = x;
			this.coords.y = y;
		}
		canvas.beginPath();
		canvas.arc(x, y, 2.5, 0, 2 * Math.PI, true);
		canvas.fill();
	}
	this.save = function() {
		drawing.drawing.objects.push(this.coords);
		drawing.drawing.points.push([this.coords.x, this.coords.y]);
		mouse.hide();
	}
}

function makeCircle(id){
	var element = document.querySelector("#" + id);
	if(element.style.border === "0px solid black"){
		element.style.border = "2px solid black";
	} else {
		element.style.border = "0px solid black";
	}
}

window.addEventListener("load", function() {
	canvas = document.getElementById("canvas").getContext("2d");
	bgcanvas = document.getElementById("bgcanvas").getContext("2d");

	showHeaderFooter();

	var tempHeight = window.innerHeight;
	var tempRatio = canvas.width/canvas.height;
	var tempWidth = tempHeight * tempRatio;

	canvas.canvas.style.width = tempWidth + 'px';
	canvas.canvas.style.height = tempHeight + 'px';

	canvas.canvas.addEventListener("mousedown", mouse.click);
	canvas.canvas.addEventListener("mousemove", mouse.move);
	canvas.canvas.addEventListener("touchend", mouse.click);
	canvas.canvas.addEventListener("touchmove", mouse.move);
	canvas.canvas.addEventListener("mouseout", mouse.hide);
	var buttons = document.getElementsByTagName("button");
	Array.prototype.forEach.call(buttons, buttonHandler);
	var selects = document.getElementsByTagName("select");
	Array.prototype.forEach.call(selects, selectHandler);
	var links = document.getElementsByTagName("a");
	Array.prototype.forEach.call(links, linkHandler);
	var dialogs = document.getElementsByClassName("dialog");
	Array.prototype.forEach.call(dialogs, dialogHandler);
	document.getElementById("file-link").className = "active";
	document.getElementById("file").className = "active";
	rect = canvas.canvas.getBoundingClientRect(),
		scaleX = $("canvas").width() / rect.width,
		scaleY = $("canvas").height() / rect.height;
	if ('ontouchstart' in window) {
		touchscreen = "Yes";
		interaction = "Drag";
	} else {
		touchscreen = "No";
		interaction = "Click";
	}
	document.getElementById("help").innerHTML = interaction + " to set new line start point";
	tool = new Line();
	drawing.refresh();
});
window.addEventListener("resize", function() {
	drawing.refresh();
});

function buttonHandler(button) {
	button.addEventListener("click", buttonClick);
}

function selectHandler(select) {
	select.addEventListener("change", selectChange);
}

function linkHandler(link) {
	if (link.href.indexOf("#") > 0) {
		link.addEventListener("click", linkClick);
	}
}

function dialogHandler(dialog) {
	dialog.addEventListener("click", dialogClick);
}

function linkClick(e) {
	var old = document.getElementsByClassName("active");
	var i;
	for (i = old.length; i > 0; i--) {
		old[i - 1].className = "";
	}
	var section = e.target.href;
	section = section.substring(section.indexOf("#") + 1);
	document.getElementById(section).className = "active";
	e.target.className = "active";
	e.preventDefault();
}

function buttonClick(e) {
	var youClicked = {
		"line-button": function() {
			tool = new Line();
		},
		"arc-button": function() {
			tool = new Arc();
		},
		"highlight-button": function(){
			tool = new Highlight();
		},
		"symbol-button": function(){
			tool = new Symbol();
		},
		"eraser-button": function() {
			tool = new Eraser();
		},
		"defectOne": function() {
			defectToWrite = "1";
			tool = new Text();
		},
		"defectTwo": function() {
			defectToWrite = "2";
			tool = new Text();
		},
		"defectThree": function() {
			defectToWrite = "3";
			tool = new Text();
		},
		"defectFour": function() {
			defectToWrite = "4";
			tool = new Text();
		},
		"defectFive": function() {
			defectToWrite = "5";
			tool = new Text();
		},
		"defectSixA": function() {
			defectToWrite = "6A";
			tool = new Text();
		},
		"defectSixB": function() {
			defectToWrite = "6B";
			tool = new Text();
		},
		"defectSixC": function() {
			defectToWrite = "6C";
			tool = new Text();
		},
		"defectSixD": function() {
			defectToWrite = "6D";
			tool = new Text();
		},
		"defectSixE": function() {
			defectToWrite = "6E";
			tool = new Text();
		},
		"defectSix": function() {
			defectToWrite = "6";
			tool = new Text();
		},
		"utilCov": function(){
				symbolToDraw = "Utility Cover";
				tool = new Symbol();
		},
		"hydrant": function(){
				symbolToDraw = "Hydrant";
				tool = new Symbol();
		},
		"signMeter": function(){
				symbolToDraw = "SignMeter";
				tool = new Symbol();
		},
		"mailBox": function(){
				symbolToDraw = "MailBox";
				tool = new Symbol();
		},
		"telephone": function(){
				symbolToDraw = "Telephone";
				tool = new Symbol();
		},
		"cellarDoor": function(){
				symbolToDraw = "CellarDoors";
				tool = new Symbol();
		},
		"pole": function(){
				symbolToDraw = "Pole";
				tool = new Symbol();
		},
		"gratingVault": function(){
				symbolToDraw = "Grating";
				tool = new Symbol();
		},
		"tree": function(){
				symbolToDraw = "TreePit";
				tool = new Symbol();
		},
		"driveWay": function(){
				symbolToDraw = "Driveway";
				tool = new Symbol();
		},
		"nonAssessableFlagButton": function(){
				symbolToDraw = "Non-Assessable";
				tool = new Symbol();
		},
		"customInputButton": function(){
			defectToWrite = document.getElementById("customInput").value;
			customInputArray.push(defectToWrite);
			tool = new Text();
		},
		"undo-button": function() {
			drawing.undo();
		},
		"options-button": function() {
			document.getElementById("options").style.display = "block";
		},
		"options-close": function() {
			document.getElementById("options").style.display = "none";
		},
		"newBlock": function(){
			$('#sheet_input').val('');
			$('#property-address1').val('');
			$('#property-address2').val('');
			$('#lot').val('');
			$('#dim').val('');
			$('#swEst').val('');
			$('#extraComm').val('');
			drawing.clear();
		},
		"newLot": function(){
			$('input').val('');
			drawing.clear();
		},
		"newPage": function(){
			drawing.clear();
		},
		"info": function() {
			// var dpi = "<table><tr><td width=\"60%\">Window Width:</td><td>" + document.body.clientWidth;
			// dpi += "</td></tr><tr><td>Device Pixel Ratio:</td><td>" + window.devicePixelRatio;
			// dpi += "</td></tr><tr><td>Touch Screen:</td><td>" + touchscreen;
			// dpi += "</td></tr></table>";
			// document.getElementById("dpi").innerHTML = dpi;
			document.getElementById("drawingOptions").style.display = 'none';
			document.getElementById("appInfo").style.display = 'block';
		},
		"ok": function() {
			document.getElementById("appInfo").style.display = 'none';
		},
		"clear": function() {
			drawing.clear();
		},
		"save": function() {
			drawing.savePDF();
		},
		"fourPlusButton": function(){
			drawing.hideYellowBox();
		},
		"oneToThreeButton": function(){
			drawing.showYellowBox();
		},
		"export": function() {
			drawing.export();
		},
		"import": function() {
			drawing.import();
		},
		"showHeaderFooter": function() {
			showHeaderFooter();
		},
		"hideHeaderFooter": function(){
			hideHeaderFooter();
		}
	}
	youClicked[e.target.id]();
}

function dialogClick(e) {
	if (e.target.className === "dialog") {
		e.target.style.display = "none";
	}
}

function selectChange(e) {
	var youClicked = {
		"grid": function() {
			drawing.drawing.grid = 96 / e.target.value;
			drawing.drawing.snap = drawing.drawing.grid / drawing.drawing.divisions * drawing.drawing.gridsnap;
			drawing.drawing.lensnap = drawing.drawing.grid / drawing.drawing.divisions * drawing.drawing.lengthsnap;
			drawing.refresh();
		},
		"divisions": function() {
			drawing.drawing.divisions = e.target.value;
			drawing.drawing.snap = drawing.drawing.grid / drawing.drawing.divisions * drawing.drawing.gridsnap;
			drawing.drawing.lensnap = drawing.drawing.grid / drawing.drawing.divisions * drawing.drawing.lengthsnap;
			drawing.refresh();
		},
		"gridsnap": function() {
			drawing.drawing.gridsnap = e.target.value;
			drawing.drawing.snap = drawing.drawing.grid / drawing.drawing.divisions * drawing.drawing.gridsnap;
			drawing.refresh();
		},
		"lengthsnap": function() {
			drawing.drawing.lengthsnap = e.target.value;
			drawing.drawing.lensnap = drawing.drawing.grid / drawing.drawing.divisions * drawing.drawing.lengthsnap;
			drawing.refresh();
		},
		"anglesnap": function() {
			drawing.drawing.anglesnap = e.target.value;
			drawing.refresh();
		},
		"endsnap": function() {
			drawing.drawing.endsnap = e.target.value;
			drawing.refresh();
		},
	}
	youClicked[e.target.id]();
}
window.addEventListener("keydown", function(e) {
	var elem = e.target.tagName.toLowerCase();
	// anything not on a text input
	if (elem !== 'input' && elem !== 'select') {
		if (e.ctrlKey && e.keyCode === 90) {
			drawing.undo();
		}
		if (e.keyCode === 27) {
			tool.reset();
			// also make sure options closes
			document.getElementById("options").style.display = "none";
		}
		if (e.shiftKey && e.keyCode === 191) {
			var old = document.getElementsByClassName("active");
			var i;
			for (i = old.length; i > 0; i--) {
				old[i - 1].className = "";
			}
			document.getElementById("shortcuts-link").className = "active";
			document.getElementById("shortcuts").className = "active";
			document.getElementById("options").style.display = "block";
		}
	}
});
