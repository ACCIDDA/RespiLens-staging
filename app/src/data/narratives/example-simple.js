export const narrativeContent = `---
title: "Simple Example Narrative"
authors: "RespiLens Team"
date: "2024-12-26"
abstract: "A simple example showing how to create dynamic narratives"
dataset: "/?location=US&view=fludetailed"
---

# Welcome to Dynamic Narratives [/?location=US&view=fludetailed]

This is a simple example narrative that loads dynamically from a JavaScript module.

**Key Features:**
- No app rebuild required
- Edit JavaScript files directly
- Refresh browser to see changes

Try editing this file in \`src/data/narratives/example-simple.js\` and refresh the page!

# Different State Example [/?location=NY&view=fludetailed]

This slide shows New York data instead of US national data.

The visualization panel automatically updates when you navigate between slides.

# Time Series View [/?location=US&view=flutimeseries]

Now we're showing the time series view for the US.

This demonstrates how different RespiLens views can be embedded in narratives.

# Custom Visualization Example [javascript:custom-demo-chart]

This slide would show a custom JavaScript visualization.

Developers can create custom charts using D3, Plotly, or other libraries.`;