const canvas = document.getElementById('map');
const ctx = canvas.getContext('2d');

canvas.width = 1920;
canvas.height = 1080;

function clearCanvas() {
    ctx.fillStyle = 'gray';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    map.drawExploredAreas();
    Obstacle.drawAll();
}

class Map {
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.exploredCells = new Set();
        this.exploredArea = 0;
        this.showExplored = true;
    }

    markExplored(robotX, robotY, robotAngle) {
        if (!this.showExplored) return;

        const radius = 100;
        const halfAngle = 10;
        const rayCount = 40;
        const obstacleBuffer = 8;

        for (let i = 0; i <= rayCount; i++) {
            const angle = robotAngle - halfAngle + (i * 2 * halfAngle) / rayCount;
            const angleRad = (Math.PI / 180) * angle;

            for (let dist = 0; dist <= radius; dist += this.cellSize) {
                const x = Math.floor(robotX + dist * Math.cos(angleRad));
                const y = Math.floor(robotY + dist * Math.sin(angleRad));

                if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) break;

                if (Obstacle.obstacles.some(obstacle => Math.hypot(obstacle.x - x, obstacle.y - y) <= obstacleBuffer)) {
                    break;
                }

                const cellX = Math.floor(x / this.cellSize);
                const cellY = Math.floor(y / this.cellSize);
                const cellKey = `${cellX},${cellY}`;

                if (!this.exploredCells.has(cellKey)) {
                    this.exploredCells.add(cellKey);
                    this.exploredArea += this.cellSize ** 2;
                }
            }
        }
    }

    drawExploredAreas() {
        if (!this.showExplored) return;

        ctx.fillStyle = 'white';
        this.exploredCells.forEach((cellKey) => {
            const [cellX, cellY] = cellKey.split(',').map(Number);
            ctx.fillRect(cellX * this.cellSize, cellY * this.cellSize, this.cellSize, this.cellSize);
        });
    }

    getExploredArea() {
        return (this.exploredArea / 10000).toFixed(2);
    }

    toggleExploredVisibility() {
        this.showExplored = !this.showExplored;
    }
}

class Robot {
    constructor(width, height, map) {
        this.width = width;
        this.height = height;
        this.x = 100;
        this.y = 100;
        this.angle = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.targetAngle = 0;
        this.speed = 0.1;
        this.rotationSpeed = 1.5;
        this.vitesseDroit = 0;
        this.vitesseGauche = 0;
        this.showData = true;
        this.distanceParcourue = 0;
        this.previousX = null;
        this.previousY = null;
        this.path = [];
        this.map = map;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.angle * Math.PI) / 180);
        ctx.fillStyle = 'blue';
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.restore();

        if (this.showData) {
            ctx.fillStyle = 'black';
            ctx.font = '16px Arial';
            ctx.fillText(`X: ${this.x.toFixed(2)} Y: ${this.y.toFixed(2)} Angle: ${this.angle.toFixed(2)}`, 10, 20);
            ctx.fillText(`Vitesse Droit: ${this.vitesseDroit} m/s`, 10, 40);
            ctx.fillText(`Vitesse Gauche: ${this.vitesseGauche} m/s`, 10, 60);
            ctx.fillText(`Distance Parcourue: ${this.distanceParcourue.toFixed(2)} cm`, 10, 80);
            ctx.fillText(`Surface Explorée: ${this.map.getExploredArea()} m²`, 10, 100);
        }
    }

    updatePosition(targetX, targetY, targetAngle, vitesseDroit, vitesseGauche) {
        this.targetX = targetX;
        this.targetY = targetY;
        this.targetAngle = targetAngle;
        this.vitesseDroit = vitesseDroit;
        this.vitesseGauche = vitesseGauche;

        if (this.previousX !== null && this.previousY !== null) {
            const dx = targetX - this.previousX;
            const dy = targetY - this.previousY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            this.distanceParcourue += distance;
            this.map.markExplored(this.x, this.y, this.angle);
        }

        if (this.path.length === 0 || (this.previousX !== targetX || this.previousY !== targetY)) {
            this.path.push({ x: targetX, y: targetY });
        }

        this.previousX = targetX;
        this.previousY = targetY;
    }

    drawPath() {
        if (!this.showData) return;

        ctx.beginPath();
        ctx.strokeStyle = 'green';
        ctx.lineWidth = 2;
        for (let i = 1; i < this.path.length; i++) {
            const { x: x1, y: y1 } = this.path[i - 1];
            const { x: x2, y: y2 } = this.path[i];
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
        }
        ctx.stroke();
    }

    animate() {
        this.x += (this.targetX - this.x) * this.speed;
        this.y += (this.targetY - this.y) * this.speed;

        const deltaAngle = (this.targetAngle - this.angle + 360) % 360;
        if (deltaAngle > 180) {
            this.angle -= Math.min(this.rotationSpeed, deltaAngle - 180);
        } else {
            this.angle += Math.min(this.rotationSpeed, deltaAngle);
        }

        this.angle = this.angle % 360;
    }

    toggleDataVisibility() {
        this.showData = !this.showData;
        this.map.toggleExploredVisibility();
    }
}

class Obstacle {
    static obstacles = [];

    static add(x, y) {
        if (!this.obstacles.some((obstacle) => Math.hypot(obstacle.x - x, obstacle.y - y) < 5)) {
            this.obstacles.push({ x, y });
        }
    }

    static drawAll() {
        ctx.fillStyle = 'red';
        this.obstacles.forEach(({ x, y }) => {
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, 2 * Math.PI);
            ctx.fill();
        });
    }

    static reset() {
        this.obstacles = [];
    }
}

const map = new Map(5);
const robot = new Robot(20, 30, map);

async function fetchData() {
    try {
        const response = await fetch('/data');
        const data = await response.json();
        if (data.length > 0) {
            const lastMeasure = data[data.length - 1];
            const { x, y, angle, distance_obstacle, vitesse_moteur_droit, vitesse_moteur_gauche } = lastMeasure;

            robot.updatePosition(x, y, angle, vitesse_moteur_droit, vitesse_moteur_gauche);

            if (distance_obstacle < 100) {
                const obstacleX = x + distance_obstacle * Math.cos((angle * Math.PI) / 180);
                const obstacleY = y + distance_obstacle * Math.sin((angle * Math.PI) / 180);
                Obstacle.add(obstacleX, obstacleY);
            }
        }
    } catch (error) {
        console.error('Erreur lors de la récupération des données :', error);
    }
}

function animate() {
    clearCanvas();
    robot.drawPath();
    robot.animate();
    robot.draw();
    requestAnimationFrame(animate);
}

document.getElementById('reset-btn').addEventListener('click', () => {
    robot.path = [];
    map.exploredCells.clear();
    map.exploredArea = 0;
    Obstacle.reset();
    clearCanvas();
});

document.getElementById('toggle-data-btn').addEventListener('click', () => {
    robot.toggleDataVisibility();
});

setInterval(fetchData, 30);
animate();
