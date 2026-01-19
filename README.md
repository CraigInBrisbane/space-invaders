# Space Invaders Game

A classic Space Invaders game built with HTML5 Canvas and Node.js.

## Features

- **Progressive Difficulty**: Levels get progressively harder with more enemies and faster gameplay
- **Pause Functionality**: Press P or click the Pause button to pause and resume the game
- **Score Tracking**: Earn points for each enemy destroyed (points increase per level)
- **Lives System**: Start with 3 lives, lose a life when hit by enemy fire
- **Visual Effects**: Explosions and particles on enemy destruction
- **Responsive Design**: Works on desktop browsers
- **High Performance**: Optimized canvas rendering with smooth 60 FPS gameplay

## Requirements

- Node.js 22.x LTS (Latest)
- npm

## Installation

1. Navigate to the project directory:
```bash
cd "Space Invaders"
```

2. Install dependencies:
```bash
npm install
```

## Running the Game

Start the server:
```bash
npm start
```

Then open your browser and visit:
```
http://localhost:3000
```

## Controls

- **Arrow Keys**: Move left and right
- **Spacebar**: Shoot
- **P Key**: Pause/Resume
- **Pause Button**: Pause/Resume (UI button)
- **Restart Button**: Start a new game

## Game Mechanics

### Levels
- Each level spawns more enemies than the previous one
- Enemy speed increases per level
- Enemy fire rate increases per level
- Clear all enemies to advance to the next level

### Scoring
- Base points: 10 points per enemy destroyed
- Points increase with level multiplier (Level 1 = 10pts, Level 2 = 20pts, etc.)

### Game Over Conditions
- Lose all 3 lives
- Enemies reach the bottom of the screen

## Project Structure

```
Space Invaders/
├── server.js          # Express server
├── package.json       # Project dependencies
├── public/
│   ├── index.html     # Game HTML
│   ├── game.js        # Game logic
│   └── styles.css     # Game styling
└── README.md          # This file
```

## Browser Compatibility

Works best in modern browsers with HTML5 Canvas support:
- Chrome
- Firefox
- Safari
- Edge

## License

MIT
