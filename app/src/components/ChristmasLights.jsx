// src/components/layout/ChristmasLights.jsx
import { Box } from '@mantine/core';

const ChristmasLights = () => {
  // Simple inline styles for the lights
  const lightStyle = {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    display: 'inline-block',
    margin: '0 15px',
    boxShadow: '0px 2px 10px rgba(0,0,0,0.2)',
    animationDuration: '2s',
    animationIterationCount: 'infinite',
    animationName: 'flash',
  };

  // Define colors for the pattern
  const colors = ['#ff2e2e', '#2eff2e', '#ffeb3b', '#2e8cff'];

  return (
    <Box
      style={{
        width: '100%',
        height: '24px',
        position: 'absolute', // Sits on top of the header content
        top: '-5px', // Adjusts vertical position to hang slightly off the top
        left: 0,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'center',
        overflow: 'hidden',
        pointerEvents: 'none', // Lets clicks pass through to nav buttons
      }}
    >
      <style>
        {`
          @keyframes flash {
            0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 10px currentColor; }
            50% { opacity: 0.4; transform: scale(0.8); box-shadow: 0 0 2px currentColor; }
          }
        `}
      </style>
      
      {/* Generate a strand of 40 lights */}
      {Array.from({ length: 40 }).map((_, i) => {
        const color = colors[i % colors.length];
        // Offset animation delay so they don't all blink at once
        const delay = `${(i % 2) * 1}s`; 
        
        return (
          <div
            key={i}
            style={{
              ...lightStyle,
              backgroundColor: color,
              color: color, // Used for the box-shadow currentColor
              animationDelay: delay,
            }}
          />
        );
      })}
    </Box>
  );
};

export default ChristmasLights;