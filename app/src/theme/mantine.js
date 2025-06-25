import { createTheme } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'blue',
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  
  colors: {
    blue: [
      '#e6f3ff',
      '#cce7ff',
      '#99d0ff',
      '#66b8ff',
      '#339fff',
      '#0087ff',
      '#006ee6',
      '#0055b3',
      '#003d80',
      '#002654'
    ],
    gray: [
      '#f8fafc',
      '#f1f5f9',
      '#e2e8f0',
      '#cbd5e1',
      '#94a3b8',
      '#64748b',
      '#475569',
      '#334155',
      '#1e293b',
      '#0f172a'
    ]
  },

  components: {
    Button: {
      defaultProps: {
        size: 'sm',
      },
      styles: {
        root: {
          fontWeight: 500,
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'translateY(-1px)',
          },
        },
      },
    },
    
    Card: {
      defaultProps: {
        shadow: 'sm',
        padding: 'md',
        radius: 'md',
      },
      styles: {
        root: {
          transition: 'box-shadow 0.2s ease',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
    
    Select: {
      defaultProps: {
        size: 'sm',
      },
    },
    
    Modal: {
      defaultProps: {
        overlayProps: {
          backgroundOpacity: 0.5,
          blur: 3,
        },
      },
    },
  },

  breakpoints: {
    xs: '36em',
    sm: '48em',
    md: '62em',
    lg: '75em',
    xl: '88em',
  },

  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },

  radius: {
    xs: '0.25rem',
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
  },
});