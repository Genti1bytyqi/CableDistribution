# CableDistribution

## Overview

**Building Cable Distribution Optimizer** is a web application designed to optimize and visually present the layout of electrical cable distributions in buildings. The application uses a modified Minimum Spanning Tree (MST) algorithm with custom rules based on node types (e.g., `powerSupply`, `mainDistribution`, `junction`, `terminal`, `switch`, `light`) to compute optimal wiring configurations that minimize cost. It features an interactive visualization built with [D3.js](https://d3js.org/), enabling users to add nodes, adjust edge costs, and export the final graph as an SVG with embedded images.

## Features

- **Optimized Wiring Layout:**  
  Implements a variant of the Kruskal MST algorithm with custom rules to ensure proper electrical distribution.
- **Interactive Visualization:**  
  Uses D3.js to render nodes and edges with animations (e.g., sequential drawing of lines and labels in optimized mode).
- **User Interactivity:**  
  Allows users to add nodes by clicking on the graph, edit edge costs by clicking on labels, and remove nodes via Alt-click.
- **SVG Export:**  
  Exports the graph as an SVG file with inlined images, ensuring that all visual elements display correctly offline.


## Installation

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/your-username/your-repo-name.git
   cd your-repo-name
   ```

- Install Node.js if not installed ('https://nodejs.org/en/download')
  
2. **Install Dependencies**
    ```bash
    npm install
    ```
3. **Run application**
    ```bash
    npm start
    ```
