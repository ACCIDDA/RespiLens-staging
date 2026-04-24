export const narrativeContent = `---
title: "Simple Example Narrative"
authors: "RespiLens Team"
date: "2024-12-26"
abstract: "A simple example showing how to create dynamic narratives with custom visualizations"
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

# Custom Plotly Gaussian [javascript:plotly-gaussian]

This slide demonstrates a custom Plotly visualization showing a Gaussian distribution.

**Custom Visualization Features:**
- Interactive Plotly charts
- Statistical distributions
- Real-time parameter adjustment
- Professional scientific plotting

The right panel shows a beautiful Gaussian curve with customizable parameters that demonstrates how developers can embed any JavaScript visualization into RespiLens narratives.`;
