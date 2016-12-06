var FPS = 60;
var Neuvol;

var speed = function(fps){
	FPS = parseInt(fps);
}

var Ball = function(x, y) {
	this.x = x;
	this.y = y;
	this.speed = -2;
	this.radius = 5;
	this.alive = true;
	this.score = 0;
}

Ball.prototype.display = function(context) {
	context.beginPath();
	context.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);
	context.fillStyle = 'black';
    context.fill();
}

Ball.prototype.update = function() {
	this.x += this.speed
}

Ball.prototype.changeDirection = function() {
	this.speed = -this.speed;
}

Ball.prototype.isDead = function(current_seg) {
	if( whatSide({x: this.x, y: this.y}, current_seg.c, current_seg.d) == 1 ||
		whatSide({x: this.x, y: this.y}, {x: current_seg.x, y: current_seg.y}, current_seg.b) == 1
		)  {
		return true;
	} else {
		return false;
	}
}

var Segment = function(x, y, angle, height) {
	this.width = 60;
	this.x = x;
	this.y = y;
	this.angle = angle;
	this.h = height;
	this.speed = 2;
	this.b = {
		x: this.x + this.h * Math.tan(this.angle/57.2958),
		y: this.y - this.h,
	};

	this.c = {
		x: this.b.x - this.width,
		y: this.b.y,
	};

	this.d = {
		x: this.x - this.width,
		y: this.y,
	};
}

Segment.prototype.display = function(context) {
	context.beginPath();
    context.moveTo(this.x, this.y);
    context.lineTo(this.b.x, this.b.y);

    context.moveTo(this.c.x, this.c.y);
    // context.lineTo(this.c.x, this.c.y);

    context.lineTo(this.d.x, this.d.y);
    // context.lineTo(this.x, this.y);
    context.lineWidth = 2;
    if(this.current)
		context.strokeStyle = 'red';
	else
		context.strokeStyle = 'blue';

	context.stroke();

	// context.fillStyle = "red";
	// context.fillRect(this.x, this.y, 5, 5)
}

Segment.prototype.update = function() {
	this.y += this.speed;
	this.b.y += this.speed;
	this.c.y += this.speed;
	this.d.y += this.speed;
}

var Game = function() {
	this.canvas = document.querySelector("#flappy");
	this.ctx = this.canvas.getContext("2d");
	this.width = this.canvas.width;
	this.height = this.canvas.height;
	this.generation = 0;
	this.alives = 0;
	this.gen = [];
	this.score = 0;
}

function inRange(num, min, max) {
	return num >= min && num <= max;
}

function whatSide(p, A, B) {
	return Math.sign((B.x - A.x) * (p.y - A.y) - (B.y - A.y) * (p.x - A.x))
}

Game.prototype.validSegment = function(last_segment) {
	var last_segment = this.segments[this.segments.length - 1];
	var isValid = false;
	var next_segment = null;

	while(!isValid) {

		isValid = true;
		var random_height = Math.random() * 100;
		next_segment = new Segment(last_segment.b.x, last_segment.b.y, 180 - last_segment.angle, random_height > 10 ? random_height : 50);
		
		if( ! inRange(next_segment.x, 0, this.width) || 
			! inRange(next_segment.b.x, 0, this.width) || 
			! inRange(next_segment.c.x, 0, this.width) || 
			! inRange(next_segment.d.x, 0, this.width) )
			isValid = false;
	}

	
	return next_segment;
}

Game.prototype.isItEnd = function(){
	for(var i in this.balls){
		if(this.balls[i].alive){
			return false;
		}
	}
	return true;
}

Game.prototype.update = function() {
	if(this.isItEnd()){
		this.start();
	}

	var current_seg = null;

	this.segments.forEach(function(seg){
		seg.update();
		seg.current = inRange(game.balls[0].y, seg.b.y, seg.y);
		if(seg.current)
			current_seg = seg;
	});

	this.balls.forEach(function(ball, index){
		if(ball.alive) {
			var inputs = [
				ball.y,
				current_seg.b.y
			];
			var res = game.gen[index].compute(inputs);
			
			if(res > 0.5)
				ball.changeDirection();

			ball.update();
			if(ball.isDead(current_seg)){
				ball.alive = false;
				game.alives --;
				Neuvol.networkScore(game.gen[index], ball.score);
			} else {
				ball.score++;
			}
		}
	});

	if(this.segments[0].b.y > this.height)
		this.segments.shift();
	
	if(this.segments[this.segments.length - 1].b.y > 0) {
		this.segments.push(this.validSegment());
	}

	setTimeout(function(){
		game.update();
	}, 1000/FPS);

	if(FPS == 0) {
		setTimeout(function(){
			game.update();
		}, 1);
	}
}


Game.prototype.display = function() {
	var self = this;
	this.ctx.clearRect(0, 0, this.width, this.height);

	this.balls.forEach(function(ball){
		if(ball.alive)
			ball.display(self.ctx);
	});

	this.segments.forEach(function(seg){
		seg.display(self.ctx);
	});
	
	requestAnimationFrame(function(){
		self.display();
	});
}


Game.prototype.start = function() {
	this.score = 0;
	this.balls = [];

	this.gen = Neuvol.nextGeneration();
	for(var i in this.gen) {
		var b = new Ball(this.width/2, this.height/2);
		this.balls.push(b);
	}
	this.generation++;
	this.alives = this.balls.length;

	this.segments = [new Segment(this.width/2 + 30, this.height / 2, 135, 25)];
	do {
		var last_segment = this.validSegment();
		this.segments.push(last_segment);
	} while(last_segment.b.y > 0)
}

window.onload = function(){
	Neuvol = new Neuroevolution({
		population:50,
		network:[2, [8], 1],
	});
	game = new Game();
	game.start();
	game.update();
	game.display();
};

$(document).keydown(function(e){
	var key = e.which;
	if(key == "32") {
		game.ball.changeDirection();
	}
})
